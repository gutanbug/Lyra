/**
 * Atlassian URL 분류기.
 * URL을 보고 Jira/Confluence의 어떤 리소스(이슈, 보드, 페이지 등)를 가리키는지 식별한다.
 * 매칭되지 않으면 null을 반환한다.
 */
import type { LinkKind } from 'components/common/AdfRenderer';

export interface AtlassianLinkRef {
  kind: LinkKind;
  baseUrl: string;
  url: string;
  ids: {
    issueKey?: string;
    projectKey?: string;
    boardId?: string;
    boardView?: 'board' | 'backlog' | 'timeline';
    sprintId?: string;
    dashboardId?: string;
    filterId?: string;
    pageId?: string;
    spaceKey?: string;
    pageTitle?: string;
    blogTitle?: string;
    tinyKey?: string;
  };
}

const ISSUE_KEY_RE = /([A-Z][A-Z0-9_]+-\d+)/;

function tryParseUrl(url: string): URL | null {
  try { return new URL(url); }
  catch { return null; }
}

/**
 * Atlassian URL을 분류한다.
 *
 * **Currently produces:** jira-issue, jira-project, jira-board, jira-dashboard,
 * jira-filter, confluence-page, confluence-space, confluence-blog, confluence-tiny.
 *
 * **Deferred (returns null for now):** jira-sprint, jira-queue, confluence-attachment.
 *
 * **Host validation:** 호출자는 Atlassian 도메인(*.atlassian.net 등)으로 입력 URL을
 * 제한할 책임이 있다. 이 함수는 path 기반 매칭만 수행하므로,
 * 임의 호스트의 `/browse/X-1` 같은 경로도 매칭될 수 있다.
 *
 * @returns AtlassianLinkRef 또는 매칭 실패 시 null.
 */
export function classifyAtlassianUrl(url: string): AtlassianLinkRef | null {
  const u = tryParseUrl(url);
  if (!u) return null;
  const baseUrl = `${u.protocol}//${u.host}`;
  const path = u.pathname;
  const search = u.searchParams;

  // Jira 이슈: /browse/KEY-123
  const browseMatch = path.match(/^\/browse\/([A-Z][A-Z0-9_]+-\d+)/);
  if (browseMatch) {
    return { kind: 'jira-issue', baseUrl, url, ids: { issueKey: browseMatch[1] } };
  }

  // 주의: selectedIssue 쿼리는 보드/타임라인 URL 위에 우선 적용됨.
  //       이슈 오버레이가 활성화된 상태이므로 issue 카드를 표시하는 게 자연스러움.
  // Jira 이슈: ?selectedIssue=KEY-123
  const selectedIssue = search.get('selectedIssue');
  if (selectedIssue) {
    const m = selectedIssue.match(ISSUE_KEY_RE);
    if (m) return { kind: 'jira-issue', baseUrl, url, ids: { issueKey: m[1] } };
  }

  // Jira 보드: /jira/software/(c/)?projects/{KEY}/boards/{id}(/{view})?
  const boardMatch = path.match(/^\/jira\/software(?:\/c)?\/projects\/([A-Z][A-Z0-9_]+)\/boards\/(\d+)(?:\/(timeline|backlog))?\/?$/);
  if (boardMatch) {
    const [, projectKey, boardId, view] = boardMatch;
    const boardView = (view as 'timeline' | 'backlog') || 'board';
    return { kind: 'jira-board', baseUrl, url, ids: { projectKey, boardId, boardView } };
  }

  // Jira 프로젝트: /jira/{type}(/c)?/projects/{KEY}(/...)?
  const projectMatch = path.match(/^\/jira\/(?:software|servicedesk|core)(?:\/c)?\/projects\/([A-Z][A-Z0-9_]+)\/?$/);
  if (projectMatch) {
    return { kind: 'jira-project', baseUrl, url, ids: { projectKey: projectMatch[1] } };
  }

  // Jira 대시보드: /jira/dashboards/{id}
  const dashboardMatch = path.match(/^\/jira\/dashboards\/(\d+)/);
  if (dashboardMatch) {
    return { kind: 'jira-dashboard', baseUrl, url, ids: { dashboardId: dashboardMatch[1] } };
  }

  // Jira 필터: /issues/?filter={id}
  if (path.startsWith('/issues')) {
    const filterId = search.get('filter');
    if (filterId && /^\d+$/.test(filterId)) {
      return { kind: 'jira-filter', baseUrl, url, ids: { filterId } };
    }
  }

  // Confluence 페이지 (id 형): /wiki/spaces/{space}/pages/{id}(/{slug})?
  const pageIdMatch = path.match(/^\/wiki\/spaces\/([^/]+)\/pages\/(\d+)/);
  if (pageIdMatch) {
    return { kind: 'confluence-page', baseUrl, url, ids: { spaceKey: pageIdMatch[1], pageId: pageIdMatch[2] } };
  }

  // Confluence 페이지 (display 형): /wiki/display/{space}/{title}
  const displayMatch = path.match(/^\/wiki\/display\/([^/]+)\/(.+)$/);
  if (displayMatch) {
    const pageTitle = decodeURIComponent(displayMatch[2].replace(/\+/g, ' '));
    return { kind: 'confluence-page', baseUrl, url, ids: { spaceKey: displayMatch[1], pageTitle } };
  }

  // Confluence 블로그: /wiki/spaces/{space}/blog/...
  const blogMatch = path.match(/^\/wiki\/spaces\/([^/]+)\/blog\//);
  if (blogMatch) {
    return { kind: 'confluence-blog', baseUrl, url, ids: { spaceKey: blogMatch[1] } };
  }

  // Confluence tiny link: /wiki/x/{key}
  const tinyMatch = path.match(/^\/wiki\/x\/([A-Za-z0-9_+/-]+)/);
  if (tinyMatch) {
    return { kind: 'confluence-tiny', baseUrl, url, ids: { tinyKey: tinyMatch[1] } };
  }

  // Confluence 스페이스: /wiki/spaces/{key}(/overview)?
  const spaceMatch = path.match(/^\/wiki\/spaces\/([^/]+)(?:\/overview)?\/?$/);
  if (spaceMatch) {
    return { kind: 'confluence-space', baseUrl, url, ids: { spaceKey: spaceMatch[1] } };
  }

  return null;
}

export function classifyAtlassianUrls(urls: string[]): AtlassianLinkRef[] {
  const out: AtlassianLinkRef[] = [];
  for (const u of urls) {
    const ref = classifyAtlassianUrl(u);
    if (ref) out.push(ref);
  }
  return out;
}
