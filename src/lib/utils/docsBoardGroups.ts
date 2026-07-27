import { DOCS_STATUS_OPTS } from 'types/docs';
import type {
  DocsComment, DocsDbRow, DocsDbState,
} from 'types/docs';

export interface DocsRowDraftSnapshot {
  row: DocsDbRow;
  comments: DocsComment[];
}

export const isDocsRowDraftUnchanged = (
  snapshot: DocsRowDraftSnapshot,
  row: DocsDbRow | undefined,
  comments: DocsComment[],
): boolean => (
  !!row
  && JSON.stringify(snapshot.row) === JSON.stringify(row)
  && JSON.stringify(snapshot.comments) === JSON.stringify(comments)
);

/**
 * 카드 상세에서 선택할 수 있는 상태 그룹을 보드 데이터로부터 만든다.
 *
 * 숨김 그룹은 보드에서만 보이지 않을 뿐 유효한 상태이므로 제외하지 않는다.
 * 다른 필드로 그룹화 중일 때 boardExtraGroups/boardGroupOrder는 그 필드의
 * 설정일 수 있으므로 상태 선택지에 섞지 않는다.
 */
export const getDocsStatusGroups = (db: DocsDbState): string[] => {
  const tracksStatusGroups = db.groupBy === 'status' || db.groupBy === null;
  const groups = new Set<string>();

  db.rows.forEach((row) => {
    const status = String(row.status || '').trim();
    if (status) groups.add(status);
  });

  if (tracksStatusGroups) {
    db.boardExtraGroups.forEach((group) => {
      const status = group.trim();
      if (status) groups.add(status);
    });
    // 저장 데이터가 이전 버전에서 만들어져 extraGroups가 누락된 경우에도
    // 보드 순서에 남아 있는 실제 그룹은 복구해서 선택지에 표시한다.
    db.boardGroupOrder.forEach((group) => {
      const status = group.trim();
      if (status) groups.add(status);
    });
  }

  const order = tracksStatusGroups && db.boardGroupOrder.length
    ? db.boardGroupOrder
    : [...DOCS_STATUS_OPTS];
  const orderIndex = new Map(order.map((status, index) => [status, index]));

  return Array.from(groups).sort((a, b) => {
    const aIndex = orderIndex.get(a);
    const bIndex = orderIndex.get(b);
    if (aIndex === undefined && bIndex === undefined) return 0;
    if (aIndex === undefined) return 1;
    if (bIndex === undefined) return -1;
    return aIndex - bIndex;
  });
};
