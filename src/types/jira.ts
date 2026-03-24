export interface JiraTransition {
  id: string;
  name: string;
  to: {
    name: string;
    statusCategory?: { name?: string; colorName?: string };
  };
}

export interface JiraAssignableUser {
  accountId: string;
  displayName: string;
  avatarUrl: string;
  emailAddress?: string;
}

export interface NormalizedIssue {
  id: string;
  key: string;
  summary: string;
  statusName: string;
  statusCategory: string;
  assigneeName: string;
  issueTypeName: string;
  priorityName: string;
  created: string;
  updated: string;
  duedate: string;
  parentKey: string;
  parentSummary: string;
  subtaskCount: number;
}

export interface EpicGroup {
  key: string;
  summary: string;
  issueTypeName: string;
  statusName: string;
  statusCategory: string;
  assigneeName: string;
  priorityName: string;
  children: NormalizedIssue[];
}

export interface NormalizedDetail {
  key: string;
  summary: string;
  descriptionHtml: string;
  /** 원본 ADF JSON (atlaskit/renderer용) */
  descriptionAdf: unknown;
  statusName: string;
  statusCategory: string;
  assigneeName: string;
  reporterName: string;
  issueTypeName: string;
  priorityName: string;
  created: string;
  updated: string;
  duedate: string;
  parentKey: string;
  parentSummary: string;
  parentIssueTypeName: string;
}

export interface NormalizedComment {
  id: string;
  author: string;
  authorId: string;
  bodyHtml: string;
  rawBody: unknown;
  created: string;
  updated: string;
  replyToId: string;
  replyToName: string;
}

export interface CommentThread {
  comment: NormalizedComment;
  replies: NormalizedComment[];
}

export interface LinkedIssue {
  key: string;
  summary: string;
  statusName: string;
  statusCategory: string;
  issueTypeName: string;
  priorityName: string;
  linkType: string;
}

export interface ChildIssue {
  key: string;
  summary: string;
  statusName: string;
  statusCategory: string;
  assigneeName: string;
  assigneeAvatarUrl: string;
  issueTypeName: string;
  priorityName: string;
}

export interface ConfluenceLink {
  pageId: string;
  title: string;
  url: string;
  lastUpdated?: string;
}

export interface ConfluencePageContent {
  title: string;
  body: string;
}

export interface JiraAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  contentUrl: string;
  thumbnailUrl?: string;
  created: string;
  author: string;
}

export interface JiraProject {
  key: string;
  name: string;
}
