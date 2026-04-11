import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'modules/contexts/account';
import { integrationController } from 'controllers/account';
import { extractJiraKeysFromHtml } from 'lib/utils/jiraLinkEnricher';
import type { JiraIssueInfo } from 'lib/utils/jiraLinkEnricher';
import type { ConfluencePageDetail as PageDetailType, ConfluenceComment } from 'types/confluence';
import type { LinkMeta, FileMeta } from 'components/common/AdfRenderer';
import { str, obj } from 'lib/utils/typeHelpers';
import { extractAllUrlsFromAdf, extractConfluencePageIdFromUrl, extractConfluenceTinyKey, extractIssueKeyFromUrl, extractMediaInfos, extractViewFileMap } from 'lib/utils/adfUtils';
import type { MediaInfo } from 'lib/utils/adfUtils';
import { normalizePageDetail, normalizeComment } from 'lib/utils/confluenceNormalizers';
import { renderMermaidDiagrams } from 'lib/utils/mermaidLoader';

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

/** 첨부파일 정보 */
interface AttInfo {
  title: string;
  mediaType: string;
  downloadUrl: string;
  fileSize: number;
  isImage: boolean;
}

/** rawAttachment → AttInfo 파싱 */
function parseAttachment(item: unknown): AttInfo | null {
  const att = item as Record<string, unknown>;
  const title = str(att.title);
  if (!title) return null;
  const extensions = obj(att.extensions);
  const metadata = obj(att.metadata);
  const mediaType = str(extensions?.mediaType) || str(metadata?.mediaType) || str(att.mediaType);
  const links = obj(att._links);
  const downloadUrl = str(links?.download) || str(links?.self);
  if (!downloadUrl) return null;
  const isImage = mediaType
    ? mediaType.startsWith('image/')
    : /\.(png|jpe?g|gif|svg|webp|bmp|ico|tiff?)$/i.test(title);
  const fileSize = typeof extensions?.fileSize === 'number' ? extensions.fileSize as number
    : typeof att.fileSize === 'number' ? att.fileSize as number
    : parseInt(str(extensions?.fileSize), 10) || 0;
  return { title, mediaType, downloadUrl, fileSize, isImage };
}

/** ADF에서 URL 추출 → linkMetaMap 구성 (페이지/이슈/tiny 링크 일괄 해석) */
async function resolveLinksFromAdf(
  bodyAdf: unknown,
  accountId: string,
): Promise<Record<string, LinkMeta>> {
  const urls = extractAllUrlsFromAdf(bodyAdf);
  if (urls.length === 0) return {};

  const metaMap: Record<string, LinkMeta> = {};
  const pageIdMap = new Map<string, string[]>();
  const issueKeyMap = new Map<string, string[]>();
  const tinyKeyMap = new Map<string, string[]>();

  for (const url of urls) {
    const pid = extractConfluencePageIdFromUrl(url);
    if (pid) { (pageIdMap.get(pid) || (() => { const a: string[] = []; pageIdMap.set(pid, a); return a; })()).push(url); continue; }
    const ik = extractIssueKeyFromUrl(url);
    if (ik) { (issueKeyMap.get(ik) || (() => { const a: string[] = []; issueKeyMap.set(ik, a); return a; })()).push(url); continue; }
    const tk = extractConfluenceTinyKey(url);
    if (tk) { (tinyKeyMap.get(tk) || (() => { const a: string[] = []; tinyKeyMap.set(tk, a); return a; })()).push(url); }
  }

  const tasks: Promise<void>[] = [];

  // Confluence 페이지 제목 조회
  for (const [pid, matchUrls] of pageIdMap.entries()) {
    tasks.push(
      integrationController.invoke({
        accountId,
        serviceType: 'confluence',
        action: 'getPageContent',
        params: { pageId: pid },
      }).then((result) => {
        const title = str((result as Record<string, unknown>).title);
        if (title) {
          for (const u of matchUrls) metaMap[u] = { type: 'confluence', title };
        }
      }).catch(() => { /* ignore */ })
    );
  }

  // Confluence tiny link 해석
  const tinyKeys = Array.from(tinyKeyMap.keys());
  if (tinyKeys.length > 0) {
    tasks.push(
      integrationController.invoke({
        accountId,
        serviceType: 'confluence',
        action: 'resolveTinyLinks',
        params: { tinyKeys },
      }).then((result) => {
        if (result && typeof result === 'object') {
          for (const [tk, info] of Object.entries(result as Record<string, Record<string, unknown>>)) {
            const title = str(info.title);
            if (title) {
              for (const u of (tinyKeyMap.get(tk) || [])) metaMap[u] = { type: 'confluence', title };
            }
          }
        }
      }).catch(() => { /* ignore */ })
    );
  }

  // Jira 이슈 메타 조회
  const issueKeys = Array.from(issueKeyMap.keys());
  if (issueKeys.length > 0) {
    tasks.push(
      integrationController.invoke({
        accountId,
        serviceType: 'jira',
        action: 'searchIssues',
        params: { jql: `key IN (${issueKeys.join(',')})`, maxResults: issueKeys.length },
      }).then((result) => {
        const r = result as Record<string, unknown>;
        const list = (r?.issues ?? []) as Record<string, unknown>[];
        if (Array.isArray(list)) {
          for (const item of list) {
            const key = str(item.key);
            const fields = obj(item.fields) || item;
            const rawSummary = fields.summary;
            const summary = typeof rawSummary === 'string' ? rawSummary : str(rawSummary);
            const statusObj = obj(fields.status);
            const statusCatObj = obj(statusObj?.statusCategory);
            const statusName = str(statusObj?.name);
            const statusCategoryKey = str(statusCatObj?.key);
            const statusCategory = str(statusCatObj?.name) || statusCategoryKey || str(statusCatObj?.colorName);
            if (key) {
              for (const u of (issueKeyMap.get(key) || [])) {
                metaMap[u] = { type: 'jira', title: summary, issueKey: key, statusName, statusCategory, statusCategoryKey };
              }
            }
          }
        }
      }).catch(() => { /* ignore */ })
    );
  }

  await Promise.all(tasks);
  return metaMap;
}

export function useConfluencePageDetail(pageId: string) {
  const { activeAccount } = useAccount();
  const layoutRef = useRef<HTMLDivElement>(null);
  const activeAccountRef = useRef(activeAccount);
  activeAccountRef.current = activeAccount;

  const [page, setPage] = useState<PageDetailType | null>(null);
  const [comments, setComments] = useState<ConfluenceComment[]>([]);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attachmentUrlMap, setAttachmentUrlMap] = useState<Record<string, string>>({});
  const [fileMetaMap, setFileMetaMap] = useState<Record<string, FileMeta>>({});
  const [jiraIssueMap, setJiraIssueMap] = useState<Record<string, JiraIssueInfo>>({});
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [linkMetaMap, setLinkMetaMap] = useState<Record<string, LinkMeta>>({});

  // ESC 키로 라이트박스 닫기
  useEffect(() => {
    if (!lightboxSrc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxSrc(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxSrc]);

  // ── 통합 데이터 페칭 ──
  useEffect(() => {
    if (!activeAccount || !pageId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const accountId = activeAccount.id;

    const fetchAll = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 1단계: 페이지, 댓글, 첨부파일 동시 조회
        const [pageResult, commentsResult, attachmentsResult] = await Promise.all([
          integrationController.invoke({
            accountId,
            serviceType: 'confluence',
            action: 'getPageContent',
            params: { pageId },
          }),
          integrationController.invoke({
            accountId,
            serviceType: 'confluence',
            action: 'getPageComments',
            params: { pageId },
          }).catch(() => []),
          integrationController.invoke({
            accountId,
            serviceType: 'confluence',
            action: 'getPageAttachments',
            params: { pageId },
          }).catch(() => []),
        ]);

        if (cancelled) return;

        // 페이지 파싱
        const detail = normalizePageDetail(pageResult as Record<string, unknown>);

        // 댓글 파싱
        const rawComments = Array.isArray(commentsResult) ? commentsResult : [];
        const normalizedComments = rawComments.map((c) => normalizeComment(c as Record<string, unknown>));
        setComments(normalizedComments);

        // 첨부파일 파싱 (페이지 레벨)
        const rawAttachments = Array.isArray(attachmentsResult) ? attachmentsResult : [];
        const pageAtts: AttInfo[] = [];
        for (const item of rawAttachments) {
          const info = parseAttachment(item);
          if (info) pageAtts.push(info);
        }

        // 댓글 ADF에서 media ID 추출 → 댓글 레벨 첨부파일 조회 필요 여부 판단
        const commentIdsWithMedia: string[] = [];
        const commentMediaInfos: MediaInfo[] = [];
        for (const comment of normalizedComments) {
          if (comment.bodyAdf) {
            const infos = extractMediaInfos(comment.bodyAdf);
            if (infos.length > 0) {
              commentMediaInfos.push(...infos);
              commentIdsWithMedia.push(comment.id);
            }
          }
        }

        // 2단계: 링크 해석 + Jira 이슈 + 댓글 첨부파일을 동시 진행
        const linkMetaPromise = detail.bodyAdf
          ? resolveLinksFromAdf(detail.bodyAdf, accountId)
          : Promise.resolve({} as Record<string, LinkMeta>);

        // Jira 이슈 정보 조회 (HTML 렌더링용)
        const jiraIssuePromise = detail.bodyHtml
          ? (async () => {
              const keys = extractJiraKeysFromHtml(detail.bodyHtml);
              if (keys.length === 0) return {};
              try {
                const result = await integrationController.invoke({
                  accountId,
                  serviceType: 'jira',
                  action: 'searchIssues',
                  params: { jql: `key IN (${keys.join(',')})`, maxResults: keys.length },
                });
                const r = result as Record<string, unknown>;
                const issues = (r.issues ?? []) as Record<string, unknown>[];
                const map: Record<string, JiraIssueInfo> = {};
                for (const issue of issues) {
                  const key = str(issue.key);
                  const summary = str(issue.summary);
                  const status = obj(issue.status);
                  const statusName = str(status?.name);
                  const statusCategory = str(status?.category);
                  const issueType = obj(issue.issue_type);
                  const issueTypeName = str(issueType?.name);
                  if (key) map[key] = { key, summary, statusName, statusCategory, issueTypeName };
                }
                return map;
              } catch { return {}; }
            })()
          : Promise.resolve({});

        // 댓글 레벨 첨부파일 조회 (댓글에 media가 있는 경우만)
        const commentAttsPromise: Promise<{ rawAtts: unknown[]; parsed: AttInfo[] }> =
          commentIdsWithMedia.length > 0
            ? (async () => {
                const results = await Promise.all(
                  commentIdsWithMedia.map((cid) =>
                    integrationController.invoke({
                      accountId,
                      serviceType: 'confluence',
                      action: 'getPageAttachments',
                      params: { pageId: cid },
                    }).catch(() => [])
                  )
                );
                const rawAtts: unknown[] = [];
                const parsed: AttInfo[] = [];
                for (const result of results) {
                  const items = Array.isArray(result) ? result : [];
                  for (const item of items) {
                    rawAtts.push(item);
                    const info = parseAttachment(item);
                    if (info) parsed.push(info);
                  }
                }
                return { rawAtts, parsed };
              })()
            : Promise.resolve({ rawAtts: [] as unknown[], parsed: [] as AttInfo[] });

        // 댓글 첨부파일 조회 완료 대기 (매칭에 필요)
        const commentAttsData = await commentAttsPromise;

        if (cancelled) return;

        // 전체 첨부파일 통합 (페이지 + 댓글 레벨)
        const allRawAttachments = [...rawAttachments, ...commentAttsData.rawAtts];
        const allAtts = [...pageAtts, ...commentAttsData.parsed];

        // 전체 media 정보 통합 (본문 + 댓글 ADF)
        const bodyMediaInfos = detail.bodyAdf ? extractMediaInfos(detail.bodyAdf) : [];
        const allMediaInfos = [...bodyMediaInfos, ...commentMediaInfos];

        // media ID → 첨부파일 매칭
        const fileMetas: Record<string, FileMeta> = {};
        if (allMediaInfos.length > 0 && allAtts.length > 0) {
          // Storage format에서 view-file 매크로 localId → filename 매핑 추출
          const viewFileMap = detail.storageRaw ? extractViewFileMap(detail.storageRaw) : {};

          const mediaToAtt = new Map<string, AttInfo>();
          const matchedTitles = new Set<string>();

          // 1차: mediaApiFileId 직접 매칭
          for (const { id: mid } of allMediaInfos) {
            const byMediaApi = allRawAttachments.find((a) => {
              const att = a as Record<string, unknown>;
              const ext = obj(att.extensions);
              const meta = obj(att.metadata);
              const props = obj(meta?.properties);
              const mediaApiId = str(att.mediaApiFileId)
                || str(ext?.mediaApiFileId)
                || str(ext?.fileId)
                || str(meta?.mediaApiFileId)
                || str(props?.['media-api-file-id']);
              return mediaApiId && mediaApiId === mid;
            });
            if (byMediaApi) {
              const title = str((byMediaApi as Record<string, unknown>).title);
              const info = allAtts.find((a) => a.title === title);
              if (info) { mediaToAtt.set(mid, info); matchedTitles.add(title); }
            }
          }

          // 2차: localId → Storage format filename 매칭 (view-file 매크로)
          for (const { id: mid, localId, fileName } of allMediaInfos) {
            if (mediaToAtt.has(mid)) continue;
            // localId로 Storage format의 view-file 매크로 파일명 조회
            const resolvedName = (localId && viewFileMap[localId]) || fileName;
            if (resolvedName) {
              const info = allAtts.find((a) => a.title === resolvedName && !matchedTitles.has(a.title));
              if (info) { mediaToAtt.set(mid, info); matchedTitles.add(info.title); }
            }
          }

          // 3차: 순서 기반 폴백 — 이미지 첨부파일만 대상으로 매칭
          const unmatchedMids = allMediaInfos.map((m) => m.id).filter((mid) => !mediaToAtt.has(mid));
          const unmatchedAtts = allAtts.filter((a) => !matchedTitles.has(a.title) && a.isImage);
          for (let i = 0; i < unmatchedMids.length && i < unmatchedAtts.length; i++) {
            mediaToAtt.set(unmatchedMids[i], unmatchedAtts[i]);
          }

          // 이미지 다운로드 (비동기, 로딩 블로킹 안 함) + 파일 메타 구성
          for (const [mid, info] of mediaToAtt.entries()) {
            if (info.isImage) {
              integrationController.invoke({
                accountId,
                serviceType: 'confluence',
                action: 'getAttachmentContent',
                params: { downloadUrl: info.downloadUrl },
              }).then((dataUrl) => {
                if (!cancelled && typeof dataUrl === 'string') {
                  setAttachmentUrlMap((prev) => ({ ...prev, [mid]: dataUrl }));
                }
              }).catch(() => { /* ignore */ });
            } else {
              fileMetas[mid] = {
                filename: info.title,
                mediaType: info.mediaType || 'application/octet-stream',
                size: info.fileSize,
                downloadUrl: info.downloadUrl,
              };
            }
          }
        }

        // HTML 본문/댓글용 이미지 첨부파일 다운로드 (파일명 키)
        for (const info of allAtts) {
          if (info.isImage) {
            integrationController.invoke({
              accountId,
              serviceType: 'confluence',
              action: 'getAttachmentContent',
              params: { downloadUrl: info.downloadUrl },
            }).then((dataUrl) => {
              if (!cancelled && typeof dataUrl === 'string') {
                setAttachmentUrlMap((prev) => ({ ...prev, [info.title]: dataUrl }));
              }
            }).catch(() => { /* ignore */ });
          }
        }

        // 링크 해석 + Jira 이슈 조회 완료 대기
        const [resolvedLinks, resolvedJiraMap] = await Promise.all([linkMetaPromise, jiraIssuePromise]);

        if (cancelled) return;

        // 모든 데이터 한번에 반영 → URL 깜빡임 없이 렌더링
        setLinkMetaMap(resolvedLinks);
        setJiraIssueMap(resolvedJiraMap);
        if (Object.keys(fileMetas).length > 0) setFileMetaMap(fileMetas);
        setPage(detail);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          console.error('[ConfluencePageDetail] fetch error:', err);
          setError('페이지를 불러올 수 없습니다.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [activeAccount, pageId]);

  // 페이지 전환 시 초기화 + 스크롤
  useEffect(() => {
    scrollToTop(layoutRef.current);
    setPage(null);
    setComments([]);
    setAttachmentUrlMap({});
    setFileMetaMap({});
    setLinkMetaMap({});
    setJiraIssueMap({});
    setLightboxSrc(null);
  }, [pageId]);

  // Mermaid 다이어그램 렌더링
  useEffect(() => {
    if (!page?.bodyHtml) return;
    const container = layoutRef.current;
    if (!container) return;
    renderMermaidDiagrams(container, pageId).catch(() => { /* ignore */ });
  }, [page?.bodyHtml, pageId, attachmentUrlMap]);

  return {
    activeAccount,
    layoutRef,
    page,
    comments,
    commentsExpanded,
    setCommentsExpanded,
    isLoading,
    error,
    attachmentUrlMap,
    fileMetaMap,
    jiraIssueMap,
    lightboxSrc,
    setLightboxSrc,
    linkMetaMap,
    setPage,
  };
}
