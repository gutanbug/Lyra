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
  downloadUrl?: string;
  searchField?: 'all' | 'title' | 'body' | 'title_body';
}

export class ConfluenceAdapter implements IntegrationAdapter<JiraCredentials> {
  readonly serviceType = 'confluence';
  readonly displayName = 'Confluence';
  readonly icon = '📄';

  async validateCredentials(credentials: JiraCredentials): Promise<boolean> {
    try {
      const client = new ConfluenceClient(credentials);
      await client.getCurrentUser();
      return true;
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
      getSpaces: (params: unknown) => this.getSpaces(params),
      getSpacePages: (params: unknown) => this.getSpacePages(params),
      getMyPages: (params: unknown) => this.getMyPages(params),
      searchPages: (params: unknown) => this.searchPages(params),
      getPageContent: (params: unknown) => this.getPageContent(params),
      getPageComments: (params: unknown) => this.getPageComments(params),
      getPageAttachments: (params: unknown) => this.getPageAttachments(params),
      getAttachmentContent: (params: unknown) => this.getAttachmentContent(params),
    };
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
    return client.getSpacePages(p.spaceKey, p.limit);
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
}
