export type ServiceType = 'jira' | 'notion' | 'trello' | 'confluence' | 'slack' | string;

export interface JiraCredentials {
  baseUrl: string;
  email: string;
  apiToken: string;
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
  | JiraCredentials
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
