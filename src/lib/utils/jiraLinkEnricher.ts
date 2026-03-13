/**
 * Confluence 본문 내 Jira URL 링크를 리치 카드(키 + 요약 + 상태)로 변환
 * HTML 문자열 레벨에서 동작하여 React 재렌더링과 충돌하지 않음
 */

export interface JiraIssueInfo {
  key: string;
  summary: string;
  statusName: string;
  statusCategory: string;
  issueTypeName: string;
}

/** Jira URL에서 이슈 키를 추출 */
function extractIssueKey(href: string): string | null {
  // ?selectedIssue=KEY-123
  const selectedMatch = href.match(/[?&]selectedIssue=([A-Z][A-Z0-9_]+-\d+)/);
  if (selectedMatch) return selectedMatch[1];

  // /browse/KEY-123
  const browseMatch = href.match(/\/browse\/([A-Z][A-Z0-9_]+-\d+)/);
  if (browseMatch) return browseMatch[1];

  return null;
}

/** 링크가 Jira URL인지 판별 */
function isJiraUrl(href: string): boolean {
  return /atlassian\.net\/.*jira/i.test(href) ||
    /atlassian\.net\/browse\//i.test(href) ||
    /\/jira\//i.test(href);
}

/**
 * HTML 문자열에서 Jira 이슈 키 목록을 반환
 * - Jira URL <a> 태그에서 추출
 * - data-jira-key 속성에서 추출 (Jira 매크로)
 */
export function extractJiraKeysFromHtml(html: string): string[] {
  const keys = new Set<string>();

  // 1) Jira URL <a> 태그에서 추출
  const anchorRegex = /<a\s[^>]*href="([^"]*)"[^>]*>/gi;
  let match;
  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[1];
    if (!isJiraUrl(href)) continue;
    const key = extractIssueKey(href);
    if (key) keys.add(key);
  }

  // 2) data-jira-key 속성에서 추출 (Jira 매크로에서 변환된 링크)
  const macroRegex = /data-jira-key="([A-Z][A-Z0-9_]+-\d+)"/gi;
  while ((match = macroRegex.exec(html)) !== null) {
    keys.add(match[1]);
  }

  return Array.from(keys);
}

/**
 * HTML 문자열 내 Jira 링크를 리치 카드 HTML로 교체
 * - Jira URL <a> 태그
 * - data-jira-key <a> 태그 (Jira 매크로)
 */
export function enrichJiraLinksInHtml(
  html: string,
  issueMap: Record<string, JiraIssueInfo>
): string {
  if (Object.keys(issueMap).length === 0) return html;

  // <a ...>텍스트</a> 패턴을 매칭하여 교체
  return html.replace(
    /<a\s([^>]*)>([\s\S]*?)<\/a>/gi,
    (fullMatch, attrs, _innerText) => {
      let key: string | null = null;

      // data-jira-key 속성 확인 (Jira 매크로)
      const macroKeyMatch = attrs.match(/data-jira-key="([A-Z][A-Z0-9_]+-\d+)"/i);
      if (macroKeyMatch) {
        key = macroKeyMatch[1];
      }

      // href에서 Jira URL 확인
      if (!key) {
        const hrefMatch = attrs.match(/href="([^"]*)"/i);
        if (hrefMatch && isJiraUrl(hrefMatch[1])) {
          key = extractIssueKey(hrefMatch[1]);
        }
      }

      if (!key) return fullMatch;
      const info = issueMap[key];
      if (!info) return fullMatch;

      const { bg, color } = getStatusColors(info.statusName, info.statusCategory);

      return `<a ${attrs} class="jira-rich-link">`
        + `<span class="jira-rich-link-inner">`
        + `<span class="jira-rich-link-key">${escapeHtml(info.key)}</span>`
        + `<span class="jira-rich-link-summary">${escapeHtml(info.summary)}</span>`
        + `<span class="jira-rich-link-status" style="background:${bg};color:${color}">${escapeHtml(info.statusName)}</span>`
        + `</span></a>`;
    }
  );
}

function getStatusColors(name: string, category: string): { bg: string; color: string } {
  const cat = category.toLowerCase();
  const n = name.toLowerCase();

  // 완료 (Done) — 초록
  if (cat === 'done' || n.includes('done') || n.includes('완료') || n.includes('closed') || n.includes('resolved')) {
    return { bg: '#E3FCEF', color: '#006644' };
  }
  // 진행 중 (In Progress) — 파랑
  if (cat === 'indeterminate' || cat === 'in progress' || n.includes('progress') || n.includes('진행') || n.includes('review') || n.includes('검토')) {
    return { bg: '#DEEBFF', color: '#0747A6' };
  }
  // 할 일 (To Do) — 회색
  return { bg: '#DFE1E6', color: '#42526E' };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
