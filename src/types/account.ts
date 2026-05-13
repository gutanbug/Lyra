export type ServiceType =
  | 'atlassian'
  | 'jira'
  | 'notion'
  | 'trello'
  | 'confluence'
  | 'slack'
  | 'github'
  | 'gitlab'
  | string;

/** Atlassian 계정 (Jira, Confluence 등 공유) */
export interface AtlassianCredentials {
  baseUrl: string;
  email: string;
  apiToken: string;
}

/** @deprecated AtlassianCredentials 사용 */
export type JiraCredentials = AtlassianCredentials;

/** Atlassian 서비스 타입인지 확인 (atlassian, jira, confluence) */
export function isAtlassianAccount(serviceType: string): boolean {
  return serviceType === 'atlassian' || serviceType === 'jira' || serviceType === 'confluence';
}

export interface NotionCredentials {
  integrationToken: string;
  workspaceId?: string;
}

export interface TrelloCredentials {
  apiKey: string;
  apiToken: string;
}

/** Git 호스팅 서비스 타입인지 확인 (github, gitlab) */
export function isGitHostAccount(serviceType: string): boolean {
  return serviceType === 'github' || serviceType === 'gitlab';
}

/**
 * GitHub / GitLab 공통 credentials.
 * - baseUrl: GitHub.com은 'https://api.github.com', GHES는 'https://ghe.example.com/api/v3'
 *            GitLab.com은 'https://gitlab.com', self-hosted는 'https://gitlab.example.com'
 * - oauthClientId: 인스턴스별 OAuth App client_id (.com 기본값은 어댑터에서 fallback)
 * - accessToken: OAuth access token (main process accounts.json에만 저장)
 * - refreshToken: GitLab은 지원, GitHub OAuth App은 기본 미지원
 * - tokenExpiresAt: ISO timestamp
 * - scopes: 요청한 OAuth scope 배열
 */
export interface GitHostCredentials {
  baseUrl: string;
  oauthClientId: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  scopes: string[];
}

export type ServiceCredentials =
  | AtlassianCredentials
  | NotionCredentials
  | TrelloCredentials
  | GitHostCredentials
  | Record<string, unknown>;

export interface Account {
  id: string;
  serviceType: ServiceType;
  displayName: string;
  credentials: ServiceCredentials;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type AccountInput = Omit<Account, 'id' | 'createdAt' | 'updatedAt'>;
