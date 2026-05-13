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
 * - authMethod: 인증 방식. 'oauth'(기본, Device Flow로 발급한 access_token) 또는
 *               'pat'(사용자가 직접 발급한 Personal Access Token). 필드 미지정 시 'oauth'.
 * - baseUrl: GitHub.com은 'https://api.github.com', GHES는 'https://ghe.example.com/api/v3'
 *            GitLab.com은 'https://gitlab.com', self-hosted는 'https://gitlab.example.com'
 * - oauthClientId: 인스턴스별 OAuth App client_id (.com 기본값은 어댑터에서 fallback).
 *                  authMethod='pat'에서는 비어 있어도 됨.
 * - accessToken: OAuth access token 또는 PAT 자체 (main process accounts.json에만 저장).
 *                Bearer 헤더 호환 — 호스트 client는 어느 쪽이든 동일하게 처리.
 * - refreshToken: OAuth-GitLab은 지원, OAuth-GitHub OAuth App은 기본 미지원. PAT은 항상 미지원.
 * - tokenExpiresAt: ISO timestamp. OAuth-GitLab만 채워짐.
 * - scopes: 부여된 scope 배열.
 */
export interface GitHostCredentials {
  /** 인증 방식. 기본 'oauth' (필드 미지정 시 하위 호환). */
  authMethod?: 'oauth' | 'pat';
  baseUrl: string;
  /** OAuth 흐름의 client_id. PAT 모드에서는 비어 있을 수 있다. */
  oauthClientId?: string;
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
