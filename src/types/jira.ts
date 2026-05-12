export interface JiraTransition {
  id: string;
  name: string;
  to: {
    name: string;
    statusCategory?: { name?: string; colorName?: string };
  };
  /** expand=transitions.fields 응답에 포함되는 필드 메타 (필드ID → 메타) */
  fields?: Record<string, JiraTransitionField>;
}

export interface JiraTransitionFieldSchema {
  type: string; // option, array, string, number ...
  items?: string; // type=array 일 때 항목 타입 (option, version, user ...)
  custom?: string;
  customId?: number;
  system?: string;
}

export interface JiraTransitionFieldAllowedValue {
  id?: string;
  value?: string;
  name?: string;
  description?: string;
}

export interface JiraTransitionField {
  required: boolean;
  name: string;
  hasDefaultValue?: boolean;
  schema: JiraTransitionFieldSchema;
  allowedValues?: JiraTransitionFieldAllowedValue[];
  defaultValue?: unknown;
  operations?: string[];
}

export interface JiraVersion {
  id: string;
  name: string;
  released?: boolean;
  archived?: boolean;
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
  /** 진짜 부모 댓글 ID — Jira properties에서 추출 (있으면 답글, 없으면 최상위) */
  parentCommentId: string;
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
  parentKey?: string;
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
  bodyAdf?: unknown;
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

export interface JiraProjectFieldSchema {
  type: string;
  items?: string;
  custom?: string;
  customId?: number;
  system?: string;
}

export interface JiraProjectField {
  id: string;
  name: string;
  required: boolean;
  schema: JiraProjectFieldSchema;
  /**
   * createmeta가 반환하는 옵션 후보 목록.
   * option/array<option> 입력 UI에서 사용. 일부 필드(특히 system 필드)는
   * 비어있을 수 있으며, 그 경우 호출자는 array<version>/array<component>처럼
   * 별도 IPC로 옵션을 가져와야 한다.
   */
  allowedValues?: Array<Record<string, unknown>>;
}
