/**
 * Jira 데이터 정규화 유틸리티
 * JiraIssueDetail / JiraDashboard에서 추출한 공통 정규화 함수
 */
import { str, obj } from 'lib/utils/typeHelpers';
import { adfToText } from 'lib/utils/adfToText';
import { adfToHtml } from 'lib/utils/adfToHtml';
import { isEpicType, escapeJql, KEY_PATTERN, NUMBER_ONLY_PATTERN } from 'lib/utils/jiraUtils';
import type {
  NormalizedDetail,
  NormalizedComment,
  CommentThread,
  LinkedIssue,
  ChildIssue,
  NormalizedIssue,
  EpicGroup,
} from 'types/jira';

// ── JiraIssueDetail 정규화 ──

/** ADF 문서 첫 번째 paragraph에 멘션을 삽입 (답글용) */
export function prependMentionToAdf(adf: unknown, mentionId: string, mentionName: string): unknown {
  const doc = adf as Record<string, unknown>;
  const content = (doc.content ?? []) as Record<string, unknown>[];
  if (content.length === 0) return adf;
  const first = content[0];
  if (first.type !== 'paragraph') return adf;
  const mentionNode = { type: 'mention', attrs: { id: mentionId, text: `@${mentionName}`, accessLevel: '' } };
  const space = { type: 'text', text: ' ' };
  const existingContent = (first.content ?? []) as unknown[];
  return {
    ...doc,
    content: [
      { ...first, content: [mentionNode, space, ...existingContent] },
      ...content.slice(1),
    ],
  };
}

export function normalizeDetail(raw: Record<string, unknown>): NormalizedDetail {
  const key = str(raw.key) || str(raw.issueKey) || '';
  const f = (raw.fields && typeof raw.fields === 'object' ? raw.fields : raw) as Record<string, unknown>;

  let summary = '';
  const rawSummary = f.summary;
  if (typeof rawSummary === 'string') {
    summary = rawSummary.trim();
  } else if (rawSummary && typeof rawSummary === 'object') {
    summary = adfToText(rawSummary).trim();
  }

  let descriptionHtml = '';
  const rawDesc = f.description;
  const descriptionAdf: unknown = (rawDesc && typeof rawDesc === 'object')
    ? rawDesc
    : (typeof rawDesc === 'string'
      ? { version: 1, type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: rawDesc }] }] }
      : null);
  if (typeof rawDesc === 'string') {
    descriptionHtml = `<p>${rawDesc.trim().replace(/\n/g, '<br />')}</p>`;
  } else if (rawDesc && typeof rawDesc === 'object') {
    descriptionHtml = adfToHtml(rawDesc);
  }

  const statusObj = obj(f.status);
  const statusName = str(statusObj?.name) || str(f.statusName) || '';
  const statusCategoryObj = obj(statusObj?.statusCategory);
  const statusCategory =
    str(statusObj?.category) ||
    str(statusCategoryObj?.name) ||
    str(statusCategoryObj?.key) ||
    str(statusCategoryObj?.colorName) ||
    str(f.statusCategory) ||
    '';

  const assigneeObj = obj(f.assignee);
  const assigneeName =
    str(assigneeObj?.displayName) || str(assigneeObj?.display_name) || str(assigneeObj?.name) || '';

  const reporterObj = obj(f.reporter);
  const reporterName =
    str(reporterObj?.displayName) || str(reporterObj?.display_name) || str(reporterObj?.name) || '';

  const issueTypeObj = obj(f.issuetype) || obj(f.issue_type) || obj(f.issueType);
  const issueTypeName = str(issueTypeObj?.name) || '';

  const priorityObj = obj(f.priority);
  const priorityName = str(priorityObj?.name) || '';

  const created = str(f.created) || '';
  const updated = str(f.updated) || '';
  const duedate = str(f.duedate) || '';

  const parentObj = obj(f.parent);
  const parentFields = obj(parentObj?.fields);
  const parentKey = str(parentObj?.key) || '';
  const parentSummary = str(parentFields?.summary) || str(parentObj?.summary) || '';
  const parentIssueTypeObj = obj(parentFields?.issuetype) || obj(parentFields?.issueType) || obj(parentFields?.issue_type) || obj(parentObj?.issue_type) || obj(parentObj?.issueType);
  const parentIssueTypeName = str(parentIssueTypeObj?.name) || str(parentObj?.issueTypeName) || '';

  return {
    key, summary, descriptionHtml, descriptionAdf, statusName, statusCategory,
    assigneeName, reporterName, issueTypeName, priorityName,
    created, updated, duedate, parentKey, parentSummary, parentIssueTypeName,
  };
}

/**
 * Jira 댓글의 부모 ID를 properties 배열에서 추출.
 *
 * Jira REST API에는 native parentId 필드가 없지만, 모던 UI의 "Reply" 기능으로
 * 작성된 댓글은 properties[]에 부모 댓글 ID를 포함한다. 키 이름은 환경/버전마다
 * 다를 수 있어 패턴 매칭으로 처리:
 *   - key가 'parent' / 'reply' / 'thread' 단어를 포함
 *   - value는 string(comment id) 또는 { id, commentId, parentId, parent }
 *
 * 키 이름이 모두 어긋나면 빈 문자열 반환 → 호출자가 flat list로 폴백.
 */
function extractParentCommentId(comment: Record<string, unknown>): string {
  // 1) 일부 응답에서는 top-level field로 노출될 수 있음
  const direct = comment.parent ?? (comment as Record<string, unknown>).parentId;
  if (typeof direct === 'string' && direct) return direct;
  if (direct && typeof direct === 'object') {
    const o = direct as Record<string, unknown>;
    const id = o.id ?? o.commentId ?? o.parentId ?? o.parent;
    if (typeof id === 'string' && id) return id;
  }

  // 2) properties[]에서 패턴 매칭
  const properties = comment.properties as unknown[] | undefined;
  if (!Array.isArray(properties)) return '';
  for (const p of properties) {
    if (!p || typeof p !== 'object') continue;
    const prop = p as Record<string, unknown>;
    const key = String(prop.key ?? '').toLowerCase();
    // 댓글 threading 관련 가능성 있는 키만 검사
    if (!/parent|reply|thread/.test(key)) continue;
    const value = prop.value;
    if (typeof value === 'string' && value) return value;
    if (value && typeof value === 'object') {
      const v = value as Record<string, unknown>;
      // 흔한 후보 필드
      const candidate =
        v.id ?? v.commentId ?? v.parentId ?? v.parent ?? v.parentCommentId ?? v.replyTo;
      if (typeof candidate === 'string' && candidate) return candidate;
      if (typeof candidate === 'number') return String(candidate);
    }
  }
  return '';
}

/** ADF 본문의 첫 번째 paragraph 첫 번째 child가 mention인 경우 추출 */
function extractLeadingMention(body: unknown): { id: string; text: string } | null {
  if (!body || typeof body !== 'object') return null;
  const doc = body as Record<string, unknown>;
  const content = doc.content as unknown[] | undefined;
  if (!Array.isArray(content) || content.length === 0) return null;

  const firstBlock = content[0] as Record<string, unknown>;
  if (firstBlock?.type !== 'paragraph') return null;

  const blockContent = firstBlock.content as unknown[] | undefined;
  if (!Array.isArray(blockContent) || blockContent.length === 0) return null;

  const firstInline = blockContent[0] as Record<string, unknown>;
  if (firstInline?.type !== 'mention') return null;

  const attrs = firstInline.attrs as Record<string, unknown> | undefined;
  return {
    id: str(attrs?.id),
    text: str(attrs?.text).replace(/^@/, ''),
  };
}

export function normalizeComments(raw: unknown[]): NormalizedComment[] {
  // 진단 로그 — Jira 응답이 threading 메타를 어디에 담는지 식별하기 위함.
  // 각 comment의 top-level 키 + properties 배열을 한 번에 dump해 부모 ID 위치를 찾는다.
  // 부모 ID 매칭이 정상화되면 제거.
  if (Array.isArray(raw) && raw.length > 0 && typeof window !== 'undefined') {
    try {
      const dump = raw.slice(0, 5).map((c) => {
        if (!c || typeof c !== 'object') return c;
        const cc = c as Record<string, unknown>;
        return {
          id: cc.id,
          topLevelKeys: Object.keys(cc),
          parent: cc.parent,
          parentId: (cc as Record<string, unknown>).parentId,
          properties: cc.properties,
        };
      });
      // eslint-disable-next-line no-console
      console.debug('[Jira comment threading diagnostic] sample:', dump);
    } catch { /* ignore */ }
  }

  return raw
    .filter((c) => c && typeof c === 'object')
    .map((c) => {
      const comment = c as Record<string, unknown>;
      const authorObj = obj(comment.author);
      const authorId = str(authorObj?.accountId) || str(authorObj?.account_id) || str(authorObj?.name) || '';
      const mention = extractLeadingMention(comment.body);

      return {
        id: str(comment.id),
        author: str(authorObj?.displayName) || str(authorObj?.display_name) || str(authorObj?.name) || '알 수 없음',
        authorId,
        bodyHtml: typeof comment.body === 'string'
          ? `<p>${comment.body.replace(/\n/g, '<br />')}</p>`
          : adfToHtml(comment.body),
        rawBody: comment.body,
        created: str(comment.created),
        updated: str(comment.updated),
        replyToId: mention?.id || '',
        replyToName: mention?.text || '',
        parentCommentId: extractParentCommentId(comment),
      };
    });
}

/**
 * 댓글 목록을 화면 표시용 thread 구조로 변환.
 *
 * 정렬·표시 규칙 (Jira 웹과 일치):
 *  - 입력은 Jira API의 작성일 오름차순(`orderBy=+created`)
 *  - 출력 최상위는 작성일 **오름차순**(오래된 것 위) — 실제 Jira 모던 UI와 동일
 *  - 답글(replies)은 부모 아래에 작성일 오름차순으로 nest
 *
 * Threading 판정 — Jira properties에서 추출한 `parentCommentId`만 신뢰.
 * 단순 mention 기반 휴리스틱은 누군가를 언급한 모든 댓글을 답글로 잘못 묶어
 * 실제 Jira UI와 어긋나므로 폐기. parentCommentId가 비어 있으면 최상위로 처리.
 *
 * 안전장치 — 부모 ID가 미존재하거나(삭제됨/권한 없음 등) 답글 자신을 가리키는
 * 자기참조 등은 최상위로 강등.
 */
export function buildCommentThreads(comments: NormalizedComment[]): CommentThread[] {
  // id → 최상위 thread index 매핑
  const idToIdx = new Map<string, number>();
  const threads: CommentThread[] = [];

  // 1차: 부모가 없거나 부모를 못 찾는 경우 = 최상위
  for (const c of comments) {
    if (c.parentCommentId && c.parentCommentId !== c.id && idToIdx.has(c.parentCommentId)) continue;
    const idx = threads.length;
    threads.push({ comment: c, replies: [] });
    idToIdx.set(c.id, idx);
  }

  // 2차: parentCommentId로 답글 attach
  for (const c of comments) {
    if (!c.parentCommentId || c.parentCommentId === c.id) continue;
    const parentIdx = idToIdx.get(c.parentCommentId);
    if (parentIdx === undefined) continue; // 1차에서 이미 최상위로 들어간 것은 skip
    threads[parentIdx].replies.push(c);
  }

  return threads;
}

/** issuelinks에서 연결된 이슈 추출 */
export function extractLinkedIssues(issuelinks: unknown[]): LinkedIssue[] {
  const linked: LinkedIssue[] = [];
  for (const link of issuelinks) {
    if (!link || typeof link !== 'object') continue;
    const l = link as Record<string, unknown>;
    const typeObj = obj(l.type);

    const outward = obj(l.outwardIssue);
    const inward = obj(l.inwardIssue);
    const target = outward || inward;
    if (!target) continue;

    const linkType = outward
      ? str(typeObj?.outward)
      : str(typeObj?.inward);

    const fields = obj(target.fields) || target;
    const statusObj = obj(fields.status);
    const statusCatObj = obj(statusObj?.statusCategory);
    const issueTypeObj = obj(fields.issuetype);
    const priorityObj = obj(fields.priority);

    linked.push({
      key: str(target.key),
      summary: typeof fields.summary === 'string' ? fields.summary : adfToText(fields.summary),
      statusName: str(statusObj?.name),
      statusCategory: str(statusCatObj?.name) || str(statusCatObj?.key) || str(statusCatObj?.colorName),
      issueTypeName: str(issueTypeObj?.name),
      priorityName: str(priorityObj?.name),
      linkType,
    });
  }
  return linked;
}

export function parseChildIssues(result: unknown): ChildIssue[] {
  if (!result || typeof result !== 'object') return [];
  const r = result as Record<string, unknown>;
  const list = (r.issues ?? r.values ?? []) as Record<string, unknown>[];
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const key = str(item.key);
      const f = (item.fields && typeof item.fields === 'object' ? item.fields : item) as Record<string, unknown>;
      const rawSummary = f.summary;
      const summary = typeof rawSummary === 'string' ? rawSummary : adfToText(rawSummary);
      const statusObj = obj(f.status);
      const statusCatObj = obj(statusObj?.statusCategory);
      const assigneeObj = obj(f.assignee);
      const issueTypeObj = obj(f.issuetype) || obj(f.issue_type) || obj(f.issueType);
      const priorityObj = obj(f.priority);
      const parentObj = obj(f.parent) || obj(item.parent);
      return {
        key,
        summary: summary.trim(),
        statusName: str(statusObj?.name),
        statusCategory: str(statusObj?.category) || str(statusCatObj?.name) || str(statusCatObj?.key) || str(statusCatObj?.colorName),
        assigneeName: str(assigneeObj?.displayName) || str(assigneeObj?.display_name) || str(assigneeObj?.name),
        assigneeAvatarUrl: (() => { const av = obj(assigneeObj?.avatarUrls); return str(av?.['48x48']) || str(av?.['32x32']) || str(av?.['24x24']) || str(assigneeObj?.avatarUrl) || ''; })(),
        issueTypeName: str(issueTypeObj?.name),
        priorityName: str(priorityObj?.name),
        parentKey: str(parentObj?.key) || undefined,
      };
    })
    .filter((i) => i.key);
}

// ── JiraDashboard 정규화 ──

/** parseIssues 옵션 — 프로젝트별 시작일 필드 매핑 등 정규화 시점에 필요한 컨텍스트. */
export interface ParseIssuesOptions {
  /** 프로젝트 키 → 시작일로 사용할 customfield ID 매핑. 예: { PROJ: 'customfield_10015' } */
  startDateByProject?: Record<string, string>;
}

/**
 * Ambient parse context — parseIssues 호출자가 options를 명시적으로 전달하지 않을 때 사용되는 fallback.
 * useJiraSearch가 `setJiraParseContext`를 통해 startDateByProject 매핑을 셋업하면,
 * 하위 훅(useJiraMyIssues 등)이 parseIssues를 옵션 없이 호출해도 자동으로 매핑이 적용된다.
 *
 * 렌더러는 단일 스레드이므로 race 없이 동작. 옵션 명시 전달 > ambient fallback.
 */
let ambientParseContext: ParseIssuesOptions = {};
export function setJiraParseContext(ctx: ParseIssuesOptions): void {
  ambientParseContext = ctx;
}
export function getJiraParseContext(): ParseIssuesOptions {
  return ambientParseContext;
}

/** customfield 값에서 startDate 추출:
 *  - 문자열: 그대로 반환 (YYYY-MM-DD 또는 ISO)
 *  - 배열(스프린트류): 항목별 startDate / start 키 우선순위로 첫 유효값
 *  - 객체: startDate / start 키
 *  - 그 외: '' */
function extractStartDateFromField(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item && typeof item === 'object') {
        const rec = item as Record<string, unknown>;
        const sd = rec.startDate ?? rec.start;
        if (typeof sd === 'string' && sd) return sd;
      }
    }
    return '';
  }
  if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    const sd = rec.startDate ?? rec.start;
    if (typeof sd === 'string') return sd;
  }
  return '';
}

function deriveProjectKey(issueKey: string): string {
  const dash = issueKey.indexOf('-');
  return dash > 0 ? issueKey.slice(0, dash) : '';
}

function normalizeIssue(raw: Record<string, unknown>, options?: ParseIssuesOptions): NormalizedIssue {
  const key = str(raw.key) || str(raw.issueKey) || '';
  const id = str(raw.id) || '';

  const f = (raw.fields && typeof raw.fields === 'object' ? raw.fields : raw) as Record<string, unknown>;

  let summary = '';
  const rawSummary = f.summary;
  if (typeof rawSummary === 'string') {
    summary = rawSummary;
  } else if (rawSummary && typeof rawSummary === 'object') {
    summary = adfToText(rawSummary).trim();
  }

  const statusObj = obj(f.status);
  const statusName = str(statusObj?.name) || '';
  const statusCategoryObj = obj(statusObj?.statusCategory);
  const statusCategory =
    str(statusObj?.category) || str(statusCategoryObj?.name) || str(statusCategoryObj?.key) || str(statusCategoryObj?.colorName) || '';

  const assigneeObj = obj(f.assignee);
  const assigneeName =
    str(assigneeObj?.displayName) || str(assigneeObj?.display_name) || str(assigneeObj?.name) || '';

  const issueTypeObj = obj(f.issuetype) || obj(f.issue_type) || obj(f.issueType);
  const issueTypeName = str(issueTypeObj?.name) || '';

  const priorityObj = obj(f.priority);
  const priorityName = str(priorityObj?.name) || '';

  const created = str(f.created) || '';
  const updated = str(f.updated) || '';
  const duedate = str(f.duedate) || str(f.dueDate) || str(f.due_date) || '';

  // 타임라인 시작일 정규화: 사용자가 프로젝트별로 매핑한 customfield ID에서 값 추출.
  // 우선순위: f.rawFields (electron 통과 경로) → f (raw fields 직접 경로).
  let startDate = '';
  const startDateFieldId = options?.startDateByProject?.[deriveProjectKey(key)];
  if (startDateFieldId) {
    const rawFieldsContainer = obj(f.rawFields) || f;
    startDate = extractStartDateFromField(rawFieldsContainer[startDateFieldId]);
  }

  const parentObj = obj(f.parent);
  const parentKey = str(parentObj?.key) || '';
  let parentSummary = str(parentObj?.summary) || '';
  if (!parentSummary && parentObj) {
    const parentFields = obj(parentObj.fields);
    if (parentFields) {
      const ps = parentFields.summary;
      parentSummary = typeof ps === 'string' ? ps : '';
    }
  }

  const rawSubtasks = f.subtasks ?? f.subtaskCount;
  const subtaskCount = typeof rawSubtasks === 'number'
    ? rawSubtasks
    : Array.isArray(rawSubtasks) ? rawSubtasks.length : 0;

  return {
    id, key, summary, statusName, statusCategory, assigneeName,
    issueTypeName, priorityName, created, updated, startDate, duedate,
    parentKey, parentSummary, subtaskCount,
  };
}

export function parseIssues(result: unknown, options?: ParseIssuesOptions): NormalizedIssue[] {
  if (!result || typeof result !== 'object') return [];
  const r = result as Record<string, unknown>;
  const list = (r.issues ?? r.values ?? []) as Record<string, unknown>[];
  if (!Array.isArray(list)) return [];
  const ctx = options ?? ambientParseContext;
  return list
    .filter((item) => item && typeof item === 'object')
    .map((item) => normalizeIssue(item, ctx))
    .filter((issue) => issue.key || issue.id);
}

/** 부모별 그룹핑 (에픽만 그룹 헤더, 나머지는 '기타'로) */
export function groupByEpic(issues: NormalizedIssue[]): EpicGroup[] {
  const epicMap = new Map<string, EpicGroup>();
  const NO_EPIC = '__no_epic__';

  const epicKeys = new Set<string>();
  const issueByKey = new Map<string, NormalizedIssue>();
  for (const issue of issues) {
    issueByKey.set(issue.key, issue);
    if (isEpicType(issue.issueTypeName)) {
      epicKeys.add(issue.key);
    }
  }

  // 부모 체인을 따라 에픽 조상을 찾는 함수
  const findEpicAncestor = (issue: NormalizedIssue): string | null => {
    const visited = new Set<string>();
    let current: NormalizedIssue | undefined = issue;
    while (current && current.parentKey) {
      if (visited.has(current.parentKey)) break; // 순환 방지
      visited.add(current.parentKey);
      if (epicKeys.has(current.parentKey)) return current.parentKey;
      current = issueByKey.get(current.parentKey);
    }
    return null;
  };

  for (const issue of issues) {
    if (isEpicType(issue.issueTypeName)) {
      if (!epicMap.has(issue.key)) {
        epicMap.set(issue.key, { key: issue.key, summary: issue.summary, issueTypeName: issue.issueTypeName, statusName: issue.statusName, statusCategory: issue.statusCategory, assigneeName: issue.assigneeName, priorityName: issue.priorityName, startDate: issue.startDate, duedate: issue.duedate, children: [] });
      } else {
        const g = epicMap.get(issue.key)!;
        g.summary = issue.summary;
        g.issueTypeName = issue.issueTypeName;
        g.statusName = issue.statusName;
        g.statusCategory = issue.statusCategory;
        g.assigneeName = issue.assigneeName;
        g.priorityName = issue.priorityName;
        g.startDate = issue.startDate;
        g.duedate = issue.duedate;
      }
      continue;
    }

    // 에픽의 직접 자식만 children에 추가 (간접 자식은 defaultChildrenMap에서 표시)
    // parentKey가 에픽이면 → 직접 자식
    // parentKey가 없으면 → Epic Link로만 연결된 이슈 (에픽 조상을 찾아 배치)
    // parentKey가 에픽이 아닌 다른 이슈면 → 간접 자식 → 에픽 children에서 제외
    if (issue.parentKey && epicKeys.has(issue.parentKey)) {
      // 직접 자식: parentKey가 에픽인 경우
      const parentKey = issue.parentKey;
      if (!epicMap.has(parentKey)) {
        const parentIssue = issueByKey.get(parentKey);
        epicMap.set(parentKey, {
          key: parentKey,
          summary: parentIssue?.summary || issue.parentSummary || parentKey,
          issueTypeName: 'Epic',
          statusName: '',
          statusCategory: '',
          assigneeName: '',
          priorityName: '',
          startDate: parentIssue?.startDate || '',
          duedate: parentIssue?.duedate || '',
          children: [],
        });
      }
      epicMap.get(parentKey)!.children.push(issue);
    } else if (!issue.parentKey || !issueByKey.has(issue.parentKey)) {
      // parentKey가 없거나, parentKey가 목록에 없는 경우 → 에픽 조상 탐색
      const epicAncestor = findEpicAncestor(issue);
      const parentKey = epicAncestor || NO_EPIC;
      if (!epicMap.has(parentKey)) {
        const parentIssue = epicAncestor ? issueByKey.get(epicAncestor) : null;
        epicMap.set(parentKey, {
          key: parentKey,
          summary: parentKey === NO_EPIC ? '기타' : (parentIssue?.summary || issue.parentSummary || parentKey),
          issueTypeName: parentKey === NO_EPIC ? '' : 'Epic',
          statusName: '',
          statusCategory: '',
          assigneeName: '',
          priorityName: '',
          startDate: parentIssue?.startDate || '',
          duedate: parentIssue?.duedate || '',
          children: [],
        });
      }
      epicMap.get(parentKey)!.children.push(issue);
    }
    // else: parentKey가 다른 이슈(스토리 등)인 경우 → 에픽 children에 넣지 않음
    // defaultChildrenMap에서 해당 스토리 하위로 표시됨
  }

  // 자식이 없는 Epic 그룹도 노출 (Epic 자체가 필터/조회 결과에 포함된 경우 보여줘야 함).
  // 다만 '__no_epic__' 그룹은 자식(에픽이 없는 이슈들)이 없으면 의미가 없으므로 제거.
  const groups = Array.from(epicMap.values()).filter((g) => g.key !== NO_EPIC || g.children.length > 0);
  groups.sort((a, b) => {
    if (a.key === NO_EPIC) return 1;
    if (b.key === NO_EPIC) return -1;
    return 0;
  });
  return groups;
}

export function buildProjectClause(projectKeys: string[]): string {
  if (projectKeys.length === 0) return '';
  if (projectKeys.length === 1) return `project = "${projectKeys[0]}"`;
  return `project IN (${projectKeys.map((k) => `"${k}"`).join(',')})`;
}

export function buildSearchJql(searchQuery: string, projectKeys: string[], allProjectKeys: string[] = []): string {
  const clauses: string[] = [];

  const pc = buildProjectClause(projectKeys);
  if (pc) clauses.push(pc);

  const term = searchQuery.trim();
  if (!term) return clauses.join(' AND ');

  if (KEY_PATTERN.test(term)) {
    clauses.push(`key = "${escapeJql(term)}"`);
    return clauses.join(' AND ');
  }

  if (NUMBER_ONLY_PATTERN.test(term)) {
    const prefixes = projectKeys.length > 0 ? projectKeys : allProjectKeys;
    if (prefixes.length > 0) {
      const keys = prefixes.map((pk) => `"${pk}-${term}"`);
      clauses.push(keys.length === 1 ? `key = ${keys[0]}` : `key IN (${keys.join(',')})`);
      return clauses.join(' AND ');
    }
  }

  const words = term.split(/\s+/).filter(Boolean);
  const wordClauses = words.map((w) => {
    const ew = escapeJql(w);
    return `(summary ~ "${ew}" OR description ~ "${ew}" OR comment ~ "${ew}")`;
  });

  clauses.push(wordClauses.length === 1 ? wordClauses[0] : wordClauses.join(' AND '));

  return clauses.join(' AND ');
}
