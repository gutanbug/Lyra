/**
 * Jira 이슈 상세 데이터 페칭 및 상태 관리 커스텀 훅
 * JiraIssueDetail 컨테이너에서 데이터 로직을 분리
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { integrationController } from 'controllers/account';
import { isSubTaskType } from 'lib/utils/jiraUtils';
import useJiraCardMetaMap from 'lib/hooks/useJiraCardMetaMap';
import useJiraConfluenceLinks from 'lib/hooks/useJiraConfluenceLinks';
import useJiraIssueAttachments from 'lib/hooks/useJiraIssueAttachments';
import useJiraChildIssues from 'lib/hooks/useJiraChildIssues';
import {
  extractCardUrlsFromAdf,
  extractInlineCardUrls,
} from 'lib/utils/adfUtils';
import {
  normalizeDetail,
  normalizeComments,
  extractLinkedIssues,
} from 'lib/utils/jiraNormalizers';
import type { NormalizedDetail, NormalizedComment, LinkedIssue } from 'types/jira';
import type { Account } from 'types/account';

export interface BreadcrumbEntry {
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
  const history = useHistory();

  const [issue, setIssue] = useState<NormalizedDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 연결된 업무 항목
  const [linkedIssues, setLinkedIssues] = useState<LinkedIssue[]>([]);

  // raw fetch 결과 (소 훅들에 전달)
  const [rawIssueData, setRawIssueData] = useState<unknown>(undefined);
  const [rawCommentsData, setRawCommentsData] = useState<unknown>(undefined);
  const [rawRemoteLinksData, setRawRemoteLinksData] = useState<unknown>(undefined);
  const [rawConfluenceSearchData, setRawConfluenceSearchData] = useState<unknown>(undefined);

  const {
    confluenceLinks,
    expandedPages,
    pageContents,
    loadingPages,
    toggleConfluencePage,
  } = useJiraConfluenceLinks({
    activeAccount,
    remoteLinksData: rawRemoteLinksData,
    confluenceSearchData: rawConfluenceSearchData,
  });

  // 하위 업무 항목 (직접 하위 + 손자 이슈) — 신규 훅으로 분리
  const {
    childIssues,
    childIssuesLoading,
    expandedChildren,
    setExpandedChildren,
    handleTransitionedForChildren,
    handleAssignedForChildren,
  } = useJiraChildIssues({
    activeAccount,
    issueKey: issue?.key,
    issueTypeName: issue?.issueTypeName,
    enabled: !!issue && !isSubTaskType(issue.issueTypeName),
  });

  // 인라인 카드 링크 → 메타 정보 매핑
  const { linkMetaMap, ingestUrls } = useJiraCardMetaMap({ activeAccount, resolveCardTitlesRef });

  // 첨부파일 (이미지 프록시 로드, media/file 매핑)
  const {
    attachments,
    attachmentImages,
    mediaUrlMap,
    fileMetaMap,
    lightboxSrc,
    setLightboxSrc,
  } = useJiraIssueAttachments({ activeAccount, rawIssueData, rawCommentsData });

  // 브레드크럼 상태
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([]);

  const handleTransitioned = useCallback((targetKey: string, toName: string, toCategory: string) => {
    if (issue && targetKey === issue.key) {
      setIssue((prev) => prev ? { ...prev, statusName: toName, statusCategory: toCategory } : prev);
    }
    handleTransitionedForChildren(targetKey, toName, toCategory);
    setLinkedIssues((prev) =>
      prev.map((li) => li.key === targetKey ? { ...li, statusName: toName, statusCategory: toCategory } : li)
    );
  }, [issue, handleTransitionedForChildren]);

  const handleAssigned = useCallback((targetKey: string, displayName: string) => {
    if (issue && targetKey === issue.key) {
      setIssue((prev) => prev ? { ...prev, assigneeName: displayName } : prev);
    }
    handleAssignedForChildren(targetKey, displayName);
  }, [issue, handleAssignedForChildren]);

  // 이슈 전환 시 스크롤 최상단으로
  useEffect(() => {
    scrollToTop(layoutRef.current);
  }, [issueKey, layoutRef]);

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
        let normalizedCommentsList: NormalizedComment[] = [];

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
          // 하위 업무 항목은 useJiraChildIssues 훅이 issue.key/issueTypeName을 감지해 자동 조회
        } else {
          setError('이슈를 불러오는데 실패했습니다.');
        }

        if (Array.isArray(commentsData)) {
          normalizedCommentsList = normalizeComments(commentsData);
          setComments(normalizedCommentsList);
        }

        // raw 결과를 소 훅들에 전달
        setRawIssueData(issueData);
        setRawCommentsData(commentsData);
        setRawRemoteLinksData(remoteLinksData);
        setRawConfluenceSearchData(confluenceSearchData);

        // 인라인 카드 링크 제목 해석 (HTML + ADF 모두에서 추출)
        const allHtml = [descHtml, ...normalizedCommentsList.map((c) => c.bodyHtml)].join(' ');
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
          ingestUrls(uniqueCardUrls);
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

  const updateDescriptionAdf = useCallback((newAdf: unknown) => {
    setIssue((prev) => prev ? { ...prev, descriptionAdf: newAdf } : prev);
  }, []);

  const updatePriority = useCallback((newPriority: string) => {
    setIssue((prev) => prev ? { ...prev, priorityName: newPriority } : prev);
  }, []);

  return {
    issue,
    isLoading,
    error,
    linkedIssues,
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
    breadcrumbs,
    handleTransitioned,
    handleAssigned,
    goToChildIssue,
    goToBreadcrumb,
    goBack,
    toggleConfluencePage,
    updateDescriptionAdf,
    updatePriority,
  };
}
