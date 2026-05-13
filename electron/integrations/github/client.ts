import type { GitHostCredentials, RawUser, RawRepo } from './types';

export class GitHubClient {
  constructor(private credentials: GitHostCredentials) {}

  private get baseUrl(): string {
    return this.credentials.baseUrl || 'https://api.github.com';
  }

  private async request<T>(pathName: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${pathName}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.credentials.accessToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.headers || {}),
      },
    });
    if (!res.ok) {
      throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  }

  async getCurrentUser(): Promise<RawUser> {
    return this.request<RawUser>('/user');
  }

  /** M+ 단계에서 구현 */
  async listRepos(): Promise<RawRepo[]> {
    throw new Error('listRepos not yet implemented');
  }
}
