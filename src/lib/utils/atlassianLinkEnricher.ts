/**
 * Confluence 본문 HTML 안의 Atlassian URL을 카드형 마크업으로 변환.
 * Jira 이슈, 프로젝트, 보드, 스프린트, 대시보드, 필터,
 * Confluence 페이지·스페이스·블로그·tiny 링크를 모두 처리한다.
 *
 * 매칭되지 않거나 메타데이터가 없는 URL은 그대로 둔다(평문 폴백).
 */
import type { LinkMeta } from 'components/common/AdfRenderer';
import { classifyAtlassianUrl } from 'lib/utils/atlassianUrlPatterns';

const ISSUE_KEY_RE = /([A-Z][A-Z0-9_]+-\d+)/;

/** HTML에서 Atlassian URL 후보를 추출 (href 또는 data-jira-key) */
export function extractAtlassianUrlsFromHtml(html: string): string[] {
  const set = new Set<string>();

  // 1) href
  const hrefRe = /<a\s[^>]*href="([^"]+)"[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    const href = m[1];
    if (classifyAtlassianUrl(href)) set.add(href);
  }

  // 2) data-jira-key (legacy: confluenceToHtml의 jira 매크로 변환)
  const macroRe = /data-jira-key="([A-Z][A-Z0-9_]+-\d+)"/gi;
  while ((m = macroRe.exec(html)) !== null) {
    set.add(m[1]); // 이슈 키 자체를 식별자로 사용
  }

  return Array.from(set);
}

/**
 * HTML 안의 anchor 태그를 카드 마크업으로 교체.
 * - href 또는 data-jira-key로 식별
 * - linkMetaMap에 매칭되는 메타가 있을 때만 교체
 */
export function enrichAtlassianLinksInHtml(
  html: string,
  linkMetaMap: Record<string, LinkMeta>,
): string {
  if (Object.keys(linkMetaMap).length === 0) return html;

  return html.replace(/<a\s([^>]*)>([\s\S]*?)<\/a>/gi, (full, attrs) => {
    // 1) data-jira-key (legacy)
    const macroKeyMatch = attrs.match(/data-jira-key="([A-Z][A-Z0-9_]+-\d+)"/i);
    if (macroKeyMatch) {
      const meta = linkMetaMap[macroKeyMatch[1]];
      if (meta) return renderCard(attrs, meta);
    }

    // 2) href
    const hrefMatch = attrs.match(/href="([^"]+)"/i);
    if (hrefMatch) {
      const meta = linkMetaMap[hrefMatch[1]];
      if (meta) return renderCard(attrs, meta);
    }

    return full;
  });
}

function renderCard(attrs: string, meta: LinkMeta): string {
  const kindAttr = ` data-link-kind="${escapeAttr(meta.kind)}"`;
  const cleanAttrs = attrs.trim();

  const iconHtml = meta.iconUrl
    ? `<img class="atlassian-rich-link-icon" src="${escapeAttr(meta.iconUrl)}" alt="" />`
    : `<span class="atlassian-rich-link-icon atlassian-rich-link-icon--${escapeAttr(meta.iconKind || 'generic')}"></span>`;

  let statusHtml = '';
  if (meta.kind === 'jira-issue' && meta.statusName) {
    const { bg, color } = getStatusColors(meta.statusName, meta.statusCategory || '');
    statusHtml = `<span class="atlassian-rich-link-status" style="background:${bg};color:${color}">${escapeHtml(meta.statusName)}</span>`;
  }

  return `<a ${cleanAttrs} class="atlassian-rich-link"${kindAttr}>`
    + `<span class="atlassian-rich-link-inner">`
    + iconHtml
    + `<span class="atlassian-rich-link-title">${escapeHtml(meta.title)}</span>`
    + statusHtml
    + `</span></a>`;
}

/** 카테고리 우선 + 한국어 포함, jiraUtils와 동일 정책 */
function getStatusColors(name: string, category: string): { bg: string; color: string } {
  const cat = category.toLowerCase().trim();
  const n = name.toLowerCase();
  if (cat === 'done' || cat === 'green' || cat.includes('완료')) {
    return { bg: '#E3FCEF', color: '#006644' };
  }
  if (cat === 'indeterminate' || cat === 'yellow' || cat === 'blue-gray' || cat.includes('progress') || cat.includes('진행')) {
    return { bg: '#DEEBFF', color: '#0747A6' };
  }
  if (cat === 'new' || cat.includes('to do') || cat.includes('todo') || cat.includes('해야') || cat.includes('할 일')) {
    return { bg: '#DFE1E6', color: '#42526E' };
  }
  if (n.includes('progress') || n.includes('진행') || n.includes('review') || n.includes('검토')) {
    return { bg: '#DEEBFF', color: '#0747A6' };
  }
  if (n.includes('done') || n.includes('완료') || n.includes('closed') || n.includes('resolved')) {
    return { bg: '#E3FCEF', color: '#006644' };
  }
  return { bg: '#DFE1E6', color: '#42526E' };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(text: string): string {
  return escapeHtml(text);
}

/** 호환: 이슈 키 정규식만 노출 (Phase 5에서 LinkMetaResolver가 사용 후 제거) */
export const ATLASSIAN_ISSUE_KEY_RE = ISSUE_KEY_RE;
