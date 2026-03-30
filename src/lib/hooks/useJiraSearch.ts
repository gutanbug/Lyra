import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import React from 'react';
import { integrationController } from 'controllers/account';
import { isEpicType, isSubTaskType, escapeJql, KEY_PATTERN, NUMBER_ONLY_PATTERN } from 'lib/utils/jiraUtils';
import { parseIssues, groupByEpic, buildProjectClause, buildSearchJql } from 'lib/utils/jiraNormalizers';
import { loadSelectedProjects, loadSelectedProjectsAsync, saveSelectedProjects, loadSelectedStatuses, saveSelectedStatuses } from 'lib/utils/storageHelpers';
import type { NormalizedIssue, EpicGroup, JiraProject } from 'types/jira';

export interface StatusCount { name: string; category: string; count: number }

interface DashboardCache {
  myIssues: NormalizedIssue[];
  projects: JiraProject[];
  selectedProjects: string[];
  searchQuery: string;
  searchResults: NormalizedIssue[] | null;
  expandedEpics: Set<string>;
  statusCounts: StatusCount[];
  defaultChildrenMap: Record<string, NormalizedIssue[]>;
  defaultExpandedChildren: Set<string>;
  accountId: string;
  browseProjectKey: string | null;
  browseEpics: NormalizedIssue[];
  browseChildrenMap: Record<string, NormalizedIssue[]>;
  browseExpandedKeys: Set<string>;
  browseLoadedChildren: Set<string>;
  doneCounts: StatusCount[];
}

const cache: DashboardCache = {
  myIssues: [],
  projects: [],
  selectedProjects: [],
  searchQuery: '',
  searchResults: null,
  expandedEpics: new Set(),
  statusCounts: [],
  defaultChildrenMap: {},
  defaultExpandedChildren: new Set(),
  accountId: '',
  browseProjectKey: null,
  browseEpics: [],
  browseChildrenMap: {},
  browseExpandedKeys: new Set(),
  browseLoadedChildren: new Set(),
  doneCounts: [],
};

interface UseJiraSearchOptions {
  activeAccount: { id: string; metadata?: unknown } | null | undefined;
  history: { push: (path: string) => void };
}

export function useJiraSearch({ activeAccount, history }: UseJiraSearchOptions) {
  const currentAccountId = activeAccount?.id || '';
  const isCacheValid = cache.accountId === currentAccountId && currentAccountId !== '';

  // 전체 이슈 (내 담당)
  const [myIssues, setMyIssues] = useState<NormalizedIssue[]>(isCacheValid ? cache.myIssues : []);
  const [myIssueKeys, setMyIssueKeys] = useState<Set<string>>(new Set()); // 본인 담당 이슈 키 (부모/조부모 제외)
  const [isLoading, setIsLoading] = useState(false);

  // 완료(Done) 상태별 개수 (별도 조회)
  const [doneCounts, setDoneCounts] = useState<StatusCount[]>(isCacheValid ? cache.doneCounts : []);

  // 프로젝트 (스페이스) 필터
  const [projects, setProjects] = useState<JiraProject[]>(isCacheValid ? cache.projects : []);
  const [selectedProjects, setSelectedProjects] = useState<string[]>(
    isCacheValid ? cache.selectedProjects : loadSelectedProjects(currentAccountId)
  );
  const [showSpaceSettings, setShowSpaceSettings] = useState(false);
  const [spaceFilter, setSpaceFilter] = useState('');
  const [projectsReady, setProjectsReady] = useState(isCacheValid || loadSelectedProjects(currentAccountId).length > 0);

  // 검색
  const [searchQuery, setSearchQuery] = useState(isCacheValid ? cache.searchQuery : '');
  const [searchResults, setSearchResults] = useState<NormalizedIssue[] | null>(isCacheValid ? cache.searchResults : null);
  const [isSearching, setIsSearching] = useState(false);

  // 자동완성
  const [suggestions, setSuggestions] = useState<NormalizedIssue[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // Epic 토글 상태
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(isCacheValid ? cache.expandedEpics : new Set());

  // 기본 모드 N-depth 하위 이슈 상태
  const [defaultChildrenMap, setDefaultChildrenMap] = useState<Record<string, NormalizedIssue[]>>(isCacheValid ? cache.defaultChildrenMap : {});
  const [defaultExpandedChildren, setDefaultExpandedChildren] = useState<Set<string>>(isCacheValid ? cache.defaultExpandedChildren : new Set());
  const [defaultLoadingChildren, setDefaultLoadingChildren] = useState<Set<string>>(new Set());
  const defaultLoadedChildrenRef = useRef<Set<string>>(
    isCacheValid ? new Set(Object.keys(cache.defaultChildrenMap)) : new Set()
  );

  // 사이드바 프로젝트 브라우즈 모드
  const [browseProjectKey, setBrowseProjectKey] = useState<string | null>(isCacheValid ? cache.browseProjectKey : null);
  const [browseEpics, setBrowseEpics] = useState<NormalizedIssue[]>(isCacheValid ? cache.browseEpics : []);
  const [browseChildrenMap, setBrowseChildrenMap] = useState<Record<string, NormalizedIssue[]>>(isCacheValid ? cache.browseChildrenMap : {});
  const [isBrowseLoading, setIsBrowseLoading] = useState(false);
  const [browseExpandedKeys, setBrowseExpandedKeys] = useState<Set<string>>(isCacheValid ? cache.browseExpandedKeys : new Set());
  const [, setBrowseLoadingChildren] = useState<Set<string>>(new Set());
  const [browseLoadedChildren, setBrowseLoadedChildren] = useState<Set<string>>(isCacheValid ? cache.browseLoadedChildren : new Set());

  // 상태 필터 (localStorage에서 복원)
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(() => {
    const saved = loadSelectedStatuses(currentAccountId);
    return new Set(saved);
  });
  const [doneIssues, setDoneIssues] = useState<NormalizedIssue[]>([]);
  const [doneIssuesLoaded, setDoneIssuesLoaded] = useState(false);

  // 상태별 개수 (myIssues + doneCounts 합산)
  const statusCounts = useMemo(() => {
    const countMap = new Map<string, { category: string; count: number }>();
    // 본인 담당 이슈만 카운트 (계층 구조용 부모/조부모 이슈 제외)
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

  // 상태 필터 토글
  const isDoneCategory = useCallback((category: string) => {
    const l = category.toLowerCase();
    return l.includes('done') || l.includes('완료');
  }, []);

  const toggleStatus = useCallback((statusName: string) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(statusName)) next.delete(statusName);
      else next.add(statusName);
      saveSelectedStatuses(currentAccountId, Array.from(next));
      return next;
    });
  }, [currentAccountId]);

  // 완료 이슈 조회 — 초기 로드 시 함께 호출, 부모 에픽 정보도 포함
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

      // 부모/조부모 에픽 조회 (myIssues와 동일 패턴)
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

      // 2단계: 조부모 (에픽) 조회
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

  // 스페이스 설정 모달용 필터링
  const filteredProjects = useMemo(() => {
    const q = spaceFilter.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q)
    );
  }, [projects, spaceFilter]);

  // ── 계정 변경 시 state 초기화 ──
  const prevAccountIdRef = useRef(currentAccountId);
  useEffect(() => {
    if (prevAccountIdRef.current === currentAccountId) return;
    prevAccountIdRef.current = currentAccountId;

    setMyIssues([]);
    setProjects([]);
    setSelectedProjects([]);
    setSearchQuery('');
    setSearchResults(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setExpandedEpics(new Set());

    if (!currentAccountId) return;

    const localKeys = loadSelectedProjects(currentAccountId);
    if (localKeys.length > 0) {
      setSelectedProjects(localKeys);
      setProjectsReady(true);
    }
    loadSelectedProjectsAsync(currentAccountId).then((keys) => {
      if (keys.length > 0) setSelectedProjects(keys);
      setProjectsReady(true);
    });
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

  // 상태 변경 시 캐시 동기화
  useEffect(() => {
    cache.accountId = currentAccountId;
    cache.myIssues = myIssues;
    cache.projects = projects;
    cache.selectedProjects = selectedProjects;
    cache.searchQuery = searchQuery;
    cache.searchResults = searchResults;
    cache.expandedEpics = expandedEpics;
    cache.statusCounts = statusCounts;
    cache.defaultChildrenMap = defaultChildrenMap;
    cache.defaultExpandedChildren = defaultExpandedChildren;
    cache.doneCounts = doneCounts;
    cache.browseProjectKey = browseProjectKey;
    cache.browseEpics = browseEpics;
    cache.browseChildrenMap = browseChildrenMap;
    cache.browseExpandedKeys = browseExpandedKeys;
    cache.browseLoadedChildren = browseLoadedChildren;
  }, [currentAccountId, myIssues, projects, selectedProjects, searchQuery, searchResults, expandedEpics, statusCounts, defaultChildrenMap, defaultExpandedChildren, doneCounts, browseProjectKey, browseEpics, browseChildrenMap, browseExpandedKeys, browseLoadedChildren]);

  // ── fetch 콜백 ──

  const fetchProjects = useCallback(async () => {
    if (!activeAccount) return;
    try {
      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'jira',
        action: 'getProjects',
      });
      if (Array.isArray(result)) {
        const list = result
          .filter((p: any) => p && p.key)
          .map((p: any) => ({ key: String(p.key), name: String(p.name || p.key) }))
          .sort((a: JiraProject, b: JiraProject) => a.name.localeCompare(b.name));
        setProjects(list);
      }
    } catch (err) {
      console.error('[JiraDashboard] fetchProjects failed:', err);
      setProjects([]);
    }
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
  }, [fetchChildren, selectedProjects]);

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
      loadAllDescendants(issues, selectedProjects.length > 0 ? selectedProjects : undefined);
    } catch (err) {
      console.error('[JiraDashboard] fetchMyIssues error:', err);
      setMyIssues([]);
      setMyIssueKeys(new Set());
    } finally {
      setIsLoading(false);
    }
  }, [activeAccount, selectedProjects, loadAllDescendants]);

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

  // ── 사이드바 프로젝트 브라우즈: 에픽만 조회 ──
  const browseFetchDone = React.useRef(isCacheValid && cache.browseProjectKey === browseProjectKey && cache.browseEpics.length > 0);
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

  const searchIssues = useCallback(async () => {
    if (!activeAccount) return;
    const jqlFilter = buildSearchJql(searchQuery, selectedProjects, projects.map((p) => p.key));
    if (!jqlFilter) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'jira',
        action: 'searchIssues',
        params: {
          jql: `${jqlFilter} ORDER BY updated DESC`,
          maxResults: 100,
          skipCache: true,
        },
      });
      const issues = parseIssues(result);
      const allKeys = new Set(issues.map((i) => i.key));

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

  // 최초 마운트 시 비동기 프로젝트 설정 로드
  const initialLoadRef = useRef(false);
  useEffect(() => {
    if (initialLoadRef.current || !currentAccountId) return;
    initialLoadRef.current = true;
    if (!projectsReady) {
      loadSelectedProjectsAsync(currentAccountId).then((keys) => {
        if (keys.length > 0) setSelectedProjects(keys);
        setProjectsReady(true);
      });
    }
  }, [currentAccountId, projectsReady]);

  // 최초 마운트: 캐시가 유효하면 API 재호출 생략
  const initialFetchDone = React.useRef(isCacheValid && cache.myIssues.length > 0);

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
  }, [activeAccount, projectsReady, fetchProjects, fetchMyIssues, fetchDoneCounts, fetchDoneIssues]);

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
    setSearchResults((prev) => prev ? updateIssues(prev) : prev);
    setBrowseEpics((prev) => updateIssues(prev));
    setBrowseChildrenMap((prev) => {
      const next: Record<string, NormalizedIssue[]> = {};
      for (const [key, children] of Object.entries(prev)) {
        next[key] = updateIssues(children);
      }
      return next;
    });
  }, []);

  const handleAssigned = useCallback((issueKey: string, displayName: string) => {
    const updateIssues = (list: NormalizedIssue[]) =>
      list.map((i) => i.key === issueKey ? { ...i, assigneeName: displayName } : i);
    setMyIssues((prev) => updateIssues(prev));
    setSearchResults((prev) => prev ? updateIssues(prev) : prev);
    setBrowseEpics((prev) => updateIssues(prev));
    setBrowseChildrenMap((prev) => {
      const next: Record<string, NormalizedIssue[]> = {};
      for (const [key, children] of Object.entries(prev)) {
        next[key] = updateIssues(children);
      }
      return next;
    });
  }, []);

  // 스페이스 설정 저장
  const saveSpaceSettings = useCallback(() => {
    saveSelectedProjects(currentAccountId, selectedProjects);
    setShowSpaceSettings(false);
    window.dispatchEvent(new CustomEvent('lyra:space-settings-changed'));
    fetchMyIssues();
    fetchDoneCounts();
    setDoneIssuesLoaded(false);
    fetchDoneIssues();
  }, [currentAccountId, selectedProjects, fetchMyIssues, fetchDoneCounts, fetchDoneIssues]);

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
