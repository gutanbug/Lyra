import { useCallback } from 'react';
import { useTabs } from 'modules/contexts/tab';
import { integrationController } from 'controllers/account';
import { str } from 'lib/utils/typeHelpers';
import { useRichContentLinkHandler } from 'lib/hooks/useRichContentLinkHandler';
import type { Account, JiraCredentials } from 'types/account';

interface UseConfluencePageLinkHandlerOptions {
  activeAccount: Account | null;
  spaceKey?: string;
  setLightboxSrc: (src: string | null) => void;
}

/**
 * Confluence 페이지 디테일의 RichContent 클릭 핸들러.
 * 1) IMG 클릭 → 라이트박스
 * 2) data-confluence-page-title → searchPages async → 내부 탭 이동 (없으면 wiki URL fallback)
 * 3) data-jira-key → Jira 이슈 탭 이동
 * 4) fallback → useRichContentLinkHandler (외부/일반 링크 처리)
 */
function useConfluencePageLinkHandler(options: UseConfluencePageLinkHandlerOptions) {
  const { activeAccount, spaceKey, setLightboxSrc } = options;
  const { addTab } = useTabs();
  const baseHandle = useRichContentLinkHandler();

  return useCallback((e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;

    // 이미지 클릭 -> 라이트박스
    if (target.tagName === 'IMG') {
      const src = (target as HTMLImageElement).src;
      if (src) {
        e.preventDefault();
        e.stopPropagation();
        setLightboxSrc(src);
        return;
      }
    }

    const anchor = target.closest('a');
    if (!anchor) return;

    // Confluence 내부 페이지 링크
    const pageTitle = anchor.getAttribute('data-confluence-page-title');
    if (pageTitle && activeAccount) {
      e.preventDefault();
      e.stopPropagation();
      const linkText = anchor.textContent?.trim() || pageTitle;
      const targetSpaceKey = anchor.getAttribute('data-confluence-space-key') || spaceKey || '';
      const spaceKeys = targetSpaceKey ? [targetSpaceKey] : undefined;
      integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'confluence',
        action: 'searchPages',
        params: { query: pageTitle, searchField: 'title', limit: 5, spaceKeys },
      }).then((result) => {
        const r = result as Record<string, unknown>;
        const results = (r.results ?? []) as Record<string, unknown>[];
        if (results.length > 0) {
          const exactMatch = results.find((item) => str(item.title as unknown) === pageTitle);
          const best = exactMatch || results[0];
          const foundId = str(best.id as unknown);
          if (foundId) {
            addTab('confluence', `/confluence/page/${foundId}`, linkText);
            return;
          }
        }
        const creds = activeAccount.credentials as JiraCredentials;
        const baseUrl = creds.baseUrl?.replace(/\/$/, '') || '';
        const anchorSpaceKey = anchor.getAttribute('data-confluence-space-key') || '';
        if (baseUrl) {
          const url = anchorSpaceKey
            ? `${baseUrl}/wiki/spaces/${anchorSpaceKey}/pages?title=${encodeURIComponent(pageTitle)}`
            : `${baseUrl}/wiki/search?text=${encodeURIComponent(pageTitle)}`;
          const api = (window as any).electronAPI;
          if (api?.openExternal) api.openExternal(url);
          else window.open(url, '_blank');
        }
      }).catch(() => { /* ignore */ });
      return;
    }

    // Jira 매크로 링크
    const jiraKey = anchor.getAttribute('data-jira-key');
    if (jiraKey) {
      e.preventDefault();
      e.stopPropagation();
      const label = anchor.textContent?.trim() || jiraKey;
      addTab('jira', `/jira/issue/${jiraKey}`, label);
      return;
    }

    baseHandle(e);
  }, [activeAccount, baseHandle, addTab, spaceKey, setLightboxSrc]);
}

export default useConfluencePageLinkHandler;
