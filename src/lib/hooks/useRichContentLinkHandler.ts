import { useCallback } from 'react';
import { useTabs } from 'modules/contexts/splitView';
import { useAccount } from 'modules/contexts/account';
import { integrationController } from 'controllers/account';
import { extractConfluenceTinyKey } from 'lib/utils/adfUtils';
import type { LinkMeta } from 'components/common/AdfRenderer';

function openExternal(href: string) {
  if (!href) return;
  const api = (window as any).electronAPI;
  if (api?.openExternal) {
    api.openExternal(href);
  } else {
    window.open(href, '_blank');
  }
}

/** URL을 분석하여 내부 라우팅 또는 외부 브라우저로 연결하는 공통 로직 */
function navigateByUrl(
  href: string,
  addTab: (type: string, path: string, label: string) => void,
  label?: string,
  linkMetaMap?: Record<string, LinkMeta>,
  activeAccountId?: string,
) {
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
    const metaTitle = linkMetaMap?.[href]?.title;
    addTab('confluence', `/confluence/page/${pageId}`, label || metaTitle || `Page ${pageId}`);
    return;
  }

  // Confluence tiny link: /wiki/x/{key} → 서버 측 해석 후 탭 열기
  const tinyKey = extractConfluenceTinyKey(href);
  if (tinyKey && activeAccountId) {
    const metaTitle = linkMetaMap?.[href]?.title;
    integrationController.invoke({
      accountId: activeAccountId,
      serviceType: 'confluence',
      action: 'resolveTinyLink',
      params: { tinyKey },
    }).then((data) => {
      if (data && typeof data === 'object') {
        const result = data as Record<string, unknown>;
        const pageId = String(result.pageId || '');
        const title = String(result.title || '');
        if (pageId) {
          addTab('confluence', `/confluence/page/${pageId}`, label || metaTitle || title || `Page ${pageId}`);
          return;
        }
      }
      openExternal(href);
    }).catch(() => {
      openExternal(href);
    });
    return;
  }

  // 외부 링크 → 브라우저에서 열기
  openExternal(href);
}

/**
 * RichContent 내부의 <a> 링크 클릭 시 Jira/Confluence 내부 링크를
 * 새 탭으로 라우팅하는 클릭 핸들러를 반환합니다.
 */
export function useRichContentLinkHandler() {
  const { addTab } = useTabs();
  const { activeAccount } = useAccount();

  const handleContentClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (!anchor) return;

    e.preventDefault();
    e.stopPropagation();

    const href = anchor.getAttribute('href') || '';
    const label = anchor.textContent?.trim();
    navigateByUrl(href, addTab, label, undefined, activeAccount?.id);
  }, [addTab, activeAccount?.id]);

  return handleContentClick;
}

/**
 * AdfRenderer의 onLinkClick에서 사용할 수 있는 URL 기반 링크 핸들러를 반환합니다.
 * linkMetaMap을 전달하면 Confluence 페이지 탭 제목에 페이지 이름이 표시됩니다.
 */
export function useAdfLinkHandler(linkMetaMap?: Record<string, LinkMeta>) {
  const { addTab } = useTabs();
  const { activeAccount } = useAccount();

  const handleLinkClick = useCallback((url: string) => {
    navigateByUrl(url, addTab, undefined, linkMetaMap, activeAccount?.id);
  }, [addTab, linkMetaMap, activeAccount?.id]);

  return handleLinkClick;
}
