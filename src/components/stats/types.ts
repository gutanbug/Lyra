export interface StatusCount {
  name: string;
  category: string;
  count: number;
}

export interface StatusIssue {
  key: string;
  summary: string;
  issueType: string;
}

export interface RawJiraIssue {
  statusName: string;
  statusCategory: string;
  issueType: string;
}

export interface ConfluencePageInfo {
  id: string;
  title: string;
  createdAt: string;
  spaceName: string;
}

export interface StatusGroup {
  category: string;
  color: string;
  statuses: StatusCount[];
  total: number;
}

export interface JiraCtxMenu {
  x: number;
  y: number;
  issueKey: string;
  label: string;
}

export interface ConfluenceCtxMenu {
  x: number;
  y: number;
  pageId: string;
  title: string;
}

export interface SpaceCount {
  name: string;
  count: number;
}

export function getYearOptions(): number[] {
  const years: number[] = [];
  for (let y = 2040; y >= 2020; y--) {
    years.push(y);
  }
  return years;
}
