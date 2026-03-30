import type { IntegrationAdapter } from '../types';
import type { JiraCredentials } from '../jira/types';
import { ConfluenceClient } from './client';

interface InvokeParams {
  credentials: JiraCredentials;
  limit?: number;
  sort?: string;
  status?: string;
  spaceKeys?: string[];
  query?: string;
  pageId?: string;
  spaceKey?: string;
  folderId?: string;
  downloadUrl?: string;
  searchField?: 'all' | 'title' | 'body' | 'title_body';
  tinyKey?: string;
  tinyKeys?: string[];
  title?: string;
  body?: unknown;
  version?: number;
}

export class ConfluenceAdapter implements IntegrationAdapter<JiraCredentials> {
  readonly serviceType = 'confluence';
  readonly displayName = 'Confluence';
  readonly icon = '📄';

  async validateCredentials(credentials: JiraCredentials): Promise<boolean | Record<string, unknown>> {
    try {
      const client = new ConfluenceClient(credentials);
      const user = await client.getCurrentUser() as Record<string, unknown>;
      return {
        valid: true,
        userDisplayName: user.displayName || user.publicName || '',
        userAccountId: user.accountId || '',
      };
    } catch {
      return false;
    }
  }

  getCommonActions() {
    return [
      {
        id: 'getSpaces',
        label: '스페이스 목록',
        handler: async (_accountId: string, params?: unknown) => this.getSpaces(params),
      },
    ];
  }

  getActions() {
    return {
      getCurrentUser: (params: unknown) => this.getCurrentUser(params),
      getSpaces: (params: unknown) => this.getSpaces(params),
      getSpacePages: (params: unknown) => this.getSpacePages(params),
      getChildPages: (params: unknown) => this.getChildPages(params),
      getFolderChildren: (params: unknown) => this.getFolderChildren(params),
      getMyPages: (params: unknown) => this.getMyPages(params),
      searchPages: (params: unknown) => this.searchPages(params),
      getPageContent: (params: unknown) => this.getPageContent(params),
      getPageComments: (params: unknown) => this.getPageComments(params),
      getPageAttachments: (params: unknown) => this.getPageAttachments(params),
      getAttachmentContent: (params: unknown) => this.getAttachmentContent(params),
      resolveTinyLink: (params: unknown) => this.resolveTinyLink(params),
      resolveTinyLinks: (params: unknown) => this.resolveTinyLinks(params),
      updatePageBody: (params: unknown) => this.updatePageBody(params),
    };
  }

  private async getCurrentUser(params?: unknown): Promise<unknown> {
    const { credentials } = (params || {}) as InvokeParams;
    const client = new ConfluenceClient(credentials);
    return client.getCurrentUser();
  }

  private async getSpaces(params?: unknown): Promise<unknown> {
    const { credentials, limit } = (params || {}) as InvokeParams;
    const client = new ConfluenceClient(credentials);
    return client.getSpaces(limit);
  }

  private async getSpacePages(params?: unknown): Promise<unknown> {
    const p = (params || {}) as InvokeParams;
    if (!p.spaceKey) throw new Error('spaceKey is required');
    const client = new ConfluenceClient(p.credentials);
    return client.getSpacePages(p.spaceKey);
  }

  private async getChildPages(params?: unknown): Promise<unknown> {
    const p = (params || {}) as InvokeParams;
    if (!p.pageId) throw new Error('pageId is required');
    const client = new ConfluenceClient(p.credentials);
    return client.getChildPages(p.pageId);
  }

  private async getFolderChildren(params?: unknown): Promise<unknown> {
    const p = (params || {}) as InvokeParams;
    if (!p.folderId) throw new Error('folderId is required');
    const client = new ConfluenceClient(p.credentials);
    return client.getFolderChildren(p.folderId);
  }

  private async getMyPages(params?: unknown): Promise<unknown> {
    const p = (params || {}) as InvokeParams;
    const client = new ConfluenceClient(p.credentials);
    return client.getMyPages({
      limit: p.limit,
      sort: p.sort,
      status: p.status,
      spaceKeys: p.spaceKeys,
    });
  }

  private async searchPages(params?: unknown): Promise<unknown> {
    const p = (params || {}) as InvokeParams;
    const client = new ConfluenceClient(p.credentials);
    return client.searchPages({
      query: p.query ?? '',
      limit: p.limit,
      spaceKeys: p.spaceKeys,
      searchField: p.searchField,
    });
  }

  private async getPageContent(params?: unknown): Promise<unknown> {
    const { credentials, pageId } = (params || {}) as InvokeParams;
    if (!pageId) throw new Error('pageId is required');
    const client = new ConfluenceClient(credentials);
    return client.getPageContent(pageId);
  }

  private async getPageComments(params?: unknown): Promise<unknown> {
    const { credentials, pageId } = (params || {}) as InvokeParams;
    if (!pageId) throw new Error('pageId is required');
    const client = new ConfluenceClient(credentials);
    return client.getPageComments(pageId);
  }

  private async getPageAttachments(params?: unknown): Promise<unknown> {
    const { credentials, pageId } = (params || {}) as InvokeParams;
    if (!pageId) throw new Error('pageId is required');
    const client = new ConfluenceClient(credentials);
    return client.getPageAttachments(pageId);
  }

  private async getAttachmentContent(params?: unknown): Promise<unknown> {
    const { credentials, downloadUrl } = (params || {}) as InvokeParams;
    if (!downloadUrl) throw new Error('downloadUrl is required');
    const client = new ConfluenceClient(credentials);
    return client.getAttachmentContent(downloadUrl);
  }

  private async resolveTinyLink(params?: unknown): Promise<unknown> {
    const { credentials, tinyKey } = (params || {}) as InvokeParams;
    if (!tinyKey) throw new Error('tinyKey is required');
    const client = new ConfluenceClient(credentials);
    return client.resolveTinyLink(tinyKey);
  }

  private async resolveTinyLinks(params?: unknown): Promise<unknown> {
    const { credentials, tinyKeys } = (params || {}) as InvokeParams;
    if (!tinyKeys || tinyKeys.length === 0) return {};
    const client = new ConfluenceClient(credentials);
    return client.resolveTinyLinks(tinyKeys);
  }

  private async updatePageBody(params?: unknown): Promise<unknown> {
    const { credentials, pageId, title, body, version } = (params || {}) as InvokeParams;
    if (!pageId) throw new Error('pageId is required');
    if (!title) throw new Error('title is required');
    if (body === undefined) throw new Error('body is required');
    if (version == null) throw new Error('version is required');
    const client = new ConfluenceClient(credentials);
    return client.updatePageBody(pageId, title, body, version);
  }
}
