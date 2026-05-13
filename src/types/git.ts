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
  /** tag 이름 목록(sha 포함). 가벼운 메타만 — 상세는 별도 조회. */
  tags: TagRef[];
  /** stash 엔트리. M5에선 메시지만, 본문은 후속. */
  stashes: StashRef[];
  /** worktree 목록. 메인 worktree 포함 가능. */
  worktrees: WorktreeRef[];
}

export interface TagRef {
  name: string;
  /** annotated tag일 경우 tag object sha, lightweight면 commit sha */
  sha: string;
}

export interface StashRef {
  /** `stash@{N}` 인덱스 (0이 가장 최근) */
  index: number;
  /** 'WIP on branch: subject' 형태의 메시지 */
  message: string;
  /** stash 대상 브랜치 이름 (파싱 가능 시) */
  branch?: string;
}

export interface WorktreeRef {
  /** worktree 절대 경로 */
  path: string;
  /** HEAD가 가리키는 sha */
  sha: string;
  /** 추적 중인 branch 이름 (detached이면 비어있음) */
  branch?: string;
  /** 메인 worktree 여부 (true면 repo.path와 동일) */
  primary: boolean;
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
  /** 부모가 위치하는 lane (x 좌표 계산용) */
  parentLane: number;
  /** 부모 체인 색상 (재사용된 lane에서 새 chain 시작 시 색이 바뀜) */
  parentColor: string;
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
