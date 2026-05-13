import type { IntegrationAdapter } from '../types';
import type { GitHostCredentials } from './types';
import { GitHubClient } from './client';
import { normalizeUser } from './normalize';

interface InvokeParams {
  credentials: GitHostCredentials;
  accountId?: string;
  /** M2 이후 OAuth 시작 시 사용 */
  clientId?: string;
  /** OAuth scope 배열 (기본값 어댑터 내부에서) */
  scopes?: string[];
  /** Device Flow poll 시 사용 */
  deviceCode?: string;
  interval?: number;
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
      beginOAuth: (params: unknown) => this.beginOAuth(params),
      pollOAuth: (params: unknown) => this.pollOAuth(params),
    };
  }

  private async getCurrentUser(params?: unknown): Promise<unknown> {
    const { credentials } = (params || {}) as InvokeParams;
    const client = new GitHubClient(credentials);
    const raw = await client.getCurrentUser();
    return normalizeUser(raw);
  }

  private async beginOAuth(_params?: unknown): Promise<unknown> {
    throw new Error('beginOAuth not yet implemented (M2)');
  }

  private async pollOAuth(_params?: unknown): Promise<unknown> {
    throw new Error('pollOAuth not yet implemented (M2)');
  }
}
