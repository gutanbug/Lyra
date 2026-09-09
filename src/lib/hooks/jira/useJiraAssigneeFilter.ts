import { useCallback, useMemo, useState } from 'react';

export interface AssigneeCount { name: string; count: number }

export interface UseJiraAssigneeFilterResult {
  assigneeCounts: AssigneeCount[];
  isAssigneeSelected: (name: string) => boolean;
  toggleAssignee: (name: string) => void;
  clearAssigneeFilter: () => void;
  isAssigneeFilterActive: boolean;
  selectedCount: number;
}

export const UNASSIGNED_LABEL = '미지정';

/**
 * 담당자 이름 기준 다중 선택 필터. 대시보드(전체 이슈)와 상세조회(하위 업무)
 * 양쪽에서 동일한 방식으로 재사용한다. selection=null은 "필터 없음"(전체 표시)을 뜻하며,
 * 화면 전환/서버 재조회 없이 이미 로드된 목록을 클라이언트에서 즉시 걸러낸다.
 */
export function useJiraAssigneeFilter(issues: { assigneeName: string }[]): UseJiraAssigneeFilterResult {
  const [selected, setSelected] = useState<Set<string> | null>(null);

  const assigneeCounts = useMemo(() => {
    const map = new Map<string, number>();
    issues.forEach((i) => {
      const name = i.assigneeName || UNASSIGNED_LABEL;
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [issues]);

  const toggleAssignee = useCallback((name: string) => {
    setSelected((prev) => {
      const base = prev ?? new Set(assigneeCounts.map((a) => a.name));
      const next = new Set(base);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      // 전체를 다시 선택한 상태가 되면 "필터 없음"으로 되돌려 정상화한다
      if (next.size >= assigneeCounts.length) return null;
      return next;
    });
  }, [assigneeCounts]);

  const isAssigneeSelected = useCallback(
    (name: string) => !selected || selected.has(name),
    [selected],
  );

  const clearAssigneeFilter = useCallback(() => setSelected(null), []);

  return {
    assigneeCounts,
    isAssigneeSelected,
    toggleAssignee,
    clearAssigneeFilter,
    isAssigneeFilterActive: selected !== null,
    selectedCount: selected ? selected.size : assigneeCounts.length,
  };
}
