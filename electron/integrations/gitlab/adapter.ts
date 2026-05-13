import type { IntegrationAdapter } from '../types';
import type { GitHostCredentials } from './types';
import { GitLabClient } from './client';
import { normalizeUser } from './normalize';

interface InvokeParams {
  credentials: GitHostCredentials;
  accountId?: string;
  clientId?: string;
  scopes?: string[];
  deviceCode?: string;
  interval?: number;
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
      beginOAuth: (params: unknown) => this.beginOAuth(params),
      pollOAuth: (params: unknown) => this.pollOAuth(params),
    };
  }

  private async getCurrentUser(params?: unknown): Promise<unknown> {
    const { credentials } = (params || {}) as InvokeParams;
    const client = new GitLabClient(credentials);
    const raw = await client.getCurrentUser();
    return normalizeUser(raw);
  }

  private async beginOAuth(_params?: unknown): Promise<unknown> {
    throw new Error('beginOAuth not yet implemented (M3)');
  }

  private async pollOAuth(_params?: unknown): Promise<unknown> {
    throw new Error('pollOAuth not yet implemented (M3)');
  }
}
