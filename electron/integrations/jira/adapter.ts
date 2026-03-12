import type { IntegrationAdapter } from '../types';
import type { JiraCredentials } from './types';
import { JiraClient } from './client';

interface InvokeParams {
  credentials: JiraCredentials;
  accountId?: string;
  jql?: string;
  maxResults?: number;
  startAt?: number;
  issueKey?: string;
  pageId?: string;
  skipCache?: boolean;
  transitionId?: string;
  contentUrl?: string;
}

export class JiraAdapter implements IntegrationAdapter<JiraCredentials> {
  readonly serviceType = 'jira';
  readonly displayName = 'Jira';
  readonly icon = '📋';

  async validateCredentials(credentials: JiraCredentials): Promise<boolean> {
    try {
      const client = new JiraClient(credentials);
      await client.getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }

  getCommonActions() {
    return [
      {
        id: 'search',
        label: '이슈 검색',
        handler: async (_accountId: string, params?: unknown) => this.searchIssues(params),
      },
      {
        id: 'list',
        label: '프로젝트 목록',
        handler: async (_accountId: string, params?: unknown) => this.getProjects(params),
      },
    ];
  }

  getActions() {
    return {
      searchIssues: (params: unknown) => this.searchIssues(params),
      getProjects: (params: unknown) => this.getProjects(params),
      getIssue: (params: unknown) => this.getIssue(params),
      getComments: (params: unknown) => this.getComments(params),
      getRemoteLinks: (params: unknown) => this.getRemoteLinks(params),
      getConfluencePageContent: (params: unknown) => this.getConfluencePageContent(params),
      searchConfluenceByIssue: (params: unknown) => this.searchConfluenceByIssue(params),
      getPriorities: (params: unknown) => this.getPriorities(params),
      getStatuses: (params: unknown) => this.getStatuses(params),
      getIssueTypes: (params: unknown) => this.getIssueTypes(params),
      getTransitions: (params: unknown) => this.getTransitions(params),
      transitionIssue: (params: unknown) => this.transitionIssue(params),
      getAttachmentContent: (params: unknown) => this.getAttachmentContent(params),
    };
  }

  private async searchIssues(params?: unknown): Promise<unknown> {
    const { credentials, jql = 'created >= -90d ORDER BY created DESC', maxResults = 50, startAt = 0, skipCache = false } =
      (params || {}) as InvokeParams;
    const client = new JiraClient(credentials);
    return client.searchIssues(jql, maxResults, startAt, undefined, skipCache);
  }

  private async getPriorities(params?: unknown): Promise<unknown> {
    const { credentials } = (params || {}) as InvokeParams;
    const client = new JiraClient(credentials);
    return client.getPriorities();
  }

  private async getStatuses(params?: unknown): Promise<unknown> {
    const { credentials } = (params || {}) as InvokeParams;
    const client = new JiraClient(credentials);
    return client.getStatuses();
  }

  private async getIssueTypes(params?: unknown): Promise<unknown> {
    const { credentials } = (params || {}) as InvokeParams;
    const client = new JiraClient(credentials);
    return client.getIssueTypes();
  }

  private async getProjects(params?: unknown): Promise<unknown> {
    const { credentials } = (params || {}) as InvokeParams;
    const client = new JiraClient(credentials);
    return client.getProjects();
  }

  private async getIssue(params: unknown): Promise<unknown> {
    const { credentials, issueKey } = (params || {}) as InvokeParams;
    if (!issueKey) throw new Error('issueKey is required');
    const client = new JiraClient(credentials);
    return client.getIssue(issueKey);
  }

  private async getComments(params: unknown): Promise<unknown> {
    const { credentials, issueKey } = (params || {}) as InvokeParams;
    if (!issueKey) throw new Error('issueKey is required');
    const client = new JiraClient(credentials);
    return client.getComments(issueKey);
  }

  private async getRemoteLinks(params: unknown): Promise<unknown> {
    const { credentials, issueKey } = (params || {}) as InvokeParams;
    if (!issueKey) throw new Error('issueKey is required');
    const client = new JiraClient(credentials);
    return client.getRemoteLinks(issueKey);
  }

  private async getConfluencePageContent(params: unknown): Promise<unknown> {
    const { credentials, pageId } = (params || {}) as InvokeParams;
    if (!pageId) throw new Error('pageId is required');
    const client = new JiraClient(credentials);
    return client.getConfluencePageContent(pageId);
  }

  private async getTransitions(params: unknown): Promise<unknown> {
    const { credentials, issueKey } = (params || {}) as InvokeParams;
    if (!issueKey) throw new Error('issueKey is required');
    const client = new JiraClient(credentials);
    return client.getTransitions(issueKey);
  }

  private async transitionIssue(params: unknown): Promise<unknown> {
    const { credentials, issueKey, transitionId } = (params || {}) as InvokeParams;
    if (!issueKey) throw new Error('issueKey is required');
    if (!transitionId) throw new Error('transitionId is required');
    const client = new JiraClient(credentials);
    await client.transitionIssue(issueKey, transitionId);
    return { success: true };
  }

  private async searchConfluenceByIssue(params: unknown): Promise<unknown> {
    const { credentials, issueKey } = (params || {}) as InvokeParams;
    if (!issueKey) throw new Error('issueKey is required');
    const client = new JiraClient(credentials);
    return client.searchConfluenceByIssue(issueKey);
  }

  private async getAttachmentContent(params: unknown): Promise<unknown> {
    const { credentials, contentUrl } = (params || {}) as InvokeParams;
    if (!contentUrl) throw new Error('contentUrl is required');
    const client = new JiraClient(credentials);
    return client.getAttachmentContent(contentUrl);
  }
}
