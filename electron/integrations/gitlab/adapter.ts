import type { IntegrationAdapter } from '../types';
import type { GitHostCredentials } from './types';
import { GitLabClient } from './client';
import { normalizeUser } from './normalize';
import { beginDeviceFlow, pollAccessToken } from './oauth';
import type { DeviceCodeResponse, AccessTokenResult } from './oauth';
import { DEFAULT_CLIENT_ID, DEFAULT_OAUTH_BASE_URL, DEFAULT_SCOPES, deriveOAuthBaseUrl } from './constants';

interface InvokeParams {
  credentials: GitHostCredentials;
  accountId?: string;
}

export interface BeginOAuthParams {
  /** API/OAuth baseUrl. 비어 있으면 https://gitlab.com 사용. self-hosted는 https://gitlab.example.com. */
  baseUrl?: string;
  /** self-hosted에서 직접 발급한 OAuth App Application ID. 비어 있으면 .com용 placeholder. */
  clientId?: string;
  /** 비어 있으면 DEFAULT_SCOPES. */
  scopes?: string[];
}

export interface PollOAuthParams {
  /** API/OAuth baseUrl (BeginOAuthParams.baseUrl과 동일 값). */
  baseUrl?: string;
  clientId?: string;
  deviceCode: string;
}

/** beginOAuth 반환 타입. 핸들러/프리로드/렌더러가 공유한다. */
export interface BeginOAuthResult extends DeviceCodeResponse {
  oauthBaseUrl: string;
  clientId: string;
  scopes: string[];
}

export class GitLabAdapter implements IntegrationAdapter<GitHostCredentials> {
  readonly serviceType = 'gitlab';
  readonly displayName = 'GitLab';
  readonly icon = '🦊';

  async validateCredentials(credentials: GitHostCredentials): Promise<boolean | Record<string, unknown>> {
    try {
      const client = new GitLabClient(credentials);
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

  static async beginOAuth(params: BeginOAuthParams): Promise<BeginOAuthResult> {
    const { oauthBaseUrl, clientId } = GitLabAdapter.resolveOAuthDefaults(params.baseUrl, params.clientId);
    const scopes = params.scopes && params.scopes.length > 0 ? params.scopes : DEFAULT_SCOPES;
    const result = await beginDeviceFlow(oauthBaseUrl, clientId, scopes);
    return { ...result, oauthBaseUrl, clientId, scopes };
  }

  static async pollOAuth(params: PollOAuthParams): Promise<AccessTokenResult> {
    const { oauthBaseUrl, clientId } = GitLabAdapter.resolveOAuthDefaults(params.baseUrl, params.clientId);
    return pollAccessToken(oauthBaseUrl, clientId, params.deviceCode);
  }

  private static resolveOAuthDefaults(
    baseUrl: string | undefined,
    clientId: string | undefined,
  ): { oauthBaseUrl: string; clientId: string } {
    const trimmedBase = baseUrl?.trim() || '';
    const oauthBaseUrl = trimmedBase ? deriveOAuthBaseUrl(trimmedBase) : DEFAULT_OAUTH_BASE_URL;
    const resolvedClientId = clientId?.trim() || DEFAULT_CLIENT_ID;
    return { oauthBaseUrl, clientId: resolvedClientId };
  }

  private async getCurrentUser(params?: unknown): Promise<unknown> {
    const { credentials } = (params || {}) as InvokeParams;
    const client = new GitLabClient(credentials);
    const raw = await client.getCurrentUser();
    return normalizeUser(raw);
  }
}
