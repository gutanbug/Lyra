/**
 * Main process 측 로컬 Git 타입.
 * Renderer의 src/types/git.ts와 shape 동일하지만, main에서 src/* import 불가하므로 별도 선언.
 * 두 파일이 일치하도록 유지해야 한다(향후 빌드 가능 공용 모듈로 통합 검토).
 */
export interface LocalRepo {
  id: string;
  path: string;
  head: string;
  detached: boolean;
  branches: BranchRef[];
  remotes: Record<string, string>;
  tags: TagRef[];
  stashes: StashRef[];
  worktrees: WorktreeRef[];
}

export interface TagRef {
  name: string;
  sha: string;
}

export interface StashRef {
  index: number;
  message: string;
  branch?: string;
}

export interface WorktreeRef {
  path: string;
  sha: string;
  branch?: string;
  primary: boolean;
}

export interface BranchRef {
  name: string;
  scope: 'local' | 'remote';
  sha: string;
  upstream?: {
    remote: string;
    branch: string;
    ahead: number;
    behind: number;
  };
}

export interface Commit {
  sha: string;
  parents: string[];
  author: { name: string; email: string; date: string };
  committer: { name: string; email: string; date: string };
  subject: string;
  body: string;
  refs: string[];
}

export interface GraphNode {
  sha: string;
  row: number;
  lane: number;
  parentLinks: { parentSha: string; parentLane: number }[];
  activeLanes: number[];
  color: string;
}
