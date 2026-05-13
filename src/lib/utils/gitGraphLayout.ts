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
  /**
   * 각 lane의 현재 chain id. lane이 새로 할당될 때마다 globalChainCounter에서 받아온다.
   * lane을 재사용해 새 chain이 시작되면 새 id로 갱신 — 색상이 바뀌어 두 chain이 시각적으로 구분된다.
   */
  const laneChainId: number[] = [];
  let globalChainCounter = 0;
  /**
   * chainId → 그 chain이 처음 만들어진(alloc된) 행. 2차 패스 압축에서 chain의 시각적 lifetime
   * `[allocRow, lastCommitRow]` 를 계산하는 데 사용 (M6+).
   */
  const chainAllocRow: number[] = [];

  const commitLanes = new Array<number>(commits.length);
  const commitChainIds = new Array<number>(commits.length);
  const activeLanesPerRow = new Array<number[]>(commits.length);

  const allocLane = (currentRow: number): number => {
    const chainId = globalChainCounter++;
    chainAllocRow[chainId] = currentRow;
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i] === null) {
        laneChainId[i] = chainId;
        return i;
      }
    }
    lanes.push(null);
    laneChainId.push(chainId);
    return lanes.length - 1;
  };

  for (let row = 0; row < commits.length; row++) {
    const c = commits[row];

    // 1. C의 lane 결정 — 기존 lane이 C의 sha를 기다리고 있으면 그 lane 이어받기(chain id 유지)
    let myLane = lanes.findIndex((s) => s === c.sha);
    if (myLane === -1) myLane = allocLane(row);

    commitLanes[row] = myLane;
    commitChainIds[row] = laneChainId[myLane];

    // 2. 같은 sha를 기다리던 다른 lane들 close (merge 흡수)
    for (let i = 0; i < lanes.length; i++) {
      if (i !== myLane && lanes[i] === c.sha) {
        lanes[i] = null;
      }
    }

    // 3. parent들로 lane 업데이트
    if (c.parents.length === 0) {
      lanes[myLane] = null;
    } else {
      lanes[myLane] = c.parents[0]; // first-parent는 같은 lane·같은 chain 이어감
      for (let i = 1; i < c.parents.length; i++) {
        const newLane = allocLane(row); // 추가 parent는 새 chain 시작
        lanes[newLane] = c.parents[i];
      }
    }

    // 4. 처리 후 활성 lane들 기록
    activeLanesPerRow[row] = lanes
      .map((v, i) => (v !== null ? i : -1))
      .filter((i) => i !== -1);
  }

  // 5. 두 번째 패스 — parent의 lane/색상 해결
  const palette = (id: number) => paletteByLane(id);
  const nodes: GraphNode[] = commits.map((c, row) => {
    const myLane = commitLanes[row];
    const myChainId = commitChainIds[row];
    const parentLinks = c.parents.map((p) => {
      const parentRow = shaToRow.get(p);
      // parent가 결과 윈도우 밖이면 fallback으로 자신의 lane/chain을 사용.
      const parentLane = parentRow !== undefined ? commitLanes[parentRow] : myLane;
      const parentChainId = parentRow !== undefined ? commitChainIds[parentRow] : myChainId;
      return { parentSha: p, parentLane, parentColor: palette(parentChainId) };
    });
    return {
      sha: c.sha,
      row,
      lane: myLane,
      parentLinks,
      activeLanes: activeLanesPerRow[row],
      color: palette(myChainId),
    };
  });

  // 6. M6+ — chain 단위 multi-pass 압축. 안전한 경우 더 낮은 lane으로 재배치.
  return compactLanes(nodes, commitChainIds, chainAllocRow);
}

/**
 * Chain 단위 lane 압축 (M6+).
 *
 * 알고리즘:
 *  1. 각 chain의 lifetime = `[allocRow, lastCommitRow]` 계산.
 *  2. allocRow 오름차순으로 chain을 정렬.
 *  3. 그리디 interval scheduling — 충돌 없는 lowest target lane에 할당.
 *  4. node·parentLink의 lane을 remap.
 *
 * **이론적 한계**: 1차 패스의 aggressive reuse가 이미 greedy interval scheduling과 등가이므로
 * 최소 lane 수 자체는 동일하다. 하지만 2차 패스는 다음을 보장한다:
 *  - chain 단위로 명시적 lifetime을 추적해 향후 휴리스틱 확장 여지를 확보
 *  - 1차 패스에서 chainId가 lane을 재사용할 때 새 chain id가 생기는 fragmented 케이스에서도
 *    동일 chain은 동일 target lane을 보장 (시각적 일관성)
 *  - 재배치가 안전한 경우(intervals 비충돌)에만 수행 — edge cross/dot overlap을 만들지 않음.
 */
function compactLanes(
  nodes: GraphNode[],
  commitChainIds: number[],
  chainAllocRow: number[],
): GraphNode[] {
  if (nodes.length === 0) return [];

  // 1) chainId → { allocRow, lastCommitRow }
  const chainSpans = new Map<number, { allocRow: number; lastCommitRow: number }>();
  for (const n of nodes) {
    const cid = commitChainIds[n.row];
    const span = chainSpans.get(cid);
    if (span) {
      if (n.row > span.lastCommitRow) span.lastCommitRow = n.row;
    } else {
      chainSpans.set(cid, {
        allocRow: chainAllocRow[cid] ?? n.row,
        lastCommitRow: n.row,
      });
    }
  }

  // 2) allocRow ASC 정렬 (안정 정렬 — chain id 순서로 동률 처리)
  const sorted = Array.from(chainSpans.entries()).sort((a, b) => {
    const da = a[1].allocRow - b[1].allocRow;
    if (da !== 0) return da;
    return a[0] - b[0]; // chain id tiebreak
  });

  // 3) Greedy interval scheduling
  const targetIntervals: Array<Array<{ start: number; end: number }>> = [];
  const chainToTarget = new Map<number, number>();

  for (const [chainId, span] of sorted) {
    let assigned = -1;
    for (let t = 0; t < targetIntervals.length; t++) {
      const intervals = targetIntervals[t];
      const conflict = intervals.some(
        (iv) => span.allocRow <= iv.end && iv.start <= span.lastCommitRow,
      );
      if (!conflict) {
        assigned = t;
        break;
      }
    }
    if (assigned === -1) {
      assigned = targetIntervals.length;
      targetIntervals.push([]);
    }
    chainToTarget.set(chainId, assigned);
    targetIntervals[assigned].push({ start: span.allocRow, end: span.lastCommitRow });
  }

  // 4) sha → chainId 인덱스 (parent lookup용)
  const shaToChain = new Map<string, number>();
  for (const n of nodes) {
    shaToChain.set(n.sha, commitChainIds[n.row]);
  }

  // 5) Remap 적용. activeLanes는 렌더링에서 사용 안 하므로 그대로 둠.
  return nodes.map((n) => {
    const cid = commitChainIds[n.row];
    const newLane = chainToTarget.get(cid) ?? n.lane;
    return {
      ...n,
      lane: newLane,
      parentLinks: n.parentLinks.map((p) => {
        const parentChainId = shaToChain.get(p.parentSha) ?? cid;
        const newParentLane = chainToTarget.get(parentChainId) ?? p.parentLane;
        return { ...p, parentLane: newParentLane };
      }),
    };
  });
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
