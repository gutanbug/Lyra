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
  return extractMediaInfos(adf).map((m) => m.id);
}

/** media 노드의 ID + localId + 파일명 정보 추출 (파일 매칭용) */
export interface MediaInfo {
  id: string;
  localId?: string;
  fileName?: string;
}

export function extractMediaInfos(adf: unknown): MediaInfo[] {
  const infos: MediaInfo[] = [];
  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    if ((n.type === 'media' || n.type === 'mediaInline') && n.attrs) {
      const attrs = n.attrs as Record<string, unknown>;
      if ((attrs.type === 'file' || !attrs.type) && typeof attrs.id === 'string') {
        const fileName = typeof attrs.__fileName === 'string' ? attrs.__fileName : undefined;
        const localId = typeof attrs.localId === 'string' ? attrs.localId : undefined;
        infos.push({ id: attrs.id, localId, fileName });
      }
    }
    const content = n.content as unknown[] | undefined;
    if (Array.isArray(content)) content.forEach(walk);
  }
  walk(adf);
  return infos;
}

/**
 * Confluence Storage Format HTML에서 view-file 매크로의 localId → 파일명 매핑 추출.
 * ADF mediaInline.localId와 매칭하여 올바른 첨부파일을 연결하는 데 사용.
 */
export function extractViewFileMap(storageHtml: string): Record<string, string> {
  const map: Record<string, string> = {};
  // view-file 매크로: <ac:structured-macro ac:local-id="X" ... ac:name="view-file" ...>
  //   <ac:parameter ac:name="name"><ri:attachment ri:filename="Y" ...></ri:attachment></ac:parameter>
  const macroRegex = /<ac:structured-macro[^>]*ac:local-id="([^"]*)"[^>]*ac:name="view-file"[^>]*>[\s\S]*?<\/ac:structured-macro>/gi;
  // 반대 순서도 고려 (name이 local-id보다 앞에 올 수 있음)
  const macroRegex2 = /<ac:structured-macro[^>]*ac:name="view-file"[^>]*ac:local-id="([^"]*)"[^>]*>[\s\S]*?<\/ac:structured-macro>/gi;

  function extractFromMatches(regex: RegExp) {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(storageHtml)) !== null) {
      const localId = m[1];
      const fnMatch = m[0].match(/ri:filename="([^"]*)"/);
      if (localId && fnMatch && fnMatch[1]) {
        map[localId] = fnMatch[1];
      }
    }
  }
  extractFromMatches(macroRegex);
  extractFromMatches(macroRegex2);
  return map;
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

/**
 * 에디터용 ADF 전처리 — 에디터가 지원하지 않는 노드를 변환
 *
 * - emoji 노드 → 유니코드 텍스트 노드 (EmojiProvider 없이도 표시)
 * - extension / bodiedExtension 노드 → 패널 또는 빈 단락 (매크로 graceful 처리)
 * - media/mediaInline (file type) → 빈 텍스트 (Media API 무한 로딩 방지)
 * - inlineCard/blockCard/embedCard → 텍스트 링크
 */
export function preprocessAdfForEditor(adf: unknown): unknown {
  if (!adf || typeof adf !== 'object') return adf;
  const doc = adf as Record<string, unknown>;
  if (doc.type !== 'doc' || !Array.isArray(doc.content)) return adf;

  function walk(node: unknown): unknown {
    if (!node || typeof node !== 'object') return node;
    const n = node as Record<string, unknown>;
    const attrs = n.attrs as Record<string, unknown> | undefined;

    // emoji → 유니코드 텍스트
    if (n.type === 'emoji') {
      const text = String(attrs?.text || attrs?.shortName || '');
      return text ? { type: 'text', text } : null;
    }

    // extension / bodiedExtension → 정보 패널 또는 빈 단락
    if (n.type === 'extension' || n.type === 'bodiedExtension') {
      const extKey = String(attrs?.extensionKey || '').toLowerCase();
      const params = attrs?.parameters as Record<string, unknown> | undefined;
      const macroMeta = params?.macroMetadata as Record<string, unknown> | undefined;
      const macroTitle = String(macroMeta?.title || attrs?.extensionKey || '매크로');

      // bodiedExtension은 내부 콘텐츠를 패널로 래핑
      if (n.type === 'bodiedExtension' && Array.isArray(n.content)) {
        return {
          type: 'panel',
          attrs: { panelType: 'info' },
          content: (n.content as unknown[]).map(walk).filter(Boolean),
        };
      }

      // 일반 extension → 플레이스홀더 텍스트가 있는 패널
      return {
        type: 'panel',
        attrs: { panelType: 'note' },
        content: [{
          type: 'paragraph',
          content: [{
            type: 'text',
            text: `[${macroTitle}]`,
            marks: [{ type: 'em' }],
          }],
        }],
      };
    }

    // media (file type, 해결되지 않은 ID) → 플레이스홀더
    if (n.type === 'media') {
      if (attrs?.type === 'external') return node; // 이미 외부 URL이면 통과
      if (attrs?.type === 'file') {
        return {
          type: 'text',
          text: `[첨부파일]`,
          marks: [{ type: 'em' }],
        };
      }
    }

    // mediaInline → 플레이스홀더
    if (n.type === 'mediaInline') {
      if (attrs?.type === 'external') return node;
      return { type: 'text', text: '[첨부파일]', marks: [{ type: 'em' }] };
    }

    // mediaSingle/mediaGroup → 내부 media를 재귀 처리
    if (n.type === 'mediaSingle' || n.type === 'mediaGroup') {
      const children = Array.isArray(n.content)
        ? (n.content as unknown[]).map(walk).filter(Boolean)
        : [];
      if (children.length === 0) return { type: 'paragraph', content: [] };
      return { ...n, content: children };
    }

    // inlineCard → 텍스트 링크
    if (n.type === 'inlineCard') {
      const url = String(attrs?.url || '');
      return {
        type: 'text',
        text: url || '[링크]',
        marks: url ? [{ type: 'link', attrs: { href: url } }] : [],
      };
    }

    // blockCard / embedCard → 단락 + 링크
    if (n.type === 'blockCard' || n.type === 'embedCard') {
      const url = String(attrs?.url || '');
      return {
        type: 'paragraph',
        content: [{
          type: 'text',
          text: url || '[링크]',
          marks: url ? [{ type: 'link', attrs: { href: url } }] : [],
        }],
      };
    }

    // 재귀 처리
    if (Array.isArray(n.content)) {
      return {
        ...n,
        content: (n.content as unknown[]).map(walk).filter(Boolean),
      };
    }

    return node;
  }

  return {
    ...doc,
    content: (doc.content as unknown[]).map(walk).filter(Boolean),
  };
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
