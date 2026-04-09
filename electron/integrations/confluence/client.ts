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
    createdAt: history.createdDate ?? version.when ?? '',
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
      timeout: 30_000,
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
    const limit = params.limit ?? 50;
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
          expand: 'content.space,content.version',
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
        params: { expand: 'body.storage,body.atlas_doc_format,version,space,history,history.createdBy' },
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
   * 페이지 본문 수정
   * PUT /wiki/api/v2/pages/:pageId
   */
  async updatePageBody(pageId: string, title: string, bodyAdf: unknown, currentVersion: number): Promise<Record<string, unknown>> {
    const { data } = await withRetry429(() =>
      this.v2.put(`/pages/${pageId}`, {
        id: pageId,
        status: 'current',
        title,
        body: {
          representation: 'atlas_doc_format',
          value: typeof bodyAdf === 'string' ? bodyAdf : JSON.stringify(bodyAdf),
        },
        version: {
          number: currentVersion + 1,
          message: 'Edited via Lyra',
        },
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
          expand: 'body.storage,body.atlas_doc_format,version,history',
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
        params: { limit: 100, expand: 'extensions,version,metadata' },
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
          this.v1.get(url, { responseType: 'arraybuffer', baseURL: '', timeout: 60_000 })
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

  /** v1 API 기반 자식 페이지 조회 (children.page expand로 hasChildren도 함께 확인) */
  private async fetchChildPages(parentId: string, spaceKey?: string): Promise<Record<string, unknown>[]> {
    const allResults: Record<string, unknown>[] = [];
    let startAt = 0;
    const pageSize = 250;

    do {
      const params: Record<string, unknown> = {
        limit: pageSize,
        start: startAt,
        expand: 'children.page',
      };

      const { data } = await withRetry429(() =>
        this.v1.get(`/content/${parentId}/child/page`, { params })
      );

      const d = data as Record<string, unknown>;
      const results = (d.results ?? []) as Record<string, unknown>[];
      if (!Array.isArray(results) || results.length === 0) break;

      for (const page of results) {
        const p = page as Record<string, unknown>;
        // children.page.size > 0 이면 하위 페이지가 있음
        const childrenObj = (p.children ?? {}) as Record<string, unknown>;
        const childPage = (childrenObj.page ?? {}) as Record<string, unknown>;
        const childSize = Number(childPage.size ?? 0);

        allResults.push({
          id: String(p.id),
          title: String(p.title || ''),
          parentId,
          spaceKey,
          hasChildren: childSize > 0,
        });
      }

      const size = Number(d.size ?? results.length);
      if (size < pageSize) break;
      startAt += size;
    } while (true);

    return allResults;
  }

  /** v2 cursor pagination 헬퍼 */
  private extractV2Cursor(data: Record<string, unknown>): string | undefined {
    const links = data._links as Record<string, string> | undefined;
    const next = links?.next;
    if (!next) return undefined;
    const match = next.match(/[?&]cursor=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : undefined;
  }

  /**
   * v2 GET /{type}/{id}/direct-children — 폴더/페이지의 직접 자식 조회
   * Database, Embed, Folder, Page, Whiteboard 모든 타입 반환
   */
  private async fetchDirectChildren(
    parentType: 'pages' | 'folders',
    parentId: string,
  ): Promise<Record<string, unknown>[]> {
    const allResults: Record<string, unknown>[] = [];
    let cursor: string | undefined;

    do {
      const params: Record<string, unknown> = { limit: 250 };
      if (cursor) params.cursor = cursor;

      const { data } = await withRetry429(() =>
        this.v2.get(`/${parentType}/${parentId}/direct-children`, { params })
      );

      const d = data as Record<string, unknown>;
      const results = (d.results ?? []) as Record<string, unknown>[];
      if (!Array.isArray(results) || results.length === 0) break;

      for (const item of results) {
        const i = item as Record<string, unknown>;
        const itemType = String(i.type || '');
        const title = String(i.title || '').trim();
        const status = String(i.status || 'current');
        // page와 folder 타입만 포함 (database, embed, whiteboard 등 제외)
        if (itemType !== 'page' && itemType !== 'folder') continue;
        // 제목이 없는 항목 제외
        if (!title) continue;
        // current 상태가 아닌 항목 제외 (trashed, draft 등)
        if (status !== 'current') continue;
        allResults.push({
          id: String(i.id),
          title,
          parentId,
          type: itemType === 'folder' ? 'folder' : 'page',
          hasChildren: itemType === 'folder',
        });
      }

      cursor = this.extractV2Cursor(d);
    } while (cursor);

    return allResults;
  }

  /**
   * 스페이스의 루트(최상위) 콘텐츠 조회 (폴더 + 페이지)
   * v2 GET /pages/{homepageId}/direct-children로 한번에 가져옴
   */
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

    const homepageId = String(homepage.id);

    // v2 direct-children: 폴더 + 페이지를 한번에 정확한 depth로 반환
    const rootItems = await this.fetchDirectChildren('pages', homepageId);

    // 페이지의 hasChildren을 v1 API로 보정 + 2단계 preload
    const enriched = await Promise.all(
      rootItems.map(async (item) => {
        if (item.type === 'folder') return item;
        // 페이지: v1 API로 자식 조회 (hasChildren 정확 + preload)
        try {
          const children = await this.fetchChildPages(String(item.id), spaceKey);
          return {
            ...item,
            hasChildren: children.length > 0,
            preloadedChildren: children.length > 0
              ? children.map((c) => ({ ...c, type: 'page' }))
              : undefined,
          };
        } catch {
          return item;
        }
      })
    );

    return { results: enriched };
  }

  /** 특정 페이지의 직접 자식 페이지 조회 — v1 API */
  async getChildPages(pageId: string): Promise<unknown> {
    const results = await this.fetchChildPages(pageId);
    return { results: results.map((r) => ({ ...r, type: 'page' })) };
  }

  /** 특정 폴더의 자식(페이지 + 하위 폴더) 조회 — v2 GET /folders/{id}/direct-children */
  async getFolderChildren(folderId: string): Promise<unknown> {
    const items = await this.fetchDirectChildren('folders', folderId);

    // 페이지의 hasChildren을 v1 API로 보정
    const enriched = await Promise.all(
      items.map(async (item) => {
        if (item.type === 'folder') return item;
        try {
          const children = await this.fetchChildPages(String(item.id));
          return { ...item, hasChildren: children.length > 0 };
        } catch {
          return item;
        }
      })
    );

    return { results: enriched };
  }

  /** 페이지 제목만 경량 조회 (본문/ancestors 제외) */
  private async getPageTitle(pageId: string): Promise<string> {
    const { data } = await withRetry429(() =>
      this.v1.get(`/content/${pageId}`, { params: {} })
    );
    return String((data as Record<string, unknown>).title || '');
  }

  /** URL에서 Confluence 페이지 ID 추출 */
  private extractPageIdFromUrl(url: string): string | null {
    const m1 = url.match(/\/pages\/(\d+)/);
    if (m1) return m1[1];
    const m2 = url.match(/pageId=(\d+)/);
    if (m2) return m2[1];
    return null;
  }

  /**
   * Confluence tiny link (/wiki/x/{key}) → 페이지 ID + 제목 해석
   * HEAD 요청으로 리다이렉트 Location만 확인 (전체 HTML 다운로드 방지)
   */
  async resolveTinyLink(tinyKey: string): Promise<{ pageId: string; title: string } | null> {
    const siteBase = this.v1.defaults.baseURL?.replace(/\/wiki\/rest\/api$/, '') || '';
    const tinyUrl = `${siteBase}/wiki/x/${tinyKey}`;
    const auth = this.v1.defaults.auth as { username: string; password: string } | undefined;
    const authOpt = auth ? { auth } : {};

    let pageId: string | null = null;

    // 방법 1: HEAD + maxRedirects:0 → Location 헤더에서 page ID 추출 (가장 빠름)
    try {
      const response = await axios.head(tinyUrl, {
        ...authOpt,
        maxRedirects: 0,
        validateStatus: (s: number) => s >= 200 && s < 400,
      });
      pageId = this.extractPageIdFromUrl(String(response.headers?.location || ''));
    } catch (err) {
      // 3xx가 에러로 throw 되는 경우 — response에서 Location 추출
      const res = (err as any)?.response;
      if (res?.headers?.location) {
        pageId = this.extractPageIdFromUrl(String(res.headers.location));
      }
    }

    // 방법 2: GET + 리다이렉트 따라가기 → 최종 URL에서 추출
    if (!pageId) {
      try {
        const response = await axios.get(tinyUrl, {
          ...authOpt,
          maxRedirects: 10,
          validateStatus: () => true,
          headers: { Range: 'bytes=0-1' }, // 본문 최소화
        });
        const finalUrl = String(response.request?.res?.responseUrl || '');
        pageId = this.extractPageIdFromUrl(finalUrl);
      } catch { /* ignore */ }
    }

    if (!pageId) return null;

    // 경량 제목 조회 (본문/ancestors 없이)
    try {
      const title = await this.getPageTitle(pageId);
      return { pageId, title };
    } catch {
      return { pageId, title: '' };
    }
  }

  /**
   * 여러 tiny link를 일괄 해석 (병렬 실행)
   */
  async resolveTinyLinks(tinyKeys: string[]): Promise<Record<string, { pageId: string; title: string }>> {
    const results: Record<string, { pageId: string; title: string }> = {};
    const siteBase = this.v1.defaults.baseURL?.replace(/\/wiki\/rest\/api$/, '') || '';
    const auth = this.v1.defaults.auth as { username: string; password: string } | undefined;
    const authOpt = auth ? { auth } : {};

    // 1단계: 모든 tiny key → page ID 병렬 해석 (HEAD, 빠름)
    const pageIdMap = new Map<string, string>(); // tinyKey → pageId
    await Promise.all(tinyKeys.map(async (tk) => {
      const tinyUrl = `${siteBase}/wiki/x/${tk}`;
      let pageId: string | null = null;
      try {
        const response = await axios.head(tinyUrl, {
          ...authOpt,
          maxRedirects: 0,
          validateStatus: (s: number) => s >= 200 && s < 400,
        });
        pageId = this.extractPageIdFromUrl(String(response.headers?.location || ''));
      } catch (err) {
        const res = (err as any)?.response;
        if (res?.headers?.location) {
          pageId = this.extractPageIdFromUrl(String(res.headers.location));
        }
      }
      if (!pageId) {
        try {
          const response = await axios.get(tinyUrl, {
            ...authOpt,
            maxRedirects: 10,
            validateStatus: () => true,
            headers: { Range: 'bytes=0-1' },
          });
          pageId = this.extractPageIdFromUrl(String(response.request?.res?.responseUrl || ''));
        } catch { /* ignore */ }
      }
      if (pageId) pageIdMap.set(tk, pageId);
    }));

    // 2단계: 고유 page ID → 제목 병렬 조회 (경량)
    const uniquePageIds = [...new Set(pageIdMap.values())];
    const titleMap = new Map<string, string>();
    await Promise.all(uniquePageIds.map(async (pid) => {
      try {
        const title = await this.getPageTitle(pid);
        titleMap.set(pid, title);
      } catch {
        titleMap.set(pid, '');
      }
    }));

    // 3단계: 결과 매핑
    for (const [tk, pid] of pageIdMap.entries()) {
      results[tk] = { pageId: pid, title: titleMap.get(pid) || '' };
    }
    return results;
  }

  async searchPages(params: {
    query: string;
    limit?: number;
    spaceKeys?: string[];
    searchField?: 'all' | 'title' | 'body' | 'title_body' | 'contributor';
  }): Promise<unknown> {
    const limit = params.limit ?? 50;
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
          expand: 'content.space,content.version',
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
