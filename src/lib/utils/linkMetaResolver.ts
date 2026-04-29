/**
 * 인라인 카드/링크의 메타(title, statusName 등) 일괄 해석 유틸.
 *
 * Jira 이슈 / Confluence 페이지 / Confluence tiny link 3종을 병렬 해석하여
 * AdfRenderer의 linkMetaMap 포맷으로 반환한다.
 *
 * @example
 *   const meta = await resolveLinkMetaFromAdf(bodyAdf, accountId);
 *   setLinkMetaMap((prev) => ({ ...prev, ...meta }));
 */
import { integrationController } from 'controllers/account';
import { str, obj } from 'lib/utils/typeHelpers';
import { adfToText } from 'lib/utils/adfToText';
import {
  extractAllUrlsFromAdf,
  extractIssueKeyFromUrl,
  extractConfluencePageIdFromUrl,
  extractConfluenceTinyKey,
} from 'lib/utils/adfUtils';
import type { LinkMeta } from 'components/common/AdfRenderer';

export interface ResolveLinkMetaOptions {
  /** Jira summary가 ADF 객체일 때 adfToText로 폴백 (기본 true) */
  adfSummaryFallback?: boolean;
  /** summary가 없는 Jira 이슈는 map에서 제외 (기본 true, 기존 Jira 훅 동작 보존) */
  requireSummary?: boolean;
}

/** URL 목록을 3종으로 분류 */
function classifyUrls(urls: string[]): {
  issueKeyMap: Map<string, string[]>;
  pageIdMap: Map<string, string[]>;
  tinyKeyMap: Map<string, string[]>;
} {
  const issueKeyMap = new Map<string, string[]>();
  const pageIdMap = new Map<string, string[]>();
  const tinyKeyMap = new Map<string, string[]>();

  const push = (map: Map<string, string[]>, key: string, url: string) => {
    const existing = map.get(key);
    if (existing) existing.push(url);
    else map.set(key, [url]);
  };

  for (const url of urls) {
    const ik = extractIssueKeyFromUrl(url);
    if (ik) { push(issueKeyMap, ik, url); continue; }
    const pid = extractConfluencePageIdFromUrl(url);
    if (pid) { push(pageIdMap, pid, url); continue; }
    const tk = extractConfluenceTinyKey(url);
    if (tk) { push(tinyKeyMap, tk, url); }
  }

  return { issueKeyMap, pageIdMap, tinyKeyMap };
}

/** Jira 이슈 메타 일괄 조회 */
async function resolveJiraIssues(
  issueKeyMap: Map<string, string[]>,
  accountId: string,
  adfSummaryFallback: boolean,
  requireSummary: boolean,
): Promise<Record<string, LinkMeta>> {
  const metaMap: Record<string, LinkMeta> = {};
  const issueKeys = Array.from(issueKeyMap.keys());
  if (issueKeys.length === 0) return metaMap;

  try {
    const result = await integrationController.invoke({
      accountId,
      serviceType: 'jira',
      action: 'searchIssues',
      params: { jql: `key IN (${issueKeys.join(',')})`, maxResults: issueKeys.length },
    });
    const r = (result as Record<string, unknown>) ?? {};
    const list = (r.issues ?? r.values ?? []) as Record<string, unknown>[];
    if (!Array.isArray(list)) return metaMap;

    for (const item of list) {
      const key = str(item.key);
      const fields = obj(item.fields) || item;
      const rawSummary = fields.summary;
      const summary = typeof rawSummary === 'string'
        ? rawSummary
        : adfSummaryFallback ? adfToText(rawSummary) : str(rawSummary);
      const statusObj = obj(fields.status);
      const statusCatObj = obj(statusObj?.statusCategory);
      const statusName = str(statusObj?.name);
      const statusCategoryKey = str(statusCatObj?.key);
      const statusCategory = str(statusCatObj?.name) || statusCategoryKey || str(statusCatObj?.colorName);

      if (!key) continue;
      if (requireSummary && !summary) continue;

      const matchUrls = issueKeyMap.get(key) || [];
      for (const u of matchUrls) {
        metaMap[u] = {
          kind: 'jira-issue',
          type: 'jira',
          title: summary,
          issueKey: key,
          statusName,
          statusCategory,
          statusCategoryKey,
          iconKind: 'jira-issue-type',
        };
      }
    }
  } catch { /* ignore — P2에서 에러 전파 개선 예정 */ }

  return metaMap;
}

/** Confluence 페이지 제목 일괄 조회 (serviceType: 'confluence' + getPageContent) */
async function resolveConfluencePages(
  pageIdMap: Map<string, string[]>,
  accountId: string,
): Promise<Record<string, LinkMeta>> {
  const metaMap: Record<string, LinkMeta> = {};
  const entries = Array.from(pageIdMap.entries());

  await Promise.all(entries.map(async ([pid, matchUrls]) => {
    try {
      const data = await integrationController.invoke({
        accountId,
        serviceType: 'confluence',
        action: 'getPageContent',
        params: { pageId: pid },
      });
      const page = obj(data);
      if (!page) return;
      const title = str(page.title);
      if (!title) return;
      for (const u of matchUrls) metaMap[u] = {
        kind: 'confluence-page',
        type: 'confluence',
        title,
        iconKind: 'confluence-page',
      };
    } catch { /* ignore */ }
  }));

  return metaMap;
}

/** Confluence tiny link(/wiki/x/{key}) 일괄 해석 */
async function resolveConfluenceTinyLinks(
  tinyKeyMap: Map<string, string[]>,
  accountId: string,
): Promise<Record<string, LinkMeta>> {
  const metaMap: Record<string, LinkMeta> = {};
  const tinyKeys = Array.from(tinyKeyMap.keys());
  if (tinyKeys.length === 0) return metaMap;

  try {
    const data = await integrationController.invoke({
      accountId,
      serviceType: 'confluence',
      action: 'resolveTinyLinks',
      params: { tinyKeys },
    });
    const results = obj(data);
    if (!results) return metaMap;
    for (const [tk, info] of Object.entries(results)) {
      const infoObj = obj(info);
      if (!infoObj) continue;
      const title = str(infoObj.title);
      if (!title) continue;
      for (const u of (tinyKeyMap.get(tk) || [])) {
        metaMap[u] = {
          kind: 'confluence-page',
          type: 'confluence',
          title,
          iconKind: 'confluence-page',
        };
      }
    }
  } catch { /* ignore */ }

  return metaMap;
}

/**
 * URL 목록을 받아 linkMetaMap을 빌드한다.
 * 호출자가 `setLinkMetaMap(prev => ({ ...prev, ...result }))`로 병합한다.
 */
export async function resolveLinkMetaMap(
  urls: string[],
  accountId: string,
  options?: ResolveLinkMetaOptions,
): Promise<Record<string, LinkMeta>> {
  if (urls.length === 0) return {};

  const adfSummaryFallback = options?.adfSummaryFallback ?? true;
  const requireSummary = options?.requireSummary ?? true;

  const { issueKeyMap, pageIdMap, tinyKeyMap } = classifyUrls(urls);

  const [jiraMeta, pageMeta, tinyMeta] = await Promise.all([
    resolveJiraIssues(issueKeyMap, accountId, adfSummaryFallback, requireSummary),
    resolveConfluencePages(pageIdMap, accountId),
    resolveConfluenceTinyLinks(tinyKeyMap, accountId),
  ]);

  return { ...jiraMeta, ...pageMeta, ...tinyMeta };
}

/**
 * ADF 문서에서 직접 모든 URL을 추출하여 linkMetaMap을 빌드한다.
 * (inlineCard / blockCard / embedCard / text link mark 포함)
 */
export async function resolveLinkMetaFromAdf(
  adf: unknown,
  accountId: string,
  options?: ResolveLinkMetaOptions,
): Promise<Record<string, LinkMeta>> {
  const urls = extractAllUrlsFromAdf(adf);
  return resolveLinkMetaMap(urls, accountId, options);
}
