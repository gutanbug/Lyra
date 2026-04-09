import type { IntegrationAdapter } from '../types';
import type { JiraCredentials } from './types';
import { JiraClient } from './client';

interface InvokeParams {
  credentials: JiraCredentials;
  accountId?: string;
  jql?: string;
  maxResults?: number;
  startAt?: number;
  nextPageToken?: string;
  issueKey?: string;
  pageId?: string;
  skipCache?: boolean;
  transitionId?: string;
  contentUrl?: string;
  commentId?: string;
  body?: unknown;
  query?: string;
  assigneeAccountId?: string | null;
  description?: unknown;
  priorityName?: string;
}

export class JiraAdapter implements IntegrationAdapter<JiraCredentials> {
  readonly serviceType = 'jira';
  readonly displayName = 'Jira';
  readonly icon = '📋';

  async validateCredentials(credentials: JiraCredentials): Promise<boolean | Record<string, unknown>> {
    try {
      const client = new JiraClient(credentials);
      const user = await client.getCurrentUser() as Record<string, unknown>;
      const avatarUrls = user.avatarUrls as Record<string, string> | undefined;
      return {
        valid: true,
        userDisplayName: user.displayName || '',
        userAccountId: user.accountId || '',
        userAvatarUrl: avatarUrls?.['48x48'] || avatarUrls?.['24x24'] || '',
      };
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
      getCurrentUser: (params: unknown) => this.getCurrentUser(params),
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
      searchUsers: (params: unknown) => this.searchUsers(params),
      searchAssignableUsers: (params: unknown) => this.searchAssignableUsers(params),
      assignIssue: (params: unknown) => this.assignIssue(params),
      updateIssueDescription: (params: unknown) => this.updateIssueDescription(params),
      updateIssuePriority: (params: unknown) => this.updateIssuePriority(params),
      addComment: (params: unknown) => this.addComment(params),
      updateComment: (params: unknown) => this.updateComment(params),
      deleteComment: (params: unknown) => this.deleteComment(params),
    };
  }

  private async getCurrentUser(params?: unknown): Promise<unknown> {
    const { credentials } = (params || {}) as InvokeParams;
    const client = new JiraClient(credentials);
    return client.getCurrentUser();
  }

  private async searchIssues(params?: unknown): Promise<unknown> {
    const { credentials, jql = '', maxResults = 50, startAt = 0, skipCache = false, nextPageToken } =
      (params || {}) as InvokeParams;
    const client = new JiraClient(credentials);
    return client.searchIssues(jql, maxResults, startAt, undefined, skipCache, nextPageToken);
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

  private async updateIssuePriority(params: unknown): Promise<unknown> {
    const { credentials, issueKey, priorityName } = (params || {}) as InvokeParams;
    if (!issueKey) throw new Error('issueKey is required');
    if (!priorityName) throw new Error('priorityName is required');
    const client = new JiraClient(credentials);
    await client.updateIssuePriority(issueKey, priorityName);
    return { success: true };
  }

  private async updateIssueDescription(params: unknown): Promise<unknown> {
    const { credentials, issueKey, description } = (params || {}) as InvokeParams;
    if (!issueKey) throw new Error('issueKey is required');
    if (description === undefined) throw new Error('description is required');
    const client = new JiraClient(credentials);
    await client.updateIssueDescription(issueKey, description);
    return { success: true };
  }

  private async assignIssue(params: unknown): Promise<unknown> {
    const { credentials, issueKey, assigneeAccountId } = (params || {}) as InvokeParams;
    if (!issueKey) throw new Error('issueKey is required');
    const client = new JiraClient(credentials);
    await client.assignIssue(issueKey, assigneeAccountId ?? null);
    return { success: true };
  }

  private async searchUsers(params: unknown): Promise<unknown> {
    const { credentials, query = '' } = (params || {}) as InvokeParams;
    const client = new JiraClient(credentials);
    return client.searchUsers(query as string);
  }

  private async searchAssignableUsers(params: unknown): Promise<unknown> {
    const { credentials, issueKey, query = '' } = (params || {}) as InvokeParams;
    if (!issueKey) throw new Error('issueKey is required');
    const client = new JiraClient(credentials);
    return client.searchAssignableUsers(issueKey, query);
  }

  private async addComment(params: unknown): Promise<unknown> {
    const { credentials, issueKey, body } = (params || {}) as InvokeParams;
    if (!issueKey) throw new Error('issueKey is required');
    if (!body) throw new Error('body is required');
    const client = new JiraClient(credentials);
    return client.addComment(issueKey, body);
  }

  private async updateComment(params: unknown): Promise<unknown> {
    const { credentials, issueKey, commentId, body } = (params || {}) as InvokeParams;
    if (!issueKey) throw new Error('issueKey is required');
    if (!commentId) throw new Error('commentId is required');
    if (!body) throw new Error('body is required');
    const client = new JiraClient(credentials);
    return client.updateComment(issueKey, commentId, body);
  }

  private async deleteComment(params: unknown): Promise<unknown> {
    const { credentials, issueKey, commentId } = (params || {}) as InvokeParams;
    if (!issueKey) throw new Error('issueKey is required');
    if (!commentId) throw new Error('commentId is required');
    const client = new JiraClient(credentials);
    await client.deleteComment(issueKey, commentId);
    return { success: true };
  }

  private async getAttachmentContent(params: unknown): Promise<unknown> {
    const { credentials, contentUrl } = (params || {}) as InvokeParams;
    if (!contentUrl) throw new Error('contentUrl is required');
    const client = new JiraClient(credentials);
    return client.getAttachmentContent(contentUrl);
  }
}
