/**
 * Jira 이슈의 Confluence 연결 문서 상태 관리 훅.
 * remoteLinks + searchConfluenceByIssue 결과를 병합해 ConfluenceLink 목록을 구성하고,
 * 펼침 토글 시 페이지 본문을 lazy-load한다.
 */
import { useState, useEffect, useCallback } from 'react';
import { integrationController } from 'controllers/account';
import { normalizePageDetail } from 'lib/utils/confluenceNormalizers';
import {
  extractConfluenceLinks,
  extractConfluenceSearchResults,
  mergeConfluenceLinks,
} from 'lib/utils/adfUtils';
import type { ConfluenceLink, ConfluencePageContent } from 'types/jira';
import type { Account } from 'types/account';

export interface UseJiraConfluenceLinksOptions {
  activeAccount: Account | null;
  remoteLinksData?: unknown;
  confluenceSearchData?: unknown;
}

export interface UseJiraConfluenceLinksResult {
  confluenceLinks: ConfluenceLink[];
  expandedPages: Set<string>;
  pageContents: Record<string, ConfluencePageContent>;
  loadingPages: Set<string>;
  toggleConfluencePage: (link: ConfluenceLink) => Promise<void>;
}

function useJiraConfluenceLinks({
  activeAccount,
  remoteLinksData,
  confluenceSearchData,
}: UseJiraConfluenceLinksOptions): UseJiraConfluenceLinksResult {
  const [confluenceLinks, setConfluenceLinks] = useState<ConfluenceLink[]>([]);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [pageContents, setPageContents] = useState<Record<string, ConfluencePageContent>>({});
  const [loadingPages, setLoadingPages] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fromRemote = Array.isArray(remoteLinksData) ? extractConfluenceLinks(remoteLinksData) : [];
    const fromSearch = Array.isArray(confluenceSearchData) ? extractConfluenceSearchResults(confluenceSearchData) : [];
    setConfluenceLinks(mergeConfluenceLinks(fromRemote, fromSearch));
  }, [remoteLinksData, confluenceSearchData]);

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
          const detail = normalizePageDetail(data as Record<string, unknown>);
          setPageContents((prev) => ({
            ...prev,
            [pageId]: {
              title: detail.title || link.title,
              body: detail.bodyHtml || '<p>(내용 없음)</p>',
              bodyAdf: detail.bodyAdf,
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

  return {
    confluenceLinks,
    expandedPages,
    pageContents,
    loadingPages,
    toggleConfluencePage,
  };
}

export default useJiraConfluenceLinks;
