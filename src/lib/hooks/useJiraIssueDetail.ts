/**
 * Jira 이슈 상세 데이터 페칭 및 상태 관리 커스텀 훅
 * JiraIssueDetail 컨테이너에서 데이터 로직을 분리
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { integrationController } from 'controllers/account';
import { isEpicType, isSubTaskType } from 'lib/utils/jiraUtils';
import useJiraCardMetaMap from 'lib/hooks/useJiraCardMetaMap';
import useJiraConfluenceLinks from 'lib/hooks/useJiraConfluenceLinks';
import useJiraIssueAttachments from 'lib/hooks/useJiraIssueAttachments';
import {
  extractCardUrlsFromAdf,
  extractInlineCardUrls,
} from 'lib/utils/adfUtils';
import {
  normalizeDetail,
  normalizeComments,
  parseChildIssues,
  extractLinkedIssues,
} from 'lib/utils/jiraNormalizers';
import type { NormalizedDetail, NormalizedComment, LinkedIssue, ChildIssue } from 'types/jira';
import type { Account } from 'types/account';

export interface BreadcrumbEntry {
  key: string;
  summary: string;
  issueTypeName: string;
}

export interface ChildWithGrandchildren extends ChildIssue {
  grandchildren: ChildIssue[];
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

  // 하위 업무 항목 (직접 하위 + 손자 이슈)
  const [childIssues, setChildIssues] = useState<ChildWithGrandchildren[]>([]);
  const [childIssuesLoading, setChildIssuesLoading] = useState(false);
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(new Set());

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
    setChildIssues((prev) =>
      prev.map((ci) => {
        if (ci.key === targetKey) return { ...ci, statusName: toName, statusCategory: toCategory };
        const updatedGc = ci.grandchildren.map((gc) =>
          gc.key === targetKey ? { ...gc, statusName: toName, statusCategory: toCategory } : gc
        );
        return { ...ci, grandchildren: updatedGc };
      })
    );
    setLinkedIssues((prev) =>
      prev.map((li) => li.key === targetKey ? { ...li, statusName: toName, statusCategory: toCategory } : li)
    );
  }, [issue]);

  const handleAssigned = useCallback((targetKey: string, displayName: string) => {
    if (issue && targetKey === issue.key) {
      setIssue((prev) => prev ? { ...prev, assigneeName: displayName } : prev);
    }
    setChildIssues((prev) =>
      prev.map((ci) => {
        if (ci.key === targetKey) return { ...ci, assigneeName: displayName };
        const updatedGc = ci.grandchildren.map((gc) =>
          gc.key === targetKey ? { ...gc, assigneeName: displayName } : gc
        );
        return { ...ci, grandchildren: updatedGc };
      })
    );
  }, [issue]);

  // 하위 업무 항목 비동기 조회 (메인 로딩과 독립적으로 실행)
  const fetchChildIssues = useCallback(async (detailKey: string, issueTypeName: string) => {
    if (!activeAccount) return;
    setChildIssuesLoading(true);
    setChildIssues([]);
    try {
      const directChildren: ChildIssue[] = [];
      const seenKeys = new Set<string>();

      // 1) parent 필드 기반 — 직접 하위만
      try {
        const childResult = await integrationController.invoke({
          accountId: activeAccount.id,
          serviceType: 'jira',
          action: 'searchIssues',
          params: {
            jql: `parent = ${detailKey} ORDER BY created ASC`,
            maxResults: 100,
            skipCache: true,
          },
        });
        for (const ci of parseChildIssues(childResult)) {
          if (!seenKeys.has(ci.key)) {
            directChildren.push(ci);
            seenKeys.add(ci.key);
          }
        }
      } catch { /* ignore */ }

      // 2) Epic Link 폴백 (classic Jira 프로젝트) — 서브태스크 제외
      if (isEpicType(issueTypeName)) {
        try {
          const epicLinkResult = await integrationController.invoke({
            accountId: activeAccount.id,
            serviceType: 'jira',
            action: 'searchIssues',
            params: {
              jql: `"Epic Link" = ${detailKey} AND issuetype not in subTaskIssueTypes() ORDER BY created ASC`,
              maxResults: 100,
              skipCache: true,
            },
          });
          for (const ci of parseChildIssues(epicLinkResult)) {
            if (!seenKeys.has(ci.key)) {
              directChildren.push(ci);
              seenKeys.add(ci.key);
            }
          }
        } catch {
          // subTaskIssueTypes() 미지원 시 parentKey 필터링으로 폴백
          try {
            const epicLinkResult = await integrationController.invoke({
              accountId: activeAccount.id,
              serviceType: 'jira',
              action: 'searchIssues',
              params: {
                jql: `"Epic Link" = ${detailKey} ORDER BY created ASC`,
                maxResults: 100,
                skipCache: true,
              },
            });
            for (const ci of parseChildIssues(epicLinkResult)) {
              if (!seenKeys.has(ci.key) && (!ci.parentKey || ci.parentKey === detailKey)) {
                directChildren.push(ci);
                seenKeys.add(ci.key);
              }
            }
          } catch { /* Epic Link 미지원 인스턴스 무시 */ }
        }
      }

      // parent/Epic Link 쿼리 결과에서 실제 parent가 현재 이슈가 아닌 항목 제거
      // parentKey가 있고 detailKey와 다르면 → 다른 이슈의 서브태스크이므로 제외
      const trueDirectChildren = directChildren.filter(
        (c) => !c.parentKey || c.parentKey === detailKey
      );

      // 직접 하위 이슈를 먼저 표시 (손자 이슈 로딩 전)
      setChildIssues(trueDirectChildren.map((c) => ({ ...c, grandchildren: [] })));

      // 3) 각 직접 하위 이슈의 손자 이슈 조회
      const childrenWithGc = await Promise.all(
        trueDirectChildren.map(async (child) => {
          let grandchildren: ChildIssue[] = [];
          try {
            const gcResult = await integrationController.invoke({
              accountId: activeAccount.id,
              serviceType: 'jira',
              action: 'searchIssues',
              params: {
                jql: `parent = ${child.key} ORDER BY created ASC`,
                maxResults: 50,
              },
            });
            grandchildren = parseChildIssues(gcResult);
          } catch { /* ignore */ }
          return { ...child, grandchildren };
        })
      );

      setChildIssues(childrenWithGc);
    } finally {
      setChildIssuesLoading(false);
    }
  }, [activeAccount]);

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

          // 하위 업무 항목 비동기 조회 (메인 로딩을 블로킹하지 않음)
          if (!isSubTaskType(detail.issueTypeName)) {
            fetchChildIssues(detail.key, detail.issueTypeName);
          } else {
            setChildIssues([]);
          }
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
