import { useCallback, useEffect, useState } from 'react';
import { integrationController } from 'controllers/account';
import type { InlineThread } from 'lib/utils/inlineThreadBuilder';

interface UseInlineCommentsParams {
  threads: InlineThread[];
  threadsByMarkerRef: Record<string, InlineThread>;
  accountId?: string;
  pageId: string;
  reloadComments: () => Promise<void>;
  isEditingBody: boolean;
}

export interface UseInlineCommentsReturn {
  activeMarkerRef: string | null;
  activeAnchorTop: number | null;
  isCollapsed: boolean;
  replyDraft: string;
  isSubmittingReply: boolean;
  open: (markerRef: string, rect: DOMRect, scrollEl: HTMLElement | null) => void;
  close: () => void;
  prev: (scrollEl: HTMLElement | null) => void;
  next: (scrollEl: HTMLElement | null) => void;
  toggleCollapse: () => void;
  setReplyDraft: (v: string) => void;
  submitReply: () => Promise<void>;
}

export function useConfluenceInlineComments(p: UseInlineCommentsParams): UseInlineCommentsReturn {
  const [activeMarkerRef, setActiveMarkerRef] = useState<string | null>(null);
  const [anchorTop, setAnchorTop] = useState<number | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // 편집 모드 진입 시 패널 닫기
  useEffect(() => {
    if (p.isEditingBody) setActiveMarkerRef(null);
  }, [p.isEditingBody]);

  // ESC 로 닫기
  useEffect(() => {
    if (!activeMarkerRef) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveMarkerRef(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeMarkerRef]);

  // 페이지 전환 등 threads 가 비면 닫기
  useEffect(() => {
    if (activeMarkerRef && !p.threadsByMarkerRef[activeMarkerRef]) {
      setActiveMarkerRef(null);
    }
  }, [p.threadsByMarkerRef, activeMarkerRef]);

  const open = useCallback((markerRef: string, rect: DOMRect, scrollEl: HTMLElement | null) => {
    const scrollTop = scrollEl?.scrollTop ?? window.scrollY;
    const containerTop = scrollEl?.getBoundingClientRect().top ?? 0;
    setActiveMarkerRef(markerRef);
    setAnchorTop(rect.top + scrollTop - containerTop);
    setReplyDraft('');
    setIsCollapsed(false);
  }, []);

  const close = useCallback(() => setActiveMarkerRef(null), []);

  const navigateTo = useCallback((targetIdx: number, scrollEl: HTMLElement | null) => {
    if (p.threads.length === 0) return;
    const len = p.threads.length;
    const idx = ((targetIdx % len) + len) % len;
    const target = p.threads[idx];
    setActiveMarkerRef(target.markerRef);
    setReplyDraft('');
    setIsCollapsed(false);

    // anchor 재측정 — 다음 frame 에서 DOM 에서 marker span 찾기
    requestAnimationFrame(() => {
      const root = scrollEl ?? document.body;
      const span = root.querySelector<HTMLElement>(
        `[data-inline-comment="true"][data-id="${CSS.escape(target.markerRef)}"]`
      );
      if (!span) return;
      const rect = span.getBoundingClientRect();
      if (scrollEl) {
        const containerTop = scrollEl.getBoundingClientRect().top;
        setAnchorTop(rect.top + scrollEl.scrollTop - containerTop);
      }
      span.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [p.threads]);

  const prev = useCallback((scrollEl: HTMLElement | null) => {
    if (!activeMarkerRef) return;
    const idx = p.threads.findIndex((t) => t.markerRef === activeMarkerRef);
    if (idx < 0) return;
    navigateTo(idx - 1, scrollEl);
  }, [activeMarkerRef, p.threads, navigateTo]);

  const next = useCallback((scrollEl: HTMLElement | null) => {
    if (!activeMarkerRef) return;
    const idx = p.threads.findIndex((t) => t.markerRef === activeMarkerRef);
    if (idx < 0) return;
    navigateTo(idx + 1, scrollEl);
  }, [activeMarkerRef, p.threads, navigateTo]);

  const toggleCollapse = useCallback(() => setIsCollapsed((v) => !v), []);

  const submitReply = useCallback(async () => {
    if (!activeMarkerRef || !p.accountId) return;
    const text = replyDraft.trim();
    if (!text) return;
    const thread = p.threadsByMarkerRef[activeMarkerRef];
    if (!thread) return;

    setIsSubmittingReply(true);
    try {
      const bodyAdf = {
        type: 'doc',
        version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
      };
      await integrationController.invoke({
        accountId: p.accountId,
        serviceType: 'confluence',
        action: 'addCommentReply',
        params: { parentCommentId: thread.root.id, bodyAdf },
      });
      setReplyDraft('');
      await p.reloadComments();
    } catch (err) {
      console.error('[InlineComments] reply failed:', err);
      throw err;
    } finally {
      setIsSubmittingReply(false);
    }
  }, [activeMarkerRef, p.accountId, replyDraft, p.threadsByMarkerRef, p.reloadComments]);

  return {
    activeMarkerRef,
    activeAnchorTop: anchorTop,
    isCollapsed,
    replyDraft,
    isSubmittingReply,
    open,
    close,
    prev,
    next,
    toggleCollapse,
    setReplyDraft,
    submitReply,
  };
}
