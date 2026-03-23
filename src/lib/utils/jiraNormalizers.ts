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
      };
    });
}

/** 댓글을 스레드(댓글 + 대댓글) 구조로 그룹핑 */
export function buildCommentThreads(comments: NormalizedComment[]): CommentThread[] {
  const threads: CommentThread[] = [];
  const authorThreadMap = new Map<string, number>();

  for (const comment of comments) {
    if (comment.replyToId) {
      const threadIdx = authorThreadMap.get(comment.replyToId);
      if (threadIdx !== undefined && threads[threadIdx]) {
        threads[threadIdx].replies.push(comment);
        continue;
      }
    }

    const idx = threads.length;
    threads.push({ comment, replies: [] });
    if (comment.authorId) {
      authorThreadMap.set(comment.authorId, idx);
    }
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
      return {
        key,
        summary: summary.trim(),
        statusName: str(statusObj?.name),
        statusCategory: str(statusObj?.category) || str(statusCatObj?.name) || str(statusCatObj?.key) || str(statusCatObj?.colorName),
        assigneeName: str(assigneeObj?.displayName) || str(assigneeObj?.display_name) || str(assigneeObj?.name),
        issueTypeName: str(issueTypeObj?.name),
        priorityName: str(priorityObj?.name),
      };
    })
    .filter((i) => i.key);
}

// ── JiraDashboard 정규화 ──

function normalizeIssue(raw: Record<string, unknown>): NormalizedIssue {
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
    issueTypeName, priorityName, created, updated, duedate,
    parentKey, parentSummary, subtaskCount,
  };
}

export function parseIssues(result: unknown): NormalizedIssue[] {
  if (!result || typeof result !== 'object') return [];
  const r = result as Record<string, unknown>;
  const list = (r.issues ?? r.values ?? []) as Record<string, unknown>[];
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => item && typeof item === 'object')
    .map(normalizeIssue)
    .filter((issue) => issue.key || issue.id);
}

/** 부모별 그룹핑 (에픽만 그룹 헤더, 나머지는 '기타'로) */
export function groupByEpic(issues: NormalizedIssue[]): EpicGroup[] {
  const epicMap = new Map<string, EpicGroup>();
  const NO_EPIC = '__no_epic__';

  const epicKeys = new Set<string>();
  for (const issue of issues) {
    if (isEpicType(issue.issueTypeName)) {
      epicKeys.add(issue.key);
    }
  }

  for (const issue of issues) {
    if (isEpicType(issue.issueTypeName)) {
      if (!epicMap.has(issue.key)) {
        epicMap.set(issue.key, { key: issue.key, summary: issue.summary, issueTypeName: issue.issueTypeName, statusName: issue.statusName, statusCategory: issue.statusCategory, assigneeName: issue.assigneeName, children: [] });
      } else {
        const g = epicMap.get(issue.key)!;
        g.summary = issue.summary;
        g.issueTypeName = issue.issueTypeName;
        g.statusName = issue.statusName;
        g.statusCategory = issue.statusCategory;
        g.assigneeName = issue.assigneeName;
      }
      continue;
    }

    const parentKey = issue.parentKey && epicKeys.has(issue.parentKey) ? issue.parentKey : NO_EPIC;
    if (!epicMap.has(parentKey)) {
      epicMap.set(parentKey, {
        key: parentKey,
        summary: parentKey === NO_EPIC ? '기타' : (issue.parentSummary || parentKey),
        issueTypeName: parentKey === NO_EPIC ? '' : 'Epic',
        statusName: '',
        statusCategory: '',
        assigneeName: '',
        children: [],
      });
    }
    epicMap.get(parentKey)!.children.push(issue);
  }

  const groups = Array.from(epicMap.values()).filter((g) => g.children.length > 0);
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
