import axios, { AxiosInstance, AxiosError } from 'axios';
import type { JiraCredentials } from '../jira/types';

async function withRetry429<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 429 && i < maxRetries - 1) {
        const retryAfter = parseInt(String(axiosErr.response.headers?.['retry-after']), 10) || 5;
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

function escapeCql(s: string): string {
  return s.replace(/[\\"]/g, '\\$&');
}

/**
 * v1 /search 결과의 content 객체를 프론트 normalizePage가 기대하는 flat 구조로 변환
 */
function normalizeSearchResult(item: Record<string, unknown>): Record<string, unknown> {
  const content = (item.content ?? item) as Record<string, unknown>;
  const space = (content.space ?? {}) as Record<string, unknown>;
  const version = (content.version ?? {}) as Record<string, unknown>;
  const versionBy = (version.by ?? {}) as Record<string, unknown>;
  const history = (content.history ?? {}) as Record<string, unknown>;
  const createdBy = (history.createdBy ?? {}) as Record<string, unknown>;

  return {
    id: content.id,
    title: content.title,
    status: content.status,
    space: {
      id: space.id,
      name: space.name,
      key: space.key,
    },
    spaceId: space.id,
    author: {
      accountId: createdBy.accountId ?? versionBy.accountId ?? '',
      displayName: createdBy.displayName ?? versionBy.displayName ?? '',
    },
    createdAt: history.createdDate ?? '',
    updatedAt: version.when ?? '',
    version: version.number ?? 1,
  };
}

export class ConfluenceClient {
  private v2: AxiosInstance;
  private v1: AxiosInstance;

  constructor(credentials: JiraCredentials) {
    const baseUrl = credentials.baseUrl.replace(/\/$/, '');
    const authConfig = {
      auth: { username: credentials.email, password: credentials.apiToken },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    };
    this.v2 = axios.create({ baseURL: `${baseUrl}/wiki/api/v2`, ...authConfig });
    this.v1 = axios.create({ baseURL: `${baseUrl}/wiki/rest/api`, ...authConfig });
  }

  async getCurrentUser(): Promise<unknown> {
    return withRetry429(() => this.v1.get('/user/current').then((r) => r.data));
  }

  async getSpaces(limit = 250): Promise<unknown> {
    const { data } = await withRetry429(() =>
      this.v2.get('/spaces', { params: { limit, sort: 'name' } })
    );
    return data;
  }

  async getMyPages(params: {
    limit?: number;
    sort?: string;
    status?: string;
    spaceKeys?: string[];
  }): Promise<unknown> {
    const limit = params.limit ?? 100;
    const conditions = [
      'type = page',
      'creator = currentUser()',
    ];
    if (params.spaceKeys && params.spaceKeys.length > 0) {
      const quoted = params.spaceKeys.map((k) => `"${escapeCql(k)}"`).join(',');
      conditions.push(`space IN (${quoted})`);
    }
    const cql = conditions.join(' AND ');
    const orderBy = 'lastModified DESC';

    const { data } = await withRetry429(() =>
      this.v1.get('/search', {
        params: {
          cql: `${cql} ORDER BY ${orderBy}`,
          limit,
          expand: 'content.space,content.version,content.history',
        },
      })
    );

    const r = data as Record<string, unknown>;
    const results = (r.results ?? []) as Record<string, unknown>[];
    return {
      results: Array.isArray(results) ? results.map(normalizeSearchResult) : [],
    };
  }

  /**
   * 페이지 본문 조회 (storage format)
   * GET /wiki/rest/api/content/:pageId?expand=body.storage,version,space,history
   */
  async getPageContent(pageId: string): Promise<Record<string, unknown>> {
    const { data } = await withRetry429(() =>
      this.v1.get(`/content/${pageId}`, {
        params: { expand: 'body.storage,version,space,history,history.createdBy,ancestors' },
      })
    );
    return data as Record<string, unknown>;
  }

  /**
   * 페이지 댓글 조회
   * GET /wiki/rest/api/content/:pageId/child/comment?expand=body.storage,version,history
   */
  async getPageComments(pageId: string): Promise<unknown[]> {
    const { data } = await withRetry429(() =>
      this.v1.get(`/content/${pageId}/child/comment`, {
        params: {
          expand: 'body.storage,version,history',
          limit: 100,
        },
      })
    );
    const r = data as Record<string, unknown>;
    const results = (r.results ?? []) as unknown[];
    return Array.isArray(results) ? results : [];
  }

  /**
   * 페이지 첨부파일 목록 조회
   */
  async getPageAttachments(pageId: string): Promise<unknown[]> {
    const { data } = await withRetry429(() =>
      this.v1.get(`/content/${pageId}/child/attachment`, {
        params: { limit: 100 },
      })
    );
    const r = data as Record<string, unknown>;
    const results = (r.results ?? []) as unknown[];
    return Array.isArray(results) ? results : [];
  }

  /**
   * 첨부파일 콘텐츠를 base64 Data URL로 반환 (인증 프록시)
   */
  async getAttachmentContent(downloadUrl: string): Promise<string> {
    const baseUrl = this.v1.defaults.baseURL?.replace(/\/wiki\/rest\/api$/, '') || '';
    const fullUrl = downloadUrl.startsWith('http') ? downloadUrl : `${baseUrl}${downloadUrl}`;
    const auth = this.v1.defaults.auth as { username: string; password: string };
    const { data, headers } = await withRetry429(() =>
      axios.get(fullUrl, {
        responseType: 'arraybuffer',
        auth,
      })
    );
    const mimeType = headers['content-type'] || 'application/octet-stream';
    const base64 = Buffer.from(data).toString('base64');
    return `data:${mimeType};base64,${base64}`;
  }

  async searchPages(params: {
    query: string;
    limit?: number;
    spaceKeys?: string[];
    searchField?: 'all' | 'title' | 'body' | 'title_body';
  }): Promise<unknown> {
    const limit = params.limit ?? 100;
    const field = params.searchField || 'all';
    const q = escapeCql(params.query);
    const conditions: string[] = ['type = page'];

    if (field === 'title') {
      conditions.push(`title ~ "${q}"`);
    } else if (field === 'body') {
      conditions.push(`text ~ "${q}"`);
      conditions.push(`title !~ "${q}"`);
    } else if (field === 'title_body') {
      conditions.push(`(title ~ "${q}" OR text ~ "${q}")`);
    } else {
      // 'all' — text는 title, body, 댓글 등 전체를 포함
      conditions.push(`text ~ "${q}"`);
    }
    if (params.spaceKeys && params.spaceKeys.length > 0) {
      const quoted = params.spaceKeys.map((k) => `"${escapeCql(k)}"`).join(',');
      conditions.push(`space IN (${quoted})`);
    }
    const cql = conditions.join(' AND ');

    const { data } = await withRetry429(() =>
      this.v1.get('/search', {
        params: {
          cql,
          limit,
          expand: 'content.space,content.version,content.history',
        },
      })
    );

    const r = data as Record<string, unknown>;
    const results = (r.results ?? []) as Record<string, unknown>[];
    return {
      results: Array.isArray(results) ? results.map(normalizeSearchResult) : [],
    };
  }
}
