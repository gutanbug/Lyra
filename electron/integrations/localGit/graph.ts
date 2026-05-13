import type { Commit, GraphNode } from './types';

/**
 * git log --all --topo-order --parents 결과를 파싱해 Commit[]을 반환.
 * 실제 구현은 M6에서.
 */
export async function getCommitGraph(
  _repoId: string,
  _absPath: string,
  _options: { limit?: number; skip?: number } = {},
): Promise<{ commits: Commit[]; nodes: GraphNode[] }> {
  throw new Error('getCommitGraph not yet implemented (M6)');
}
