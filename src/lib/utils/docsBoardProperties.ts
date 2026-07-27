import type { DocsDbState } from 'types/docs';

/** 보드 설정의 순서와 표시 상태를 카드 렌더링에 적용한다. */
export const getVisibleDocsBoardPropertyKeys = (db: DocsDbState): string[] => (
  db.boardPropertyOrder.filter((key) => !db.boardHiddenProperties.includes(key))
);

export const reorderDocsBoardProperties = (
  order: string[],
  sourceKey: string,
  targetKey: string,
  position: 'before' | 'after',
): string[] => {
  if (sourceKey === targetKey || !order.includes(sourceKey) || !order.includes(targetKey)) return order;
  const next = order.filter((key) => key !== sourceKey);
  const targetIndex = next.indexOf(targetKey);
  next.splice(targetIndex + (position === 'after' ? 1 : 0), 0, sourceKey);
  return next;
};
