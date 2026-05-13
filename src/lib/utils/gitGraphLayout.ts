import type { Commit, GraphNode } from 'types/git';

/**
 * lane 색상 팔레트. lane 번호 % 길이 로 색상 결정.
 * GitKraken처럼 무지개 톤이지만 너무 옅지 않도록 채도 유지.
 */
export const LANE_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
];

export function paletteByLane(lane: number): string {
  return LANE_COLORS[((lane % LANE_COLORS.length) + LANE_COLORS.length) % LANE_COLORS.length];
}

/**
 * Topological order로 정렬된 커밋 배열을 받아 lane 할당 결과(GraphNode[])를 반환한다.
 *
 * 알고리즘:
 * 1. `lanes[]`는 활성 lane 배열. 각 lane은 "현재 그 lane이 기다리는 다음 커밋 sha"를 보유.
 * 2. 행 R의 커밋 C를 처리할 때:
 *    a. C.sha를 기다리던 lane이 있으면 그 lane을 C의 lane으로 사용. 없으면 빈 lane 또는 신규 lane 할당.
 *    b. C.sha를 기다리던 *다른* lane들(=병합 흡수)은 close.
 *    c. C.parents[0]이 C의 lane을 이어받고, C.parents[1..]은 새 lane을 할당.
 *    d. `activeLanes`는 처리 후 비어있지 않은 lane 인덱스 목록.
 * 3. 모든 커밋에 lane이 할당된 뒤, 두 번째 패스에서 parentLinks의 `parentLane`을 부모 커밋의 lane으로 채운다.
 *
 * 결과: `git log --all --graph --oneline`과 유사한 lane 모양을 만든다. 완전 픽셀 일치는 보장하지 않으나
 * topo-order + first-parent-stays-in-lane 규칙으로 자연스러운 흐름이 유지된다.
 */
export function layoutGraph(commits: Commit[]): GraphNode[] {
  if (commits.length === 0) return [];

  const shaToRow = new Map<string, number>();
  for (let i = 0; i < commits.length; i++) shaToRow.set(commits[i].sha, i);

  const lanes: (string | null)[] = [];
  const commitLanes = new Array<number>(commits.length);
  const activeLanesPerRow = new Array<number[]>(commits.length);

  const allocLane = (): number => {
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i] === null) return i;
    }
    lanes.push(null);
    return lanes.length - 1;
  };

  for (let row = 0; row < commits.length; row++) {
    const c = commits[row];

    // 1. C의 lane 결정
    let myLane = lanes.findIndex((s) => s === c.sha);
    if (myLane === -1) myLane = allocLane();

    commitLanes[row] = myLane;

    // 2. 같은 sha를 기다리던 다른 lane들 close (merge 흡수)
    for (let i = 0; i < lanes.length; i++) {
      if (i !== myLane && lanes[i] === c.sha) {
        lanes[i] = null;
      }
    }

    // 3. parent들로 lane 업데이트
    if (c.parents.length === 0) {
      // root commit — lane 비움
      lanes[myLane] = null;
    } else {
      lanes[myLane] = c.parents[0];
      for (let i = 1; i < c.parents.length; i++) {
        const newLane = allocLane();
        lanes[newLane] = c.parents[i];
      }
    }

    // 4. 처리 후 활성 lane들 기록
    activeLanesPerRow[row] = lanes
      .map((v, i) => (v !== null ? i : -1))
      .filter((i) => i !== -1);
  }

  // 5. 두 번째 패스 — parent의 lane 해결
  const nodes: GraphNode[] = commits.map((c, row) => {
    const myLane = commitLanes[row];
    const parentLinks = c.parents.map((p) => {
      const parentRow = shaToRow.get(p);
      // parent가 결과 윈도우 밖이면 fallback으로 자신의 lane을 사용(=그래프 가장자리로 향하는 끝점).
      const parentLane = parentRow !== undefined ? commitLanes[parentRow] : myLane;
      return { parentSha: p, parentLane };
    });
    return {
      sha: c.sha,
      row,
      lane: myLane,
      parentLinks,
      activeLanes: activeLanesPerRow[row],
      color: paletteByLane(myLane),
    };
  });

  return nodes;
}

/** 그래프에 등장하는 최대 lane 번호 (렌더링 캔버스 너비 계산용). 빈 입력은 0. */
export function maxLaneCount(nodes: GraphNode[]): number {
  let max = 0;
  for (const n of nodes) {
    if (n.lane + 1 > max) max = n.lane + 1;
    for (const a of n.activeLanes) {
      if (a + 1 > max) max = a + 1;
    }
  }
  return max;
}
