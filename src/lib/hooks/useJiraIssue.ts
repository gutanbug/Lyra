/**
 * Jira 이슈 코어 데이터 페칭 + 상태 관리 훅
 * Promise.all(getIssue + getComments + getRemoteLinks + searchConfluenceByIssue)
 * + parent chain 브레드크럼 재귀 + 이슈 네비게이션 콜백
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { integrationController } from 'controllers/account';
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

export interface UseJiraIssueOptions {
  issueKey?: string;
  activeAccount: Account | null;
  layoutRef?: React.RefObject<HTMLElement>;
}

export interface UseJiraIssueResult {
  issue: NormalizedDetail | null;
  linkedIssues: LinkedIssue[];
  isLoading: boolean;
  error: string | null;
  breadcrumbs: BreadcrumbEntry[];
  rawIssueData: unknown;
  rawCommentsData: unknown;
  rawRemoteLinksData: unknown;
  rawConfluenceSearchData: unknown;
  normalizedComments: NormalizedComment[];
  cardUrlsSnapshot: string[];
  updateDescriptionAdf: (adf: unknown) => void;
  updatePriority: (priorityName: string) => void;
  handleTransitionedForIssue: (targetKey: string, toName: string, toCategory: string) => void;
  handleAssignedForIssue: (targetKey: string, displayName: string) => void;
  goBack: () => void;
  goToBreadcrumb: (targetKey: string) => void;
  goToChildIssue: (targetKey: string) => void;
}

function useJiraIssue({
  issueKey,
  activeAccount,
  layoutRef,
}: UseJiraIssueOptions): UseJiraIssueResult {
  const history = useHistory();

  const [issue, setIssue] = useState<NormalizedDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkedIssues, setLinkedIssues] = useState<LinkedIssue[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([]);

  const [rawIssueData, setRawIssueData] = useState<unknown>(undefined);
  const [rawCommentsData, setRawCommentsData] = useState<unknown>(undefined);
  const [rawRemoteLinksData, setRawRemoteLinksData] = useState<unknown>(undefined);
  const [rawConfluenceSearchData, setRawConfluenceSearchData] = useState<unknown>(undefined);

  const [normalizedCommentsState, setNormalizedCommentsState] = useState<NormalizedComment[]>([]);

  // 이슈 전환 시 스크롤 최상단으로
  useEffect(() => {
    if (layoutRef) {
      scrollToTop(layoutRef.current);
    }
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

        let normalizedCommentsList: NormalizedComment[] = [];

        if (issueData && typeof issueData === 'object') {
          const raw = issueData as Record<string, unknown>;
          const detail = normalizeDetail(raw);
          setIssue(detail);

          // 계층 구조 브레드크럼: parent 체인을 따라가며 ancestors 구성
          const ancestors: BreadcrumbEntry[] = [];
          let currentParentKey = detail.parentKey;
          const currentParentSummary = detail.parentSummary;
          const currentParentType = detail.parentIssueTypeName;

          if (currentParentKey) {
            ancestors.unshift({ key: currentParentKey, summary: currentParentSummary, issueTypeName: currentParentType });

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

          const rawLinks = raw.issuelinks;
          if (Array.isArray(rawLinks)) {
            setLinkedIssues(extractLinkedIssues(rawLinks));
          }
        } else {
          setError('이슈를 불러오는데 실패했습니다.');
        }

        if (Array.isArray(commentsData)) {
          normalizedCommentsList = normalizeComments(commentsData);
          setNormalizedCommentsState(normalizedCommentsList);
        }

        setRawIssueData(issueData);
        setRawCommentsData(commentsData);
        setRawRemoteLinksData(remoteLinksData);
        setRawConfluenceSearchData(confluenceSearchData);

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

  // HTML + ADF에서 모든 카드 URL 추출 (composer에서 ingestUrls 호출용)
  const cardUrlsSnapshot = useMemo<string[]>(() => {
    const descHtml = issue?.descriptionHtml ?? '';
    const allHtml = [descHtml, ...normalizedCommentsState.map((c) => c.bodyHtml)].join(' ');
    const cardUrls = extractInlineCardUrls(allHtml);

    if (rawIssueData && typeof rawIssueData === 'object') {
      const rawFields = (rawIssueData as Record<string, unknown>).fields as Record<string, unknown> | undefined;
      const descAdf = rawFields?.description ?? (rawIssueData as Record<string, unknown>).description;
      cardUrls.push(...extractCardUrlsFromAdf(descAdf));
    }

    if (Array.isArray(rawCommentsData)) {
      for (const c of rawCommentsData) {
        if (c && typeof c === 'object') {
          cardUrls.push(...extractCardUrlsFromAdf((c as Record<string, unknown>).body));
        }
      }
    }

    return Array.from(new Set(cardUrls));
  }, [issue, normalizedCommentsState, rawIssueData, rawCommentsData]);

  const handleTransitionedForIssue = useCallback((targetKey: string, toName: string, toCategory: string) => {
    setIssue((prev) => (prev && targetKey === prev.key
      ? { ...prev, statusName: toName, statusCategory: toCategory }
      : prev));
    setLinkedIssues((prev) =>
      prev.map((li) => li.key === targetKey ? { ...li, statusName: toName, statusCategory: toCategory } : li)
    );
  }, []);

  const handleAssignedForIssue = useCallback((targetKey: string, displayName: string) => {
    setIssue((prev) => (prev && targetKey === prev.key
      ? { ...prev, assigneeName: displayName }
      : prev));
  }, []);

  const goToChildIssue = useCallback((targetKey: string) => {
    history.push(`/jira/issue/${targetKey}`);
  }, [history]);

  const goToBreadcrumb = useCallback((targetKey: string) => {
    history.push(`/jira/issue/${targetKey}`);
  }, [history]);

  const goBack = useCallback(() => {
    history.goBack();
  }, [history]);

  const updateDescriptionAdf = useCallback((newAdf: unknown) => {
    setIssue((prev) => prev ? { ...prev, descriptionAdf: newAdf } : prev);
  }, []);

  const updatePriority = useCallback((newPriority: string) => {
    setIssue((prev) => prev ? { ...prev, priorityName: newPriority } : prev);
  }, []);

  return {
    issue,
    linkedIssues,
    isLoading,
    error,
    breadcrumbs,
    rawIssueData,
    rawCommentsData,
    rawRemoteLinksData,
    rawConfluenceSearchData,
    normalizedComments: normalizedCommentsState,
    cardUrlsSnapshot,
    updateDescriptionAdf,
    updatePriority,
    handleTransitionedForIssue,
    handleAssignedForIssue,
    goBack,
    goToBreadcrumb,
    goToChildIssue,
  };
}

export default useJiraIssue;
