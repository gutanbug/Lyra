import { useCallback } from 'react';
import { useTabs } from 'modules/contexts/splitView';

/** URL을 분석하여 내부 라우팅 또는 외부 브라우저로 연결하는 공통 로직 */
function navigateByUrl(href: string, addTab: (type: string, path: string, label: string) => void, label?: string) {
  // Jira issue: /browse/KEY-123 또는 ?selectedIssue=KEY-123
  const jiraBrowseMatch = href.match(/\/browse\/([A-Z][A-Z0-9_]+-\d+)/);
  const jiraSelectedMatch = href.match(/[?&]selectedIssue=([A-Z][A-Z0-9_]+-\d+)/);
  const jiraIssueKey = jiraBrowseMatch?.[1] || jiraSelectedMatch?.[1];
  if (jiraIssueKey) {
    addTab('jira', `/jira/issue/${jiraIssueKey}`, label || jiraIssueKey);
    return;
  }

  // Confluence page: /wiki/spaces/.../pages/{pageId}/... or /wiki/pages/{pageId}
  const confluenceMatch = href.match(/\/wiki\/(?:spaces\/[^/]+\/)?pages\/(\d+)/);
  if (confluenceMatch) {
    const pageId = confluenceMatch[1];
    addTab('confluence', `/confluence/page/${pageId}`, label || `Page ${pageId}`);
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
}

/**
 * RichContent 내부의 <a> 링크 클릭 시 Jira/Confluence 내부 링크를
 * 새 탭으로 라우팅하는 클릭 핸들러를 반환합니다.
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
    const label = anchor.textContent?.trim();
    navigateByUrl(href, addTab, label);
  }, [addTab]);

  return handleContentClick;
}

/**
 * AdfRenderer의 onLinkClick에서 사용할 수 있는 URL 기반 링크 핸들러를 반환합니다.
 */
export function useAdfLinkHandler() {
  const { addTab } = useTabs();

  const handleLinkClick = useCallback((url: string) => {
    navigateByUrl(url, addTab);
  }, [addTab]);

  return handleLinkClick;
}
