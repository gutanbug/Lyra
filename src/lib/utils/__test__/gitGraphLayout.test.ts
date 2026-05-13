import { describe, it, expect } from 'vitest';
import { layoutGraph, maxLaneCount } from '../gitGraphLayout';
import type { Commit } from 'types/git';

const noAuthor = { name: '', email: '', date: '' };
function commit(sha: string, parents: string[] = []): Commit {
  return {
    sha,
    parents,
    author: noAuthor,
    committer: noAuthor,
    subject: '',
    body: '',
    refs: [],
  };
}

describe('gitGraphLayout', () => {
  it('empty input returns empty', () => {
    expect(layoutGraph([])).toEqual([]);
    expect(maxLaneCount([])).toBe(0);
  });

  it('single root commit goes to lane 0', () => {
    const nodes = layoutGraph([commit('A')]);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].lane).toBe(0);
    expect(nodes[0].parentLinks).toEqual([]);
    expect(maxLaneCount(nodes)).toBe(1);
  });

  it('linear history stays on lane 0', () => {
    // A → B → C (A is newest, has parent B; B has parent C; C is root)
    const nodes = layoutGraph([
      commit('A', ['B']),
      commit('B', ['C']),
      commit('C'),
    ]);
    expect(nodes.map((n) => n.lane)).toEqual([0, 0, 0]);
    expect(nodes[0].parentLinks).toEqual([{ parentSha: 'B', parentLane: 0 }]);
    expect(nodes[1].parentLinks).toEqual([{ parentSha: 'C', parentLane: 0 }]);
    expect(nodes[2].parentLinks).toEqual([]);
    expect(maxLaneCount(nodes)).toBe(1);
  });

  it('side branch off main allocates a new lane', () => {
    // A (lane 0) → B (lane 0, parent of A)
    // X (lane ?) → B (lane 0, parent of X too)
    // Topo order: A, X, B  (B is root, two children)
    const nodes = layoutGraph([
      commit('A', ['B']),
      commit('X', ['B']),
      commit('B'),
    ]);
    // A starts on lane 0. X is not waited-for by any lane → lane 1.
    // When B is processed, lane 0 expects B and lane 1 expects B — both close, B occupies lane 0 (the first match).
    expect(nodes[0].lane).toBe(0);
    expect(nodes[1].lane).toBe(1);
    expect(nodes[2].lane).toBe(0);
    expect(nodes[0].parentLinks).toEqual([{ parentSha: 'B', parentLane: 0 }]);
    expect(nodes[1].parentLinks).toEqual([{ parentSha: 'B', parentLane: 0 }]);
  });

  it('merge commit allocates new lane for second parent', () => {
    // M (lane 0) has parents [A, B]. A on lane 0, B on new lane 1.
    // Topo order: M, A, B (assuming A and B are both leaves merged)
    const nodes = layoutGraph([
      commit('M', ['A', 'B']),
      commit('A'),
      commit('B'),
    ]);
    expect(nodes[0].lane).toBe(0);
    expect(nodes[0].parentLinks.map((p) => p.parentSha)).toEqual(['A', 'B']);
    // A continues lane 0 (first parent), B goes to lane 1
    expect(nodes[1].lane).toBe(0);
    expect(nodes[2].lane).toBe(1);
    expect(nodes[0].parentLinks).toEqual([
      { parentSha: 'A', parentLane: 0 },
      { parentSha: 'B', parentLane: 1 },
    ]);
  });

  it('parent outside the window keeps its own lane fallback', () => {
    // A has parent OUT (not in commits[]) — parentLane should fall back to A's lane.
    const nodes = layoutGraph([commit('A', ['OUT'])]);
    expect(nodes[0].parentLinks).toEqual([{ parentSha: 'OUT', parentLane: 0 }]);
  });

  it('activeLanes reflects open lanes after each row', () => {
    // Same side-branch case
    const nodes = layoutGraph([
      commit('A', ['B']),
      commit('X', ['B']),
      commit('B'),
    ]);
    // After A: lane 0 expects B → activeLanes = [0]
    expect(nodes[0].activeLanes).toEqual([0]);
    // After X: lane 0 expects B, lane 1 expects B → activeLanes = [0, 1]
    expect(nodes[1].activeLanes).toEqual([0, 1]);
    // After B (root): both lanes closed → []
    expect(nodes[2].activeLanes).toEqual([]);
  });

  it('unrelated root commits go to distinct lanes (no lane reuse)', () => {
    // 끊긴 그래프 회귀 테스트: 두 root commit A, B가 같은 lane에 배치되면 시각적 단절.
    // 재사용 금지 정책으로 A는 lane 0, B는 lane 1에 가야 한다.
    const nodes = layoutGraph([
      commit('A'),
      commit('B'),
    ]);
    expect(nodes[0].lane).toBe(0);
    expect(nodes[1].lane).toBe(1);
    expect(maxLaneCount(nodes)).toBe(2);
  });

  it('color rotates through LANE_COLORS palette', () => {
    const nodes = layoutGraph([
      commit('M', ['A', 'B', 'C']), // octopus merge — 3 parents
      commit('A'),
      commit('B'),
      commit('C'),
    ]);
    // M is lane 0 → blue. A continues lane 0. B is lane 1, C is lane 2.
    expect(nodes[0].color).toBe('#3b82f6');
    expect(nodes[1].color).toBe('#3b82f6');
    expect(nodes[2].color).toBe('#10b981');
    expect(nodes[3].color).toBe('#f59e0b');
  });
});
