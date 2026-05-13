/**
 * GitLab 정규화 타입.
 * 어댑터가 GitLab 응답을 GitHub과 동일한 shape으로 변환한다.
 * Renderer에서는 같은 컴포넌트로 양쪽을 다룬다.
 */

export type { RemoteUser, RemoteRepo, Issue } from './github';
export type { PullRequest as MergeRequest } from './github';

/** GitLab에서도 PullRequest 타입을 그대로 쓰되, 의미를 명확히 하기 위한 alias */
export type { PullRequest } from './github';
