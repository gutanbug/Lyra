import type { IntegrationAdapter } from '../types';
import type { GitHostCredentials } from './types';
import { GitHubClient } from './client';
import { normalizeUser } from './normalize';
import { beginDeviceFlow, pollAccessToken } from './oauth';
import type { DeviceCodeResponse, AccessTokenResult } from './oauth';
import {
  DEFAULT_CLIENT_ID,
  DEFAULT_OAUTH_BASE_URL,
  DEFAULT_SCOPES,
  deriveOAuthBaseUrl,
} from './constants';

interface InvokeParams {
  credentials: GitHostCredentials;
  accountId?: string;
}

export interface BeginOAuthParams {
  /** API baseUrl. 비어 있으면 https://api.github.com 사용. GHES는 https://ghe.example.com/api/v3. */
  baseUrl?: string;
  /** 사용자가 self-hosted에서 직접 발급한 client_id. 비어 있으면 .com용 placeholder. */
  clientId?: string;
  /** 비어 있으면 DEFAULT_SCOPES. */
  scopes?: string[];
}

export interface PollOAuthParams {
  baseUrl?: string;
  clientId?: string;
  deviceCode: string;
}

export class GitHubAdapter implements IntegrationAdapter<GitHostCredentials> {
  readonly serviceType = 'github';
  readonly displayName = 'GitHub';
  readonly icon = '🐙';

  async validateCredentials(credentials: GitHostCredentials): Promise<boolean | Record<string, unknown>> {
    try {
      const client = new GitHubClient(credentials);
      const user = await client.getCurrentUser();
      const normalized = normalizeUser(user);
      return {
        valid: true,
        userDisplayName: normalized.name,
        userAccountId: String(user.id),
        userAvatarUrl: normalized.avatarUrl,
      };
    } catch {
      return false;
    }
  }

  getCommonActions() {
    return [];
  }

  getActions() {
    return {
      getCurrentUser: (params: unknown) => this.getCurrentUser(params),
    };
  }

  /**
   * OAuth 시작은 account 컨텍스트가 없으므로 IPC handlers에서 직접 호출.
   * 응답은 device_code / user_code / verification_uri 등.
   */
  static async beginOAuth(params: BeginOAuthParams): Promise<DeviceCodeResponse & { oauthBaseUrl: string; clientId: string; scopes: string[] }> {
    const apiBaseUrl = params.baseUrl?.trim() || '';
    const oauthBaseUrl = apiBaseUrl ? deriveOAuthBaseUrl(apiBaseUrl) : DEFAULT_OAUTH_BASE_URL;
    const clientId = params.clientId?.trim() || DEFAULT_CLIENT_ID;
    const scopes = params.scopes && params.scopes.length > 0 ? params.scopes : DEFAULT_SCOPES;
    const result = await beginDeviceFlow(oauthBaseUrl, clientId, scopes);
    return { ...result, oauthBaseUrl, clientId, scopes };
  }

  /** OAuth polling. 호출자는 interval/slow_down에 따라 setTimeout으로 재호출. */
  static async pollOAuth(params: PollOAuthParams): Promise<AccessTokenResult> {
    const oauthBaseUrl = params.baseUrl ? deriveOAuthBaseUrl(params.baseUrl) : DEFAULT_OAUTH_BASE_URL;
    const clientId = params.clientId?.trim() || DEFAULT_CLIENT_ID;
    return pollAccessToken(oauthBaseUrl, clientId, params.deviceCode);
  }

  private async getCurrentUser(params?: unknown): Promise<unknown> {
    const { credentials } = (params || {}) as InvokeParams;
    const client = new GitHubClient(credentials);
    const raw = await client.getCurrentUser();
    return normalizeUser(raw);
  }
}
