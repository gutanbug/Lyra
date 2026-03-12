import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { useAccount } from 'modules/contexts/account';
import { integrationController } from 'controllers/account';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { transition } from 'lib/styles/styles';
import { adfToText } from 'lib/utils/adfToText';
import { adfToHtml } from 'lib/utils/adfToHtml';
import { confluenceToHtml } from 'lib/utils/confluenceToHtml';
import { str, obj, isEpicType, isSubTaskType, getStatusColor, getPriorityColor, formatDate } from 'lib/utils/jiraUtils';
import { useTransitionDropdown } from 'lib/hooks/useTransitionDropdown';
import { useRichContentLinkHandler } from 'lib/hooks/useRichContentLinkHandler';
import JiraTransitionDropdown from 'components/jira/JiraTransitionDropdown';
import { ExternalLink } from 'lucide-react';
import JiraTaskIcon, { resolveTaskType } from 'components/jira/JiraTaskIcon';
import type { JiraCredentials } from 'types/account';
import type { NormalizedDetail, NormalizedComment, CommentThread, LinkedIssue, ChildIssue, ConfluenceLink, ConfluencePageContent, JiraAttachment } from 'types/jira';

function normalizeDetail(raw: Record<string, unknown>): NormalizedDetail {
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

  return {
    key, summary, descriptionHtml, statusName, statusCategory,
    assigneeName, reporterName, issueTypeName, priorityName,
    created, updated, duedate,
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

function normalizeComments(raw: unknown[]): NormalizedComment[] {
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
        created: str(comment.created),
        updated: str(comment.updated),
        replyToId: mention?.id || '',
        replyToName: mention?.text || '',
      };
    });
}

/** 댓글을 스레드(댓글 + 대댓글) 구조로 그룹핑 */
function buildCommentThreads(comments: NormalizedComment[]): CommentThread[] {
  const threads: CommentThread[] = [];
  // authorId → 해당 작성자의 가장 최근 root 댓글이 속한 thread index
  const authorThreadMap = new Map<string, number>();

  for (const comment of comments) {
    if (comment.replyToId) {
      // 대댓글: 멘션 대상의 가장 최근 root 댓글 스레드에 추가
      const threadIdx = authorThreadMap.get(comment.replyToId);
      if (threadIdx !== undefined && threads[threadIdx]) {
        threads[threadIdx].replies.push(comment);
        continue;
      }
    }

    // root 댓글
    const idx = threads.length;
    threads.push({ comment, replies: [] });
    if (comment.authorId) {
      authorThreadMap.set(comment.authorId, idx);
    }
  }

  return threads;
}

/** issuelinks에서 연결된 이슈 추출 */
function extractLinkedIssues(issuelinks: unknown[]): LinkedIssue[] {
  const linked: LinkedIssue[] = [];
  for (const link of issuelinks) {
    if (!link || typeof link !== 'object') continue;
    const l = link as Record<string, unknown>;
    const typeObj = obj(l.type);

    // outwardIssue or inwardIssue
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
      statusCategory: str(statusCatObj?.name) || str(statusCatObj?.key),
      issueTypeName: str(issueTypeObj?.name),
      priorityName: str(priorityObj?.name),
      linkType,
    });
  }
  return linked;
}

/** 원격 링크에서 Confluence 링크 추출 */
function extractConfluenceLinks(remoteLinks: unknown[]): ConfluenceLink[] {
  const links: ConfluenceLink[] = [];
  for (const link of remoteLinks) {
    if (!link || typeof link !== 'object') continue;
    const rl = link as Record<string, unknown>;
    const objectData = obj(rl.object);
    if (!objectData) continue;

    const url = str(objectData.url);
    const title = str(objectData.title);

    // Confluence URL에서 pageId 추출: /pages/{pageId}/...
    const pageIdMatch = url.match(/\/pages\/(\d+)/);
    if (pageIdMatch && pageIdMatch[1]) {
      links.push({ pageId: pageIdMatch[1], title: title || 'Confluence 문서', url });
    }
  }
  return links;
}

/** Confluence 검색 결과에서 페이지 정보 추출 */
function extractConfluenceSearchResults(results: unknown[]): ConfluenceLink[] {
  const links: ConfluenceLink[] = [];
  for (const item of results) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;

    // Confluence search API는 content를 반환
    const content = obj(r.content) || r;
    const id = str(content.id);
    const title = str(content.title) || str(r.title);
    const url = str(r.url) || str(content._links && (content._links as any)?.webui) || '';

    // version에서 마지막 수정일 추출
    const versionObj = obj(content.version);
    const lastUpdated = str(versionObj?.when);

    if (id) {
      links.push({ pageId: id, title: title || 'Confluence 문서', url, lastUpdated });
    }
  }
  return links;
}

/** 두 Confluence 링크 소스를 병합 (중복 제거) */
function mergeConfluenceLinks(remote: ConfluenceLink[], search: ConfluenceLink[]): ConfluenceLink[] {
  const seen = new Set<string>();
  const merged: ConfluenceLink[] = [];
  for (const link of [...remote, ...search]) {
    if (!seen.has(link.pageId)) {
      seen.add(link.pageId);
      merged.push(link);
    }
  }
  return merged;
}

/** HTML에서 data-inline-card 링크의 href를 추출 */
function extractInlineCardUrls(html: string): string[] {
  const urls: string[] = [];
  const hrefRegex = /<a\s+[^>]*href="([^"]*)"[^>]*data-inline-card="true"[^>]*>/g;
  const hrefRegex2 = /<a\s+[^>]*data-inline-card="true"[^>]*href="([^"]*)"[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = hrefRegex.exec(html)) !== null) {
    if (m[1]) urls.push(m[1]);
  }
  while ((m = hrefRegex2.exec(html)) !== null) {
    if (m[1] && !urls.includes(m[1])) urls.push(m[1]);
  }
  return urls;
}

/** URL에서 Jira 이슈 키 추출 (/browse/PROJ-123) */
function extractIssueKeyFromUrl(url: string): string | null {
  const m = url.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/i);
  return m ? m[1] : null;
}

/** URL에서 Confluence 페이지 ID 추출 (/pages/{pageId}/) */
function extractConfluencePageIdFromUrl(url: string): string | null {
  const m = url.match(/\/pages\/(\d+)/);
  return m ? m[1] : null;
}

/** HTML 내 인라인 카드 링크의 텍스트를 제목으로 대체 */
function replaceInlineCardTitles(html: string, titleMap: Record<string, string>): string {
  // <a href="URL" ... data-inline-card="true">기존 텍스트</a> → <a ...>제목</a>
  return html.replace(
    /<a\s+([^>]*data-inline-card="true"[^>]*)>([^<]*)<\/a>/g,
    (fullMatch, attrs, _oldText) => {
      const hrefMatch = attrs.match(/href="([^"]*)"/);
      if (!hrefMatch) return fullMatch;
      const url = hrefMatch[1];
      const title = titleMap[url];
      if (title) {
        return `<a ${attrs}>${title}</a>`;
      }
      return fullMatch;
    }
  );
}

/** ADF에서 media 노드의 file ID 목록 추출 */
function extractMediaIds(adf: unknown): string[] {
  const ids: string[] = [];
  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    if (n.type === 'media' && n.attrs) {
      const attrs = n.attrs as Record<string, unknown>;
      if (attrs.type === 'file' && typeof attrs.id === 'string') {
        ids.push(attrs.id);
      }
    }
    const content = n.content as unknown[] | undefined;
    if (Array.isArray(content)) content.forEach(walk);
  }
  walk(adf);
  return ids;
}

/** HTML 내 data-media-id img 태그에 실제 src를 삽입 */
function resolveMediaInHtml(html: string, mediaUrlMap: Record<string, string>): string {
  return html.replace(
    /<img\s+([^>]*data-media-id="([^"]*)"[^>]*)\/?\s*>/g,
    (fullMatch, attrs, mediaId) => {
      const src = mediaUrlMap[mediaId];
      if (src) {
        return `<img src="${src}" ${attrs} />`;
      }
      return fullMatch;
    }
  );
}

function parseChildIssues(result: unknown): ChildIssue[] {
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
        statusCategory: str(statusCatObj?.name) || str(statusCatObj?.key),
        assigneeName: str(assigneeObj?.displayName) || str(assigneeObj?.display_name) || str(assigneeObj?.name),
        issueTypeName: str(issueTypeObj?.name),
        priorityName: str(priorityObj?.name),
      };
    })
    .filter((i) => i.key);
}

interface BreadcrumbEntry {
  key: string;
  summary: string;
  issueTypeName: string;
}

// 모듈 레벨 스택 (라우트 이동 간 유지)
const breadcrumbStack: BreadcrumbEntry[] = [];

/** 가장 가까운 스크롤 가능한 부모 요소를 찾아 scrollTop을 0으로 설정 */
function scrollToTop(el: HTMLElement | null) {
  let current = el?.parentElement;
  while (current) {
    if (current.scrollHeight > current.clientHeight) {
      current.scrollTop = 0;
      return;
    }
    current = current.parentElement;
  }
  window.scrollTo(0, 0);
}

const JiraIssueDetail = () => {
  const { issueKey } = useParams<{ issueKey: string }>();
  const history = useHistory();
  const { activeAccount } = useAccount();
  const layoutRef = useRef<HTMLDivElement>(null);
  const [issue, setIssue] = useState<NormalizedDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 댓글
  const [comments, setComments] = useState<NormalizedComment[]>([]);

  // 연결된 업무 항목
  const [linkedIssues, setLinkedIssues] = useState<LinkedIssue[]>([]);

  // Confluence 연결 문서
  const [confluenceLinks, setConfluenceLinks] = useState<ConfluenceLink[]>([]);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [pageContents, setPageContents] = useState<Record<string, ConfluencePageContent>>({});
  const [loadingPages, setLoadingPages] = useState<Set<string>>(new Set());

  // 하위 업무 항목 (직접 하위 + 손자 이슈)
  interface ChildWithGrandchildren extends ChildIssue {
    grandchildren: ChildIssue[];
  }
  const [childIssues, setChildIssues] = useState<ChildWithGrandchildren[]>([]);
  const [childIssuesLoading, setChildIssuesLoading] = useState(false);
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(new Set());

  // 인라인 카드 링크 → 제목 매핑
  const [linkTitleMap, setLinkTitleMap] = useState<Record<string, string>>({});

  // 첨부 이미지
  const [attachments, setAttachments] = useState<JiraAttachment[]>([]);
  const [attachmentImages, setAttachmentImages] = useState<Record<string, string>>({});
  const [mediaUrlMap, setMediaUrlMap] = useState<Record<string, string>>({});
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // 댓글 섹션 토글 (기본 닫힘)
  const [commentsExpanded, setCommentsExpanded] = useState(false);

  // 브레드크럼 상태
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([]);

  const handleTransitioned = useCallback((targetKey: string, toName: string, toCategory: string) => {
    if (issue && targetKey === issue.key) {
      setIssue((prev) => prev ? { ...prev, statusName: toName, statusCategory: toCategory } : prev);
    }
    setChildIssues((prev) =>
      prev.map((ci) => {
        if (ci.key === targetKey) return { ...ci, statusName: toName, statusCategory: toCategory };
        const updatedGc = ci.grandchildren.map((gc) =>
          gc.key === targetKey ? { ...gc, statusName: toName, statusCategory: toCategory } : gc
        );
        return { ...ci, grandchildren: updatedGc };
      })
    );
    setLinkedIssues((prev) =>
      prev.map((li) => li.key === targetKey ? { ...li, statusName: toName, statusCategory: toCategory } : li)
    );
  }, [issue]);

  const handleContentClick = useRichContentLinkHandler();

  const { target: transitionTarget, transitions, isLoading: isTransitionLoading, dropdownRef: transitionRef, open: openTransitionDropdown, execute: executeTransition, close: closeTransition } = useTransitionDropdown({
    accountId: activeAccount?.id,
    serviceType: 'jira',
    onTransitioned: handleTransitioned,
  });

  // 하위 업무 항목 비동기 조회 (메인 로딩과 독립적으로 실행)
  const fetchChildIssues = useCallback(async (detailKey: string, issueTypeName: string) => {
    if (!activeAccount) return;
    setChildIssuesLoading(true);
    setChildIssues([]);
    try {
      const directChildren: ChildIssue[] = [];
      const seenKeys = new Set<string>();

      // 1) parent 필드 기반 — 직접 하위만
      try {
        const childResult = await integrationController.invoke({
          accountId: activeAccount.id,
          serviceType: 'jira',
          action: 'searchIssues',
          params: {
            jql: `parent = ${detailKey} ORDER BY created ASC`,
            maxResults: 100,
          },
        });
        for (const ci of parseChildIssues(childResult)) {
          if (!seenKeys.has(ci.key)) {
            directChildren.push(ci);
            seenKeys.add(ci.key);
          }
        }
      } catch { /* ignore */ }

      // 2) Epic Link 폴백 (classic Jira 프로젝트)
      if (isEpicType(issueTypeName)) {
        try {
          const epicLinkResult = await integrationController.invoke({
            accountId: activeAccount.id,
            serviceType: 'jira',
            action: 'searchIssues',
            params: {
              jql: `"Epic Link" = ${detailKey} ORDER BY created ASC`,
              maxResults: 100,
            },
          });
          for (const ci of parseChildIssues(epicLinkResult)) {
            if (!seenKeys.has(ci.key)) {
              directChildren.push(ci);
              seenKeys.add(ci.key);
            }
          }
        } catch { /* Epic Link 미지원 인스턴스 무시 */ }
      }

      // 직접 하위 이슈를 먼저 표시 (손자 이슈 로딩 전)
      setChildIssues(directChildren.map((c) => ({ ...c, grandchildren: [] })));

      // 3) 각 직접 하위 이슈의 손자 이슈 조회
      const childrenWithGc = await Promise.all(
        directChildren.map(async (child) => {
          let grandchildren: ChildIssue[] = [];
          try {
            const gcResult = await integrationController.invoke({
              accountId: activeAccount.id,
              serviceType: 'jira',
              action: 'searchIssues',
              params: {
                jql: `parent = ${child.key} ORDER BY created ASC`,
                maxResults: 50,
              },
            });
            grandchildren = parseChildIssues(gcResult);
          } catch { /* ignore */ }
          return { ...child, grandchildren };
        })
      );

      setChildIssues(childrenWithGc);
    } finally {
      setChildIssuesLoading(false);
    }
  }, [activeAccount]);

  // 인라인 카드 URL에서 제목을 일괄 해석
  const resolveCardTitles = useCallback(async (urls: string[]) => {
    if (!activeAccount) return;
    const titleMap: Record<string, string> = {};
    const issueKeyMap = new Map<string, string[]>(); // issueKey → urls
    const pageIdMap = new Map<string, string[]>();    // pageId → urls

    for (const url of urls) {
      const ik = extractIssueKeyFromUrl(url);
      if (ik) {
        const existing = issueKeyMap.get(ik) || [];
        existing.push(url);
        issueKeyMap.set(ik, existing);
        continue;
      }
      const pid = extractConfluencePageIdFromUrl(url);
      if (pid) {
        const existing = pageIdMap.get(pid) || [];
        existing.push(url);
        pageIdMap.set(pid, existing);
      }
    }

    // Jira 이슈 제목 일괄 조회
    const issueKeys = Array.from(issueKeyMap.keys());
    if (issueKeys.length > 0) {
      try {
        const jql = `key IN (${issueKeys.join(',')})`;
        const result = await integrationController.invoke({
          accountId: activeAccount.id,
          serviceType: 'jira',
          action: 'searchIssues',
          params: { jql, maxResults: issueKeys.length },
        });
        const r = result as Record<string, unknown>;
        const list = (r?.issues ?? r?.values ?? []) as Record<string, unknown>[];
        if (Array.isArray(list)) {
          for (const item of list) {
            const key = str(item.key);
            const fields = obj(item.fields) || item;
            const rawSummary = fields.summary;
            const summary = typeof rawSummary === 'string' ? rawSummary : adfToText(rawSummary);
            if (key && summary) {
              const matchUrls = issueKeyMap.get(key) || [];
              for (const u of matchUrls) {
                titleMap[u] = `${key}: ${summary}`;
              }
            }
          }
        }
      } catch { /* ignore */ }
    }

    // Confluence 페이지 제목 일괄 조회
    const pageIds = Array.from(pageIdMap.keys());
    await Promise.all(pageIds.map(async (pid) => {
      try {
        const data = await integrationController.invoke({
          accountId: activeAccount.id,
          serviceType: 'jira',
          action: 'getConfluencePageContent',
          params: { pageId: pid },
        });
        if (data && typeof data === 'object') {
          const page = data as Record<string, unknown>;
          const title = str(page.title);
          if (title) {
            const matchUrls = pageIdMap.get(pid) || [];
            for (const u of matchUrls) {
              titleMap[u] = title;
            }
          }
        }
      } catch { /* ignore */ }
    }));

    if (Object.keys(titleMap).length > 0) {
      setLinkTitleMap(titleMap);
    }
  }, [activeAccount]);

  // 이슈 전환 시 스크롤 최상단으로
  useEffect(() => {
    scrollToTop(layoutRef.current);
  }, [issueKey]);

  useEffect(() => {
    if (!activeAccount || !issueKey) {
      setIsLoading(false);
      return;
    }

    const fetchAll = async () => {
      try {
        const [issueData, commentsData, remoteLinksData, confluenceSearchData] = await Promise.all([
          integrationController.invoke({
            accountId: activeAccount.id,
            serviceType: 'jira',
            action: 'getIssue',
            params: { issueKey },
          }),
          integrationController.invoke({
            accountId: activeAccount.id,
            serviceType: 'jira',
            action: 'getComments',
            params: { issueKey },
          }).catch(() => []),
          integrationController.invoke({
            accountId: activeAccount.id,
            serviceType: 'jira',
            action: 'getRemoteLinks',
            params: { issueKey },
          }).catch(() => []),
          integrationController.invoke({
            accountId: activeAccount.id,
            serviceType: 'jira',
            action: 'searchConfluenceByIssue',
            params: { issueKey },
          }).catch(() => []),
        ]);

        let descHtml = '';
        let normalizedComments: NormalizedComment[] = [];

        if (issueData && typeof issueData === 'object') {
          const raw = issueData as Record<string, unknown>;
          const detail = normalizeDetail(raw);
          descHtml = detail.descriptionHtml;
          setIssue(detail);

          // 브레드크럼 관리: 현재 이슈가 스택에 이미 있으면 그 지점까지 자르기
          const existingIdx = breadcrumbStack.findIndex((b) => b.key === detail.key);
          if (existingIdx >= 0) {
            breadcrumbStack.splice(existingIdx);
          }
          setBreadcrumbs([...breadcrumbStack]);

          // issuelinks 추출
          const rawLinks = raw.issuelinks;
          if (Array.isArray(rawLinks)) {
            setLinkedIssues(extractLinkedIssues(rawLinks));
          }

          // 첨부파일 추출 및 이미지 로드
          const rawAttachments = raw.attachment as unknown[] | undefined;
          if (Array.isArray(rawAttachments) && rawAttachments.length > 0) {
            const parsed: JiraAttachment[] = rawAttachments
              .filter((a) => a && typeof a === 'object')
              .map((a) => {
                const att = a as Record<string, unknown>;
                const authorObj = obj(att.author);
                return {
                  id: str(att.id),
                  filename: str(att.filename),
                  mimeType: str(att.mimeType),
                  size: typeof att.size === 'number' ? att.size : 0,
                  contentUrl: str(att.content),
                  thumbnailUrl: str(att.thumbnail) || undefined,
                  created: str(att.created),
                  author: str(authorObj?.displayName) || str(authorObj?.display_name) || str(authorObj?.name) || '',
                };
              })
              .filter((a) => a.id && a.mimeType.startsWith('image/'));
            setAttachments(parsed);

            // ADF 설명 + 댓글에서 media ID 추출 → 첨부파일 매핑
            const rawDesc = (raw.fields && typeof raw.fields === 'object')
              ? (raw.fields as Record<string, unknown>).description
              : raw.description;
            const mediaIds = extractMediaIds(rawDesc);
            // 댓글 본문의 media ID도 추출
            if (Array.isArray(commentsData)) {
              for (const c of commentsData) {
                if (c && typeof c === 'object') {
                  const commentMediaIds = extractMediaIds((c as Record<string, unknown>).body);
                  mediaIds.push(...commentMediaIds);
                }
              }
            }

            // mediaApiFileId로 직접 매핑 시도, 없으면 순서 기반 매핑
            const mediaToAttachment: Record<string, JiraAttachment> = {};
            const matchedAttIds = new Set<string>();
            for (const mid of mediaIds) {
              // mediaApiFileId 필드가 있는 경우 직접 매핑
              const byMediaApi = rawAttachments.find((a) => {
                const att = a as Record<string, unknown>;
                return str(att.mediaApiFileId) === mid;
              });
              if (byMediaApi) {
                const attId = str((byMediaApi as Record<string, unknown>).id);
                const found = parsed.find((p) => p.id === attId);
                if (found) {
                  mediaToAttachment[mid] = found;
                  matchedAttIds.add(found.id);
                }
              }
            }
            // 매칭되지 않은 media ID는 순서 기반으로 매칭
            const unmatchedMedia = mediaIds.filter((mid) => !mediaToAttachment[mid]);
            const unmatchedAtts = parsed.filter((a) => !matchedAttIds.has(a.id));
            for (let i = 0; i < unmatchedMedia.length && i < unmatchedAtts.length; i++) {
              mediaToAttachment[unmatchedMedia[i]] = unmatchedAtts[i];
            }

            // 이미지를 인증 프록시를 통해 로드
            for (const att of parsed) {
              integrationController.invoke({
                accountId: activeAccount!.id,
                serviceType: 'jira',
                action: 'getAttachmentContent',
                params: { contentUrl: att.contentUrl },
              }).then((dataUrl) => {
                if (typeof dataUrl === 'string') {
                  setAttachmentImages((prev) => ({ ...prev, [att.id]: dataUrl }));
                  // media ID 매핑 업데이트
                  for (const [mid, mappedAtt] of Object.entries(mediaToAttachment)) {
                    if (mappedAtt.id === att.id) {
                      setMediaUrlMap((prev) => ({ ...prev, [mid]: dataUrl }));
                    }
                  }
                }
              }).catch(() => { /* ignore */ });
            }
          }

          // 하위 업무 항목 비동기 조회 (메인 로딩을 블로킹하지 않음)
          if (!isSubTaskType(detail.issueTypeName)) {
            fetchChildIssues(detail.key, detail.issueTypeName);
          } else {
            setChildIssues([]);
          }
        } else {
          setError('이슈를 불러오는데 실패했습니다.');
        }

        if (Array.isArray(commentsData)) {
          normalizedComments = normalizeComments(commentsData);
          setComments(normalizedComments);
        }

        // Confluence: remoteLinks + search 결과 병합
        const fromRemote = Array.isArray(remoteLinksData) ? extractConfluenceLinks(remoteLinksData) : [];
        const fromSearch = Array.isArray(confluenceSearchData) ? extractConfluenceSearchResults(confluenceSearchData) : [];
        setConfluenceLinks(mergeConfluenceLinks(fromRemote, fromSearch));

        // 인라인 카드 링크 제목 해석
        const allHtml = [descHtml, ...normalizedComments.map((c) => c.bodyHtml)].join(' ');
        const cardUrls = extractInlineCardUrls(allHtml);
        if (cardUrls.length > 0) {
          resolveCardTitles(cardUrls);
        }

        setError(null);
      } catch (err) {
        setError('이슈를 불러오는데 실패했습니다.');
        console.error('[JiraIssueDetail] fetchAll error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccount, issueKey]);

  // 하위 이슈 클릭 시 현재 이슈를 브레드크럼에 추가하고 이동
  const goToChildIssue = (targetKey: string) => {
    if (issue) {
      // 이미 스택에 현재 이슈가 없으면 추가
      if (!breadcrumbStack.some((b) => b.key === issue.key)) {
        breadcrumbStack.push({
          key: issue.key,
          summary: issue.summary,
          issueTypeName: issue.issueTypeName,
        });
      }
    }
    history.push(`/jira/issue/${targetKey}`);
  };

  // 브레드크럼 항목 클릭 → 해당 지점까지 스택 자르고 이동
  const goToBreadcrumb = (targetKey: string) => {
    const idx = breadcrumbStack.findIndex((b) => b.key === targetKey);
    if (idx >= 0) {
      breadcrumbStack.splice(idx + 1);
    }
    history.push(`/jira/issue/${targetKey}`);
  };

  // 목록으로 돌아갈 때 스택 초기화
  const goToList = () => {
    breadcrumbStack.length = 0;
    history.push('/jira');
  };

  // 뒤로가기: 브레드크럼 스택이 있으면 상위 이슈로, 없으면 목록으로
  const goBack = () => {
    if (breadcrumbStack.length > 0) {
      const prev = breadcrumbStack[breadcrumbStack.length - 1];
      breadcrumbStack.splice(breadcrumbStack.length - 1);
      history.push(`/jira/issue/${prev.key}`);
    } else {
      goToList();
    }
  };

  const toggleConfluencePage = useCallback(async (link: ConfluenceLink) => {
    const { pageId } = link;
    setExpandedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });

    // 아직 로드하지 않은 페이지만 fetch
    if (!pageContents[pageId] && activeAccount) {
      setLoadingPages((prev) => new Set(prev).add(pageId));
      try {
        const data = await integrationController.invoke({
          accountId: activeAccount.id,
          serviceType: 'jira',
          action: 'getConfluencePageContent',
          params: { pageId },
        });
        if (data && typeof data === 'object') {
          const page = data as Record<string, unknown>;
          const bodyObj = obj(page.body);
          const storageObj = obj(bodyObj?.storage);
          const rawBody = str(storageObj?.value);
          const bodyHtml = rawBody ? confluenceToHtml(rawBody) : '';
          setPageContents((prev) => ({
            ...prev,
            [pageId]: {
              title: str(page.title) || link.title,
              body: bodyHtml || '<p>(내용 없음)</p>',
            },
          }));
        }
      } catch {
        setPageContents((prev) => ({
          ...prev,
          [pageId]: { title: link.title, body: '문서를 불러올 수 없습니다.' },
        }));
      } finally {
        setLoadingPages((prev) => {
          const next = new Set(prev);
          next.delete(pageId);
          return next;
        });
      }
    }
  }, [activeAccount, pageContents]);

  if (!activeAccount) {
    return (
      <Layout ref={layoutRef}>
        <Content>
          <ErrorMessage>계정을 먼저 설정해주세요.</ErrorMessage>
        </Content>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout ref={layoutRef}>
        <Content>
          <Loading>로딩 중...</Loading>
        </Content>
      </Layout>
    );
  }

  // HTML 내 인라인 카드 링크를 제목으로 치환하는 헬퍼
  const hasLinkTitles = Object.keys(linkTitleMap).length > 0;
  const hasMediaUrls = Object.keys(mediaUrlMap).length > 0;
  const resolveHtml = (html: string) => {
    let result = html;
    if (hasLinkTitles) result = replaceInlineCardTitles(result, linkTitleMap);
    if (hasMediaUrls) result = resolveMediaInHtml(result, mediaUrlMap);
    return result;
  };

  if (error || !issue) {
    return (
      <Layout ref={layoutRef}>
        <ToolbarArea>
          <BackButton onClick={goBack}>
            &larr; {breadcrumbs.length > 0 ? '상위 이슈' : '목록으로'}
          </BackButton>
        </ToolbarArea>
        <Content>
          <ErrorMessage>{error ?? '이슈를 찾을 수 없습니다.'}</ErrorMessage>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout ref={layoutRef}>
      <ToolbarArea>
        <BackButton onClick={goBack}>
          &larr; {breadcrumbs.length > 0 ? '상위 이슈' : '목록으로'}
        </BackButton>
        <Breadcrumbs>
          {breadcrumbs.map((b) => (
            <React.Fragment key={b.key}>
              <BreadcrumbSep>/</BreadcrumbSep>
              <BreadcrumbItem onClick={() => goToBreadcrumb(b.key)}>
                <JiraTaskIcon type={resolveTaskType(b.issueTypeName)} size={14} />
                <span>{b.key}</span>
              </BreadcrumbItem>
            </React.Fragment>
          ))}
          <BreadcrumbSep>/</BreadcrumbSep>
          <BreadcrumbCurrent>
            <JiraTaskIcon type={resolveTaskType(issue.issueTypeName)} size={14} />
            <span>{issue.key}</span>
          </BreadcrumbCurrent>
        </Breadcrumbs>
      </ToolbarArea>

      <Content>
        {/* 헤더 */}
        <HeaderCard>
          <HeaderTopRow>
            <IssueKeyRow>
              <JiraTaskIcon type={resolveTaskType(issue.issueTypeName)} size={24} />
              <IssueKeyLink>{issue.key}</IssueKeyLink>
            </IssueKeyRow>
            <OpenInBrowserBtn
              title="Jira에서 열기"
              onClick={() => {
                const creds = activeAccount.credentials as JiraCredentials;
                const baseUrl = creds.baseUrl?.replace(/\/$/, '') || '';
                if (baseUrl) {
                  const url = `${baseUrl}/browse/${issue.key}`;
                  const api = (window as any).electronAPI;
                  if (api?.openExternal) {
                    api.openExternal(url);
                  } else {
                    window.open(url, '_blank');
                  }
                }
              }}
            >
              <ExternalLink size={16} />
            </OpenInBrowserBtn>
          </HeaderTopRow>
          <Badges>
            {issue.statusName && (
              <StatusBadgeBtn
                $color={getStatusColor(issue.statusName, issue.statusCategory)}
                onClick={(e) => openTransitionDropdown(issue.key, issue.statusName, e)}
              >
                {issue.statusName}
                <ChevronIcon>▾</ChevronIcon>
              </StatusBadgeBtn>
            )}
            {issue.priorityName && (
              <Badge $color={getPriorityColor(issue.priorityName)}>
                {issue.priorityName}
              </Badge>
            )}
          </Badges>
          <Title>{issue.summary || '(제목 없음)'}</Title>

          <MetaGrid>
            <MetaItem>
              <MetaLabel>담당자</MetaLabel>
              <MetaValue>{issue.assigneeName || '미지정'}</MetaValue>
            </MetaItem>
            <MetaItem>
              <MetaLabel>보고자</MetaLabel>
              <MetaValue>{issue.reporterName || '-'}</MetaValue>
            </MetaItem>
            <MetaItem>
              <MetaLabel>생성일</MetaLabel>
              <MetaValue>{formatDate(issue.created)}</MetaValue>
            </MetaItem>
            <MetaItem>
              <MetaLabel>수정일</MetaLabel>
              <MetaValue>{formatDate(issue.updated)}</MetaValue>
            </MetaItem>
            {issue.duedate && (
              <MetaItem>
                <MetaLabel>마감일</MetaLabel>
                <MetaValue>{issue.duedate.slice(0, 10)}</MetaValue>
              </MetaItem>
            )}
          </MetaGrid>

        </HeaderCard>

        {/* 설명 */}
        {issue.descriptionHtml && (
          <Section>
            <SectionTitle>설명</SectionTitle>
            <RichContent onClick={handleContentClick} dangerouslySetInnerHTML={{ __html: resolveHtml(issue.descriptionHtml) }} />
          </Section>
        )}

        {/* 첨부 이미지 */}
        {attachments.length > 0 && (
          <Section>
            <SectionTitle>첨부 이미지 ({attachments.length})</SectionTitle>
            <AttachmentGrid>
              {attachments.map((att) => {
                const src = attachmentImages[att.id];
                return (
                  <AttachmentItem key={att.id}>
                    {src ? (
                      <AttachmentImage
                        src={src}
                        alt={att.filename}
                        onClick={() => setLightboxSrc(src)}
                      />
                    ) : (
                      <AttachmentPlaceholder>로딩 중...</AttachmentPlaceholder>
                    )}
                    <AttachmentFilename title={att.filename}>{att.filename}</AttachmentFilename>
                  </AttachmentItem>
                );
              })}
            </AttachmentGrid>
          </Section>
        )}

        {lightboxSrc && (
          <LightboxOverlay onClick={() => setLightboxSrc(null)}>
            <LightboxImage src={lightboxSrc} alt="첨부 이미지" onClick={(e) => e.stopPropagation()} />
          </LightboxOverlay>
        )}

        {/* 하위 업무 항목 */}
        {(childIssues.length > 0 || childIssuesLoading) && (
          <Section>
            <SectionTitle>
              하위 업무 항목 {childIssuesLoading ? '(로딩 중...)' : `(${childIssues.length})`}
            </SectionTitle>
            <ChildIssueList>
              {childIssues.map((ci) => (
                <React.Fragment key={ci.key}>
                  <ChildIssueRow onClick={() => goToChildIssue(ci.key)}>
                    <ChildIssueLeft>
                      {ci.grandchildren.length > 0 && (
                        <GrandchildToggle
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedChildren((prev) => {
                              const next = new Set(prev);
                              if (next.has(ci.key)) next.delete(ci.key);
                              else next.add(ci.key);
                              return next;
                            });
                          }}
                        >
                          {expandedChildren.has(ci.key) ? '▼' : '▶'}
                        </GrandchildToggle>
                      )}
                      <JiraTaskIcon type={resolveTaskType(ci.issueTypeName)} size={18} />
                      <ChildIssueKey>{ci.key}</ChildIssueKey>
                      <ChildIssueSummary>{ci.summary || '(제목 없음)'}</ChildIssueSummary>
                    </ChildIssueLeft>
                    <ChildIssueRight>
                      {ci.assigneeName && <ChildAssignee>{ci.assigneeName}</ChildAssignee>}
                      <StatusBadgeBtn
                        $color={getStatusColor(ci.statusName, ci.statusCategory)}
                        onClick={(e) => { e.stopPropagation(); openTransitionDropdown(ci.key, ci.statusName, e); }}
                      >
                        {ci.statusName || '-'}
                        <ChevronIcon>▾</ChevronIcon>
                      </StatusBadgeBtn>
                    </ChildIssueRight>
                  </ChildIssueRow>
                  {expandedChildren.has(ci.key) && ci.grandchildren.length > 0 && (
                    <GrandchildList>
                      {ci.grandchildren.map((gc) => (
                        <GrandchildRow key={gc.key} onClick={() => goToChildIssue(gc.key)}>
                          <ChildIssueLeft>
                            <JiraTaskIcon type={resolveTaskType(gc.issueTypeName)} size={16} />
                            <ChildIssueKey>{gc.key}</ChildIssueKey>
                            <ChildIssueSummary>{gc.summary || '(제목 없음)'}</ChildIssueSummary>
                          </ChildIssueLeft>
                          <ChildIssueRight>
                            {gc.assigneeName && <ChildAssignee>{gc.assigneeName}</ChildAssignee>}
                            <StatusBadgeBtn
                              $color={getStatusColor(gc.statusName, gc.statusCategory)}
                              onClick={(e) => { e.stopPropagation(); openTransitionDropdown(gc.key, gc.statusName, e); }}
                            >
                              {gc.statusName || '-'}
                              <ChevronIcon>▾</ChevronIcon>
                            </StatusBadgeBtn>
                          </ChildIssueRight>
                        </GrandchildRow>
                      ))}
                    </GrandchildList>
                  )}
                </React.Fragment>
              ))}
            </ChildIssueList>
          </Section>
        )}

        {/* 댓글 */}
        <Section>
          <SectionToggleHeader onClick={() => setCommentsExpanded((v) => !v)}>
            <SectionToggleArrow>{commentsExpanded ? '▼' : '▶'}</SectionToggleArrow>
            <SectionTitle>댓글 ({comments.length})</SectionTitle>
          </SectionToggleHeader>
          {commentsExpanded && (
            comments.length === 0 ? (
              <EmptyComments>댓글이 없습니다.</EmptyComments>
            ) : (
              <CommentList>
                {buildCommentThreads(comments).map(({ comment, replies }) => (
                  <ThreadGroup key={comment.id}>
                    <CommentItem>
                      <CommentHeader>
                        <CommentAuthor>{comment.author}</CommentAuthor>
                        <CommentDate>{formatDate(comment.created)}</CommentDate>
                      </CommentHeader>
                      <CommentBody onClick={handleContentClick} dangerouslySetInnerHTML={{ __html: resolveHtml(comment.bodyHtml) }} />
                    </CommentItem>
                    {replies.length > 0 && (
                      <ReplyList>
                        {replies.map((reply) => (
                          <ReplyItem key={reply.id}>
                            <CommentHeader>
                              <CommentAuthor>
                                {reply.author}
                                {reply.replyToName && (
                                  <ReplyTarget>
                                    &rarr; {reply.replyToName}
                                  </ReplyTarget>
                                )}
                              </CommentAuthor>
                              <CommentDate>{formatDate(reply.created)}</CommentDate>
                            </CommentHeader>
                            <CommentBody onClick={handleContentClick} dangerouslySetInnerHTML={{ __html: resolveHtml(reply.bodyHtml) }} />
                          </ReplyItem>
                        ))}
                      </ReplyList>
                    )}
                  </ThreadGroup>
                ))}
              </CommentList>
            )
          )}
        </Section>

        {/* 연결된 업무 항목 */}
        {linkedIssues.length > 0 && (
          <Section>
            <SectionTitle>연결된 업무 항목 ({linkedIssues.length})</SectionTitle>
            <LinkedIssueList>
              {linkedIssues.map((li) => (
                <LinkedIssueRow
                  key={li.key}
                  onClick={() => goToChildIssue(li.key)}
                >
                  <LinkedIssueLeft>
                    <JiraTaskIcon type={resolveTaskType(li.issueTypeName)} size={18} />
                    <LinkedIssueKey>{li.key}</LinkedIssueKey>
                    <LinkedIssueSummary>{li.summary || '(제목 없음)'}</LinkedIssueSummary>
                  </LinkedIssueLeft>
                  <LinkedIssueRight>
                    <LinkTypeBadge>{li.linkType}</LinkTypeBadge>
                    <StatusBadgeBtn
                      $color={getStatusColor(li.statusName, li.statusCategory)}
                      onClick={(e) => { e.stopPropagation(); openTransitionDropdown(li.key, li.statusName, e); }}
                    >
                      {li.statusName || '-'}
                      <ChevronIcon>▾</ChevronIcon>
                    </StatusBadgeBtn>
                  </LinkedIssueRight>
                </LinkedIssueRow>
              ))}
            </LinkedIssueList>
          </Section>
        )}

        {/* Confluence 콘텐츠 */}
        {confluenceLinks.length > 0 && (
          <Section>
            <SectionTitle>Confluence 콘텐츠 ({confluenceLinks.length})</SectionTitle>
            {confluenceLinks.map((link) => {
              const isExpanded = expandedPages.has(link.pageId);
              const isPageLoading = loadingPages.has(link.pageId);
              const content = pageContents[link.pageId];
              return (
                <ConfluenceToggle key={link.pageId}>
                  <ConfluenceHeader onClick={() => toggleConfluencePage(link)}>
                    <ToggleArrow>{isExpanded ? '▼' : '▶'}</ToggleArrow>
                    <ConfluenceIcon>C</ConfluenceIcon>
                    <ConfluenceTitle>{link.title}</ConfluenceTitle>
                    {link.lastUpdated && (
                      <ConfluenceDate>{formatDate(link.lastUpdated)}</ConfluenceDate>
                    )}
                  </ConfluenceHeader>
                  {isExpanded && (
                    <ConfluenceBody>
                      {isPageLoading ? (
                        <ConfluenceLoading>문서 로딩 중...</ConfluenceLoading>
                      ) : content ? (
                        <ConfluenceContent onClick={handleContentClick} dangerouslySetInnerHTML={{ __html: content.body }} />
                      ) : null}
                    </ConfluenceBody>
                  )}
                </ConfluenceToggle>
              );
            })}
          </Section>
        )}
      </Content>

      {transitionTarget && (
        <JiraTransitionDropdown
          target={transitionTarget}
          transitions={transitions}
          isLoading={isTransitionLoading}
          dropdownRef={transitionRef}
          onSelect={executeTransition}
          onClose={closeTransition}
        />
      )}
    </Layout>
  );
};

export default JiraIssueDetail;

const Layout = styled.div`
  flex: 1;
  min-height: 100%;
  background: ${jiraTheme.bg.subtle};
  zoom: 1.2;
`;

const ToolbarArea = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: ${jiraTheme.bg.default};
  border-bottom: 1px solid ${jiraTheme.border};
`;

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: 1px solid ${jiraTheme.border};
  border-radius: 20px;
  color: ${jiraTheme.text.secondary};
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ${transition};

  &:hover {
    background: ${jiraTheme.bg.hover};
    color: ${jiraTheme.text.primary};
  }
`;

const Breadcrumbs = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  overflow: hidden;
`;

const BreadcrumbSep = styled.span`
  color: ${jiraTheme.text.muted};
  font-size: 0.8125rem;
  flex-shrink: 0;
`;

const BreadcrumbItem = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid ${jiraTheme.border};
  border-radius: 20px;
  color: ${jiraTheme.primary};
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ${transition};
  flex-shrink: 0;

  &:hover {
    background: ${jiraTheme.primaryLight};
    border-color: ${jiraTheme.primary};
  }
`;

const BreadcrumbCurrent = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
  background: ${jiraTheme.bg.subtle};
  border-radius: 3px;
  white-space: nowrap;
  flex-shrink: 0;
`;

const Content = styled.main`
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
`;

const HeaderCard = styled.div`
  padding: 1.5rem;
  background: ${jiraTheme.bg.default};
  border-radius: 3px;
  border: 1px solid ${jiraTheme.border};
  margin-bottom: 1rem;
`;

const HeaderTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

const IssueKeyRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const IssueKeyLink = styled.span`
  font-weight: 700;
  font-size: 1.125rem;
  color: ${jiraTheme.primary};
`;

const OpenInBrowserBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: 1px solid ${jiraTheme.border};
  border-radius: 50%;
  color: ${jiraTheme.text.muted};
  cursor: pointer;
  transition: all 0.15s ${transition};

  &:hover {
    background: ${jiraTheme.primaryLight};
    border-color: ${jiraTheme.primary};
    color: ${jiraTheme.primary};
  }
`;

const Title = styled.h1`
  margin: 0.5rem 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
  line-height: 1.4;
`;

const Badges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const Badge = styled.span<{ $color?: string }>`
  display: inline-block;
  padding: 0.3rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border-radius: 3px;
  background: ${({ $color }) => $color || jiraTheme.status.default};
  color: white;
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${jiraTheme.border};
`;

const MetaItem = styled.div`
  font-size: 0.8125rem;
`;

const MetaLabel = styled.span`
  display: block;
  color: ${jiraTheme.text.muted};
  margin-bottom: 0.25rem;
`;

const MetaValue = styled.span`
  color: ${jiraTheme.text.primary};
`;

const Section = styled.div`
  padding: 1.5rem;
  background: ${jiraTheme.bg.default};
  border-radius: 3px;
  border: 1px solid ${jiraTheme.border};
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h2`
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
`;

const SectionToggleHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;

  &:hover ${SectionTitle} {
    color: ${jiraTheme.primary};
  }

  ${SectionTitle} {
    margin-bottom: 0;
  }
`;

const SectionToggleArrow = styled.span`
  font-size: 0.7rem;
  color: ${jiraTheme.text.muted};
  width: 1rem;
  flex-shrink: 0;
`;

const RichContent = styled.div`
  font-size: 0.875rem;
  color: ${jiraTheme.text.primary};
  line-height: 1.6;

  p { margin: 0 0 0.5rem 0; }
  p:last-child { margin-bottom: 0; }

  h1, h2, h3, h4, h5, h6 {
    margin: 1rem 0 0.5rem 0;
    color: ${jiraTheme.text.primary};
    line-height: 1.3;
  }
  h1 { font-size: 1.25rem; }
  h2 { font-size: 1.125rem; }
  h3 { font-size: 1rem; }
  h4, h5, h6 { font-size: 0.875rem; }
  h1:first-child, h2:first-child, h3:first-child { margin-top: 0; }

  ul, ol {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }
  li { margin-bottom: 0.25rem; }

  a {
    color: ${jiraTheme.primary};
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }

  code {
    background: ${jiraTheme.bg.subtle};
    border: 1px solid ${jiraTheme.border};
    border-radius: 3px;
    padding: 0.125rem 0.375rem;
    font-size: 0.8125rem;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  }

  pre {
    background: #263238;
    color: #EEFFFF;
    border-radius: 3px;
    padding: 0.75rem 1rem;
    margin: 0.5rem 0;
    overflow-x: auto;

    code {
      background: none;
      border: none;
      padding: 0;
      color: inherit;
      font-size: 0.8125rem;
    }
  }

  blockquote {
    margin: 0.5rem 0;
    padding: 0.5rem 1rem;
    border-left: 3px solid ${jiraTheme.primary};
    background: ${jiraTheme.primaryLight};
    color: ${jiraTheme.text.secondary};
  }

  hr {
    border: none;
    border-top: 1px solid ${jiraTheme.border};
    margin: 1rem 0;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5rem 0;
  }
  th, td {
    border: 1px solid ${jiraTheme.border};
    padding: 0.5rem 0.625rem;
    font-size: 0.8125rem;
    text-align: left;
  }
  th {
    background: ${jiraTheme.bg.subtle};
    font-weight: 600;
  }

  img.adf-image {
    max-width: 100%;
    border-radius: 3px;
  }

  .adf-panel {
    margin: 0.5rem 0;
    padding: 0.75rem 1rem;
    border-radius: 3px;
    border-left: 3px solid;
  }
  .adf-panel-info { border-color: ${jiraTheme.primary}; background: ${jiraTheme.primaryLight}; }
  .adf-panel-note { border-color: ${jiraTheme.issueType.epic}; background: #EAE6FF; }
  .adf-panel-success { border-color: ${jiraTheme.status.done}; background: #E3FCEF; }
  .adf-panel-warning { border-color: ${jiraTheme.priority.medium}; background: #FFFAE6; }
  .adf-panel-error { border-color: ${jiraTheme.issueType.bug}; background: #FFEBE6; }

  .adf-status {
    display: inline-block;
    padding: 0.125rem 0.375rem;
    font-size: 0.6875rem;
    font-weight: 600;
    border-radius: 3px;
    text-transform: uppercase;
    color: white;
  }
  .adf-status-blue { background: ${jiraTheme.primary}; }
  .adf-status-green { background: ${jiraTheme.status.done}; }
  .adf-status-yellow { background: ${jiraTheme.priority.medium}; }
  .adf-status-red { background: ${jiraTheme.issueType.bug}; }
  .adf-status-neutral { background: ${jiraTheme.status.default}; }
  .adf-status-purple { background: ${jiraTheme.issueType.epic}; }

  .adf-mention {
    color: ${jiraTheme.primary};
    background: ${jiraTheme.primaryLight};
    padding: 0.0625rem 0.25rem;
    border-radius: 3px;
    font-weight: 500;
  }

  .adf-media-placeholder {
    color: ${jiraTheme.text.muted};
    font-style: italic;
  }

  details {
    margin: 0.5rem 0;
    border: 1px solid ${jiraTheme.border};
    border-radius: 3px;

    summary {
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      font-weight: 500;
      background: ${jiraTheme.bg.subtle};
      &:hover { background: ${jiraTheme.bg.hover}; }
    }

    > *:not(summary) {
      padding: 0 0.75rem;
    }
  }

  .confluence-panel {
    margin: 0.5rem 0;
    padding: 0.75rem 1rem;
    border-radius: 3px;
    border-left: 3px solid;
  }
  .confluence-panel-info { border-color: ${jiraTheme.primary}; background: ${jiraTheme.primaryLight}; }
  .confluence-panel-note { border-color: ${jiraTheme.issueType.epic}; background: #EAE6FF; }
  .confluence-panel-tip { border-color: ${jiraTheme.status.done}; background: #E3FCEF; }
  .confluence-panel-warning { border-color: ${jiraTheme.priority.medium}; background: #FFFAE6; }
`;

const ChildIssueList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const ChildIssueRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: ${jiraTheme.bg.subtle};
  border: 1px solid ${jiraTheme.border};
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.15s ${transition};

  &:hover { background: ${jiraTheme.bg.hover}; }
`;

const ChildIssueLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
`;

const ChildIssueKey = styled.span`
  font-weight: 600;
  font-size: 0.8125rem;
  color: ${jiraTheme.primary};
  flex-shrink: 0;
`;

const ChildIssueSummary = styled.span`
  font-size: 0.8125rem;
  color: ${jiraTheme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ChildIssueRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
`;

const ChildAssignee = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.textSecondary || '#6b778c'};
  white-space: nowrap;
  max-width: 8rem;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const GrandchildToggle = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  font-size: 0.625rem;
  color: ${jiraTheme.text.secondary};
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    color: ${jiraTheme.text.primary};
  }
`;

const GrandchildList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding-left: 1.5rem;
  margin-top: 0.375rem;
  margin-bottom: 0.375rem;
`;

const GrandchildRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.12s;
  background: ${jiraTheme.bg.subtle};
  border: 1px solid ${jiraTheme.border};

  &:hover {
    background: ${jiraTheme.bg.hover};
  }
`;

const LinkedIssueList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const LinkedIssueRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  background: ${jiraTheme.bg.subtle};
  border: 1px solid ${jiraTheme.border};
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.15s ${transition};

  &:hover {
    background: ${jiraTheme.bg.hover};
  }
`;

const LinkedIssueLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
`;

const LinkedIssueKey = styled.span`
  font-weight: 600;
  font-size: 0.8125rem;
  color: ${jiraTheme.primary};
  flex-shrink: 0;
`;

const LinkedIssueSummary = styled.span`
  font-size: 0.8125rem;
  color: ${jiraTheme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const LinkedIssueRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
`;

const LinkTypeBadge = styled.span`
  font-size: 0.6875rem;
  color: ${jiraTheme.text.muted};
  border: 1px solid ${jiraTheme.border};
  border-radius: 3px;
  padding: 0.125rem 0.375rem;
  white-space: nowrap;
`;

const StatusBadgeBtn = styled.button<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.4rem;
  font-size: 0.6875rem;
  font-weight: 500;
  border-radius: 20px;
  background: ${({ $color }) => $color || jiraTheme.status.default};
  color: white;
  white-space: nowrap;
  border: none;
  cursor: pointer;
  transition: filter 0.15s;

  &:hover { filter: brightness(0.9); }
`;

const ChevronIcon = styled.span`
  font-size: 0.625rem;
  line-height: 1;
  opacity: 0.8;
`;


const ConfluenceToggle = styled.div`
  border: 1px solid ${jiraTheme.border};
  border-radius: 3px;
  overflow: hidden;

  & + & {
    margin-top: 0.5rem;
  }
`;

const ConfluenceHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: ${jiraTheme.bg.subtle};
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ${transition};

  &:hover {
    background: ${jiraTheme.bg.hover};
  }
`;

const ToggleArrow = styled.span`
  font-size: 0.65rem;
  color: ${jiraTheme.text.muted};
  width: 0.875rem;
  flex-shrink: 0;
`;

const ConfluenceIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 3px;
  background: #1868DB;
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
`;

const ConfluenceTitle = styled.span`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${jiraTheme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`;

const ConfluenceDate = styled.span`
  font-size: 0.75rem;
  color: ${jiraTheme.text.muted};
  flex-shrink: 0;
`;

const ConfluenceBody = styled.div`
  border-top: 1px solid ${jiraTheme.border};
  padding: 1rem;
  background: ${jiraTheme.bg.default};
`;

const ConfluenceLoading = styled.div`
  font-size: 0.8125rem;
  color: ${jiraTheme.text.muted};
`;

const ConfluenceContent = styled(RichContent)`
  font-size: 0.8125rem;
  max-height: 400px;
  overflow-y: auto;
`;

const CommentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const ThreadGroup = styled.div``;

const CommentItem = styled.div`
  padding: 0.75rem;
  background: ${jiraTheme.bg.subtle};
  border-radius: 3px;
  border: 1px solid ${jiraTheme.border};
`;

const ReplyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
  margin-left: 1.5rem;
  padding-left: 0.75rem;
  border-left: 2px solid ${jiraTheme.border};
`;

const ReplyItem = styled.div`
  padding: 0.625rem 0.75rem;
  background: ${jiraTheme.bg.default};
  border-radius: 3px;
  border: 1px solid ${jiraTheme.border};
`;

const CommentHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const CommentAuthor = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
`;

const ReplyTarget = styled.span`
  font-weight: 400;
  font-size: 0.75rem;
  color: ${jiraTheme.text.muted};
`;

const CommentDate = styled.span`
  font-size: 0.75rem;
  color: ${jiraTheme.text.muted};
  flex-shrink: 0;
`;

const CommentBody = styled(RichContent)`
  font-size: 0.8125rem;
`;

const EmptyComments = styled.div`
  font-size: 0.8125rem;
  color: ${jiraTheme.text.muted};
  margin-top: 1rem;
`;

const Loading = styled.div`
  padding: 4rem 2rem;
  text-align: center;
  color: ${jiraTheme.text.secondary};
`;

const ErrorMessage = styled.div`
  padding: 2rem;
  text-align: center;
  color: #E5493A;
`;

const AttachmentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.75rem;
`;

const AttachmentItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const AttachmentImage = styled.img`
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 3px;
  border: 1px solid ${jiraTheme.border};
  cursor: pointer;
  transition: opacity 0.15s ${transition};

  &:hover {
    opacity: 0.85;
  }
`;

const AttachmentPlaceholder = styled.div`
  width: 100%;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${jiraTheme.bg.subtle};
  border: 1px solid ${jiraTheme.border};
  border-radius: 3px;
  font-size: 0.75rem;
  color: ${jiraTheme.text.muted};
`;

const AttachmentFilename = styled.span`
  font-size: 0.75rem;
  color: ${jiraTheme.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const LightboxOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  cursor: pointer;
`;

const LightboxImage = styled.img`
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 4px;
  cursor: default;
`;
