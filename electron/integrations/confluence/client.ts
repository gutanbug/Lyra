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

  /** displayName으로 사용자 검색 → accountId 배열 반환 */
  private async searchUsersByName(name: string): Promise<string[]> {
    try {
      const { data } = await withRetry429(() =>
        this.v1.get('/search/user', {
          params: { cql: `user.fullname ~ "${escapeCql(name)}"`, limit: 10 },
        })
      );
      const r = data as Record<string, unknown>;
      const results = (r.results ?? []) as Record<string, unknown>[];
      return results
        .map((u) => {
          const user = (u.user ?? u) as Record<string, unknown>;
          return String(user.accountId || '');
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  async getSpaces(limit = 250): Promise<unknown> {
    const allResults: unknown[] = [];
    let cursor: string | undefined;

    do {
      const params: Record<string, unknown> = { limit, sort: 'name' };
      if (cursor) params.cursor = cursor;

      const { data } = await withRetry429(() =>
        this.v2.get('/spaces', { params })
      );

      const d = data as Record<string, unknown>;
      const results = d.results as unknown[];
      if (Array.isArray(results)) {
        allResults.push(...results);
      }

      // v2 API: _links.next contains the cursor for the next page
      const links = d._links as Record<string, string> | undefined;
      const next = links?.next;
      if (next) {
        const match = next.match(/[?&]cursor=([^&]+)/);
        cursor = match ? decodeURIComponent(match[1]) : undefined;
      } else {
        cursor = undefined;
      }
    } while (cursor);

    return { results: allResults };
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
          expand: 'content.space,content.version,content.history,content.history.createdBy',
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
    // 본문 + 메타데이터 (ancestors 제외 — 깊은 계층에서 500 유발)
    const { data } = await withRetry429(() =>
      this.v1.get(`/content/${pageId}`, {
        params: { expand: 'body.storage,version,space,history,history.createdBy' },
      })
    );
    const result = data as Record<string, unknown>;

    // ancestors는 v2 API로 별도 조회
    try {
      const { data: ancestorsData } = await withRetry429(() =>
        this.v2.get(`/pages/${pageId}/ancestors`)
      );
      const d = ancestorsData as Record<string, unknown>;
      const ancestors = (d.results ?? []) as Record<string, unknown>[];
      result.ancestors = ancestors.map((a) => ({
        id: String(a.id),
        title: a.title,
      }));
    } catch {
      result.ancestors = [];
    }

    return result;
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
        params: { limit: 100, expand: 'extensions,version' },
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
    const siteBase = this.v1.defaults.baseURL?.replace(/\/wiki\/rest\/api$/, '') || '';

    // 절대 URL 후보 구성 (v1 인스턴스의 인증 설정 재사용)
    const candidates: string[] = [];
    if (downloadUrl.startsWith('http')) {
      candidates.push(downloadUrl);
    } else {
      // /wiki/ prefix 포함/미포함 두 가지 모두 시도
      candidates.push(`${siteBase}${downloadUrl}`);
      if (!downloadUrl.startsWith('/wiki/')) {
        candidates.push(`${siteBase}/wiki${downloadUrl}`);
      }
    }

    for (const url of candidates) {
      try {
        const { data, headers } = await withRetry429(() =>
          this.v1.get(url, { responseType: 'arraybuffer', baseURL: '' })
        );
        const mimeType = headers['content-type'] || 'application/octet-stream';
        const base64 = Buffer.from(data).toString('base64');
        return `data:${mimeType};base64,${base64}`;
      } catch {
        // 다음 URL 후보로 시도
      }
    }
    throw new Error(`Failed to download attachment: ${downloadUrl}`);
  }

  /** v1 child/page 페이지네이션 헬퍼 */
  private async fetchChildPages(parentId: string, spaceKey?: string): Promise<Record<string, unknown>[]> {
    const allResults: Record<string, unknown>[] = [];
    let start = 0;

    do {
      const { data } = await withRetry429(() =>
        this.v1.get(`/content/${parentId}/child/page`, {
          params: { limit: 100, start, expand: 'children.page' },
        })
      );

      const d = data as Record<string, unknown>;
      const results = (d.results ?? []) as Record<string, unknown>[];
      if (!Array.isArray(results) || results.length === 0) break;

      for (const page of results) {
        const children = (page.children as Record<string, unknown>)?.page as Record<string, unknown> | undefined;
        const childSize = (children?.size as number) ?? 0;
        allResults.push({
          id: String(page.id),
          title: page.title,
          parentId,
          spaceKey,
          hasChildren: childSize > 0,
        });
      }

      start += results.length;
      const size = d.size as number | undefined;
      if (size != null && size < 100) break;
    } while (true);

    return allResults;
  }

  /** 스페이스의 루트(최상위) 페이지 조회 — v1 API */
  async getSpacePages(spaceKey: string): Promise<unknown> {
    // 스페이스 홈페이지 ID 조회
    const { data: spaceData } = await withRetry429(() =>
      this.v1.get(`/space/${spaceKey}`, {
        params: { expand: 'homepage' },
      })
    );
    const space = spaceData as Record<string, unknown>;
    const homepage = space.homepage as Record<string, unknown> | undefined;

    if (!homepage?.id) {
      return { results: [] };
    }

    // 홈페이지의 자식 = 스페이스 루트 페이지들
    const results = await this.fetchChildPages(String(homepage.id), spaceKey);
    return { results };
  }

  /** 특정 페이지의 직접 자식 페이지 조회 — v1 API */
  async getChildPages(pageId: string): Promise<unknown> {
    const results = await this.fetchChildPages(pageId);
    return { results };
  }

  async searchPages(params: {
    query: string;
    limit?: number;
    spaceKeys?: string[];
    searchField?: 'all' | 'title' | 'body' | 'title_body' | 'contributor';
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
    } else if (field === 'contributor') {
      // 이름으로 사용자 검색 → accountId로 contributor CQL 실행
      const userIds = await this.searchUsersByName(params.query);
      if (userIds.length === 0) {
        return { results: [] };
      }
      const contributorCql = userIds.map((id) => `contributor = "${escapeCql(id)}"`).join(' OR ');
      conditions.push(`(${contributorCql})`);
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
          expand: 'content.space,content.version,content.history,content.history.createdBy',
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
