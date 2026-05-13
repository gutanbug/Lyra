/** GitHub 인증 정보 (Renderer의 GitHostCredentials와 동일 shape) */
export interface GitHostCredentials {
  baseUrl: string;
  oauthClientId: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  scopes: string[];
}

/** GitHub /user 응답 raw 일부 */
export interface RawUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

/** GitHub /user/repos 응답 raw 일부 */
export interface RawRepo {
  id: number;
  full_name: string;
  name: string;
  owner: { login: string };
  description: string | null;
  private: boolean;
  default_branch: string;
  html_url: string;
  clone_url: string;
  pushed_at: string;
  updated_at: string;
  stargazers_count: number;
}
