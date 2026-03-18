import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useAccount } from 'modules/contexts/account';
import { integrationController } from 'controllers/account';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { transition } from 'lib/styles/styles';
import { adfToText } from 'lib/utils/adfToText';
import { adfToHtml } from 'lib/utils/adfToHtml';
import { confluenceToHtml } from 'lib/utils/confluenceToHtml';
import { str, obj, isEpicType, isSubTaskType, getStatusColor, getPriorityColor, formatDate } from 'lib/utils/jiraUtils';
import { useTransitionDropdown } from 'lib/hooks/useTransitionDropdown';
import { useRichContentLinkHandler, useAdfLinkHandler } from 'lib/hooks/useRichContentLinkHandler';
import JiraTransitionDropdown from 'components/jira/JiraTransitionDropdown';
import { ExternalLink, Send, Edit2, Trash2, CornerDownRight, X, Smile, Plus } from 'lucide-react';
import EmojiPickerPanel from 'components/common/EmojiPicker';
import JiraTaskIcon, { resolveTaskType } from 'components/jira/JiraTaskIcon';
import type { JiraCredentials } from 'types/account';
import AdfCommentEditor from 'components/common/AdfCommentEditor';
import type { AdfCommentEditorHandle } from 'components/common/AdfCommentEditor';
import AdfRenderer from 'components/common/AdfRenderer';
import type { NormalizedDetail, NormalizedComment, CommentThread, LinkedIssue, ChildIssue, ConfluenceLink, ConfluencePageContent, JiraAttachment } from 'types/jira';
import type { LinkMeta } from 'components/common/AdfRenderer';

/** ADF 문서 첫 번째 paragraph에 멘션을 삽입 (답글용) */
function prependMentionToAdf(adf: unknown, mentionId: string, mentionName: string): unknown {
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
  // ADF JSON이면 원본 보존, 문자열이면 간이 ADF로 래핑
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
        rawBody: comment.body,
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

/** HTML에서 인라인 카드 및 일반 Jira/Confluence 링크의 href를 추출 */
function extractInlineCardUrls(html: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const hrefRegex = /<a\s+[^>]*href="([^"]*)"[^>]*data-inline-card="true"[^>]*>/g;
  const hrefRegex2 = /<a\s+[^>]*data-inline-card="true"[^>]*href="([^"]*)"[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = hrefRegex.exec(html)) !== null) {
    if (m[1] && !seen.has(m[1])) { urls.push(m[1]); seen.add(m[1]); }
  }
  while ((m = hrefRegex2.exec(html)) !== null) {
    if (m[1] && !seen.has(m[1])) { urls.push(m[1]); seen.add(m[1]); }
  }
  // 일반 <a> 태그에서 Jira/Confluence URL 추출
  const regularRegex = /<a\s+[^>]*href="([^"]*)"[^>]*>/gi;
  while ((m = regularRegex.exec(html)) !== null) {
    const href = m[1];
    if (seen.has(href)) continue;
    if (extractIssueKeyFromUrl(href) || extractConfluencePageIdFromUrl(href)) {
      urls.push(href);
      seen.add(href);
    }
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

/** ADF에서 inlineCard/blockCard/embedCard의 URL 추출 */
function extractCardUrlsFromAdf(adf: unknown): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    if (n.type === 'inlineCard' || n.type === 'blockCard' || n.type === 'embedCard') {
      const attrs = n.attrs as Record<string, unknown> | undefined;
      const url = attrs?.url as string | undefined;
      if (url && !seen.has(url)) {
        urls.push(url);
        seen.add(url);
      }
    }
    const content = n.content as unknown[] | undefined;
    if (Array.isArray(content)) content.forEach(walk);
  }
  walk(adf);
  return urls;
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

/** 자기 자신 포함 모든 스크롤 가능한 부모 요소의 scrollTop을 0으로 설정 */
function scrollToTop(el: HTMLElement | null) {
  let current: HTMLElement | null = el;
  while (current) {
    if (current.scrollTop > 0) {
      current.scrollTop = 0;
    }
    current = current.parentElement;
  }
  window.scrollTo(0, 0);
}

const JiraIssueDetail = () => {
  const { issueKey } = useParams<{ issueKey: string }>();
  const history = useHistory();
  const { activeAccount } = useAccount();
  const myDisplayName = (activeAccount?.metadata as Record<string, unknown>)?.userDisplayName as string | undefined;
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

  // 인라인 카드 링크 → 메타 정보 매핑
  const [linkMetaMap, setLinkMetaMap] = useState<Record<string, LinkMeta>>({});

  // 첨부 이미지
  const [attachments, setAttachments] = useState<JiraAttachment[]>([]);
  const [attachmentImages, setAttachmentImages] = useState<Record<string, string>>({});
  const [mediaUrlMap, setMediaUrlMap] = useState<Record<string, string>>({});
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // 댓글 섹션 토글 (기본 닫힘)
  const [commentsExpanded, setCommentsExpanded] = useState(false);

  // 댓글 CRUD 상태
  // newCommentText 제거: Atlaskit Editor의 editorEmpty 상태로 대체
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ id: string; authorId: string; authorName: string } | null>(null);
  const [editTarget, setEditTarget] = useState<{ id: string; rawBody: unknown } | null>(null);
  const [editEditorEmpty, setEditEditorEmpty] = useState(true);
  const [isDeletingComment, setIsDeletingComment] = useState<string | null>(null);
  const [emojiPickerTarget, setEmojiPickerTarget] = useState<string | null>(null);
  const [commentReactions, setCommentReactions] = useState<Record<string, string[]>>({});
  const newCommentRef = useRef<AdfCommentEditorHandle>(null);
  const editCommentRef = useRef<AdfCommentEditorHandle>(null);
  const [editorEmpty, setEditorEmpty] = useState(true);

  // (멘션은 Atlaskit Editor가 자체 처리 — 기존 수동 멘션 상태 제거)

  // 브레드크럼 상태
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([]);

  // resolveCardTitles ref (순환 의존 방지)
  const resolveCardTitlesRef = useRef<(urls: string[]) => Promise<void>>();

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
  const handleAdfLinkClick = useAdfLinkHandler();

  // 댓글 다시 불러오기
  const refreshComments = useCallback(async () => {
    if (!activeAccount || !issueKey) return;
    try {
      const data = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'jira',
        action: 'getComments',
        params: { issueKey },
      });
      if (Array.isArray(data)) {
        const normalized = normalizeComments(data);
        setComments(normalized);

        // 새 댓글의 Jira/Confluence 링크 제목 해석
        const allCommentHtml = normalized.map((c) => c.bodyHtml).join(' ');
        const cardUrls = extractInlineCardUrls(allCommentHtml);
        if (cardUrls.length > 0) {
          resolveCardTitlesRef.current?.(cardUrls);
        }
      }
    } catch { /* ignore */ }
  }, [activeAccount, issueKey]);

  // 댓글 추가 (Atlaskit Editor → ADF 직접 추출)
  const handleAddComment = useCallback(async () => {
    if (!activeAccount || !issueKey || editorEmpty) return;
    setIsSubmittingComment(true);
    try {
      const adf = await newCommentRef.current?.getValue();
      if (!adf) return;
      const body = replyTarget
        ? prependMentionToAdf(adf, replyTarget.authorId, replyTarget.authorName)
        : adf;
      await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'jira',
        action: 'addComment',
        params: { issueKey, body },
      });
      setReplyTarget(null);
      newCommentRef.current?.clear();
      setEditorEmpty(true);
      await refreshComments();
    } catch (err) {
      console.error('[JiraIssueDetail] addComment error:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  }, [activeAccount, issueKey, editorEmpty, replyTarget, refreshComments]);

  // 댓글 수정
  const handleUpdateComment = useCallback(async () => {
    if (!activeAccount || !issueKey || !editTarget || editEditorEmpty) return;
    setIsSubmittingComment(true);
    try {
      const body = await editCommentRef.current?.getValue();
      if (!body) return;
      await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'jira',
        action: 'updateComment',
        params: { issueKey, commentId: editTarget.id, body },
      });
      setEditTarget(null);
      await refreshComments();
    } catch (err) {
      console.error('[JiraIssueDetail] updateComment error:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  }, [activeAccount, issueKey, editTarget, editEditorEmpty, refreshComments]);

  // 댓글 삭제
  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!activeAccount || !issueKey) return;
    setIsDeletingComment(commentId);
    try {
      await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'jira',
        action: 'deleteComment',
        params: { issueKey, commentId },
      });
      await refreshComments();
    } catch (err) {
      console.error('[JiraIssueDetail] deleteComment error:', err);
    } finally {
      setIsDeletingComment(null);
    }
  }, [activeAccount, issueKey, refreshComments]);

  // 대댓글 시작
  const startReply = useCallback((comment: NormalizedComment) => {
    setReplyTarget({ id: comment.id, authorId: comment.authorId, authorName: comment.author });
    setEditTarget(null);
    setCommentsExpanded(true);
    setTimeout(() => newCommentRef.current?.focus(), 100);
  }, []);

  // 수정 시작
  const startEdit = useCallback((comment: NormalizedComment) => {
    setEditTarget({ id: comment.id, rawBody: comment.rawBody });
    setEditEditorEmpty(false);
    setReplyTarget(null);
    setTimeout(() => editCommentRef.current?.focus(), 100);
  }, []);

  // 이모지 반응 토글
  const toggleReaction = useCallback((commentId: string, emoji: string) => {
    setCommentReactions((prev) => {
      const existing = prev[commentId] || [];
      if (existing.includes(emoji)) {
        return { ...prev, [commentId]: existing.filter((e) => e !== emoji) };
      }
      return { ...prev, [commentId]: [...existing, emoji] };
    });
    setEmojiPickerTarget(null);
  }, []);

  // ─── 멘션 자동완성 ─── //

  // (멘션 검색/키보드 처리는 Atlaskit Editor가 자체 수행)


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

  // 인라인 카드 URL에서 메타 정보를 일괄 해석
  const resolveCardTitles = useCallback(async (urls: string[]) => {
    if (!activeAccount) return;
    const metaMap: Record<string, LinkMeta> = {};
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

    // Jira 이슈 메타 일괄 조회
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
            const statusObj = obj(fields.status);
            const statusCatObj = obj(statusObj?.statusCategory);
            const statusName = str(statusObj?.name);
            const statusCategory = str(statusCatObj?.name) || str(statusCatObj?.key);
            if (key && summary) {
              const matchUrls = issueKeyMap.get(key) || [];
              for (const u of matchUrls) {
                metaMap[u] = {
                  type: 'jira',
                  title: summary,
                  issueKey: key,
                  statusName,
                  statusCategory,
                };
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
              metaMap[u] = { type: 'confluence', title };
            }
          }
        }
      } catch { /* ignore */ }
    }));

    if (Object.keys(metaMap).length > 0) {
      setLinkMetaMap((prev) => ({ ...prev, ...metaMap }));
    }
  }, [activeAccount]);

  // ref 동기화
  resolveCardTitlesRef.current = resolveCardTitles;

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

          // 계층 구조 브레드크럼: parent 체인을 따라가며 ancestors 구성
          const ancestors: BreadcrumbEntry[] = [];
          let currentParentKey = detail.parentKey;
          let currentParentSummary = detail.parentSummary;
          let currentParentType = detail.parentIssueTypeName;

          // 첫 번째 parent는 이미 detail에 있음
          if (currentParentKey) {
            ancestors.unshift({ key: currentParentKey, summary: currentParentSummary, issueTypeName: currentParentType });

            // 상위 parent들을 재귀 조회 (최대 5단계)
            for (let i = 0; i < 5; i++) {
              try {
                const parentData = await integrationController.invoke({
                  accountId: activeAccount.id,
                  serviceType: 'jira',
                  action: 'getIssue',
                  params: { issueKey: currentParentKey },
                });
                const parentRaw = parentData as Record<string, unknown>;
                const parentDetail = normalizeDetail(parentRaw);
                if (!parentDetail.parentKey) break;
                ancestors.unshift({
                  key: parentDetail.parentKey,
                  summary: parentDetail.parentSummary,
                  issueTypeName: parentDetail.parentIssueTypeName,
                });
                currentParentKey = parentDetail.parentKey;
              } catch {
                break;
              }
            }
          }
          setBreadcrumbs(ancestors);

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

        // 인라인 카드 링크 제목 해석 (HTML + ADF 모두에서 추출)
        const allHtml = [descHtml, ...normalizedComments.map((c) => c.bodyHtml)].join(' ');
        const cardUrls = extractInlineCardUrls(allHtml);
        // ADF에서도 card URL 추출 (description)
        if (issueData && typeof issueData === 'object') {
          const rawFields = (issueData as Record<string, unknown>).fields as Record<string, unknown> | undefined;
          const descAdf = rawFields?.description ?? (issueData as Record<string, unknown>).description;
          cardUrls.push(...extractCardUrlsFromAdf(descAdf));
        }
        // ADF에서 card URL 추출 (comments)
        if (Array.isArray(commentsData)) {
          for (const c of commentsData) {
            if (c && typeof c === 'object') {
              cardUrls.push(...extractCardUrlsFromAdf((c as Record<string, unknown>).body));
            }
          }
        }
        // 중복 제거
        const uniqueCardUrls = Array.from(new Set(cardUrls));
        if (uniqueCardUrls.length > 0) {
          resolveCardTitles(uniqueCardUrls);
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

  // 이슈 클릭 시 이동 (계층은 자동으로 parent chain에서 구성됨)
  const goToChildIssue = (targetKey: string) => {
    history.push(`/jira/issue/${targetKey}`);
  };

  // 브레드크럼 항목 클릭 → 해당 이슈로 이동
  const goToBreadcrumb = (targetKey: string) => {
    history.push(`/jira/issue/${targetKey}`);
  };

  const goBack = () => {
    history.goBack();
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

  if (error || !issue) {
    return (
      <Layout ref={layoutRef}>
        <ToolbarArea>
          <BackButton onClick={goBack}>
            &larr; 뒤로가기
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
          &larr; 뒤로가기
        </BackButton>
        <Breadcrumbs>
          {breadcrumbs.map((b) => (
            <React.Fragment key={b.key}>
              <BreadcrumbSep>&gt;</BreadcrumbSep>
              <BreadcrumbItem onClick={() => goToBreadcrumb(b.key)} title={b.summary}>
                <JiraTaskIcon type={resolveTaskType(b.issueTypeName)} size={14} />
                <span>{b.key}</span>
                {b.summary && <BreadcrumbSummary>{b.summary}</BreadcrumbSummary>}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
          <BreadcrumbSep>&gt;</BreadcrumbSep>
          <BreadcrumbCurrent title={issue.summary}>
            <JiraTaskIcon type={resolveTaskType(issue.issueTypeName)} size={14} />
            <span>{issue.key}</span>
          </BreadcrumbCurrent>
        </Breadcrumbs>
      </ToolbarArea>

      <Content>
        <>
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
              <MetaValue $isMe={issue.assigneeName === myDisplayName}>{issue.assigneeName || '미지정'}</MetaValue>
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
        {issue.descriptionAdf && (
          <Section>
            <SectionTitle>설명</SectionTitle>
            <AdfRenderer document={issue.descriptionAdf} onLinkClick={handleAdfLinkClick} mediaUrlMap={mediaUrlMap} linkMetaMap={linkMetaMap} />
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
                  <ChildIssueRow
                    onClick={() => {
                      if (ci.grandchildren.length > 0) {
                        setExpandedChildren((prev) => {
                          const next = new Set(prev);
                          if (next.has(ci.key)) next.delete(ci.key);
                          else next.add(ci.key);
                          return next;
                        });
                      } else {
                        goToChildIssue(ci.key);
                      }
                    }}
                  >
                    <ChildIssueLeft>
                      <GrandchildToggle $visible={ci.grandchildren.length > 0}>
                        {ci.grandchildren.length > 0 ? (expandedChildren.has(ci.key) ? '▼' : '▶') : ''}
                      </GrandchildToggle>
                      <JiraTaskIcon type={resolveTaskType(ci.issueTypeName)} size={18} />
                      <ChildIssueKey
                        onClick={(e) => { e.stopPropagation(); goToChildIssue(ci.key); }}
                      >
                        {ci.key}
                      </ChildIssueKey>
                      <ChildIssueSummary>{ci.summary || '(제목 없음)'}</ChildIssueSummary>
                    </ChildIssueLeft>
                    <ChildIssueRight>
                      {ci.assigneeName && <ChildAssignee $isMe={ci.assigneeName === myDisplayName}>{ci.assigneeName}</ChildAssignee>}
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
                        <GrandchildRow key={gc.key}>
                          <ChildIssueLeft>
                            <JiraTaskIcon type={resolveTaskType(gc.issueTypeName)} size={16} />
                            <ChildIssueKey
                              onClick={() => goToChildIssue(gc.key)}
                            >
                              {gc.key}
                            </ChildIssueKey>
                            <ChildIssueSummary>{gc.summary || '(제목 없음)'}</ChildIssueSummary>
                          </ChildIssueLeft>
                          <ChildIssueRight>
                            {gc.assigneeName && <ChildAssignee $isMe={gc.assigneeName === myDisplayName}>{gc.assigneeName}</ChildAssignee>}
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
            <>
              {comments.length === 0 ? (
                <EmptyComments>댓글이 없습니다.</EmptyComments>
              ) : (
                <CommentList>
                  {buildCommentThreads(comments).map(({ comment, replies }) => (
                    <ThreadGroup key={comment.id}>
                      <CommentItem>
                        <CommentHeader>
                          <CommentAuthorRow>
                            <CommentAuthor>{comment.author}</CommentAuthor>
                            <CommentDate>{formatDate(comment.created)}</CommentDate>
                          </CommentAuthorRow>
                          <CommentActions>
                            <CommentActionBtn title="답글" onClick={() => startReply(comment)}>
                              <CornerDownRight size={13} />
                            </CommentActionBtn>
                            <CommentActionBtn title="수정" onClick={() => startEdit(comment)}>
                              <Edit2 size={13} />
                            </CommentActionBtn>
                            <CommentActionBtn
                              title="삭제"
                              $danger
                              onClick={() => { if (window.confirm('댓글을 삭제하시겠습니까?')) handleDeleteComment(comment.id); }}
                            >
                              {isDeletingComment === comment.id ? <CommentSpinner /> : <Trash2 size={13} />}
                            </CommentActionBtn>
                            <EmojiPickerWrapper>
                              <CommentActionBtn title="반응" onClick={() => setEmojiPickerTarget((v) => v === comment.id ? null : comment.id)}>
                                <Smile size={13} />
                              </CommentActionBtn>
                              {emojiPickerTarget === comment.id && (
                                <EmojiPickerPanel
                                  onSelect={(emoji) => toggleReaction(comment.id, emoji)}
                                  onClose={() => setEmojiPickerTarget(null)}
                                />
                              )}
                            </EmojiPickerWrapper>
                          </CommentActions>
                        </CommentHeader>
                        {editTarget?.id === comment.id ? (
                          <CommentEditArea>
                            <CommentEditorRow>
                              <AdfCommentEditor
                                ref={editCommentRef}
                                defaultValue={comment.rawBody}
                                placeholder="댓글 수정..."
                                onSave={handleUpdateComment}
                                onChangeEmpty={setEditEditorEmpty}
                                disabled={isSubmittingComment}
                                accountId={activeAccount?.id}
                                issueKey={issueKey}
                                hideSaveButton
                              />
                            </CommentEditorRow>
                            <CommentEditActions>
                              <CancelBtn onClick={() => setEditTarget(null)}>취소</CancelBtn>
                              <SubmitBtn onClick={handleUpdateComment} disabled={isSubmittingComment || editEditorEmpty}>
                                {isSubmittingComment ? <CommentSpinner /> : '저장'}
                              </SubmitBtn>
                            </CommentEditActions>
                          </CommentEditArea>
                        ) : (
                          <CommentAdfBody document={comment.rawBody} onLinkClick={handleAdfLinkClick} mediaUrlMap={mediaUrlMap} linkMetaMap={linkMetaMap} />
                        )}
                        {(commentReactions[comment.id]?.length ?? 0) > 0 && (
                          <ReactionBar>
                            {commentReactions[comment.id].map((emoji) => (
                              <ReactionChip key={emoji} onClick={() => toggleReaction(comment.id, emoji)}>
                                {emoji} <ReactionCount>1</ReactionCount>
                              </ReactionChip>
                            ))}
                            <EmojiPickerWrapper>
                              <AddReactionChip onClick={() => setEmojiPickerTarget((v) => v === `${comment.id}-bar` ? null : `${comment.id}-bar`)}>
                                <Plus size={12} />
                              </AddReactionChip>
                              {emojiPickerTarget === `${comment.id}-bar` && (
                                <EmojiPickerPanel
                                  onSelect={(emoji) => toggleReaction(comment.id, emoji)}
                                  onClose={() => setEmojiPickerTarget(null)}
                                />
                              )}
                            </EmojiPickerWrapper>
                          </ReactionBar>
                        )}
                      </CommentItem>
                      {replies.length > 0 && (
                        <ReplyList>
                          {replies.map((reply) => (
                            <ReplyItem key={reply.id}>
                              <CommentHeader>
                                <CommentAuthorRow>
                                  <CommentAuthor>
                                    {reply.author}
                                    {reply.replyToName && (
                                      <ReplyTarget>
                                        &rarr; {reply.replyToName}
                                      </ReplyTarget>
                                    )}
                                  </CommentAuthor>
                                  <CommentDate>{formatDate(reply.created)}</CommentDate>
                                </CommentAuthorRow>
                                <CommentActions>
                                  <CommentActionBtn title="답글" onClick={() => startReply(reply)}>
                                    <CornerDownRight size={13} />
                                  </CommentActionBtn>
                                  <CommentActionBtn title="수정" onClick={() => startEdit(reply)}>
                                    <Edit2 size={13} />
                                  </CommentActionBtn>
                                  <CommentActionBtn
                                    title="삭제"
                                    $danger
                                    onClick={() => { if (window.confirm('댓글을 삭제하시겠습니까?')) handleDeleteComment(reply.id); }}
                                  >
                                    {isDeletingComment === reply.id ? <CommentSpinner /> : <Trash2 size={13} />}
                                  </CommentActionBtn>
                                  <EmojiPickerWrapper>
                                    <CommentActionBtn title="반응" onClick={() => setEmojiPickerTarget((v) => v === reply.id ? null : reply.id)}>
                                      <Smile size={13} />
                                    </CommentActionBtn>
                                    {emojiPickerTarget === reply.id && (
                                      <EmojiPickerPanel
                                        onSelect={(emoji) => toggleReaction(reply.id, emoji)}
                                        onClose={() => setEmojiPickerTarget(null)}
                                      />
                                    )}
                                  </EmojiPickerWrapper>
                                </CommentActions>
                              </CommentHeader>
                              {editTarget?.id === reply.id ? (
                                <CommentEditArea>
                                  <CommentEditorRow>
                                    <AdfCommentEditor
                                      ref={editCommentRef}
                                      defaultValue={reply.rawBody}
                                      placeholder="댓글 수정..."
                                      onSave={handleUpdateComment}
                                      onChangeEmpty={setEditEditorEmpty}
                                      disabled={isSubmittingComment}
                                      accountId={activeAccount?.id}
                                      issueKey={issueKey}
                                      hideSaveButton
                                    />
                                  </CommentEditorRow>
                                  <CommentEditActions>
                                    <CancelBtn onClick={() => setEditTarget(null)}>취소</CancelBtn>
                                    <SubmitBtn onClick={handleUpdateComment} disabled={isSubmittingComment || editEditorEmpty}>
                                      {isSubmittingComment ? <CommentSpinner /> : '저장'}
                                    </SubmitBtn>
                                  </CommentEditActions>
                                </CommentEditArea>
                              ) : (
                                <CommentAdfBody document={reply.rawBody} onLinkClick={handleAdfLinkClick} mediaUrlMap={mediaUrlMap} linkMetaMap={linkMetaMap} />
                              )}
                              {(commentReactions[reply.id]?.length ?? 0) > 0 && (
                                <ReactionBar>
                                  {commentReactions[reply.id].map((emoji) => (
                                    <ReactionChip key={emoji} onClick={() => toggleReaction(reply.id, emoji)}>
                                      {emoji} <ReactionCount>1</ReactionCount>
                                    </ReactionChip>
                                  ))}
                                  <EmojiPickerWrapper>
                                    <AddReactionChip onClick={() => setEmojiPickerTarget((v) => v === `${reply.id}-bar` ? null : `${reply.id}-bar`)}>
                                      <Plus size={12} />
                                    </AddReactionChip>
                                    {emojiPickerTarget === `${reply.id}-bar` && (
                                      <EmojiPickerPanel
                                        onSelect={(emoji) => toggleReaction(reply.id, emoji)}
                                        onClose={() => setEmojiPickerTarget(null)}
                                      />
                                    )}
                                  </EmojiPickerWrapper>
                                </ReactionBar>
                              )}
                            </ReplyItem>
                          ))}
                        </ReplyList>
                      )}
                    </ThreadGroup>
                  ))}
                </CommentList>
              )}

              {/* 댓글 입력 */}
              <CommentInputArea>
                {replyTarget && (
                  <ReplyIndicator>
                    <CornerDownRight size={14} />
                    <span><strong>{replyTarget.authorName}</strong>에게 답글</span>
                    <ReplyIndicatorClose onClick={() => setReplyTarget(null)}><X size={14} /></ReplyIndicatorClose>
                  </ReplyIndicator>
                )}
                <CommentEditorRow>
                  <AdfCommentEditor
                    ref={newCommentRef}
                    placeholder={replyTarget ? `${replyTarget.authorName}에게 답글 작성...` : '댓글 작성... (⌘+Enter로 전송)'}
                    onSave={handleAddComment}
                    onChangeEmpty={setEditorEmpty}
                    disabled={isSubmittingComment}
                    accountId={activeAccount?.id}
                    issueKey={issueKey}
                  />
                  <SendBtn
                    onClick={handleAddComment}
                    disabled={isSubmittingComment || editorEmpty}
                    title="댓글 전송 (⌘+Enter)"
                  >
                    {isSubmittingComment ? <CommentSpinner /> : <Send size={16} />}
                  </SendBtn>
                </CommentEditorRow>
              </CommentInputArea>
            </>
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
        </>
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
  min-height: 0;
  background: ${jiraTheme.bg.subtle};
  zoom: 1.2;
  overflow-y: auto;
`;

const ToolbarArea = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
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
  flex-wrap: wrap;
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
  max-width: 280px;

  &:hover {
    background: ${jiraTheme.primaryLight};
    border-color: ${jiraTheme.primary};
  }
`;

const BreadcrumbSummary = styled.span`
  color: ${jiraTheme.text.secondary};
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

const Content = styled.main<{ children?: React.ReactNode }>`
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
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
`;

const IssueKeyRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  min-width: 0;
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

const MetaValue = styled.span<{ $isMe?: boolean }>`
  color: ${({ $isMe }) => ($isMe ? jiraTheme.primary : jiraTheme.text.primary)};
  font-weight: ${({ $isMe }) => ($isMe ? 600 : 400)};
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
  h1:first-of-type, h2:first-of-type, h3:first-of-type { margin-top: 0; }

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

  span[data-renderer-mark="code"],
  code {
    background: ${jiraTheme.bg.subtle} !important;
    border: 1px solid ${jiraTheme.border} !important;
    border-radius: 3px !important;
    padding: 0.125rem 0.375rem !important;
    font-size: 0.8125rem !important;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace !important;
    color: ${jiraTheme.text.primary} !important;
  }

  pre {
    background: #263238;
    color: #EEFFFF;
    border-radius: 6px;
    padding: 0.75rem 1rem;
    margin: 0.5rem 0;
    overflow-x: auto;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 0.8125rem;
    line-height: 1.5;
    white-space: pre;
    word-wrap: normal;
    overflow-wrap: normal;

    code {
      background: none !important;
      border: none !important;
      padding: 0 !important;
      color: inherit !important;
      font-size: inherit !important;
      font-family: inherit;
      white-space: inherit;
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
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

const ChildIssueSummary = styled.span`
  font-size: 0.8125rem;
  color: ${jiraTheme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ChildIssueRight = styled.div`
  display: grid;
  grid-template-columns: 5rem 6rem;
  align-items: center;
  gap: 1.5rem;
  flex-shrink: 0;
  justify-items: start;

  & > :first-child {
    justify-self: end;
  }
`;

const ChildAssignee = styled.span<{ $isMe?: boolean }>`
  font-size: 0.75rem;
  color: ${({ $isMe }) => ($isMe ? jiraTheme.primary : '#6b778c')};
  font-weight: ${({ $isMe }) => ($isMe ? 600 : 400)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: right;
`;

const GrandchildToggle = styled.span<{ $visible?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  font-size: 0.625rem;
  color: ${({ $visible }) => $visible ? jiraTheme.text.secondary : 'transparent'};
  cursor: ${({ $visible }) => $visible ? 'pointer' : 'default'};
  flex-shrink: 0;

  &:hover {
    color: ${({ $visible }) => $visible ? jiraTheme.text.primary : 'transparent'};
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

const CommentAuthorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
`;

const CommentAuthor = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
`;

const CommentActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.125rem;
  opacity: 0;
  transition: opacity 0.15s;

  ${CommentItem}:hover &,
  ${ReplyItem}:hover & {
    opacity: 1;
  }
`;

const CommentActionBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 3px;
  color: ${({ $danger }) => $danger ? '#E5493A' : jiraTheme.text.muted};
  cursor: pointer;
  transition: all 0.12s;

  &:hover {
    background: ${({ $danger }) => $danger ? '#FFEBE6' : jiraTheme.bg.hover};
    color: ${({ $danger }) => $danger ? '#BF2600' : jiraTheme.text.primary};
  }
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

const CommentAdfBody = styled(AdfRenderer)`
  font-size: 0.8125rem;
`;

const EmptyComments = styled.div`
  font-size: 0.8125rem;
  color: ${jiraTheme.text.muted};
  margin-top: 1rem;
`;

const CommentInputArea = styled.div`
  margin-top: 1rem;
  margin-bottom: -0.5rem;
  padding-top: 1rem;
  border-top: 1px solid ${jiraTheme.border};
`;

const CommentInputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CommentEditorRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;

  & > div:first-child {
    flex: 1;
    min-width: 0;
  }
`;


const SendBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  background: ${jiraTheme.primary};
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  flex-shrink: 0;
  box-shadow: 0 2px 6px ${jiraTheme.primary}40;

  &:hover:not(:disabled) {
    background: ${jiraTheme.primaryHover};
    transform: scale(1.05);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const ReplyIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding: 0.375rem 0.625rem;
  background: ${jiraTheme.primaryLight};
  border-radius: 3px;
  font-size: 0.8125rem;
  color: ${jiraTheme.primary};

  strong { font-weight: 600; }
`;

const ReplyIndicatorClose = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  padding: 0;
  background: transparent;
  border: none;
  color: ${jiraTheme.text.muted};
  cursor: pointer;

  &:hover { color: ${jiraTheme.text.primary}; }
`;

const CommentEditArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const CommentEditActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
`;

const CancelBtn = styled.button`
  padding: 0.3rem 0.75rem;
  font-size: 0.8125rem;
  background: transparent;
  border: 1px solid ${jiraTheme.border};
  border-radius: 3px;
  color: ${jiraTheme.text.secondary};
  cursor: pointer;
  transition: all 0.12s;

  &:hover {
    background: ${jiraTheme.bg.hover};
  }
`;

const SubmitBtn = styled.button`
  padding: 0.3rem 0.75rem;
  font-size: 0.8125rem;
  background: ${jiraTheme.primary};
  border: none;
  border-radius: 3px;
  color: white;
  cursor: pointer;
  transition: background 0.15s;

  &:hover:not(:disabled) {
    background: ${jiraTheme.primaryHover};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const EmojiPickerWrapper = styled.div`
  position: relative;
`;

const ReactionBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.5rem;
`;

const ReactionChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  font-size: 0.875rem;
  background: ${jiraTheme.primaryLight};
  border: 1px solid ${jiraTheme.primary}33;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.12s;

  &:hover {
    background: ${jiraTheme.primary}22;
    border-color: ${jiraTheme.primary};
  }
`;

const ReactionCount = styled.span`
  font-size: 0.75rem;
  color: ${jiraTheme.text.secondary};
  font-weight: 500;
`;

const AddReactionChip = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 24px;
  padding: 0;
  background: ${jiraTheme.bg.hover};
  border: 1px solid ${jiraTheme.border};
  border-radius: 12px;
  cursor: pointer;
  color: ${jiraTheme.text.secondary};
  transition: all 0.12s;

  &:hover {
    background: ${jiraTheme.primary}15;
    border-color: ${jiraTheme.primary}44;
    color: ${jiraTheme.primary};
  }
`;

const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const CommentSpinner = styled.div`
  width: 14px;
  height: 14px;
  border: 2px solid ${jiraTheme.border};
  border-top-color: ${jiraTheme.primary};
  border-radius: 50%;
  animation: ${spinAnimation} 0.6s linear infinite;
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
