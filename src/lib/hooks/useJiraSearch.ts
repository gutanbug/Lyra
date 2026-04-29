import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import React from 'react';
import { integrationController } from 'controllers/account';
import { isEpicType } from 'lib/utils/jiraUtils';
import { parseIssues, buildProjectClause } from 'lib/utils/jiraNormalizers';
import { createAccountScopedCache, useAccountScopedCache } from 'lib/hooks/_shared/useAccountScopedCache';
import { useJiraStatusFilter } from 'lib/hooks/jira/useJiraStatusFilter';
import { useJiraProjects } from 'lib/hooks/jira/useJiraProjects';
import { useJiraMyIssues } from 'lib/hooks/jira/useJiraMyIssues';
import { useJiraDoneIssues } from 'lib/hooks/jira/useJiraDoneIssues';
import { useJiraIssueSearch } from 'lib/hooks/jira/useJiraIssueSearch';
import { useJiraSuggest } from 'lib/hooks/jira/useJiraSuggest';
import { useJiraBrowseMode } from 'lib/hooks/jira/useJiraBrowseMode';
import { useJiraExpandState } from 'lib/hooks/jira/useJiraExpandState';
import type { NormalizedIssue, EpicGroup, JiraProject } from 'types/jira';

export interface StatusCount { name: string; category: string; count: number }

interface DashboardCache {
  myIssues: NormalizedIssue[];
  projects: JiraProject[];
  selectedProjects: string[];
  searchQuery: string;
  searchResults: NormalizedIssue[] | null;
  expandedEpics: Set<string>;
  defaultChildrenMap: Record<string, NormalizedIssue[]>;
  defaultExpandedChildren: Set<string>;
  browseProjectKey: string | null;
  browseEpics: NormalizedIssue[];
  browseChildrenMap: Record<string, NormalizedIssue[]>;
  browseExpandedKeys: Set<string>;
  browseLoadedChildren: Set<string>;
  doneCounts: StatusCount[];
  doneIssues: NormalizedIssue[];
  selectedStatuses: string[];
}

const jiraDashboardCache = createAccountScopedCache<DashboardCache>();

interface UseJiraSearchOptions {
  activeAccount: { id: string; metadata?: unknown } | null | undefined;
  history: { push: (path: string) => void };
}

export function useJiraSearch({ activeAccount, history }: UseJiraSearchOptions) {
  const currentAccountId = activeAccount?.id || '';
  const cached = currentAccountId ? jiraDashboardCache.get(currentAccountId) : undefined;

  // 프로젝트 (스페이스) 필터
  const projectsHook = useJiraProjects({
    accountId: currentAccountId,
    activeAccount,
    cached: {
      projects: cached?.projects,
      selectedProjects: cached?.selectedProjects,
    },
  });
  const {
    projects,
    setProjects,
    selectedProjects,
    setSelectedProjects,
    spaceFilter,
    setSpaceFilter,
    filteredProjects,
    projectsReady,
    setProjectsReady,
    fetchProjects,
    handleSaveSpaceSettings,
  } = projectsHook;

  const [showSpaceSettings, setShowSpaceSettings] = useState(false);

  // 완료 이슈/카운트
  const doneIssuesHook = useJiraDoneIssues({
    accountId: currentAccountId,
    activeAccount,
    selectedProjects,
    cached: {
      doneIssues: cached?.doneIssues,
      doneCounts: cached?.doneCounts,
    },
  });
  const {
    doneIssues,
    doneCounts,
    setDoneIssues,
    setDoneIssuesLoaded,
    fetchDoneIssues,
    fetchDoneCounts,
  } = doneIssuesHook;

  // 하위 이슈/부모 조회 헬퍼 (expandState/browseMode/issueSearch 공용 의존성)
  const fetchChildren = useCallback(async (parentKeys: string[], projectFilter?: string[], isEpic = false): Promise<NormalizedIssue[]> => {
    if (parentKeys.length === 0 || !activeAccount) return [];
    const allChildren: NormalizedIssue[] = [];
    const seenKeys = new Set<string>();
    const parentKeySet = new Set(parentKeys);
    const pc = projectFilter && projectFilter.length > 0 ? `${buildProjectClause(projectFilter)} AND ` : '';

    // parent JQL — 직접 자식 반환
    try {
      const jql = `${pc}parent IN (${parentKeys.join(',')}) ORDER BY created ASC`;
      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'jira',
        action: 'searchIssues',
        params: { jql, maxResults: 200, skipCache: true },
      });
      for (const issue of parseIssues(result)) {
        if (seenKeys.has(issue.key)) continue;
        allChildren.push(issue);
        seenKeys.add(issue.key);
      }
    } catch { /* ignore */ }

    // Epic Link JQL — 에픽일 때만 실행 (서브태스크 제외)
    if (isEpic) {
      try {
        const jql = `${pc}"Epic Link" IN (${parentKeys.join(',')}) AND issuetype not in subTaskIssueTypes() ORDER BY created ASC`;
        const result = await integrationController.invoke({
          accountId: activeAccount.id,
          serviceType: 'jira',
          action: 'searchIssues',
          params: { jql, maxResults: 200, skipCache: true },
        });
        for (const issue of parseIssues(result)) {
          if (seenKeys.has(issue.key)) continue;
          if (!issue.parentKey && parentKeys.length === 1) {
            issue.parentKey = parentKeys[0];
          }
          allChildren.push(issue);
          seenKeys.add(issue.key);
        }
      } catch {
        // subTaskIssueTypes() 미지원 시 폴백
        try {
          const jql = `${pc}"Epic Link" IN (${parentKeys.join(',')}) ORDER BY created ASC`;
          const result = await integrationController.invoke({
            accountId: activeAccount.id,
            serviceType: 'jira',
            action: 'searchIssues',
            params: { jql, maxResults: 200, skipCache: true },
          });
          for (const issue of parseIssues(result)) {
            if (seenKeys.has(issue.key)) continue;
            if (issue.parentKey && !parentKeySet.has(issue.parentKey)) continue;
            if (!issue.parentKey && parentKeys.length === 1) {
              issue.parentKey = parentKeys[0];
            }
            allChildren.push(issue);
            seenKeys.add(issue.key);
          }
        } catch { /* Epic Link 필드가 없는 인스턴스에서는 무시 */ }
      }
    }

    return allChildren;
  }, [activeAccount]);

  const fetchByKeys = useCallback(async (keys: Set<string>): Promise<NormalizedIssue[]> => {
    if (keys.size === 0 || !activeAccount) return [];
    try {
      const jql = `key IN (${Array.from(keys).join(',')})`;
      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'jira',
        action: 'searchIssues',
        params: { jql, maxResults: keys.size, skipCache: true },
      });
      return parseIssues(result);
    } catch {
      return [];
    }
  }, [activeAccount]);

  // ── 브라우즈 모드 ──
  const browseModeHook = useJiraBrowseMode({
    accountId: currentAccountId,
    activeAccount,
    fetchChildren,
    cached: {
      browseProjectKey: cached?.browseProjectKey,
      browseEpics: cached?.browseEpics,
      browseChildrenMap: cached?.browseChildrenMap,
      browseExpandedKeys: cached?.browseExpandedKeys,
      browseLoadedChildren: cached?.browseLoadedChildren,
    },
  });
  const {
    browseProjectKey,
    browseEpics,
    browseChildrenMap,
    isBrowseLoading,
    browseExpandedKeys,
    browseLoadedChildren,
    setBrowseExpandedKeys,
    setBrowseEpics,
    setBrowseChildrenMap,
    loadBrowseChildren,
    toggleBrowseEpic,
  } = browseModeHook;

  // epicGroupsRef: JiraDashboard에 노출되어 렌더 시 현재 epic group을 넣고,
  // 단축키 이벤트에서 composer(expandState)가 expandAll에 전달할 수 있게 한다.
  const epicGroupsRef = useRef<EpicGroup[]>([]);

  // 브라우즈 모드용 ref (expand-state의 browseOverride가 최신 값을 읽기 위해)
  const browseProjectKeyRef = useRef<string | null>(null);
  useEffect(() => { browseProjectKeyRef.current = browseProjectKey; }, [browseProjectKey]);
  const browseEpicsRef = useRef<NormalizedIssue[]>([]);
  useEffect(() => { browseEpicsRef.current = browseEpics; }, [browseEpics]);
  const browseChildrenMapRef = useRef<Record<string, NormalizedIssue[]>>({});
  useEffect(() => { browseChildrenMapRef.current = browseChildrenMap; }, [browseChildrenMap]);

  const browseOverride = useMemo(() => ({
    isActive: () => Boolean(browseProjectKeyRef.current),
    expandAll: () => {
      const allKeys = new Set<string>();
      browseEpicsRef.current.forEach((e) => allKeys.add(e.key));
      for (const [key, children] of Object.entries(browseChildrenMapRef.current)) {
        if (children.length > 0) allKeys.add(key);
      }
      setBrowseExpandedKeys(allKeys);
      browseEpicsRef.current.forEach((e) => loadBrowseChildren(e.key));
    },
    collapseAll: () => {
      setBrowseExpandedKeys(new Set());
    },
  }), [setBrowseExpandedKeys, loadBrowseChildren]);

  // myIssuesHook.onIssuesLoaded가 expandStateHook보다 앞에 선언되므로,
  // 아래에서 할당되는 expandStateHook.loadAllDescendants를 ref로 간접 참조한다.
  const expandStateRef = useRef<{
    loadAllDescendants: (issues: NormalizedIssue[], projectFilter?: string[]) => Promise<void>;
  } | null>(null);

  // 내 이슈 (myIssues): 초기값 cached 기반, onIssuesLoaded에서 expandState.loadAllDescendants 호출
  const myIssuesHook = useJiraMyIssues({
    accountId: currentAccountId,
    activeAccount,
    selectedProjects,
    cached: {
      myIssues: cached?.myIssues,
    },
    onIssuesLoaded: useCallback(
      (issues: NormalizedIssue[]) => {
        expandStateRef.current?.loadAllDescendants(issues, selectedProjects.length > 0 ? selectedProjects : undefined);
      },
      [selectedProjects],
    ),
  });
  const {
    myIssues,
    myIssueKeys,
    isLoading,
    setMyIssues,
    fetchMyIssues,
  } = myIssuesHook;

  // ── 기본 모드 확장 상태 ──
  const expandStateHook = useJiraExpandState({
    accountId: currentAccountId,
    activeAccount,
    myIssues,
    fetchChildren,
    selectedProjects,
    epicGroupsRef,
    browseOverride,
    cached: {
      expandedEpics: cached?.expandedEpics,
      defaultChildrenMap: cached?.defaultChildrenMap,
      defaultExpandedChildren: cached?.defaultExpandedChildren,
    },
  });
  const {
    expandedEpics,
    setExpandedEpics,
    defaultChildrenMap,
    defaultExpandedChildren,
    setDefaultExpandedChildren,
    defaultLoadingChildren,
    loadDefaultChildren,
    loadAllDescendants,
    toggleEpic,
    expandAll,
    collapseAll,
  } = expandStateHook;

  // myIssuesHook.onIssuesLoaded가 최신 loadAllDescendants를 참조하도록 ref 동기화
  useEffect(() => {
    expandStateRef.current = { loadAllDescendants };
  }, [loadAllDescendants]);

  // 상태 필터
  const statusFilterHook = useJiraStatusFilter({
    accountId: currentAccountId,
    myIssues,
    myIssueKeys,
    doneCounts,
    cachedSelectedStatuses: cached?.selectedStatuses,
  });
  const { selectedStatuses, statusCounts, toggleStatus } = statusFilterHook;

  // 검색 + 자동완성
  const issueSearchHook = useJiraIssueSearch({
    accountId: currentAccountId,
    activeAccount,
    selectedProjects,
    projects,
    fetchByKeys,
    fetchChildren,
    onResultsLoaded: useCallback(
      (issues: NormalizedIssue[], pf?: string[]) => {
        setExpandedEpics(
          new Set(issues.filter((i) => isEpicType(i.issueTypeName)).map((i) => i.key).concat('__no_epic__')),
        );
        loadAllDescendants(issues, pf);
      },
      [loadAllDescendants, setExpandedEpics],
    ),
    cached: {
      searchQuery: cached?.searchQuery,
      searchResults: cached?.searchResults,
    },
  });
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    isSearching,
    searchIssues,
  } = issueSearchHook;

  const suggestHook = useJiraSuggest({
    accountId: currentAccountId,
    activeAccount,
    selectedProjects,
    projects,
  });
  const {
    suggestions,
    setSuggestions,
    showSuggestions,
    setShowSuggestions,
    isSuggestLoading,
    activeSuggestionIdx,
    setActiveSuggestionIdx,
    suggestContainerRef: searchWrapperRef,
    handleSearchChange: triggerSuggest,
    fetchSuggestions,
  } = suggestHook;

  // ── 계정 변경 시 화면 즉시 리셋 (slot은 jiraDashboardCache Map에 보존되어 복귀 시 복원) ──
  const prevAccountIdRef = useRef(currentAccountId);
  useEffect(() => {
    if (prevAccountIdRef.current === currentAccountId) return;
    prevAccountIdRef.current = currentAccountId;

    setSearchQuery('');
    setSearchResults(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setExpandedEpics(new Set());
  }, [currentAccountId, setSearchQuery, setSearchResults, setSuggestions, setShowSuggestions, setExpandedEpics]);

  // 상태 변경 시 캐시 동기화 (계정별 slot에 스냅샷 저장)
  useAccountScopedCache(
    jiraDashboardCache,
    currentAccountId,
    [myIssues, projects, selectedProjects, searchQuery, searchResults, expandedEpics, defaultChildrenMap, defaultExpandedChildren, doneCounts, doneIssues, browseProjectKey, browseEpics, browseChildrenMap, browseExpandedKeys, browseLoadedChildren, selectedStatuses],
    () => ({
      myIssues,
      projects,
      selectedProjects,
      searchQuery,
      searchResults,
      expandedEpics,
      defaultChildrenMap,
      defaultExpandedChildren,
      doneCounts,
      doneIssues,
      browseProjectKey,
      browseEpics,
      browseChildrenMap,
      browseExpandedKeys,
      browseLoadedChildren,
      selectedStatuses: Array.from(selectedStatuses),
    }),
  );

  // composer 수준에서 searchQuery와 debounced suggest trigger를 합성
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    triggerSuggest(value);
  }, [setSearchQuery, triggerSuggest]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults(null);
    setSuggestions([]);
    setShowSuggestions(false);
  }, [setSearchQuery, setSearchResults, setSuggestions, setShowSuggestions]);

  // 최초 마운트: 캐시가 유효하면 API 재호출 생략
  const initialFetchDone = React.useRef(Boolean(cached && cached.myIssues.length > 0));

  useEffect(() => {
    if (!activeAccount || !projectsReady) {
      if (!activeAccount) {
        setProjects([]);
        setMyIssues([]);
      }
      return;
    }
    if (initialFetchDone.current) {
      initialFetchDone.current = false;
      return;
    }
    fetchProjects();
    fetchMyIssues();
    fetchDoneCounts();
    fetchDoneIssues();
  }, [activeAccount, projectsReady, fetchProjects, fetchMyIssues, fetchDoneCounts, fetchDoneIssues, setProjects, setMyIssues]);

  const goToIssue = useCallback((key: string) => {
    if (key) history.push(`/jira/issue/${key}`);
  }, [history]);

  // ── 상태 업데이트 콜백 (transition/assignee 드롭다운에서 사용) ──

  const handleTransitioned = useCallback((issueKey: string, toName: string, toCategory: string) => {
    const updateIssues = (list: NormalizedIssue[]) =>
      list.map((i) => i.key === issueKey ? { ...i, statusName: toName, statusCategory: toCategory } : i);
    setMyIssues((prev) => updateIssues(prev));
    setDoneIssues((prev) => updateIssues(prev));
    setSearchResults((prev) => prev ? updateIssues(prev) : prev);
    setBrowseEpics((prev) => updateIssues(prev));
    setBrowseChildrenMap((prev) => {
      const next: Record<string, NormalizedIssue[]> = {};
      for (const [key, children] of Object.entries(prev)) {
        next[key] = updateIssues(children);
      }
      return next;
    });
  }, [setMyIssues, setDoneIssues, setSearchResults, setBrowseEpics, setBrowseChildrenMap]);

  const handleAssigned = useCallback((issueKey: string, displayName: string) => {
    const updateIssues = (list: NormalizedIssue[]) =>
      list.map((i) => i.key === issueKey ? { ...i, assigneeName: displayName } : i);
    setMyIssues((prev) => updateIssues(prev));
    setDoneIssues((prev) => updateIssues(prev));
    setSearchResults((prev) => prev ? updateIssues(prev) : prev);
    setBrowseEpics((prev) => updateIssues(prev));
    setBrowseChildrenMap((prev) => {
      const next: Record<string, NormalizedIssue[]> = {};
      for (const [key, children] of Object.entries(prev)) {
        next[key] = updateIssues(children);
      }
      return next;
    });
  }, [setMyIssues, setDoneIssues, setSearchResults, setBrowseEpics, setBrowseChildrenMap]);

  // 스페이스 설정 저장 (훅의 handleSaveSpaceSettings를 래핑하여 후속 fetch 합성)
  const saveSpaceSettings = useCallback(() => {
    handleSaveSpaceSettings();
    setShowSpaceSettings(false);
    fetchMyIssues();
    fetchDoneCounts();
    setDoneIssuesLoaded(false);
    fetchDoneIssues();
  }, [handleSaveSpaceSettings, fetchMyIssues, fetchDoneCounts, fetchDoneIssues, setDoneIssuesLoaded]);

  // projectsReady는 useJiraProjects가 관리하지만, activeAccount 해제 시 composer가 직접 제어할 필요가 있을 때를 위해 노출
  void setProjectsReady;

  return {
    // State
    myIssues,
    isLoading,
    doneCounts,
    projects,
    selectedProjects,
    setSelectedProjects,
    showSpaceSettings,
    setShowSpaceSettings,
    spaceFilter,
    setSpaceFilter,
    projectsReady,
    searchQuery,
    searchResults,
    isSearching,
    suggestions,
    showSuggestions,
    setShowSuggestions,
    isSuggestLoading,
    activeSuggestionIdx,
    setActiveSuggestionIdx,
    expandedEpics,
    defaultChildrenMap,
    defaultExpandedChildren,
    setDefaultExpandedChildren,
    defaultLoadingChildren,
    browseProjectKey,
    browseEpics,
    browseChildrenMap,
    isBrowseLoading,
    browseExpandedKeys,
    setBrowseExpandedKeys,
    browseLoadedChildren,

    // Refs
    searchWrapperRef,
    epicGroupsRef,

    // Computed
    statusCounts,
    filteredProjects,
    selectedStatuses,
    doneIssues,

    // Callbacks
    fetchProjects,
    fetchByKeys,
    fetchChildren,
    loadAllDescendants,
    loadDefaultChildren,
    fetchMyIssues,
    fetchDoneCounts,
    searchIssues,
    fetchSuggestions,
    handleSearchChange,
    clearSearch,
    loadBrowseChildren,
    goToIssue,
    toggleEpic,
    expandAll,
    collapseAll,
    toggleBrowseEpic,
    handleTransitioned,
    handleAssigned,
    saveSpaceSettings,
    toggleStatus,
  };
}
