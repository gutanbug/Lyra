import { useCallback, useEffect, useState } from 'react';
import type { ConfluenceSpaceGroup } from 'types/confluence';

export interface UseConfluenceExpandStateOptions {
  /** 단축키 처리 시 참조할 space 그룹 ref (composer에서 최신 그룹을 주입) */
  spaceGroupsRef: React.RefObject<ConfluenceSpaceGroup[]>;
  cached?: {
    expandedSpaces?: Set<string>;
  };
}

export interface UseConfluenceExpandStateResult {
  expandedSpaces: Set<string>;
  setExpandedSpaces: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleSpace: (spaceId: string) => void;
  expandAll: (groups: ConfluenceSpaceGroup[]) => void;
  collapseAll: () => void;
}

/**
 * Confluence Dashboard의 스페이스 확장 상태 훅.
 * `lyra:expand-all|collapse-all` 전역 단축키를 수신해 펼침/접힘을 일괄 적용한다.
 */
export function useConfluenceExpandState({
  spaceGroupsRef,
  cached,
}: UseConfluenceExpandStateOptions): UseConfluenceExpandStateResult {
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(cached?.expandedSpaces ?? new Set());

  const toggleSpace = useCallback((spaceId: string) => {
    setExpandedSpaces((prev) => {
      const next = new Set(prev);
      if (next.has(spaceId)) {
        next.delete(spaceId);
      } else {
        next.add(spaceId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback((groups: ConfluenceSpaceGroup[]) => {
    setExpandedSpaces(new Set(groups.map((g) => g.spaceId)));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedSpaces(new Set());
  }, []);

  // 글로벌 단축키 이벤트 수신
  useEffect(() => {
    const onExpand = () => expandAll(spaceGroupsRef.current ?? []);
    const onCollapse = () => collapseAll();
    window.addEventListener('lyra:expand-all', onExpand);
    window.addEventListener('lyra:collapse-all', onCollapse);
    return () => {
      window.removeEventListener('lyra:expand-all', onExpand);
      window.removeEventListener('lyra:collapse-all', onCollapse);
    };
  }, [expandAll, collapseAll, spaceGroupsRef]);

  return {
    expandedSpaces,
    setExpandedSpaces,
    toggleSpace,
    expandAll,
    collapseAll,
  };
}
