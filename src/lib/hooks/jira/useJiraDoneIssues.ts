import { useCallback, useState } from 'react';
import { integrationController } from 'controllers/account';
import { parseIssues, buildProjectClause } from 'lib/utils/jiraNormalizers';
import type { NormalizedIssue } from 'types/jira';
import type { StatusCount } from 'lib/hooks/useJiraSearch';

export interface UseJiraDoneIssuesOptions {
  accountId: string;
  activeAccount: { id: string } | null | undefined;
  selectedProjects: string[];
  cached?: {
    doneIssues?: NormalizedIssue[];
    doneCounts?: StatusCount[];
  };
}

export interface UseJiraDoneIssuesResult {
  doneIssues: NormalizedIssue[];
  doneCounts: StatusCount[];
  setDoneIssues: React.Dispatch<React.SetStateAction<NormalizedIssue[]>>;
  setDoneCounts: React.Dispatch<React.SetStateAction<StatusCount[]>>;
  setDoneIssuesLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  fetchDoneIssues: () => Promise<void>;
  fetchDoneCounts: () => Promise<void>;
}

/**
 * Jira Dashboard 완료(Done) 이슈 + 상태별 카운트 조회.
 * 부모/조부모 에픽도 함께 조회해 계층 구조를 유지한다.
 */
export function useJiraDoneIssues({
  activeAccount,
  selectedProjects,
  cached,
}: UseJiraDoneIssuesOptions): UseJiraDoneIssuesResult {
  const [doneIssues, setDoneIssues] = useState<NormalizedIssue[]>(cached?.doneIssues ?? []);
  const [doneCounts, setDoneCounts] = useState<StatusCount[]>(cached?.doneCounts ?? []);
  const [, setDoneIssuesLoaded] = useState<boolean>(
    Boolean(cached && cached.doneIssues && cached.doneIssues.length > 0),
  );

  const fetchDoneIssues = useCallback(async () => {
    if (!activeAccount) return;
    try {
      const pc = buildProjectClause(selectedProjects);
      const projectClause = pc ? `${pc} AND ` : '';
      const allDone: NormalizedIssue[] = [];
      const allKeys = new Set<string>();
      const pageSize = 100;
      let pageToken: string | undefined;
      const maxPages = 20;

      for (let page = 0; page < maxPages; page++) {
        const result = await integrationController.invoke({
          accountId: activeAccount.id,
          serviceType: 'jira',
          action: 'searchIssues',
          params: {
            jql: `${projectClause}assignee = currentUser() AND statusCategory = Done ORDER BY updated DESC`,
            maxResults: pageSize,
            skipCache: true,
            ...(pageToken ? { nextPageToken: pageToken } : {}),
          },
        }) as Record<string, unknown>;
        const issues = parseIssues(result);
        for (const i of issues) {
          allDone.push(i);
          allKeys.add(i.key);
        }
        pageToken = result.nextPageToken as string | undefined;
        if (!pageToken || issues.length < pageSize) break;
      }

      // 부모 조회
      const missingParentKeys = new Set<string>();
      for (const issue of allDone) {
        if (issue.parentKey && !allKeys.has(issue.parentKey)) {
          missingParentKeys.add(issue.parentKey);
        }
      }
      if (missingParentKeys.size > 0) {
        try {
          const parentJql = `key IN (${Array.from(missingParentKeys).join(',')})`;
          const parentResult = await integrationController.invoke({
            accountId: activeAccount.id,
            serviceType: 'jira',
            action: 'searchIssues',
            params: { jql: parentJql, maxResults: missingParentKeys.size },
          });
          for (const p of parseIssues(parentResult)) {
            if (!allKeys.has(p.key)) {
              allDone.push(p);
              allKeys.add(p.key);
            }
          }
        } catch { /* ignore */ }
      }

      // 조부모(에픽) 조회
      const missingGrandparentKeys = new Set<string>();
      for (const issue of allDone) {
        if (issue.parentKey && !allKeys.has(issue.parentKey)) {
          missingGrandparentKeys.add(issue.parentKey);
        }
      }
      if (missingGrandparentKeys.size > 0) {
        try {
          const gpJql = `key IN (${Array.from(missingGrandparentKeys).join(',')})`;
          const gpResult = await integrationController.invoke({
            accountId: activeAccount.id,
            serviceType: 'jira',
            action: 'searchIssues',
            params: { jql: gpJql, maxResults: missingGrandparentKeys.size },
          });
          for (const gp of parseIssues(gpResult)) {
            if (!allKeys.has(gp.key)) {
              allDone.push(gp);
              allKeys.add(gp.key);
            }
          }
        } catch { /* ignore */ }
      }

      setDoneIssues(allDone);
      setDoneIssuesLoaded(true);
    } catch (err) {
      console.error('[JiraDashboard] fetchDoneIssues error:', err);
    }
  }, [activeAccount, selectedProjects]);

  const fetchDoneCounts = useCallback(async () => {
    if (!activeAccount) return;
    try {
      const pc = buildProjectClause(selectedProjects);
      const projectClause = pc ? `${pc} AND ` : '';
      const jql = `${projectClause}assignee = currentUser() AND statusCategory = Done`;
      const countMap = new Map<string, { category: string; count: number }>();
      const pageSize = 100;
      let pageToken: string | undefined;
      const maxPages = 20;

      for (let page = 0; page < maxPages; page++) {
        const result = await integrationController.invoke({
          accountId: activeAccount.id,
          serviceType: 'jira',
          action: 'searchIssues',
          params: { jql, maxResults: pageSize, skipCache: true, ...(pageToken ? { nextPageToken: pageToken } : {}) },
        }) as Record<string, unknown>;
        const issues = parseIssues(result);
        for (const issue of issues) {
          const name = issue.statusName || '완료';
          const cat = issue.statusCategory || 'done';
          const entry = countMap.get(name);
          if (entry) entry.count++;
          else countMap.set(name, { category: cat, count: 1 });
        }
        pageToken = result.nextPageToken as string | undefined;
        if (!pageToken || issues.length < pageSize) break;
      }

      const counts: StatusCount[] = [];
      countMap.forEach((v, name) => counts.push({ name, category: v.category, count: v.count }));
      setDoneCounts(counts);
    } catch (err) {
      console.error('[JiraDashboard] fetchDoneCounts error:', err);
    }
  }, [activeAccount, selectedProjects]);

  return {
    doneIssues,
    doneCounts,
    setDoneIssues,
    setDoneCounts,
    setDoneIssuesLoaded,
    fetchDoneIssues,
    fetchDoneCounts,
  };
}
