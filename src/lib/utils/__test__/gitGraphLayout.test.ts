import { describe, it, expect } from 'vitest';
import { LANE_COLORS, layoutGraph, maxLaneCount } from '../gitGraphLayout';
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

  it('linear history stays on lane 0 with consistent chain color', () => {
    // A → B → C (A is newest, has parent B; B has parent C; C is root)
    const nodes = layoutGraph([
      commit('A', ['B']),
      commit('B', ['C']),
      commit('C'),
    ]);
    expect(nodes.map((n) => n.lane)).toEqual([0, 0, 0]);
    expect(nodes[0].parentLinks).toEqual([{ parentSha: 'B', parentLane: 0, parentColor: LANE_COLORS[0] }]);
    expect(nodes[1].parentLinks).toEqual([{ parentSha: 'C', parentLane: 0, parentColor: LANE_COLORS[0] }]);
    expect(nodes[2].parentLinks).toEqual([]);
    expect(maxLaneCount(nodes)).toBe(1);
    // 모두 같은 chain이므로 같은 색
    expect(new Set(nodes.map((n) => n.color)).size).toBe(1);
  });

  it('side branch off main allocates a new lane', () => {
    const nodes = layoutGraph([
      commit('A', ['B']),
      commit('X', ['B']),
      commit('B'),
    ]);
    expect(nodes[0].lane).toBe(0);
    expect(nodes[1].lane).toBe(1);
    expect(nodes[2].lane).toBe(0);
    expect(nodes[0].parentLinks[0]).toMatchObject({ parentSha: 'B', parentLane: 0 });
    expect(nodes[1].parentLinks[0]).toMatchObject({ parentSha: 'B', parentLane: 0 });
  });

  it('merge commit allocates new lane for second parent', () => {
    const nodes = layoutGraph([
      commit('M', ['A', 'B']),
      commit('A'),
      commit('B'),
    ]);
    expect(nodes[0].lane).toBe(0);
    expect(nodes[0].parentLinks.map((p) => p.parentSha)).toEqual(['A', 'B']);
    expect(nodes[1].lane).toBe(0);
    expect(nodes[2].lane).toBe(1);
    expect(nodes[0].parentLinks[0]).toMatchObject({ parentSha: 'A', parentLane: 0 });
    expect(nodes[0].parentLinks[1]).toMatchObject({ parentSha: 'B', parentLane: 1 });
  });

  it('parent outside the window keeps its own lane fallback', () => {
    const nodes = layoutGraph([commit('A', ['OUT'])]);
    expect(nodes[0].parentLinks[0]).toMatchObject({ parentSha: 'OUT', parentLane: 0 });
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

  it('aggressive lane reuse: freed lane immediately reused by next unrelated commit', () => {
    // 그래프 폭 최소화를 위해 freed lane을 즉시 재사용.
    // A는 lane 0 (chain 0), 부모 없음 → freed.
    // B는 같은 lane 0 재사용하지만 새 chain id가 부여되어 색상이 다름.
    const nodes = layoutGraph([
      commit('A'),
      commit('B'),
    ]);
    expect(nodes[0].lane).toBe(0);
    expect(nodes[1].lane).toBe(0); // 같은 lane
    expect(nodes[0].color).not.toBe(nodes[1].color); // 다른 색 — 시각적으로 구분
    expect(maxLaneCount(nodes)).toBe(1);
  });

  it('many unrelated roots all reuse lane 0 with distinct chain colors', () => {
    // 9개 root commit이 lane 0을 연속 재사용. 폭 = 1 lane.
    // 각 commit은 새 chain id를 받아 색상이 모두 다름 (팔레트 길이 8까지 unique, 그 이상 cycle).
    const seq = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map((s) => commit(s));
    const nodes = layoutGraph(seq);
    expect(nodes.every((n) => n.lane === 0)).toBe(true);
    expect(maxLaneCount(nodes)).toBe(1);
    // 처음 LANE_COLORS.length(8)개의 chain은 distinct color
    const firstEight = new Set(nodes.slice(0, LANE_COLORS.length).map((n) => n.color));
    expect(firstEight.size).toBe(LANE_COLORS.length);
  });

  describe('M6+ chain-based compaction', () => {
    it('demo: re-uses lanes for non-overlapping chains via post-pass remap', () => {
      // 두 개의 독립 chain이 시간상 겹치지 않으면 같은 target lane으로 압축되어야 한다.
      // 1차 패스의 aggressive reuse도 같은 결과를 내지만, compaction이 그 결과를 보존하는지 확인.
      const nodes = layoutGraph([
        commit('A'), // row 0: 새 chain 0 lane 0, root → freed
        commit('B'), // row 1: 새 chain 1 lane 0 (재사용), root
        commit('C'), // row 2: 새 chain 2 lane 0 (재사용), root
      ]);
      expect(nodes.every((n) => n.lane === 0)).toBe(true);
      expect(maxLaneCount(nodes)).toBe(1);
      // 각 chain은 별도 색
      expect(new Set(nodes.map((n) => n.color)).size).toBe(3);
    });

    it('preserves merge ordering: M[A,B] keeps A on lane 0 and B on lane 1', () => {
      // 머지 commit은 동시에 active한 chain들이 distinct lane을 가져야 한다.
      const nodes = layoutGraph([
        commit('M', ['A', 'B']),
        commit('A'),
        commit('B'),
      ]);
      expect(nodes[0].lane).toBe(0); // M
      expect(nodes[1].lane).toBe(0); // A (first-parent inheritance)
      expect(nodes[2].lane).toBe(1); // B (second-parent, separate chain)
      expect(maxLaneCount(nodes)).toBe(2);
    });

    it('parentLane remaps consistently after compaction', () => {
      // parentLink.parentLane이 compaction 후에도 parent의 실제 lane을 가리켜야 한다.
      const nodes = layoutGraph([
        commit('M', ['A', 'B']),
        commit('A'),
        commit('B'),
      ]);
      // M's first parent A goes to A's actual lane (0)
      expect(nodes[0].parentLinks[0]).toMatchObject({ parentSha: 'A', parentLane: 0 });
      // M's second parent B goes to B's actual lane (1)
      expect(nodes[0].parentLinks[1]).toMatchObject({ parentSha: 'B', parentLane: 1 });
    });
  });

  it('color rotates through LANE_COLORS palette by chain id', () => {
    const nodes = layoutGraph([
      commit('M', ['A', 'B', 'C']), // octopus merge — 3 parents
      commit('A'),
      commit('B'),
      commit('C'),
    ]);
    // M starts chain 0 (blue). A continues chain 0. B starts chain 1, C starts chain 2.
    expect(nodes[0].color).toBe('#3b82f6');
    expect(nodes[1].color).toBe('#3b82f6');
    expect(nodes[2].color).toBe('#10b981');
    expect(nodes[3].color).toBe('#f59e0b');
  });
});
