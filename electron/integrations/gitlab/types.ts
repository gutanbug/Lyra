export interface GitHostCredentials {
  baseUrl: string;
  oauthClientId: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  scopes: string[];
}

/** GitLab /user 응답 일부 */
export interface RawUser {
  id: number;
  username: string;
  name: string | null;
  avatar_url: string;
  web_url: string;
}

/** GitLab /projects 응답 일부 */
export interface RawProject {
  id: number;
  path_with_namespace: string;
  name: string;
  namespace: { path: string };
  description: string | null;
  visibility: 'private' | 'internal' | 'public';
  default_branch: string;
  web_url: string;
  http_url_to_repo: string;
  last_activity_at: string;
  star_count: number;
}
