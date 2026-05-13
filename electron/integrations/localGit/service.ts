import simpleGit from 'simple-git';
import type { SimpleGit } from 'simple-git';
import { dialog } from 'electron';
import type { BranchRef, LocalRepo, StashRef, TagRef, WorktreeRef } from './types';

/**
 * 열린 로컬 Repo의 SimpleGit 인스턴스 풀.
 * key: repoId (path 해시), value: SimpleGit 인스턴스
 */
const repoPool = new Map<string, { path: string; git: SimpleGit }>();

/** 경로로부터 repoId 생성 (간단히 path 자체를 base64로 — 추후 해시 변경 가능) */
export function pathToRepoId(absPath: string): string {
  return Buffer.from(absPath).toString('base64url');
}

/**
 * 디렉토리 선택 다이얼로그. 사용자가 취소하면 null.
 * Renderer에서 IPC를 통해 호출 — 절대경로 반환.
 */
export async function openDialog(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: '로컬 Git 저장소 열기',
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
}

/**
 * 절대 경로의 디렉토리를 Git 저장소로 연다.
 * - .git 디렉토리가 없으면 throw('NOT_A_REPO')
 * - 성공 시 repoPool에 인스턴스 등록 + meta 반환
 */
export async function openRepo(absPath: string): Promise<LocalRepo> {
  const git = simpleGit(absPath);
  const isRepo = await git.checkIsRepo().catch(() => false);
  if (!isRepo) {
    const e = new Error('NOT_A_REPO') as Error & { code: string };
    e.code = 'NOT_A_REPO';
    throw e;
  }
  const id = pathToRepoId(absPath);
  repoPool.set(id, { path: absPath, git });
  return getRepoMeta(id);
}

/**
 * repoId로 열린 Repo의 현재 상태(HEAD/branches/remotes)를 다시 읽어온다.
 * Watcher가 변경을 감지하면 이 함수로 새 meta를 가져온다(M7+).
 * @throws Error('NOT_OPEN') — repoPool에 없는 경우
 */
export async function getRepoMeta(repoId: string): Promise<LocalRepo> {
  const cached = repoPool.get(repoId);
  if (!cached) {
    const e = new Error('NOT_OPEN') as Error & { code: string };
    e.code = 'NOT_OPEN';
    throw e;
  }
  const { path: absPath, git } = cached;

  // HEAD: symbolic-ref가 가능하면 branch 이름, 아니면 detached HEAD로 sha 사용.
  let head = '';
  let detached = false;
  try {
    const symbolic = (await git.raw(['symbolic-ref', '--short', '-q', 'HEAD'])).trim();
    if (symbolic) {
      head = symbolic;
    } else {
      throw new Error('detached');
    }
  } catch {
    try {
      head = (await git.revparse(['HEAD'])).trim();
      detached = true;
    } catch {
      head = '';
      detached = true;
    }
  }

  // Branches (local + remote). branches['-a', '-v']는 remotes/* 키도 포함.
  const branches: BranchRef[] = [];
  try {
    const summary = await git.branch(['-a', '-v']);
    for (const [name, info] of Object.entries(summary.branches)) {
      if (name.startsWith('remotes/')) {
        // remotes/origin/HEAD → origin/main 형태의 포인터는 건너뛴다.
        if (name.endsWith('/HEAD')) continue;
        branches.push({
          name: name.slice('remotes/'.length),
          scope: 'remote',
          sha: info.commit,
        });
      } else {
        branches.push({
          name,
          scope: 'local',
          sha: info.commit,
        });
      }
    }
  } catch {
    /* 새 repo는 branch가 0개일 수 있다 — 빈 배열 그대로 */
  }

  // Remotes
  const remotes: Record<string, string> = {};
  try {
    const remoteList = await git.getRemotes(true);
    for (const r of remoteList) {
      remotes[r.name] = r.refs.fetch || r.refs.push || '';
    }
  } catch {
    /* remote 없음 */
  }

  // Tags: `git for-each-ref refs/tags --format=%(refname:short)\t%(objectname)`
  const tags: TagRef[] = [];
  try {
    const raw = await git.raw([
      'for-each-ref',
      '--format=%(refname:short)\t%(objectname)',
      'refs/tags',
    ]);
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const [name, sha] = trimmed.split('\t');
      if (name && sha) tags.push({ name, sha });
    }
  } catch {
    /* tag 없음 */
  }

  // Stashes: `git stash list`
  const stashes: StashRef[] = [];
  try {
    const raw = await git.raw(['stash', 'list']);
    for (const line of raw.split('\n')) {
      const m = line.match(/^stash@\{(\d+)\}:\s*(.+)$/);
      if (!m) continue;
      const index = parseInt(m[1], 10);
      const message = m[2];
      // 'WIP on <branch>: ...' / 'On <branch>: ...' 패턴에서 branch 추출
      const bm = message.match(/^(?:WIP on|On)\s+([^:]+):/);
      stashes.push({ index, message, branch: bm ? bm[1] : undefined });
    }
  } catch {
    /* stash 없음 */
  }

  // Worktrees: `git worktree list --porcelain` → 블록 단위 파싱
  const worktrees: WorktreeRef[] = [];
  try {
    const raw = await git.raw(['worktree', 'list', '--porcelain']);
    const blocks = raw.split(/\n\n+/);
    for (const block of blocks) {
      const wPath = block.match(/^worktree\s+(.+)$/m)?.[1]?.trim();
      const sha = block.match(/^HEAD\s+([0-9a-f]+)$/m)?.[1]?.trim() ?? '';
      const branchRaw = block.match(/^branch\s+(.+)$/m)?.[1]?.trim();
      const isDetached = /^detached$/m.test(block);
      if (!wPath) continue;
      const branch = branchRaw ? branchRaw.replace(/^refs\/heads\//, '') : undefined;
      worktrees.push({
        path: wPath,
        sha,
        branch: isDetached ? undefined : branch,
        primary: wPath === absPath,
      });
    }
  } catch {
    /* worktree 명령 미지원/실패 */
  }

  return { id: repoId, path: absPath, head, detached, branches, remotes, tags, stashes, worktrees };
}

/** repoId로 SimpleGit 인스턴스 가져오기 (없으면 새로 생성) */
export function getGit(repoId: string, absPath: string): SimpleGit {
  const cached = repoPool.get(repoId);
  if (cached) return cached.git;
  const git = simpleGit(absPath);
  repoPool.set(repoId, { path: absPath, git });
  return git;
}

/** 시스템 git 설치 여부 확인 (M8에서 부트 시 호출) */
export async function checkGitInstalled(): Promise<{ installed: boolean; version?: string }> {
  try {
    const git = simpleGit();
    const result = await git.raw(['--version']);
    return { installed: true, version: result.trim() };
  } catch {
    return { installed: false };
  }
}
