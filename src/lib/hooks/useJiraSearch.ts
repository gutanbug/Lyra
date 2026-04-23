import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import React from 'react';
import { integrationController } from 'controllers/account';
import { isEpicType, isSubTaskType, escapeJql, KEY_PATTERN, NUMBER_ONLY_PATTERN } from 'lib/utils/jiraUtils';
import { parseIssues, groupByEpic, buildProjectClause, buildSearchJql } from 'lib/utils/jiraNormalizers';
import { createAccountScopedCache, useAccountScopedCache } from 'lib/hooks/_shared/useAccountScopedCache';
import { useJiraStatusFilter } from 'lib/hooks/jira/useJiraStatusFilter';
import { useJiraProjects } from 'lib/hooks/jira/useJiraProjects';
import { useJiraMyIssues } from 'lib/hooks/jira/useJiraMyIssues';
import { useJiraDoneIssues } from 'lib/hooks/jira/useJiraDoneIssues';
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

  // 완료 이슈/카운트 (먼저 선언: loadAllDescendants 선언부에서 참조되지 않고, my 이슈 fetch가 descendant 로딩과 분리됨)
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

  // 검색
  const [searchQuery, setSearchQuery] = useState(cached?.searchQuery ?? '');
  const [searchResults, setSearchResults] = useState<NormalizedIssue[] | null>(cached?.searchResults ?? null);
  const [isSearching, setIsSearching] = useState(false);

  // 자동완성
  const [suggestions, setSuggestions] = useState<NormalizedIssue[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // Epic 토글 상태
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(cached?.expandedEpics ?? new Set());

  // 기본 모드 N-depth 하위 이슈 상태
  const [defaultChildrenMap, setDefaultChildrenMap] = useState<Record<string, NormalizedIssue[]>>(cached?.defaultChildrenMap ?? {});
  const [defaultExpandedChildren, setDefaultExpandedChildren] = useState<Set<string>>(cached?.defaultExpandedChildren ?? new Set());
  const [defaultLoadingChildren, setDefaultLoadingChildren] = useState<Set<string>>(new Set());
  const defaultLoadedChildrenRef = useRef<Set<string>>(
    cached ? new Set(Object.keys(cached.defaultChildrenMap)) : new Set()
  );

  // 사이드바 프로젝트 브라우즈 모드
  const [browseProjectKey, setBrowseProjectKey] = useState<string | null>(cached?.browseProjectKey ?? null);
  const [browseEpics, setBrowseEpics] = useState<NormalizedIssue[]>(cached?.browseEpics ?? []);
  const [browseChildrenMap, setBrowseChildrenMap] = useState<Record<string, NormalizedIssue[]>>(cached?.browseChildrenMap ?? {});
  const [isBrowseLoading, setIsBrowseLoading] = useState(false);
  const [browseExpandedKeys, setBrowseExpandedKeys] = useState<Set<string>>(cached?.browseExpandedKeys ?? new Set());
  const [, setBrowseLoadingChildren] = useState<Set<string>>(new Set());
  const [browseLoadedChildren, setBrowseLoadedChildren] = useState<Set<string>>(cached?.browseLoadedChildren ?? new Set());

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

  const loadAllDescendants = useCallback(async (issues: NormalizedIssue[], projectFilter?: string[]) => {
    const childrenMap: Record<string, NormalizedIssue[]> = {};
    const loaded = new Set<string>();
    const issueMap = new Map<string, NormalizedIssue>();
    for (const i of issues) issueMap.set(i.key, i);

    let keysToLoad = issues
      .filter((i) => i.subtaskCount > 0)
      .map((i) => i.key);

    while (keysToLoad.length > 0) {
      const nextKeys: string[] = [];

      await Promise.all(
        keysToLoad.map(async (key) => {
          if (loaded.has(key)) return;
          loaded.add(key);
          try {
            const parentIssue = issueMap.get(key);
            const epic = parentIssue ? isEpicType(parentIssue.issueTypeName) : false;
            const children = await fetchChildren([key], projectFilter, epic);
            childrenMap[key] = children;
            for (const child of children) {
              issueMap.set(child.key, child);
              if (child.subtaskCount > 0 && !loaded.has(child.key)) {
                nextKeys.push(child.key);
              }
            }
          } catch { /* ignore */ }
        }),
      );

      keysToLoad = nextKeys;
    }

    setDefaultChildrenMap((prev) => ({ ...prev, ...childrenMap }));
    for (const key of Object.keys(childrenMap)) {
      defaultLoadedChildrenRef.current.add(key);
    }
  }, [fetchChildren]);

  // 내 이슈 (myIssues 훅): composer에서 onIssuesLoaded로 descendant 로딩 합성
  const myIssuesHook = useJiraMyIssues({
    accountId: currentAccountId,
    activeAccount,
    selectedProjects,
    cached: {
      myIssues: cached?.myIssues,
    },
    onIssuesLoaded: useCallback(
      (issues: NormalizedIssue[]) => {
        loadAllDescendants(issues, selectedProjects.length > 0 ? selectedProjects : undefined);
      },
      [loadAllDescendants, selectedProjects],
    ),
  });
  const {
    myIssues,
    myIssueKeys,
    isLoading,
    setMyIssues,
    fetchMyIssues,
  } = myIssuesHook;

  // 상태 필터 (selectedStatuses + statusCounts + toggleStatus)
  const statusFilterHook = useJiraStatusFilter({
    accountId: currentAccountId,
    myIssues,
    myIssueKeys,
    doneCounts,
    cachedSelectedStatuses: cached?.selectedStatuses,
  });
  const { selectedStatuses, statusCounts, toggleStatus } = statusFilterHook;

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
  }, [currentAccountId]);

  // 사이드바에서 프로젝트 브라우즈 이벤트 수신
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const key = detail?.projectKey as string | null;
      if (key) {
        setBrowseProjectKey(key);
        setBrowseEpics([]);
        setBrowseChildrenMap({});
        setBrowseExpandedKeys(new Set());
        setBrowseLoadedChildren(new Set());
      } else {
        setBrowseProjectKey(null);
        setBrowseEpics([]);
        setBrowseChildrenMap({});
        setBrowseExpandedKeys(new Set());
        setBrowseLoadedChildren(new Set());
      }
    };
    window.addEventListener('lyra:sidebar-browse-project', handler);
    return () => window.removeEventListener('lyra:sidebar-browse-project', handler);
  }, []);

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

  // ── 사이드바 프로젝트 브라우즈: 에픽만 조회 ──
  const browseFetchDone = React.useRef(Boolean(cached && cached.browseProjectKey === browseProjectKey && cached.browseEpics.length > 0));
  useEffect(() => {
    if (!browseProjectKey || !activeAccount) return;
    if (browseFetchDone.current) {
      browseFetchDone.current = false;
      return;
    }
    let cancelled = false;
    setIsBrowseLoading(true);
    setBrowseEpics([]);
    setBrowseChildrenMap({});
    setBrowseLoadedChildren(new Set());

    (async () => {
      try {
        const epicResult = await integrationController.invoke({
          accountId: activeAccount.id,
          serviceType: 'jira',
          action: 'searchIssues',
          params: {
            jql: `project = "${escapeJql(browseProjectKey)}" AND issuetype in (Epic, 에픽) ORDER BY created DESC`,
            maxResults: 500,
            skipCache: true,
          },
        });
        if (cancelled) return;
        const epics = parseIssues(epicResult);
        setBrowseEpics(epics);
      } catch (err) {
        console.error('[JiraDashboard] browse epics error:', err);
        if (!cancelled) setBrowseEpics([]);
      } finally {
        if (!cancelled) setIsBrowseLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [browseProjectKey, activeAccount]);

  // 브라우즈 모드에서 하위 이슈 비동기 로드
  const loadBrowseChildren = useCallback(async (parentKey: string) => {
    if (browseLoadedChildren.has(parentKey)) return;

    // browseEpics에서 에픽 여부 확인
    const epic = browseEpics.some((e) => e.key === parentKey);

    setBrowseLoadingChildren((prev) => new Set(prev).add(parentKey));
    try {
      const children = await fetchChildren([parentKey], undefined, epic);
      setBrowseChildrenMap((prev) => ({
        ...prev,
        [parentKey]: children,
      }));
    } catch { /* ignore */ }
    setBrowseLoadingChildren((prev) => {
      const next = new Set(prev);
      next.delete(parentKey);
      return next;
    });
    setBrowseLoadedChildren((prev) => new Set(prev).add(parentKey));
  }, [fetchChildren, browseLoadedChildren]);

  // 캐시 복원 후 펼침 상태와 로드된 데이터 동기화
  const browseResyncDone = React.useRef(false);
  useEffect(() => {
    if (browseResyncDone.current) return;
    browseResyncDone.current = true;
    if (!browseProjectKey || !activeAccount) return;
    browseExpandedKeys.forEach((key) => {
      if (browseChildrenMap[key] === undefined) {
        loadBrowseChildren(key);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDefaultChildren = useCallback(async (parentKey: string) => {
    if (defaultLoadedChildrenRef.current.has(parentKey)) {
      setDefaultExpandedChildren((prev) => {
        const next = new Set(prev);
        next.add(parentKey);
        return next;
      });
      return;
    }

    // 이슈 타입 확인: myIssues 또는 defaultChildrenMap에서 찾기
    let epic = false;
    const parentIssue = myIssues.find((i) => i.key === parentKey);
    if (parentIssue) {
      epic = isEpicType(parentIssue.issueTypeName);
    }

    setDefaultLoadingChildren((prev) => new Set(prev).add(parentKey));
    try {
      const children = await fetchChildren([parentKey], selectedProjects, epic);
      setDefaultChildrenMap((prev) => ({
        ...prev,
        [parentKey]: children,
      }));
      setDefaultExpandedChildren((prev) => {
        const next = new Set(prev);
        next.add(parentKey);
        return next;
      });
    } catch { /* ignore */ }
    setDefaultLoadingChildren((prev) => {
      const next = new Set(prev);
      next.delete(parentKey);
      return next;
    });
    defaultLoadedChildrenRef.current.add(parentKey);
  }, [fetchChildren, selectedProjects, myIssues]);

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

      // 기본 검색과 담당자 검색을 병렬 실행
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

      // 키 검색이 아닌 경우에만 사용자 검색 수행
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

      // 매칭된 사용자가 있으면 해당 담당자의 이슈를 추가 검색
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

      // 1단계: 부모 조회
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

      // 2단계: 조부모 조회
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

      // 3단계: 에픽의 하위 스토리 조회
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

      // 4단계: 스토리의 하위항목 조회
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
      setExpandedEpics(new Set(issues.filter((i) => isEpicType(i.issueTypeName)).map((i) => i.key).concat('__no_epic__')));
      loadAllDescendants(issues, pf);
    } catch (err) {
      console.error('[JiraDashboard] searchIssues error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [activeAccount, searchQuery, selectedProjects, projects, fetchByKeys, fetchChildren, loadAllDescendants]);

  // 자동완성: summary 필드만으로 검색
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!activeAccount || !query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsSuggestLoading(true);
    try {
      const clauses: string[] = [];
      const pc = buildProjectClause(selectedProjects);
      if (pc) clauses.push(pc);

      const term = query.trim();
      if (KEY_PATTERN.test(term)) {
        clauses.push(`key = "${escapeJql(term)}"`);
      } else if (NUMBER_ONLY_PATTERN.test(term)) {
        const prefixes = selectedProjects.length > 0 ? selectedProjects : projects.map((p) => p.key);
        if (prefixes.length > 0) {
          const keys = prefixes.map((pk) => `"${pk}-${term}"`);
          clauses.push(keys.length === 1 ? `key = ${keys[0]}` : `key IN (${keys.join(',')})`);
        }
      } else {
        const words = term.split(/\s+/).filter(Boolean);
        const wordClauses = words.map((w) => `summary ~ "${escapeJql(w)}"`);
        clauses.push(wordClauses.length === 1 ? wordClauses[0] : wordClauses.join(' AND '));
      }

      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'jira',
        action: 'searchIssues',
        params: {
          jql: `${clauses.join(' AND ')} ORDER BY updated DESC`,
          maxResults: 10,
          skipCache: true,
        },
      });
      const issues = parseIssues(result);
      setSuggestions(issues);
      setShowSuggestions(issues.length > 0);
      setActiveSuggestionIdx(-1);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSuggestLoading(false);
    }
  }, [activeAccount, selectedProjects, projects]);

  // 검색어 변경 시 debounce 자동완성
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    suggestTimerRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  }, [fetchSuggestions]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 타이머 정리
  useEffect(() => {
    return () => {
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    };
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults(null);
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

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

  const toggleEpic = useCallback((epicKey: string) => {
    setExpandedEpics((prev) => {
      const next = new Set(prev);
      if (next.has(epicKey)) {
        next.delete(epicKey);
      } else {
        next.add(epicKey);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback((groups: EpicGroup[]) => {
    setExpandedEpics(new Set(groups.map((g) => g.key)));
    const allKeys = new Set<string>();
    for (const [key, children] of Object.entries(defaultChildrenMap)) {
      if (children.length > 0) allKeys.add(key);
    }
    setDefaultExpandedChildren(allKeys);
  }, [defaultChildrenMap]);

  const collapseAll = useCallback(() => {
    setExpandedEpics(new Set());
    setDefaultExpandedChildren(new Set());
  }, []);

  // 글로벌 단축키 이벤트 수신 (모두 접기/펼치기)
  const epicGroupsRef = useRef<EpicGroup[]>([]);
  const browseEpicsRef = useRef<NormalizedIssue[]>([]);
  useEffect(() => { browseEpicsRef.current = browseEpics; }, [browseEpics]);
  const browseChildrenMapRef = useRef<Record<string, NormalizedIssue[]>>({});
  useEffect(() => { browseChildrenMapRef.current = browseChildrenMap; }, [browseChildrenMap]);
  const browseProjectKeyRef = useRef<string | null>(null);
  useEffect(() => { browseProjectKeyRef.current = browseProjectKey; }, [browseProjectKey]);

  useEffect(() => {
    const onExpand = () => {
      if (browseProjectKeyRef.current) {
        const allKeys = new Set<string>();
        browseEpicsRef.current.forEach((e) => allKeys.add(e.key));
        for (const [key, children] of Object.entries(browseChildrenMapRef.current)) {
          if (children.length > 0) allKeys.add(key);
        }
        setBrowseExpandedKeys(allKeys);
        browseEpicsRef.current.forEach((e) => loadBrowseChildren(e.key));
      } else {
        expandAll(epicGroupsRef.current);
      }
    };
    const onCollapse = () => {
      if (browseProjectKeyRef.current) {
        setBrowseExpandedKeys(new Set());
      } else {
        collapseAll();
      }
    };
    window.addEventListener('lyra:expand-all', onExpand);
    window.addEventListener('lyra:collapse-all', onCollapse);
    return () => {
      window.removeEventListener('lyra:expand-all', onExpand);
      window.removeEventListener('lyra:collapse-all', onCollapse);
    };
  }, [expandAll, collapseAll, loadBrowseChildren]);

  // 브라우즈 모드에서 에픽 토글
  const toggleBrowseEpic = useCallback((epicKey: string) => {
    setBrowseExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(epicKey)) {
        next.delete(epicKey);
      } else {
        next.add(epicKey);
      }
      return next;
    });
    loadBrowseChildren(epicKey);
  }, [loadBrowseChildren]);

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
  }, [setMyIssues, setDoneIssues]);

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
  }, [setMyIssues, setDoneIssues]);

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
