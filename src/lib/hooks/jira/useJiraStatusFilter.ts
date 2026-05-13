import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadSelectedStatuses, saveSelectedStatuses } from 'lib/utils/storageHelpers';
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

  return {
    selectedStatuses,
    statusCounts,
    toggleStatus,
    isDoneCategory: isDoneCategoryCb,
  };
}
