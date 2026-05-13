import type { GitHostCredentials, RawUser, RawProject } from './types';

export class GitLabClient {
  constructor(private credentials: GitHostCredentials) {}

  private get baseUrl(): string {
    return this.credentials.baseUrl || 'https://gitlab.com';
  }

  private async request<T>(pathName: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/api/v4${pathName}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.credentials.accessToken}`,
        ...(init.headers || {}),
      },
    });
    if (!res.ok) {
      throw new Error(`GitLab API ${res.status}: ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  }

  async getCurrentUser(): Promise<RawUser> {
    return this.request<RawUser>('/user');
  }

  /** M+ 단계 */
  async listProjects(): Promise<RawProject[]> {
    throw new Error('listProjects not yet implemented');
  }
}
