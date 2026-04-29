import { useCallback, useMemo, useState } from 'react';
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
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(() => {
    if (cachedSelectedStatuses && cachedSelectedStatuses.length > 0) {
      return new Set(cachedSelectedStatuses);
    }
    return new Set(loadSelectedStatuses(accountId));
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

  const toggleStatus = useCallback((statusName: string) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(statusName)) next.delete(statusName);
      else next.add(statusName);
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
