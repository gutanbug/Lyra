/**
 * Jira 이슈 상세 composer 훅
 * 5개 소 훅(useJiraIssue/Attachments/ChildIssues/ConfluenceLinks/CardMetaMap)을 합성하고
 * transition/assigned 핸들러를 합성해 외부에 기존 시그니처를 그대로 노출.
 */
import { useEffect, useCallback } from 'react';
import { isSubTaskType } from 'lib/utils/jiraUtils';
import useJiraIssue from 'lib/hooks/useJiraIssue';
import useJiraCardMetaMap from 'lib/hooks/useJiraCardMetaMap';
import useJiraConfluenceLinks from 'lib/hooks/useJiraConfluenceLinks';
import useJiraIssueAttachments from 'lib/hooks/useJiraIssueAttachments';
import useJiraChildIssues from 'lib/hooks/useJiraChildIssues';
import type { NormalizedComment } from 'types/jira';
import type { Account } from 'types/account';

export type { BreadcrumbEntry } from 'lib/hooks/useJiraIssue';

interface UseJiraIssueDetailParams {
  issueKey: string;
  activeAccount: Account | null;
  layoutRef: React.RefObject<HTMLDivElement>;
  setComments: (comments: NormalizedComment[]) => void;
  resolveCardTitlesRef: React.MutableRefObject<((urls: string[]) => Promise<void>) | undefined>;
}

export function useJiraIssueDetail({
  issueKey,
  activeAccount,
  layoutRef,
  setComments,
  resolveCardTitlesRef,
}: UseJiraIssueDetailParams) {
  const issueHook = useJiraIssue({ issueKey, activeAccount, layoutRef });

  const { linkMetaMap, ingestUrls } = useJiraCardMetaMap({ activeAccount, resolveCardTitlesRef });

  const {
    confluenceLinks,
    expandedPages,
    pageContents,
    loadingPages,
    toggleConfluencePage,
  } = useJiraConfluenceLinks({
    activeAccount,
    remoteLinksData: issueHook.rawRemoteLinksData,
    confluenceSearchData: issueHook.rawConfluenceSearchData,
  });

  const {
    childIssues,
    childIssuesLoading,
    expandedChildren,
    setExpandedChildren,
    handleTransitionedForChildren,
    handleAssignedForChildren,
  } = useJiraChildIssues({
    activeAccount,
    issueKey: issueHook.issue?.key,
    issueTypeName: issueHook.issue?.issueTypeName,
    enabled: !!issueHook.issue && !isSubTaskType(issueHook.issue.issueTypeName),
  });

  const {
    attachments,
    attachmentImages,
    mediaUrlMap,
    fileMetaMap,
    lightboxSrc,
    setLightboxSrc,
  } = useJiraIssueAttachments({
    activeAccount,
    rawIssueData: issueHook.rawIssueData,
    rawCommentsData: issueHook.rawCommentsData,
  });

  // 정규화된 댓글을 외부 useJiraComments 상태로 동기화 (기존: commentsData가 Array면 항상 호출)
  const { normalizedComments, rawCommentsData } = issueHook;
  useEffect(() => {
    if (Array.isArray(rawCommentsData)) {
      setComments(normalizedComments);
    }
  // setComments는 상위에서 setState ref로 안정 가정 (기존 로직 보존)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedComments, rawCommentsData]);

  // 카드 URL 일괄 해석 (HTML + ADF에서 모두 수집)
  const { cardUrlsSnapshot } = issueHook;
  useEffect(() => {
    if (cardUrlsSnapshot.length > 0) {
      ingestUrls(cardUrlsSnapshot);
    }
  }, [cardUrlsSnapshot, ingestUrls]);

  const handleTransitioned = useCallback((targetKey: string, toName: string, toCategory: string) => {
    issueHook.handleTransitionedForIssue(targetKey, toName, toCategory);
    handleTransitionedForChildren(targetKey, toName, toCategory);
  }, [issueHook, handleTransitionedForChildren]);

  const handleAssigned = useCallback((targetKey: string, displayName: string) => {
    issueHook.handleAssignedForIssue(targetKey, displayName);
    handleAssignedForChildren(targetKey, displayName);
  }, [issueHook, handleAssignedForChildren]);

  return {
    issue: issueHook.issue,
    isLoading: issueHook.isLoading,
    error: issueHook.error,
    linkedIssues: issueHook.linkedIssues,
    confluenceLinks,
    expandedPages,
    pageContents,
    loadingPages,
    childIssues,
    childIssuesLoading,
    expandedChildren,
    setExpandedChildren,
    linkMetaMap,
    fileMetaMap,
    attachments,
    attachmentImages,
    mediaUrlMap,
    lightboxSrc,
    setLightboxSrc,
    breadcrumbs: issueHook.breadcrumbs,
    handleTransitioned,
    handleAssigned,
    goToChildIssue: issueHook.goToChildIssue,
    goToBreadcrumb: issueHook.goToBreadcrumb,
    goBack: issueHook.goBack,
    toggleConfluencePage,
    updateDescriptionAdf: issueHook.updateDescriptionAdf,
    updatePriority: issueHook.updatePriority,
  };
}
