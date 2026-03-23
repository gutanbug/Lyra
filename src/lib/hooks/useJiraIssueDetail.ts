/**
 * Jira 이슈 상세 데이터 페칭 및 상태 관리 커스텀 훅
 * JiraIssueDetail 컨테이너에서 데이터 로직을 분리
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { integrationController } from 'controllers/account';
import { adfToText } from 'lib/utils/adfToText';
import { confluenceToHtml } from 'lib/utils/confluenceToHtml';
import { str, obj, isEpicType, isSubTaskType } from 'lib/utils/jiraUtils';
import {
  extractIssueKeyFromUrl,
  extractConfluencePageIdFromUrl,
  extractConfluenceTinyKey,
  extractCardUrlsFromAdf,
  extractMediaIds,
  extractConfluenceLinks,
  extractConfluenceSearchResults,
  mergeConfluenceLinks,
  extractInlineCardUrls,
} from 'lib/utils/adfUtils';
import {
  normalizeDetail,
  normalizeComments,
  parseChildIssues,
  extractLinkedIssues,
} from 'lib/utils/jiraNormalizers';
import type { NormalizedDetail, NormalizedComment, LinkedIssue, ChildIssue, ConfluenceLink, ConfluencePageContent, JiraAttachment } from 'types/jira';
import type { LinkMeta, FileMeta } from 'components/common/AdfRenderer';

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
  activeAccount: { id: string; credentials: unknown; metadata?: Record<string, unknown> } | null;
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

  // Confluence 연결 문서
  const [confluenceLinks, setConfluenceLinks] = useState<ConfluenceLink[]>([]);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [pageContents, setPageContents] = useState<Record<string, ConfluencePageContent>>({});
  const [loadingPages, setLoadingPages] = useState<Set<string>>(new Set());

  // 하위 업무 항목 (직접 하위 + 손자 이슈)
  const [childIssues, setChildIssues] = useState<ChildWithGrandchildren[]>([]);
  const [childIssuesLoading, setChildIssuesLoading] = useState(false);
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(new Set());

  // 인라인 카드 링크 → 메타 정보 매핑
  const [linkMetaMap, setLinkMetaMap] = useState<Record<string, LinkMeta>>({});

  // 첨부 이미지
  const [attachments, setAttachments] = useState<JiraAttachment[]>([]);
  const [attachmentImages, setAttachmentImages] = useState<Record<string, string>>({});
  const [mediaUrlMap, setMediaUrlMap] = useState<Record<string, string>>({});
  const [fileMetaMap, setFileMetaMap] = useState<Record<string, FileMeta>>({});
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

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
          },
        });
        for (const ci of parseChildIssues(childResult)) {
          if (!seenKeys.has(ci.key)) {
            directChildren.push(ci);
            seenKeys.add(ci.key);
          }
        }
      } catch { /* ignore */ }

      // 2) Epic Link 폴백 (classic Jira 프로젝트)
      if (isEpicType(issueTypeName)) {
        try {
          const epicLinkResult = await integrationController.invoke({
            accountId: activeAccount.id,
            serviceType: 'jira',
            action: 'searchIssues',
            params: {
              jql: `"Epic Link" = ${detailKey} ORDER BY created ASC`,
              maxResults: 100,
            },
          });
          for (const ci of parseChildIssues(epicLinkResult)) {
            if (!seenKeys.has(ci.key)) {
              directChildren.push(ci);
              seenKeys.add(ci.key);
            }
          }
        } catch { /* Epic Link 미지원 인스턴스 무시 */ }
      }

      // 직접 하위 이슈를 먼저 표시 (손자 이슈 로딩 전)
      setChildIssues(directChildren.map((c) => ({ ...c, grandchildren: [] })));

      // 3) 각 직접 하위 이슈의 손자 이슈 조회
      const childrenWithGc = await Promise.all(
        directChildren.map(async (child) => {
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

  // 인라인 카드 URL에서 메타 정보를 일괄 해석
  const resolveCardTitles = useCallback(async (urls: string[]) => {
    if (!activeAccount) return;
    const metaMap: Record<string, LinkMeta> = {};
    const issueKeyMap = new Map<string, string[]>(); // issueKey → urls
    const pageIdMap = new Map<string, string[]>();    // pageId → urls
    const tinyKeyMap = new Map<string, string[]>();   // tinyKey → urls

    for (const url of urls) {
      const ik = extractIssueKeyFromUrl(url);
      if (ik) {
        const existing = issueKeyMap.get(ik) || [];
        existing.push(url);
        issueKeyMap.set(ik, existing);
        continue;
      }
      const pid = extractConfluencePageIdFromUrl(url);
      if (pid) {
        const existing = pageIdMap.get(pid) || [];
        existing.push(url);
        pageIdMap.set(pid, existing);
        continue;
      }
      const tk = extractConfluenceTinyKey(url);
      if (tk) {
        const existing = tinyKeyMap.get(tk) || [];
        existing.push(url);
        tinyKeyMap.set(tk, existing);
      }
    }

    // Jira 이슈 메타 일괄 조회
    const issueKeys = Array.from(issueKeyMap.keys());
    if (issueKeys.length > 0) {
      try {
        const jql = `key IN (${issueKeys.join(',')})`;
        const result = await integrationController.invoke({
          accountId: activeAccount.id,
          serviceType: 'jira',
          action: 'searchIssues',
          params: { jql, maxResults: issueKeys.length },
        });
        const r = result as Record<string, unknown>;
        const list = (r?.issues ?? r?.values ?? []) as Record<string, unknown>[];
        if (Array.isArray(list)) {
          for (const item of list) {
            const key = str(item.key);
            const fields = obj(item.fields) || item;
            const rawSummary = fields.summary;
            const summary = typeof rawSummary === 'string' ? rawSummary : adfToText(rawSummary);
            const statusObj = obj(fields.status);
            const statusCatObj = obj(statusObj?.statusCategory);
            const statusName = str(statusObj?.name);
            const statusCategoryKey = str(statusCatObj?.key);
            const statusCategory = str(statusCatObj?.name) || statusCategoryKey || str(statusCatObj?.colorName);
            if (key && summary) {
              const matchUrls = issueKeyMap.get(key) || [];
              for (const u of matchUrls) {
                metaMap[u] = {
                  type: 'jira',
                  title: summary,
                  issueKey: key,
                  statusName,
                  statusCategory,
                  statusCategoryKey,
                };
              }
            }
          }
        }
      } catch { /* ignore */ }
    }

    // Confluence 페이지 제목 일괄 조회
    const pageIds = Array.from(pageIdMap.keys());
    await Promise.all(pageIds.map(async (pid) => {
      try {
        const data = await integrationController.invoke({
          accountId: activeAccount.id,
          serviceType: 'jira',
          action: 'getConfluencePageContent',
          params: { pageId: pid },
        });
        if (data && typeof data === 'object') {
          const page = data as Record<string, unknown>;
          const title = str(page.title);
          if (title) {
            const matchUrls = pageIdMap.get(pid) || [];
            for (const u of matchUrls) {
              metaMap[u] = { type: 'confluence', title };
            }
          }
        }
      } catch { /* ignore */ }
    }));

    // Confluence tiny link (/wiki/x/{key}) 일괄 해석
    const tinyKeys = Array.from(tinyKeyMap.keys());
    if (tinyKeys.length > 0) {
      try {
        const data = await integrationController.invoke({
          accountId: activeAccount.id,
          serviceType: 'confluence',
          action: 'resolveTinyLinks',
          params: { tinyKeys },
        });
        if (data && typeof data === 'object') {
          const results = data as Record<string, Record<string, unknown>>;
          for (const [tk, info] of Object.entries(results)) {
            const title = str(info.title);
            if (title) {
              const matchUrls = tinyKeyMap.get(tk) || [];
              for (const u of matchUrls) {
                metaMap[u] = { type: 'confluence', title };
              }
            }
          }
        }
      } catch { /* ignore */ }
    }

    if (Object.keys(metaMap).length > 0) {
      setLinkMetaMap((prev) => ({ ...prev, ...metaMap }));
    }
  }, [activeAccount]);

  // ref 동기화
  resolveCardTitlesRef.current = resolveCardTitles;

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

          // 첨부파일 추출 및 이미지 로드
          const rawAttachments = raw.attachment as unknown[] | undefined;
          if (Array.isArray(rawAttachments) && rawAttachments.length > 0) {
            const allParsed: JiraAttachment[] = rawAttachments
              .filter((a) => a && typeof a === 'object')
              .map((a) => {
                const att = a as Record<string, unknown>;
                const authorObj = obj(att.author);
                return {
                  id: str(att.id),
                  filename: str(att.filename),
                  mimeType: str(att.mimeType),
                  size: typeof att.size === 'number' ? att.size : 0,
                  contentUrl: str(att.content),
                  thumbnailUrl: str(att.thumbnail) || undefined,
                  created: str(att.created),
                  author: str(authorObj?.displayName) || str(authorObj?.display_name) || str(authorObj?.name) || '',
                };
              })
              .filter((a) => a.id);
            const imageAtts = allParsed.filter((a) => a.mimeType.startsWith('image/'));
            const fileAtts = allParsed.filter((a) => !a.mimeType.startsWith('image/'));
            setAttachments(imageAtts);

            // ADF 설명 + 댓글에서 media ID 추출 → 첨부파일 매핑
            const rawDesc = (raw.fields && typeof raw.fields === 'object')
              ? (raw.fields as Record<string, unknown>).description
              : raw.description;
            const mediaIds = extractMediaIds(rawDesc);
            // 댓글 본문의 media ID도 추출
            if (Array.isArray(commentsData)) {
              for (const c of commentsData) {
                if (c && typeof c === 'object') {
                  const commentMediaIds = extractMediaIds((c as Record<string, unknown>).body);
                  mediaIds.push(...commentMediaIds);
                }
              }
            }

            // mediaApiFileId로 직접 매핑 시도, 없으면 순서 기반 매핑
            const mediaToAttachment: Record<string, JiraAttachment> = {};
            const matchedAttIds = new Set<string>();
            for (const mid of mediaIds) {
              const byMediaApi = rawAttachments.find((a) => {
                const att = a as Record<string, unknown>;
                return str(att.mediaApiFileId) === mid;
              });
              if (byMediaApi) {
                const attId = str((byMediaApi as Record<string, unknown>).id);
                const found = allParsed.find((p) => p.id === attId);
                if (found) {
                  mediaToAttachment[mid] = found;
                  matchedAttIds.add(found.id);
                }
              }
            }
            // 매칭되지 않은 media ID는 순서 기반으로 매칭
            const unmatchedMedia = mediaIds.filter((mid) => !mediaToAttachment[mid]);
            const unmatchedAtts = allParsed.filter((a) => !matchedAttIds.has(a.id));
            for (let i = 0; i < unmatchedMedia.length && i < unmatchedAtts.length; i++) {
              mediaToAttachment[unmatchedMedia[i]] = unmatchedAtts[i];
            }

            // 이미지를 인증 프록시를 통해 로드
            for (const att of imageAtts) {
              integrationController.invoke({
                accountId: activeAccount!.id,
                serviceType: 'jira',
                action: 'getAttachmentContent',
                params: { contentUrl: att.contentUrl },
              }).then((dataUrl) => {
                if (typeof dataUrl === 'string') {
                  setAttachmentImages((prev) => ({ ...prev, [att.id]: dataUrl }));
                  for (const [mid, mappedAtt] of Object.entries(mediaToAttachment)) {
                    if (mappedAtt.id === att.id) {
                      setMediaUrlMap((prev) => ({ ...prev, [mid]: dataUrl }));
                    }
                  }
                }
              }).catch(() => { /* ignore */ });
            }

            // 비이미지 파일 → fileMetaMap 구성
            const fileMetas: Record<string, FileMeta> = {};
            for (const [mid, att] of Object.entries(mediaToAttachment)) {
              if (!att.mimeType.startsWith('image/')) {
                fileMetas[mid] = {
                  filename: att.filename,
                  mediaType: att.mimeType || 'application/octet-stream',
                  size: att.size,
                  downloadUrl: att.contentUrl,
                };
              }
            }
            // mediaApiFileId 매핑이 안 된 파일 첨부도 fileMetaMap에 추가
            for (const att of fileAtts) {
              if (!matchedAttIds.has(att.id)) {
                fileMetas[att.id] = {
                  filename: att.filename,
                  mediaType: att.mimeType || 'application/octet-stream',
                  size: att.size,
                  downloadUrl: att.contentUrl,
                };
              }
            }
            if (Object.keys(fileMetas).length > 0) {
              setFileMetaMap(fileMetas);
            }
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

        // Confluence: remoteLinks + search 결과 병합
        const fromRemote = Array.isArray(remoteLinksData) ? extractConfluenceLinks(remoteLinksData) : [];
        const fromSearch = Array.isArray(confluenceSearchData) ? extractConfluenceSearchResults(confluenceSearchData) : [];
        setConfluenceLinks(mergeConfluenceLinks(fromRemote, fromSearch));

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
          resolveCardTitles(uniqueCardUrls);
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

    // 아직 로드하지 않은 페이지만 fetch
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
          const page = data as Record<string, unknown>;
          const bodyObj = obj(page.body);
          const storageObj = obj(bodyObj?.storage);
          const rawBody = str(storageObj?.value);
          const bodyHtml = rawBody ? confluenceToHtml(rawBody) : '';
          setPageContents((prev) => ({
            ...prev,
            [pageId]: {
              title: str(page.title) || link.title,
              body: bodyHtml || '<p>(내용 없음)</p>',
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
  };
}
