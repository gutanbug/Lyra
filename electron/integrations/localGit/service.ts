import simpleGit from 'simple-git';
import type { SimpleGit } from 'simple-git';
import type { LocalRepo } from './types';

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
 * 경로가 git 저장소인지 확인. 추후 구현.
 * @throws Error('NOT_A_REPO')
 */
export async function openRepo(_absPath: string): Promise<LocalRepo> {
  throw new Error('openRepo not yet implemented (M5)');
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
