import axios, { AxiosInstance, AxiosError } from 'axios';
import type { JiraCredentials } from './types';

const DEFAULT_FIELDS = ['*navigable', 'parent'];

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.data;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

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

/** ADF 객체에서 텍스트 추출 */
function extractTextFromAdf(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as Record<string, unknown>;
  if (n.type === 'text' && typeof n.text === 'string') return n.text;
  const content = n.content as unknown[] | undefined;
  if (Array.isArray(content)) return content.map(extractTextFromAdf).join('');
  return '';
}

function toText(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') return extractTextFromAdf(v);
  return '';
}

/** Jira API nested fields → flat 형식으로 변환 */
function normalizeIssue(raw: Record<string, unknown>): Record<string, unknown> {
  if (typeof raw.summary === 'string' && !raw.fields) return raw;

  const fields = raw.fields as Record<string, unknown> | undefined;
  if (!fields || typeof fields !== 'object') return raw;

  const result: Record<string, unknown> = {
    id: raw.id,
    key: raw.key,
    self: raw.self,
  };

  result.summary = toText(fields.summary);
  result.description = fields.description;
  result.created = fields.created;
  result.updated = fields.updated;
  result.duedate = fields.duedate;

  // parent (Epic 연결 정보)
  const parent = fields.parent as Record<string, unknown> | undefined;
  if (parent) {
    const parentFields = parent.fields as Record<string, unknown> | undefined;
    result.parent = {
      id: parent.id,
      key: parent.key,
      summary: parentFields ? toText(parentFields.summary) : '',
      issue_type: parentFields?.issuetype
        ? { name: (parentFields.issuetype as Record<string, unknown>).name }
        : undefined,
    };
  }

  const status = fields.status as Record<string, unknown> | undefined;
  if (status) {
    const cat = status.statusCategory as Record<string, unknown> | undefined;
    result.status = {
      name: status.name,
      statusCategory: {
        name: cat?.name ?? '',
        key: cat?.key ?? '',
        colorName: cat?.colorName ?? '',
      },
      // 하위 호환
      category: cat?.name ?? '',
      color: cat?.colorName ?? '',
    };
  }

  const assignee = fields.assignee as Record<string, unknown> | undefined;
  if (assignee) {
    result.assignee = {
      display_name: assignee.displayName ?? assignee.display_name ?? assignee.name ?? '',
      name: assignee.name ?? assignee.displayName ?? '',
      email: assignee.emailAddress ?? assignee.email ?? '',
    };
  }

  const issuetype = fields.issuetype as Record<string, unknown> | undefined;
  if (issuetype) {
    result.issue_type = { name: issuetype.name };
  }

  const priority = fields.priority as Record<string, unknown> | undefined;
  if (priority) {
    result.priority = { name: priority.name };
  }

  const reporter = fields.reporter as Record<string, unknown> | undefined;
  if (reporter) {
    result.reporter = {
      display_name: reporter.displayName ?? reporter.display_name ?? reporter.name ?? '',
      name: reporter.name ?? reporter.displayName ?? '',
      email: reporter.emailAddress ?? reporter.email ?? '',
    };
  }

  // issuelinks (Confluence 연결 등)
  if (fields.issuelinks) {
    result.issuelinks = fields.issuelinks;
  }

  // subtasks 수 (하위 항목 토글 표시용)
  const subtasks = fields.subtasks as unknown[] | undefined;
  result.subtaskCount = Array.isArray(subtasks) ? subtasks.length : 0;

  // 첨부파일
  if (Array.isArray(fields.attachment)) {
    result.attachment = fields.attachment;
  }

  // Epic Link 커스텀 필드 폴백 (classic Jira 프로젝트용)
  if (!result.parent) {
    for (const [key, value] of Object.entries(fields)) {
      if (!key.startsWith('customfield_')) continue;
      if (typeof value === 'string' && /^[A-Z][A-Z0-9]+-\d+$/i.test(value)) {
        result.parent = { key: value, summary: '' };
        break;
      }
    }
  }

  return result;
}

export class JiraClient {
  private client: AxiosInstance;
  private wikiClient: AxiosInstance;
  private searchCache = new Map<string, CacheEntry<unknown>>();
  private metadataCache = new Map<string, CacheEntry<unknown>>();
  private wikiV1Client: AxiosInstance;
  private credentials: JiraCredentials;

  constructor(credentials: JiraCredentials) {
    this.credentials = credentials;
    const baseUrl = credentials.baseUrl.replace(/\/$/, '');
    const authConfig = {
      auth: { username: credentials.email, password: credentials.apiToken },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    };
    this.client = axios.create({ baseURL: `${baseUrl}/rest/api/3`, ...authConfig });
    this.wikiClient = axios.create({ baseURL: `${baseUrl}/wiki/api/v2`, ...authConfig });
    this.wikiV1Client = axios.create({ baseURL: `${baseUrl}/wiki/rest/api`, ...authConfig });
  }

  async getCurrentUser(): Promise<unknown> {
    return withRetry429(() => this.client.get('/myself').then((r) => r.data));
  }

  /**
   * 개별 이슈를 ID 또는 Key로 조회
   * GET /rest/api/3/issue/:issueIdOrKey
   */
  async getIssue(issueIdOrKey: string): Promise<Record<string, unknown>> {
    const { data } = await withRetry429(() =>
      this.client.get(`/issue/${issueIdOrKey}`)
    );
    return normalizeIssue(data as Record<string, unknown>);
  }

  /**
   * 이슈 댓글 조회
   * GET /rest/api/3/issue/:issueIdOrKey/comment
   */
  async getComments(issueIdOrKey: string): Promise<unknown[]> {
    const { data } = await withRetry429(() =>
      this.client.get(`/issue/${issueIdOrKey}/comment`, {
        params: { orderBy: '+created' },
      })
    );
    const r = data as Record<string, unknown>;
    const comments = (r.comments ?? r.values ?? []) as unknown[];
    return Array.isArray(comments) ? comments : [];
  }

  /**
   * 이슈 원격 링크 조회 (Confluence 등)
   * GET /rest/api/3/issue/:issueIdOrKey/remotelink
   */
  async getRemoteLinks(issueIdOrKey: string): Promise<unknown[]> {
    const { data } = await withRetry429(() =>
      this.client.get(`/issue/${issueIdOrKey}/remotelink`)
    );
    return Array.isArray(data) ? data : [];
  }

  /**
   * Confluence 페이지 본문 조회 (같은 Atlassian 인스턴스)
   * GET /wiki/rest/api/content/:pageId
   * ConfluenceClient.getPageContent와 동일한 expand 사용
   */
  async getConfluencePageContent(pageId: string): Promise<Record<string, unknown>> {
    const { data } = await withRetry429(() =>
      this.wikiV1Client.get(`/content/${pageId}`, {
        params: { expand: 'body.storage,body.atlas_doc_format,version,space' },
      })
    );
    return data as Record<string, unknown>;
  }

  /**
   * JQL로 이슈 검색
   * GET /rest/api/3/search/jql (Enhanced search)
   * ⚠️ fields 기본값 = "id" → 반드시 명시적으로 지정
   */
  async searchIssues(
    jql: string,
    maxResults = 50,
    _startAt = 0,
    fields: string[] = DEFAULT_FIELDS,
    skipCache = false,
    nextPageToken?: string
  ): Promise<unknown> {
    const cacheKey = `search:${jql}:${maxResults}:${nextPageToken || _startAt}`;
    if (!skipCache) {
      const cached = getCached(this.searchCache, cacheKey);
      if (cached) return cached;
    }

    const jqlQuery = jql || 'ORDER BY created DESC';
    const fieldsStr = fields.join(',');

    const params: Record<string, unknown> = { jql: jqlQuery, maxResults, fields: fieldsStr };
    if (nextPageToken) {
      params.nextPageToken = nextPageToken;
    }

    const result = await withRetry429(() =>
      this.client
        .get('/search/jql', { params })
        .then((r) => r.data)
    );

    const normalized = this.normalizeSearchResult(result);
    setCache(this.searchCache, cacheKey, normalized);
    return normalized;
  }

  private normalizeSearchResult(result: unknown): Record<string, unknown> {
    const r = result as Record<string, unknown>;
    const issues = ((r.issues ?? r.values) || []) as Record<string, unknown>[];

    return {
      ...r,
      issues: Array.isArray(issues)
        ? issues.map((i) => (i && typeof i === 'object' ? normalizeIssue(i) : i))
        : [],
    };
  }

  /**
   * 이슈의 가능한 전환(워크플로) 목록 조회
   * GET /rest/api/3/issue/:issueIdOrKey/transitions
   */
  async getTransitions(issueIdOrKey: string): Promise<unknown> {
    const { data } = await withRetry429(() =>
      this.client.get(`/issue/${issueIdOrKey}/transitions`)
    );
    return data;
  }

  /**
   * 이슈 상태 전환 실행
   * POST /rest/api/3/issue/:issueIdOrKey/transitions
   */
  async transitionIssue(issueIdOrKey: string, transitionId: string): Promise<void> {
    await withRetry429(() =>
      this.client.post(`/issue/${issueIdOrKey}/transitions`, {
        transition: { id: transitionId },
      })
    );
    // 전환 후 관련 검색 캐시 무효화
    this.searchCache.clear();
  }

  async getPriorities(): Promise<unknown> {
    const cached = getCached(this.metadataCache, 'priorities');
    if (cached) return cached;
    const data = await withRetry429(() => this.client.get('/priority').then((r) => r.data));
    setCache(this.metadataCache, 'priorities', data);
    return data;
  }

  async getStatuses(): Promise<unknown> {
    const cached = getCached(this.metadataCache, 'statuses');
    if (cached) return cached;
    const data = await withRetry429(() => this.client.get('/status').then((r) => r.data));
    setCache(this.metadataCache, 'statuses', data);
    return data;
  }

  async getIssueTypes(): Promise<unknown> {
    const cached = getCached(this.metadataCache, 'issuetypes');
    if (cached) return cached;
    const data = await withRetry429(() => this.client.get('/issuetype').then((r) => r.data));
    setCache(this.metadataCache, 'issuetypes', data);
    return data;
  }

  async getProjects(): Promise<unknown> {
    const cached = getCached(this.metadataCache, 'projects');
    if (cached) return cached;
    const data = await withRetry429(() => this.client.get('/project').then((r) => r.data));
    setCache(this.metadataCache, 'projects', data);
    return data;
  }

  /**
   * Confluence에서 Jira 이슈와 연결된 페이지 검색
   * GET /wiki/rest/api/search?cql=...
   */
  async searchConfluenceByIssue(issueKey: string): Promise<unknown[]> {
    try {
      const cql = `type = page AND text ~ "${issueKey}"`;
      const { data } = await withRetry429(() =>
        this.wikiV1Client.get('/search', {
          params: { cql, limit: 20 },
        })
      );
      const r = data as Record<string, unknown>;
      const results = (r.results ?? []) as unknown[];
      return Array.isArray(results) ? results : [];
    } catch {
      return [];
    }
  }

  /**
   * 사용자 검색 (범용)
   * GET /rest/api/3/user/search
   */
  async searchUsers(query: string): Promise<unknown[]> {
    const { data } = await withRetry429(() =>
      this.client.get('/user/search', {
        params: {
          query,
          maxResults: 10,
        },
      })
    );
    return (data as Record<string, unknown>[]).map((u) => ({
      accountId: u.accountId,
      displayName: u.displayName,
      avatarUrl: (u.avatarUrls as Record<string, string>)?.['24x24'] || '',
      emailAddress: u.emailAddress || '',
    }));
  }

  /**
   * 이슈에 할당 가능한 사용자 검색
   * GET /rest/api/3/user/assignable/search
   */
  async searchAssignableUsers(issueKey: string, query: string): Promise<unknown[]> {
    const { data } = await withRetry429(() =>
      this.client.get('/user/assignable/search', {
        params: {
          issueKey,
          query,
          maxResults: 10,
        },
      })
    );
    return (data as Record<string, unknown>[]).map((u) => ({
      accountId: u.accountId,
      displayName: u.displayName,
      avatarUrl: (u.avatarUrls as Record<string, string>)?.['24x24'] || '',
      emailAddress: u.emailAddress || '',
    }));
  }

  /**
   * 이슈 설명(description) 수정
   * PUT /rest/api/3/issue/:issueIdOrKey
   */
  async updateIssueDescription(issueIdOrKey: string, descriptionAdf: unknown): Promise<void> {
    await withRetry429(() =>
      this.client.put(`/issue/${issueIdOrKey}`, {
        fields: { description: descriptionAdf },
      })
    );
    this.searchCache.clear();
  }

  /**
   * 이슈 우선순위 변경
   * PUT /rest/api/3/issue/:issueIdOrKey
   */
  async updateIssuePriority(issueIdOrKey: string, priorityName: string): Promise<void> {
    await withRetry429(() =>
      this.client.put(`/issue/${issueIdOrKey}`, {
        fields: { priority: { name: priorityName } },
      })
    );
    this.searchCache.clear();
  }

  /**
   * 이슈 담당자 지정
   * PUT /rest/api/3/issue/:issueIdOrKey/assignee
   */
  async assignIssue(issueIdOrKey: string, accountId: string | null): Promise<void> {
    await withRetry429(() =>
      this.client.put(`/issue/${issueIdOrKey}/assignee`, {
        accountId: accountId,
      })
    );
  }

  /**
   * 댓글 추가
   * POST /rest/api/3/issue/:issueIdOrKey/comment
   */
  async addComment(issueIdOrKey: string, bodyAdf: unknown): Promise<unknown> {
    const { data } = await withRetry429(() =>
      this.client.post(`/issue/${issueIdOrKey}/comment`, { body: bodyAdf })
    );
    return data;
  }

  /**
   * 댓글 수정
   * PUT /rest/api/3/issue/:issueIdOrKey/comment/:commentId
   */
  async updateComment(issueIdOrKey: string, commentId: string, bodyAdf: unknown): Promise<unknown> {
    const { data } = await withRetry429(() =>
      this.client.put(`/issue/${issueIdOrKey}/comment/${commentId}`, { body: bodyAdf })
    );
    return data;
  }

  /**
   * 댓글 삭제
   * DELETE /rest/api/3/issue/:issueIdOrKey/comment/:commentId
   */
  async deleteComment(issueIdOrKey: string, commentId: string): Promise<void> {
    await withRetry429(() =>
      this.client.delete(`/issue/${issueIdOrKey}/comment/${commentId}`)
    );
  }

  /**
   * 첨부파일 콘텐츠를 base64 Data URL로 반환 (인증 프록시)
   */
  async getAttachmentContent(contentUrl: string): Promise<string> {
    const { data, headers } = await withRetry429(() =>
      axios.get(contentUrl, {
        responseType: 'arraybuffer',
        auth: {
          username: this.credentials.email,
          password: this.credentials.apiToken,
        },
      })
    );
    const mimeType = headers['content-type'] || 'application/octet-stream';
    const base64 = Buffer.from(data).toString('base64');
    return `data:${mimeType};base64,${base64}`;
  }
}
