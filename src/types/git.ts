/** 로컬 Git 저장소 (호스팅 비의존) */
export interface LocalRepo {
  /** 저장소 식별자 (main 측에서 발급, repoPath 해시 등) */
  id: string;
  /** 절대 경로 */
  path: string;
  /** 현재 HEAD ref name (branch 이름 또는 detached HEAD 시 sha) */
  head: string;
  /** detached HEAD 여부 */
  detached: boolean;
  /** 로컬 + 원격 branches */
  branches: BranchRef[];
  /** remote URLs (key: remote name, value: fetch url) */
  remotes: Record<string, string>;
}

export interface BranchRef {
  name: string;
  /** 'local' | 'remote' */
  scope: 'local' | 'remote';
  /** 가리키는 commit sha */
  sha: string;
  /** 원격 추적 정보 (로컬 브랜치 한정) */
  upstream?: {
    remote: string;
    branch: string;
    ahead: number;
    behind: number;
  };
}

export interface Commit {
  sha: string;
  /** 부모 sha 배열 (병합 커밋은 2개 이상) */
  parents: string[];
  author: {
    name: string;
    email: string;
    /** ISO timestamp */
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
  /** 첫 줄(subject) */
  subject: string;
  /** 본문(없으면 빈 문자열) */
  body: string;
  /** 이 커밋을 가리키는 ref 이름들 (branch/tag) */
  refs: string[];
}

/** 그래프 렌더링용 노드 (lane 할당 후) */
export interface GraphNode {
  sha: string;
  /** 행 인덱스 (0이 최신) */
  row: number;
  /** lane 인덱스 (0이 가장 왼쪽) */
  lane: number;
  /** 부모로 향하는 연결선 정보 */
  parentLinks: ParentLink[];
  /** 이 행에서 같은 시점에 존재하는 모든 활성 lane (수직선 그리기용) */
  activeLanes: number[];
  /** 노드 색상 (lane → palette) */
  color: string;
}

export interface ParentLink {
  parentSha: string;
  /** 부모가 위치하는 lane */
  parentLane: number;
}

export type GitErrorCode =
  | 'OAUTH_DENIED'
  | 'OAUTH_EXPIRED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'RATE_LIMITED'
  | 'NETWORK'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'NOT_A_REPO'
  | 'GIT_NOT_INSTALLED'
  | 'GIT_COMMAND_FAILED'
  | 'UNKNOWN';

export interface GitError {
  code: GitErrorCode;
  message: string;
  /** 원본 에러 (디버깅용) */
  cause?: unknown;
}
