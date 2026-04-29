import { useCallback, useState } from 'react';
import { integrationController } from 'controllers/account';
import { isEpicType, isSubTaskType, escapeJql, KEY_PATTERN, NUMBER_ONLY_PATTERN } from 'lib/utils/jiraUtils';
import { parseIssues, buildProjectClause, buildSearchJql } from 'lib/utils/jiraNormalizers';
import type { NormalizedIssue, JiraProject } from 'types/jira';

export interface UseJiraIssueSearchOptions {
  accountId: string;
  activeAccount: { id: string } | null | undefined;
  selectedProjects: string[];
  projects: JiraProject[];
  fetchByKeys: (keys: Set<string>) => Promise<NormalizedIssue[]>;
  fetchChildren: (parentKeys: string[], projectFilter?: string[], isEpic?: boolean) => Promise<NormalizedIssue[]>;
  /** 검색 결과 로드 완료 시 composer에서 loadAllDescendants 등 후속 작업 처리 */
  onResultsLoaded?: (issues: NormalizedIssue[], projectFilter?: string[]) => void;
  cached?: {
    searchQuery?: string;
    searchResults?: NormalizedIssue[] | null;
    searchedOnce?: boolean;
  };
}

export interface UseJiraIssueSearchResult {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  searchResults: NormalizedIssue[] | null;
  setSearchResults: React.Dispatch<React.SetStateAction<NormalizedIssue[] | null>>;
  isSearching: boolean;
  searchedOnce: boolean;
  searchIssues: () => Promise<void>;
}

/**
 * Jira Dashboard 검색 훅.
 * 기본 JQL + 담당자 이름 검색을 병렬 실행한 뒤, 부모/조부모/에픽 하위/스토리 하위 4단계를 추가 조회해
 * 결과 트리를 구성한다. 결과 로드 시 `onResultsLoaded`로 composer에 descendant 로딩을 위임한다.
 */
export function useJiraIssueSearch({
  activeAccount,
  selectedProjects,
  projects,
  fetchByKeys,
  fetchChildren,
  onResultsLoaded,
  cached,
}: UseJiraIssueSearchOptions): UseJiraIssueSearchResult {
  const [searchQuery, setSearchQuery] = useState(cached?.searchQuery ?? '');
  const [searchResults, setSearchResults] = useState<NormalizedIssue[] | null>(cached?.searchResults ?? null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchedOnce, setSearchedOnce] = useState(cached?.searchedOnce ?? false);

  const searchIssues = useCallback(async () => {
    if (!activeAccount) return;
    const jqlFilter = buildSearchJql(searchQuery, selectedProjects, projects.map((p) => p.key));
    if (!jqlFilter) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const term = searchQuery.trim();
      const isKeySearch = KEY_PATTERN.test(term) || NUMBER_ONLY_PATTERN.test(term);

      const searchPromise = integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'jira',
        action: 'searchIssues',
        params: {
          jql: `${jqlFilter} ORDER BY updated DESC`,
          maxResults: 100,
          skipCache: true,
        },
      });

      const userPromise = !isKeySearch
        ? integrationController.invoke({
            accountId: activeAccount.id,
            serviceType: 'jira',
            action: 'searchUsers',
            params: { query: term },
          }).catch(() => [] as unknown[])
        : Promise.resolve([] as unknown[]);

      const [result, matchedUsers] = await Promise.all([searchPromise, userPromise]);
      const issues = parseIssues(result);
      const allKeys = new Set(issues.map((i) => i.key));

      if (Array.isArray(matchedUsers) && matchedUsers.length > 0) {
        const accountIds = (matchedUsers as { accountId?: string }[])
          .map((u) => u.accountId)
          .filter(Boolean) as string[];
        if (accountIds.length > 0) {
          const pc = buildProjectClause(selectedProjects);
          const projectClause = pc ? `${pc} AND ` : '';
          const assigneeClause = accountIds.length === 1
            ? `assignee = "${accountIds[0]}"`
            : `assignee IN (${accountIds.map((id) => `"${id}"`).join(',')})`;
          try {
            const assigneeResult = await integrationController.invoke({
              accountId: activeAccount.id,
              serviceType: 'jira',
              action: 'searchIssues',
              params: {
                jql: `${projectClause}${assigneeClause} ORDER BY updated DESC`,
                maxResults: 50,
                skipCache: true,
              },
            });
            const assigneeIssues = parseIssues(assigneeResult);
            for (const ai of assigneeIssues) {
              if (!allKeys.has(ai.key)) {
                issues.push(ai);
                allKeys.add(ai.key);
              }
            }
          } catch { /* assignee search failed, continue with base results */ }
        }
      }

      // 1단계: 부모
      const missingParentKeys = new Set<string>();
      for (const issue of issues) {
        if (issue.parentKey && !allKeys.has(issue.parentKey)) {
          missingParentKeys.add(issue.parentKey);
        }
      }
      const parentIssues = await fetchByKeys(missingParentKeys);
      for (const p of parentIssues) {
        if (!allKeys.has(p.key)) {
          issues.push(p);
          allKeys.add(p.key);
        }
      }

      // 2단계: 조부모
      const missingGrandparentKeys = new Set<string>();
      for (const p of parentIssues) {
        if (p.parentKey && !allKeys.has(p.parentKey)) {
          missingGrandparentKeys.add(p.parentKey);
        }
      }
      const grandparentIssues = await fetchByKeys(missingGrandparentKeys);
      for (const gp of grandparentIssues) {
        if (!allKeys.has(gp.key)) {
          issues.push(gp);
          allKeys.add(gp.key);
        }
      }

      // 3단계: 에픽의 하위 스토리
      const pf = selectedProjects.length > 0 ? selectedProjects : undefined;
      const epicKeys = issues
        .filter((i) => isEpicType(i.issueTypeName))
        .map((i) => i.key);
      const storyIssues = await fetchChildren(epicKeys, pf, true);
      for (const s of storyIssues) {
        if (!allKeys.has(s.key)) {
          issues.push(s);
          allKeys.add(s.key);
        } else if (s.parentKey) {
          const idx = issues.findIndex((i) => i.key === s.key);
          if (idx >= 0 && !issues[idx].parentKey) {
            issues[idx] = { ...issues[idx], parentKey: s.parentKey, parentSummary: s.parentSummary || issues[idx].parentSummary };
          }
        }
      }

      // 4단계: 스토리의 하위항목
      const storyKeys = issues
        .filter((i) => !isEpicType(i.issueTypeName) && !isSubTaskType(i.issueTypeName))
        .filter((i) => epicKeys.length === 0 || i.parentKey)
        .map((i) => i.key);
      const subTaskIssues = await fetchChildren(storyKeys, pf);
      for (const st of subTaskIssues) {
        if (!allKeys.has(st.key)) {
          issues.push(st);
          allKeys.add(st.key);
        } else if (st.parentKey) {
          const idx = issues.findIndex((i) => i.key === st.key);
          if (idx >= 0 && !issues[idx].parentKey) {
            issues[idx] = { ...issues[idx], parentKey: st.parentKey, parentSummary: st.parentSummary || issues[idx].parentSummary };
          }
        }
      }

      setSearchResults(issues);
      setSearchedOnce(true);
      if (onResultsLoaded) onResultsLoaded(issues, pf);
    } catch (err) {
      console.error('[JiraDashboard] searchIssues error:', err);
      setSearchResults([]);
      setSearchedOnce(true);
    } finally {
      setIsSearching(false);
    }
  }, [activeAccount, searchQuery, selectedProjects, projects, fetchByKeys, fetchChildren, onResultsLoaded]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    isSearching,
    searchedOnce,
    searchIssues,
  };
}
