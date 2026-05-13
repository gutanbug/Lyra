/**
 * Renderer가 보는 GitHub 정규화 타입.
 * 어댑터가 원본 응답을 이 shape로 변환해서 전달한다.
 */

export interface RemoteUser {
  /** GitHub login (예: "octocat") */
  login: string;
  /** 표시 이름 */
  name: string;
  /** Avatar URL */
  avatarUrl: string;
  /** 프로필 URL */
  htmlUrl: string;
}

export interface RemoteRepo {
  /** GitHub repo id */
  id: number;
  /** "owner/name" */
  fullName: string;
  /** 짧은 이름 */
  name: string;
  /** owner login */
  ownerLogin: string;
  /** 설명 (없으면 '') */
  description: string;
  /** private/public */
  isPrivate: boolean;
  defaultBranch: string;
  /** 가시화 URL */
  htmlUrl: string;
  /** clone URL (HTTPS) */
  cloneUrl: string;
  /** 마지막 push 시간 (ISO) */
  pushedAt: string;
  /** 마지막 update 시간 (ISO) */
  updatedAt: string;
  /** star 수 */
  stargazersCount: number;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  /** 본문 markdown */
  body: string;
  state: 'open' | 'closed' | 'merged';
  isDraft: boolean;
  author: RemoteUser;
  /** 대상 base (예: "main") */
  baseRef: string;
  /** 출발 head (예: "feature/x") */
  headRef: string;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  /** 어떤 repo의 PR인지 */
  repoFullName: string;
}

export interface Issue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  author: RemoteUser;
  assignees: RemoteUser[];
  labels: { name: string; color: string }[];
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  repoFullName: string;
}
