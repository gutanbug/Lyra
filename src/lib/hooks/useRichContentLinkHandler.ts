import { useCallback } from 'react';
import { useTabs } from 'modules/contexts/splitView';

/**
 * RichContent 내부의 <a> 링크 클릭 시 Jira/Confluence 내부 링크를
 * 새 탭으로 라우팅하는 클릭 핸들러를 반환합니다.
 *
 * - Jira: /browse/KEY-123 → 새 탭 /jira/issue/KEY-123
 * - Confluence: /wiki/spaces/.../pages/{pageId}/... → 새 탭 /confluence/page/{pageId}
 * - 그 외 링크 → 외부 브라우저로 열기
 */
export function useRichContentLinkHandler() {
  const { addTab } = useTabs();

  const handleContentClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (!anchor) return;

    e.preventDefault();
    e.stopPropagation();

    const href = anchor.getAttribute('href') || '';

    // Jira issue: /browse/KEY-123
    const jiraMatch = href.match(/\/browse\/([A-Z][A-Z0-9_]+-\d+)/);
    if (jiraMatch) {
      const issueKey = jiraMatch[1];
      addTab('jira', `/jira/issue/${issueKey}`, issueKey);
      return;
    }

    // Confluence page: /wiki/spaces/.../pages/{pageId}/... or /wiki/pages/{pageId}
    const confluenceMatch = href.match(/\/wiki\/(?:spaces\/[^/]+\/)?pages\/(\d+)/);
    if (confluenceMatch) {
      const pageId = confluenceMatch[1];
      const linkText = anchor.textContent?.trim() || `Page ${pageId}`;
      addTab('confluence', `/confluence/page/${pageId}`, linkText);
      return;
    }

    // 외부 링크 → 브라우저에서 열기
    if (href) {
      const api = (window as any).electronAPI;
      if (api?.openExternal) {
        api.openExternal(href);
      } else {
        window.open(href, '_blank');
      }
    }
  }, [addTab]);

  return handleContentClick;
}
