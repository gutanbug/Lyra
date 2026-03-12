export type ServiceType = 'atlassian' | 'jira' | 'notion' | 'trello' | 'confluence' | 'slack' | string;

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

export type ServiceCredentials =
  | AtlassianCredentials
  | NotionCredentials
  | TrelloCredentials
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
