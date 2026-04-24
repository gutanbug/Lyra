/**
 * Jira 댓글 CRUD 커스텀 훅
 * JiraIssueDetail에서 댓글 관련 상태/로직을 분리
 */
import { useState, useCallback, useRef } from 'react';
import { integrationController } from 'controllers/account';
import type { AdfCommentEditorHandle } from 'components/common/AdfCommentEditor';

interface NormalizedComment {
  id: string;
  author: string;
  authorId: string;
  bodyHtml: string;
  rawBody: unknown;
  created: string;
  updated: string;
  replyToId: string;
  replyToName: string;
}

interface UseJiraCommentsParams {
  accountId?: string;
  issueKey: string;
  normalizeComments: (raw: unknown[]) => NormalizedComment[];
  prependMentionToAdf: (adf: unknown, userId: string, userName: string) => unknown;
  onNewCardUrls?: (urls: string[]) => void;
  extractInlineCardUrls?: (html: string) => string[];
}

export function useJiraComments({
  accountId,
  issueKey,
  normalizeComments,
  prependMentionToAdf,
  onNewCardUrls,
  extractInlineCardUrls,
}: UseJiraCommentsParams) {
  const [comments, setComments] = useState<NormalizedComment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ id: string; authorId: string; authorName: string } | null>(null);
  const [editTarget, setEditTarget] = useState<{ id: string; rawBody: unknown } | null>(null);
  const [editEditorEmpty, setEditEditorEmpty] = useState(true);
  const [editorEmpty, setEditorEmpty] = useState(true);
  const [isDeletingComment, setIsDeletingComment] = useState<string | null>(null);
  const [emojiPickerTarget, setEmojiPickerTarget] = useState<string | null>(null);
  const [commentReactions, setCommentReactions] = useState<Record<string, string[]>>({});
  const [commentsExpanded, setCommentsExpanded] = useState(false);

  const newCommentRef = useRef<AdfCommentEditorHandle>(null);
  const editCommentRef = useRef<AdfCommentEditorHandle>(null);

  const refreshComments = useCallback(async () => {
    if (!accountId || !issueKey) return;
    try {
      const data = await integrationController.invoke({
        accountId,
        serviceType: 'jira',
        action: 'getComments',
        params: { issueKey },
      });
      if (Array.isArray(data)) {
        const normalized = normalizeComments(data);
        setComments(normalized);

        if (extractInlineCardUrls && onNewCardUrls) {
          const allCommentHtml = normalized.map((c) => c.bodyHtml).join(' ');
          const cardUrls = extractInlineCardUrls(allCommentHtml);
          if (cardUrls.length > 0) onNewCardUrls(cardUrls);
        }
      }
    } catch { /* ignore */ }
  }, [accountId, issueKey, normalizeComments, extractInlineCardUrls, onNewCardUrls]);

  const handleAddComment = useCallback(async () => {
    if (!accountId || !issueKey || editorEmpty) return;
    setIsSubmitting(true);
    try {
      const adf = await newCommentRef.current?.getValue();
      if (!adf) return;
      const body = replyTarget
        ? prependMentionToAdf(adf, replyTarget.authorId, replyTarget.authorName)
        : adf;
      await integrationController.invoke({
        accountId,
        serviceType: 'jira',
        action: 'addComment',
        params: { issueKey, body },
      });
      setReplyTarget(null);
      newCommentRef.current?.clear();
      setEditorEmpty(true);
      await refreshComments();
    } catch (err) {
      console.error('[useJiraComments] addComment error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [accountId, issueKey, editorEmpty, replyTarget, prependMentionToAdf, refreshComments]);

  const handleUpdateComment = useCallback(async () => {
    if (!accountId || !issueKey || !editTarget || editEditorEmpty) return;
    setIsSubmitting(true);
    try {
      const body = await editCommentRef.current?.getValue();
      if (!body) return;
      await integrationController.invoke({
        accountId,
        serviceType: 'jira',
        action: 'updateComment',
        params: { issueKey, commentId: editTarget.id, body },
      });
      setEditTarget(null);
      await refreshComments();
    } catch (err) {
      console.error('[useJiraComments] updateComment error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [accountId, issueKey, editTarget, editEditorEmpty, refreshComments]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!accountId || !issueKey) return;
    setIsDeletingComment(commentId);
    try {
      await integrationController.invoke({
        accountId,
        serviceType: 'jira',
        action: 'deleteComment',
        params: { issueKey, commentId },
      });
      await refreshComments();
    } catch (err) {
      console.error('[useJiraComments] deleteComment error:', err);
    } finally {
      setIsDeletingComment(null);
    }
  }, [accountId, issueKey, refreshComments]);

  const startReply = useCallback((comment: NormalizedComment) => {
    setReplyTarget({ id: comment.id, authorId: comment.authorId, authorName: comment.author });
    setEditTarget(null);
    setCommentsExpanded(true);
    setTimeout(() => newCommentRef.current?.focus(), 100);
  }, []);

  const startEdit = useCallback((comment: NormalizedComment) => {
    setEditTarget({ id: comment.id, rawBody: comment.rawBody });
    setEditEditorEmpty(false);
    setReplyTarget(null);
    setTimeout(() => editCommentRef.current?.focus(), 100);
  }, []);

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

  return {
    comments,
    setComments,
    isSubmitting,
    replyTarget,
    setReplyTarget,
    editTarget,
    setEditTarget,
    editEditorEmpty,
    setEditEditorEmpty,
    editorEmpty,
    setEditorEmpty,
    isDeletingComment,
    emojiPickerTarget,
    setEmojiPickerTarget,
    commentReactions,
    commentsExpanded,
    setCommentsExpanded,
    newCommentRef,
    editCommentRef,
    refreshComments,
    handleAddComment,
    handleUpdateComment,
    handleDeleteComment,
    startReply,
    startEdit,
    toggleReaction,
  };
}

export type UseJiraCommentsReturn = ReturnType<typeof useJiraComments>;
