import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadSelectedStatuses, saveSelectedStatuses } from 'lib/utils/storageHelpers';
import { isDoneStatus } from 'lib/utils/jiraUtils';
import type { NormalizedIssue } from 'types/jira';
import type { StatusCount } from 'lib/hooks/useJiraSearch';

export interface UseJiraStatusFilterOptions {
  accountId: string;
  myIssues: NormalizedIssue[];
  myIssueKeys: Set<string>;
  doneCounts: StatusCount[];
  cachedSelectedStatuses?: string[];
}

export interface UseJiraStatusFilterResult {
  selectedStatuses: Set<string>;
  statusCounts: StatusCount[];
  toggleStatus: (statusName: string) => void;
  isDoneCategory: (category: string) => boolean;
  /** "완료만 보기" 토글 활성 여부 (선택된 상태 = 완료 카테고리 상태 전체와 정확히 일치) */
  isDoneOnlyActive: boolean;
  /** 화면 전환 없이 완료 상태만 표시하도록 토글. 다시 누르면 토글 이전 선택으로 복원. */
  toggleDoneOnly: () => void;
}

export function isDoneCategory(category: string): boolean {
  const l = category.toLowerCase();
  return l.includes('done') || l.includes('완료');
}

export function useJiraStatusFilter({
  accountId,
  myIssues,
  myIssueKeys,
  doneCounts,
  cachedSelectedStatuses,
}: UseJiraStatusFilterOptions): UseJiraStatusFilterResult {
  // 저장 이력 추적: localStorage에 한 번도 저장된 적이 없으면 false → statusCounts 도착 시 전체 선택 기본값 적용.
  // 빈 배열([])은 "사용자가 의도적으로 모두 해제"한 상태이므로 초기화 대상에서 제외해야 한다.
  const initializedRef = useRef<boolean>(false);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(() => {
    if (cachedSelectedStatuses !== undefined) {
      initializedRef.current = true;
      return new Set(cachedSelectedStatuses);
    }
    const stored = loadSelectedStatuses(accountId);
    if (stored !== null) {
      initializedRef.current = true;
      return new Set(stored);
    }
    return new Set();
  });

  const statusCounts = useMemo(() => {
    const countMap = new Map<string, { category: string; count: number }>();
    for (const issue of myIssues) {
      if (myIssueKeys.size > 0 && !myIssueKeys.has(issue.key)) continue;
      const name = issue.statusName || '기타';
      const cat = issue.statusCategory || '';
      const entry = countMap.get(name);
      if (entry) entry.count++;
      else countMap.set(name, { category: cat, count: 1 });
    }
    for (const dc of doneCounts) {
      const entry = countMap.get(dc.name);
      if (entry) entry.count += dc.count;
      else countMap.set(dc.name, { category: dc.category, count: dc.count });
    }
    const counts: StatusCount[] = [];
    countMap.forEach((v, name) => counts.push({ name, category: v.category, count: v.count }));
    const catOrder = (c: string) => {
      const l = c.toLowerCase();
      if (l.includes('done') || l.includes('완료')) return 2;
      if (l.includes('progress') || l.includes('진행')) return 1;
      return 0;
    };
    counts.sort((a, b) => catOrder(a.category) - catOrder(b.category));
    return counts;
  }, [myIssues, myIssueKeys, doneCounts]);

  // 최초 진입(저장 이력 없음)에서 statusCounts가 처음 도착하면 전체 선택을 기본값으로 적용.
  // 사용자가 의도적으로 모두 해제(빈 배열로 저장)한 경우는 initializedRef=true라 트리거되지 않음.
  useEffect(() => {
    if (initializedRef.current) return;
    if (statusCounts.length === 0) return;
    const all = statusCounts.map((sc) => sc.name);
    initializedRef.current = true;
    setSelectedStatuses(new Set(all));
    saveSelectedStatuses(accountId, all);
  }, [statusCounts, accountId]);

  const toggleStatus = useCallback((statusName: string) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(statusName)) next.delete(statusName);
      else next.add(statusName);
      initializedRef.current = true;
      saveSelectedStatuses(accountId, Array.from(next));
      return next;
    });
  }, [accountId]);

  const isDoneCategoryCb = useCallback((category: string) => isDoneCategory(category), []);

  // 완료 카테고리에 속하는 상태 이름 집합. statusCategory가 비어있거나 모호한 경우
  // isDoneStatus의 상태명 폴백 규칙까지 함께 사용해 판별한다.
  const doneStatusNames = useMemo(
    () => new Set(statusCounts.filter((sc) => isDoneStatus(sc.name, sc.category)).map((sc) => sc.name)),
    [statusCounts]
  );

  const isDoneOnlyActive = useMemo(() => {
    if (doneStatusNames.size === 0 || selectedStatuses.size === 0) return false;
    if (selectedStatuses.size !== doneStatusNames.size) return false;
    for (const name of selectedStatuses) {
      if (!doneStatusNames.has(name)) return false;
    }
    return true;
  }, [selectedStatuses, doneStatusNames]);

  // 토글 이전 선택을 기억해 뒀다가 "완료만 보기" 해제 시 복원한다.
  const prevSelectionRef = useRef<string[] | null>(null);

  const toggleDoneOnly = useCallback(() => {
    if (isDoneOnlyActive) {
      const restored = prevSelectionRef.current;
      const next = restored && restored.length > 0
        ? new Set(restored)
        : new Set(statusCounts.map((sc) => sc.name));
      prevSelectionRef.current = null;
      initializedRef.current = true;
      setSelectedStatuses(next);
      saveSelectedStatuses(accountId, Array.from(next));
    } else {
      prevSelectionRef.current = Array.from(selectedStatuses);
      const next = new Set(doneStatusNames);
      initializedRef.current = true;
      setSelectedStatuses(next);
      saveSelectedStatuses(accountId, Array.from(next));
    }
  }, [isDoneOnlyActive, statusCounts, doneStatusNames, selectedStatuses, accountId]);

  return {
    selectedStatuses,
    statusCounts,
    toggleStatus,
    isDoneCategory: isDoneCategoryCb,
    isDoneOnlyActive,
    toggleDoneOnly,
  };
}
