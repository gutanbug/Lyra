import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import React from 'react';
import { integrationController } from 'controllers/account';
import { isEpicType } from 'lib/utils/jiraUtils';
import { parseIssues, buildProjectClause, setJiraParseContext } from 'lib/utils/jiraNormalizers';
import { loadProjectFieldConfigAsync } from 'lib/utils/storageHelpers';
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
  myIssueKeys: Set<string>;
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
  /** 캐시 복원 시 무한 스크롤 페이지 토큰. null=더 없음, string=다음 페이지 토큰. undefined로 두면 페이지네이션 상태가 사라져 100건 이상 로드 불가. */
  browseNextPageToken: string | null;
  doneCounts: StatusCount[];
  doneIssues: NormalizedIssue[];
  doneOwnKeys: Set<string>;
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

  // 타임라인 뷰용: 활성 프로젝트 각각의 startDateFieldId 매핑.
  // ProjectFieldConfig 변경 시 `lyra:project-field-config-changed` 이벤트로 갱신.
  // 전체 모드(selectedProjects가 비어 있음)에서는 visible projects 전부를 대상으로 한다.
  const [startDateByProject, setStartDateByProject] = useState<Record<string, string>>({});
  const projectKeysForFieldConfig = useMemo(
    () => (selectedProjects.length > 0 ? selectedProjects : projects.map((p) => p.key)),
    [selectedProjects, projects],
  );
  useEffect(() => {
    if (!currentAccountId || projectKeysForFieldConfig.length === 0) {
      setStartDateByProject({});
      return;
    }
    let cancelled = false;
    const load = async () => {
      const next: Record<string, string> = {};
      for (const pk of projectKeysForFieldConfig) {
        try {
          const cfg = await loadProjectFieldConfigAsync(currentAccountId, pk);
          if (cfg?.startDateFieldId) next[pk] = cfg.startDateFieldId;
        } catch { /* ignore */ }
      }
      if (!cancelled) setStartDateByProject(next);
    };
    load();
    const handler = () => { load(); };
    window.addEventListener('lyra:project-field-config-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      cancelled = true;
      window.removeEventListener('lyra:project-field-config-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, [currentAccountId, projectKeysForFieldConfig]);
  const startDateByProjectRef = useRef<Record<string, string>>({});
  useEffect(() => {
    startDateByProjectRef.current = startDateByProject;
    setJiraParseContext({ startDateByProject });
  }, [startDateByProject]);

  // 완료 이슈/카운트
  const doneIssuesHook = useJiraDoneIssues({
    accountId: currentAccountId,
    activeAccount,
    selectedProjects,
    cached: {
      doneIssues: cached?.doneIssues,
      doneOwnKeys: cached?.doneOwnKeys,
      doneCounts: cached?.doneCounts,
    },
  });
  const {
    doneIssues,
    doneOwnKeys,
    doneCounts,
    setDoneIssues,
    setDoneIssuesLoaded,
    fetchDoneIssues,
    fetchDoneCounts,
  } = doneIssuesHook;

  // 하위 이슈/부모 조회 헬퍼 (expandState/browseMode/issueSearch 공용 의존성)
  // onlyMine=true: assignee = currentUser() 조건을 JQL에 추가하여 내 담당 하위 이슈만 반환.
  // 대시보드 N-depth 확장 시 사용. 브라우즈/검색 모드는 false로 유지하여 전체 결과를 노출한다.
  const fetchChildren = useCallback(async (parentKeys: string[], projectFilter?: string[], isEpic = false, onlyMine = false): Promise<NormalizedIssue[]> => {
    if (parentKeys.length === 0 || !activeAccount) return [];
    const allChildren: NormalizedIssue[] = [];
    const seenKeys = new Set<string>();
    const parentKeySet = new Set(parentKeys);
    const pc = projectFilter && projectFilter.length > 0 ? `${buildProjectClause(projectFilter)} AND ` : '';
    const assigneeClause = onlyMine ? 'assignee = currentUser() AND ' : '';

    // parent JQL — 직접 자식 반환
    try {
      const jql = `${pc}${assigneeClause}parent IN (${parentKeys.join(',')}) ORDER BY created ASC`;
      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'jira',
        action: 'searchIssues',
        params: { jql, maxResults: 200, skipCache: true },
      });
      for (const issue of parseIssues(result, { startDateByProject: startDateByProjectRef.current })) {
        if (seenKeys.has(issue.key)) continue;
        allChildren.push(issue);
        seenKeys.add(issue.key);
      }
    } catch { /* ignore */ }

    // Epic Link JQL — 에픽일 때만 실행 (서브태스크 제외)
    if (isEpic) {
      try {
        const jql = `${pc}${assigneeClause}"Epic Link" IN (${parentKeys.join(',')}) AND issuetype not in subTaskIssueTypes() ORDER BY created ASC`;
        const result = await integrationController.invoke({
          accountId: activeAccount.id,
          serviceType: 'jira',
          action: 'searchIssues',
          params: { jql, maxResults: 200, skipCache: true },
        });
        for (const issue of parseIssues(result, { startDateByProject: startDateByProjectRef.current })) {
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
          const jql = `${pc}${assigneeClause}"Epic Link" IN (${parentKeys.join(',')}) ORDER BY created ASC`;
          const result = await integrationController.invoke({
            accountId: activeAccount.id,
            serviceType: 'jira',
            action: 'searchIssues',
            params: { jql, maxResults: 200, skipCache: true },
          });
          for (const issue of parseIssues(result, { startDateByProject: startDateByProjectRef.current })) {
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
      return parseIssues(result, { startDateByProject: startDateByProjectRef.current });
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
      browseNextPageToken: cached?.browseNextPageToken,
    },
  });
  const {
    browseProjectKey,
    browseBoardId,
    browseBoardName,
    browseEpics,
    browseChildrenMap,
    isBrowseLoading,
    isBrowseLoadingMore,
    hasMoreBrowseEpics,
    browseNextPageToken,
    browseExpandedKeys,
    browseLoadedChildren,
    setBrowseExpandedKeys,
    setBrowseEpics,
    setBrowseChildrenMap,
    loadBrowseChildren,
    loadMoreBrowseEpics,
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
    loadAllDescendants: (issues: NormalizedIssue[], projectFilter?: string[], onlyMine?: boolean) => Promise<void>;
  } | null>(null);

  // 내 이슈 (myIssues): 초기값 cached 기반, onIssuesLoaded에서 expandState.loadAllDescendants 호출
  const myIssuesHook = useJiraMyIssues({
    accountId: currentAccountId,
    activeAccount,
    selectedProjects,
    cached: {
      myIssues: cached?.myIssues,
      myIssueKeys: cached?.myIssueKeys,
    },
    onIssuesLoaded: useCallback(
      (issues: NormalizedIssue[]) => {
        // 내 담당 대시보드 → 하위 N-depth도 내 담당으로 제한
        expandStateRef.current?.loadAllDescendants(issues, selectedProjects.length > 0 ? selectedProjects : undefined, true);
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
    setDefaultChildrenMap,
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
  const {
    selectedStatuses, statusCounts, toggleStatus, isDoneOnlyActive, toggleDoneOnly, isHideDoneActive, toggleHideDone,
  } = statusFilterHook;

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
    [myIssues, myIssueKeys, projects, selectedProjects, searchQuery, searchResults, expandedEpics, defaultChildrenMap, defaultExpandedChildren, doneCounts, doneIssues, doneOwnKeys, browseProjectKey, browseEpics, browseChildrenMap, browseExpandedKeys, browseLoadedChildren, browseNextPageToken, selectedStatuses],
    () => ({
      myIssues,
      myIssueKeys,
      projects,
      selectedProjects,
      searchQuery,
      searchResults,
      expandedEpics,
      defaultChildrenMap,
      defaultExpandedChildren,
      doneCounts,
      doneIssues,
      doneOwnKeys,
      browseProjectKey,
      browseEpics,
      browseChildrenMap,
      browseExpandedKeys,
      browseLoadedChildren,
      browseNextPageToken,
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

  // startDateByProject 매핑이 바뀌면 이미 정규화된 NormalizedIssue들의 startDate는 stale.
  // 안전하게 다시 조회해 새 ambient context로 재정규화한다. (검색/브라우즈는 별도 trigger)
  const startDateByProjectKey = useMemo(
    () =>
      Object.entries(startDateByProject)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => `${k}=${v}`)
        .join('|'),
    [startDateByProject],
  );
  const startDateInitialRunRef = useRef(true);
  useEffect(() => {
    if (startDateInitialRunRef.current) {
      startDateInitialRunRef.current = false;
      return;
    }
    if (!activeAccount) return;
    fetchMyIssues();
    fetchDoneCounts();
    setDoneIssuesLoaded(false);
    fetchDoneIssues();
    // 검색/브라우즈가 활성이라면 같이 갱신
    if (searchResults !== null) {
      // useJiraIssueSearch는 외부에서 jql 변경으로만 재실행되므로 setSearchResults(null)로 표시 갱신만.
      // 사용자 입력이 다시 들어올 때 새 매핑이 적용된다.
    }
    if (browseProjectKey) {
      // browse 모드는 별도 effect chain — 매핑 적용된 막대는 보지 않으므로 noop.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDateByProjectKey]);

  const goToIssue = useCallback((key: string) => {
    if (key) history.push(`/jira/issue/${key}`);
  }, [history]);

  // ── 상태 업데이트 콜백 (transition/assignee 드롭다운에서 사용) ──

  const handleTransitioned = useCallback((issueKey: string, toName: string, toCategory: string) => {
    // 1) 낙관적 갱신: 즉시 보이는 statusName/statusCategory를 새 값으로 패치
    //    (사용자 피드백 지연 최소화 + 서버 응답 도착 전 일관성 유지)
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
    setDefaultChildrenMap((prev) => {
      const next: Record<string, NormalizedIssue[]> = {};
      for (const [key, children] of Object.entries(prev)) {
        next[key] = updateIssues(children);
      }
      return next;
    });

    // 2) 서버 동기화: Done ↔ non-Done 버킷 이동, doneOwnKeys/doneCounts 같은
    //    파생 상태를 정확히 맞추려면 재조회가 필요하다. (낙관적 패치만으로는 부족)
    fetchMyIssues();
    fetchDoneCounts();
    fetchDoneIssues();
  }, [
    setMyIssues, setDoneIssues, setSearchResults, setBrowseEpics, setBrowseChildrenMap, setDefaultChildrenMap,
    fetchMyIssues, fetchDoneCounts, fetchDoneIssues,
  ]);

  const handleDateChanged = useCallback((issueKey: string, next: { startDate: string; duedate: string }) => {
    const updateIssues = (list: NormalizedIssue[]) =>
      list.map((i) => i.key === issueKey ? { ...i, startDate: next.startDate, duedate: next.duedate } : i);
    setMyIssues((prev) => updateIssues(prev));
    setDoneIssues((prev) => updateIssues(prev));
    setSearchResults((prev) => prev ? updateIssues(prev) : prev);
    setBrowseEpics((prev) => updateIssues(prev));
    setBrowseChildrenMap((prev) => {
      const out: Record<string, NormalizedIssue[]> = {};
      for (const [k, children] of Object.entries(prev)) {
        out[k] = updateIssues(children);
      }
      return out;
    });
    setDefaultChildrenMap((prev) => {
      const out: Record<string, NormalizedIssue[]> = {};
      for (const [k, children] of Object.entries(prev)) {
        out[k] = updateIssues(children);
      }
      return out;
    });
  }, [setMyIssues, setDoneIssues, setSearchResults, setBrowseEpics, setBrowseChildrenMap, setDefaultChildrenMap]);

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
    myIssueKeys,
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
    browseBoardId,
    browseBoardName,
    browseEpics,
    browseChildrenMap,
    isBrowseLoading,
    isBrowseLoadingMore,
    hasMoreBrowseEpics,
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
    doneOwnKeys,

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
    loadMoreBrowseEpics,
    goToIssue,
    toggleEpic,
    expandAll,
    collapseAll,
    toggleBrowseEpic,
    handleTransitioned,
    handleAssigned,
    handleDateChanged,
    saveSpaceSettings,
    toggleStatus,
    isDoneOnlyActive,
    toggleDoneOnly,
    isHideDoneActive,
    toggleHideDone,

    // 타임라인용 메타
    startDateByProject,
  };
}
