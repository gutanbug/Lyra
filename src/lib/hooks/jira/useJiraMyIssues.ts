import { useCallback, useState } from 'react';
import { integrationController } from 'controllers/account';
import { parseIssues, buildProjectClause } from 'lib/utils/jiraNormalizers';
import type { NormalizedIssue } from 'types/jira';

export interface UseJiraMyIssuesOptions {
  accountId: string;
  activeAccount: { id: string } | null | undefined;
  selectedProjects: string[];
  cached?: {
    myIssues?: NormalizedIssue[];
    myIssueKeys?: Set<string>;
  };
  /** 초기 조회 결과를 받아 composer에서 loadAllDescendants 등 후속 작업 처리 */
  onIssuesLoaded?: (issues: NormalizedIssue[]) => void;
}

export interface UseJiraMyIssuesResult {
  myIssues: NormalizedIssue[];
  myIssueKeys: Set<string>;
  isLoading: boolean;
  setMyIssues: React.Dispatch<React.SetStateAction<NormalizedIssue[]>>;
  fetchMyIssues: () => Promise<void>;
}

/**
 * Jira Dashboard 내 이슈(담당) 조회 훅.
 * assignee = currentUser() AND statusCategory != Done 을 기본으로,
 * 부모/조부모 2단계를 추가 조회해 에픽 계층을 구성한다.
 */
export function useJiraMyIssues({
  activeAccount,
  selectedProjects,
  cached,
  onIssuesLoaded,
}: UseJiraMyIssuesOptions): UseJiraMyIssuesResult {
  const [myIssues, setMyIssues] = useState<NormalizedIssue[]>(cached?.myIssues ?? []);
  const [myIssueKeys, setMyIssueKeys] = useState<Set<string>>(cached?.myIssueKeys ?? new Set());
  const [isLoading, setIsLoading] = useState(false);

  const fetchMyIssues = useCallback(async () => {
    if (!activeAccount) return;
    setIsLoading(true);
    try {
      const pc = buildProjectClause(selectedProjects);
      const projectClause = pc ? `${pc} AND ` : '';
      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'jira',
        action: 'searchIssues',
        params: {
          jql: `${projectClause}assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC`,
          maxResults: 100,
        },
      });
      const issues = parseIssues(result);
      const originalKeys = new Set(issues.map((i) => i.key));
      const allKeys = new Set(originalKeys);

      // 1단계: 직접 부모 조회
      const missingParentKeys = new Set<string>();
      for (const issue of issues) {
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
          const parentIssues = parseIssues(parentResult);
          for (const p of parentIssues) {
            if (!allKeys.has(p.key)) {
              issues.push(p);
              allKeys.add(p.key);
            }
          }
        } catch { /* ignore */ }
      }

      // 2단계: 조부모 조회
      const missingGrandparentKeys = new Set<string>();
      for (const issue of issues) {
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
          const gpIssues = parseIssues(gpResult);
          for (const gp of gpIssues) {
            if (!allKeys.has(gp.key)) {
              issues.push(gp);
              allKeys.add(gp.key);
            }
          }
        } catch { /* ignore */ }
      }

      setMyIssues(issues);
      setMyIssueKeys(originalKeys);
      if (onIssuesLoaded) onIssuesLoaded(issues);
    } catch (err) {
      console.error('[JiraDashboard] fetchMyIssues error:', err);
      setMyIssues([]);
      setMyIssueKeys(new Set());
    } finally {
      setIsLoading(false);
    }
  }, [activeAccount, selectedProjects, onIssuesLoaded]);

  return {
    myIssues,
    myIssueKeys,
    isLoading,
    setMyIssues,
    fetchMyIssues,
  };
}
