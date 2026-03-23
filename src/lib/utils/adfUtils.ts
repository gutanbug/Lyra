/**
 * ADF(Atlassian Document Format) 관련 공통 유틸리티
 */
import type { ConfluenceLink } from 'types/jira';
import { str, obj } from 'lib/utils/typeHelpers';

/** URL에서 Jira 이슈 키 추출 (/browse/PROJ-123 또는 ?selectedIssue=PROJ-123) */
export function extractIssueKeyFromUrl(url: string): string | null {
  const browseMatch = url.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/i);
  if (browseMatch) return browseMatch[1];
  const selectedMatch = url.match(/[?&]selectedIssue=([A-Z][A-Z0-9]+-\d+)/i);
  return selectedMatch ? selectedMatch[1] : null;
}

/** URL에서 Confluence 페이지 ID 추출 (/pages/{pageId}/) */
export function extractConfluencePageIdFromUrl(url: string): string | null {
  const m = url.match(/\/pages\/(\d+)/);
  return m ? m[1] : null;
}

/** URL에서 Confluence tiny link 키 추출 (/wiki/x/{key}) */
export function extractConfluenceTinyKey(url: string): string | null {
  const m = url.match(/\/wiki\/x\/([A-Za-z0-9_+/-]+)/);
  return m ? m[1] : null;
}

/** ADF에서 inlineCard/blockCard/embedCard의 URL 추출 */
export function extractCardUrlsFromAdf(adf: unknown): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    if (n.type === 'inlineCard' || n.type === 'blockCard' || n.type === 'embedCard') {
      const attrs = n.attrs as Record<string, unknown> | undefined;
      const url = attrs?.url as string | undefined;
      if (url && !seen.has(url)) {
        urls.push(url);
        seen.add(url);
      }
    }
    const content = n.content as unknown[] | undefined;
    if (Array.isArray(content)) content.forEach(walk);
  }
  walk(adf);
  return urls;
}

/** ADF 트리에서 카드 URL + 텍스트 link mark URL 모두 추출 */
export function extractAllUrlsFromAdf(adf: unknown): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  function add(url: string) {
    if (url && !seen.has(url)) { seen.add(url); urls.push(url); }
  }
  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    if (n.type === 'inlineCard' || n.type === 'blockCard' || n.type === 'embedCard') {
      const attrs = n.attrs as Record<string, unknown> | undefined;
      if (attrs?.url) add(String(attrs.url));
    }
    if (n.type === 'text' && Array.isArray(n.marks)) {
      for (const mark of n.marks as Record<string, unknown>[]) {
        if (mark.type === 'link') {
          const attrs = mark.attrs as Record<string, unknown> | undefined;
          if (attrs?.href) add(String(attrs.href));
        }
      }
    }
    const content = n.content as unknown[] | undefined;
    if (Array.isArray(content)) content.forEach(walk);
  }
  walk(adf);
  return urls;
}

/** ADF에서 media / mediaInline 노드의 file ID 목록 추출 */
export function extractMediaIds(adf: unknown): string[] {
  const ids: string[] = [];
  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    if ((n.type === 'media' || n.type === 'mediaInline') && n.attrs) {
      const attrs = n.attrs as Record<string, unknown>;
      if ((attrs.type === 'file' || !attrs.type) && typeof attrs.id === 'string') {
        ids.push(attrs.id);
      }
    }
    const content = n.content as unknown[] | undefined;
    if (Array.isArray(content)) content.forEach(walk);
  }
  walk(adf);
  return ids;
}

// ── JiraIssueDetail에서 이동한 유틸리티 ──

/** 원격 링크에서 Confluence 링크 추출 */
export function extractConfluenceLinks(remoteLinks: unknown[]): ConfluenceLink[] {
  const links: ConfluenceLink[] = [];
  for (const link of remoteLinks) {
    if (!link || typeof link !== 'object') continue;
    const rl = link as Record<string, unknown>;
    const objectData = obj(rl.object);
    if (!objectData) continue;

    const url = str(objectData.url);
    const title = str(objectData.title);

    const pageIdMatch = url.match(/\/pages\/(\d+)/);
    if (pageIdMatch && pageIdMatch[1]) {
      links.push({ pageId: pageIdMatch[1], title: title || 'Confluence 문서', url });
    }
  }
  return links;
}

/** Confluence 검색 결과에서 페이지 정보 추출 */
export function extractConfluenceSearchResults(results: unknown[]): ConfluenceLink[] {
  const links: ConfluenceLink[] = [];
  for (const item of results) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;

    const content = obj(r.content) || r;
    const id = str(content.id);
    const title = str(content.title) || str(r.title);
    const url = str(r.url) || str(content._links && (content._links as any)?.webui) || '';

    const versionObj = obj(content.version);
    const lastUpdated = str(versionObj?.when);

    if (id) {
      links.push({ pageId: id, title: title || 'Confluence 문서', url, lastUpdated });
    }
  }
  return links;
}

/** 두 Confluence 링크 소스를 병합 (중복 제거) */
export function mergeConfluenceLinks(remote: ConfluenceLink[], search: ConfluenceLink[]): ConfluenceLink[] {
  const seen = new Set<string>();
  const merged: ConfluenceLink[] = [];
  for (const link of [...remote, ...search]) {
    if (!seen.has(link.pageId)) {
      seen.add(link.pageId);
      merged.push(link);
    }
  }
  return merged;
}

/** HTML에서 인라인 카드 및 일반 Jira/Confluence 링크의 href를 추출 */
export function extractInlineCardUrls(html: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const hrefRegex = /<a\s+[^>]*href="([^"]*)"[^>]*data-inline-card="true"[^>]*>/g;
  const hrefRegex2 = /<a\s+[^>]*data-inline-card="true"[^>]*href="([^"]*)"[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = hrefRegex.exec(html)) !== null) {
    if (m[1] && !seen.has(m[1])) { urls.push(m[1]); seen.add(m[1]); }
  }
  while ((m = hrefRegex2.exec(html)) !== null) {
    if (m[1] && !seen.has(m[1])) { urls.push(m[1]); seen.add(m[1]); }
  }
  const regularRegex = /<a\s+[^>]*href="([^"]*)"[^>]*>/gi;
  while ((m = regularRegex.exec(html)) !== null) {
    const href = m[1];
    if (seen.has(href)) continue;
    if (extractIssueKeyFromUrl(href) || extractConfluencePageIdFromUrl(href) || extractConfluenceTinyKey(href)) {
      urls.push(href);
      seen.add(href);
    }
  }
  return urls;
}
