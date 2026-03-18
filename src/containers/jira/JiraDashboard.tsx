import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useAccount } from 'modules/contexts/account';
import { integrationController } from 'controllers/account';
import { getServiceIcon, hasServiceIcon } from 'lib/icons/services';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { transition } from 'lib/styles/styles';
import { adfToText } from 'lib/utils/adfToText';
import { str, obj, isEpicType, isSubTaskType, getStatusColor, escapeJql, KEY_PATTERN, NUMBER_ONLY_PATTERN } from 'lib/utils/jiraUtils';
import { useTransitionDropdown } from 'lib/hooks/useTransitionDropdown';
import JiraTransitionDropdown from 'components/jira/JiraTransitionDropdown';
import JiraTaskIcon, { resolveTaskType, TASK_TYPE_LABELS, TASK_TYPE_COLORS } from 'components/jira/JiraTaskIcon';
import { isAtlassianAccount } from 'types/account';
import { useTabs } from 'modules/contexts/splitView';
import { Loader } from 'lucide-react';
import type { NormalizedIssue, EpicGroup, JiraProject } from 'types/jira';

function normalizeIssue(raw: Record<string, unknown>): NormalizedIssue {
  const key = str(raw.key) || str(raw.issueKey) || '';
  const id = str(raw.id) || '';

  const f = (raw.fields && typeof raw.fields === 'object' ? raw.fields : raw) as Record<string, unknown>;

  let summary = '';
  const rawSummary = f.summary;
  if (typeof rawSummary === 'string') {
    summary = rawSummary;
  } else if (rawSummary && typeof rawSummary === 'object') {
    summary = adfToText(rawSummary).trim();
  }

  const statusObj = obj(f.status);
  const statusName = str(statusObj?.name) || '';
  const statusCategoryObj = obj(statusObj?.statusCategory);
  const statusCategory =
    str(statusObj?.category) || str(statusCategoryObj?.name) || str(statusCategoryObj?.key) || '';

  const assigneeObj = obj(f.assignee);
  const assigneeName =
    str(assigneeObj?.displayName) || str(assigneeObj?.display_name) || str(assigneeObj?.name) || '';

  const issueTypeObj = obj(f.issuetype) || obj(f.issue_type) || obj(f.issueType);
  const issueTypeName = str(issueTypeObj?.name) || '';

  const priorityObj = obj(f.priority);
  const priorityName = str(priorityObj?.name) || '';

  const created = str(f.created) || '';
  const updated = str(f.updated) || '';
  const duedate = str(f.duedate) || str(f.dueDate) || str(f.due_date) || '';

  // parent (Epic 정보)
  const parentObj = obj(f.parent);
  const parentKey = str(parentObj?.key) || '';
  let parentSummary = str(parentObj?.summary) || '';
  if (!parentSummary && parentObj) {
    const parentFields = obj(parentObj.fields);
    if (parentFields) {
      const ps = parentFields.summary;
      parentSummary = typeof ps === 'string' ? ps : '';
    }
  }

  // subtaskCount: Jira API가 반환하는 subtasks 배열 길이
  const rawSubtasks = f.subtasks ?? f.subtaskCount;
  const subtaskCount = typeof rawSubtasks === 'number'
    ? rawSubtasks
    : Array.isArray(rawSubtasks) ? rawSubtasks.length : 0;

  return {
    id, key, summary, statusName, statusCategory, assigneeName,
    issueTypeName, priorityName, created, updated, duedate,
    parentKey, parentSummary, subtaskCount,
  };
}

function parseIssues(result: unknown): NormalizedIssue[] {
  if (!result || typeof result !== 'object') return [];
  const r = result as Record<string, unknown>;
  const list = (r.issues ?? r.values ?? []) as Record<string, unknown>[];
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => item && typeof item === 'object')
    .map(normalizeIssue)
    .filter((issue) => issue.key || issue.id);
}

/** 부모별 그룹핑 (parent가 없는 이슈는 '기타'로) */
function groupByEpic(issues: NormalizedIssue[]): EpicGroup[] {
  const epicMap = new Map<string, EpicGroup>();
  const NO_EPIC = '__no_epic__';

  // 이슈 키 → issueTypeName 매핑 (그룹 헤더 타입 결정용)
  const issueTypeMap = new Map<string, string>();
  for (const issue of issues) {
    if (issue.key) issueTypeMap.set(issue.key, issue.issueTypeName);
  }

  for (const issue of issues) {
    // Epic 자체는 children에 넣지 않고 그룹 헤더로
    if (isEpicType(issue.issueTypeName)) {
      if (!epicMap.has(issue.key)) {
        epicMap.set(issue.key, { key: issue.key, summary: issue.summary, issueTypeName: issue.issueTypeName, statusName: issue.statusName, statusCategory: issue.statusCategory, assigneeName: issue.assigneeName, children: [] });
      } else {
        const g = epicMap.get(issue.key)!;
        g.summary = issue.summary;
        g.issueTypeName = issue.issueTypeName;
        g.statusName = issue.statusName;
        g.statusCategory = issue.statusCategory;
        g.assigneeName = issue.assigneeName;
      }
      continue;
    }

    const parentKey = issue.parentKey || NO_EPIC;
    if (!epicMap.has(parentKey)) {
      // 부모 이슈의 실제 타입을 찾아서 설정
      const parentTypeName = issueTypeMap.get(parentKey) || '';
      epicMap.set(parentKey, {
        key: parentKey,
        summary: issue.parentSummary || (parentKey === NO_EPIC ? '기타' : parentKey),
        issueTypeName: parentTypeName,
        statusName: '',
        statusCategory: '',
        assigneeName: '',
        children: [],
      });
    }
    epicMap.get(parentKey)!.children.push(issue);
  }

  // children이 있는 그룹만 반환, 기타는 맨 뒤로
  const groups = Array.from(epicMap.values()).filter((g) => g.children.length > 0);
  groups.sort((a, b) => {
    if (a.key === NO_EPIC) return 1;
    if (b.key === NO_EPIC) return -1;
    return 0;
  });
  return groups;
}

function buildProjectClause(projectKeys: string[]): string {
  if (projectKeys.length === 0) return '';
  if (projectKeys.length === 1) return `project = "${projectKeys[0]}"`;
  return `project IN (${projectKeys.map((k) => `"${k}"`).join(',')})`;
}

function buildSearchJql(searchQuery: string, projectKeys: string[], allProjectKeys: string[] = []): string {
  const clauses: string[] = [];

  const pc = buildProjectClause(projectKeys);
  if (pc) clauses.push(pc);

  const term = searchQuery.trim();
  if (!term) return clauses.join(' AND ');

  // 티켓 키 정확 일치인 경우
  if (KEY_PATTERN.test(term)) {
    clauses.push(`key = "${escapeJql(term)}"`);
    return clauses.join(' AND ');
  }

  // 숫자만 입력된 경우: 프로젝트 prefix를 붙여서 검색
  // 선택된 프로젝트가 있으면 그것만, 없으면 전체 프로젝트 사용
  if (NUMBER_ONLY_PATTERN.test(term)) {
    const prefixes = projectKeys.length > 0 ? projectKeys : allProjectKeys;
    if (prefixes.length > 0) {
      const keys = prefixes.map((pk) => `"${pk}-${term}"`);
      clauses.push(keys.length === 1 ? `key = ${keys[0]}` : `key IN (${keys.join(',')})`);
      return clauses.join(' AND ');
    }
  }

  // 일반 검색: 각 단어를 여러 필드에서 OR 매칭
  const words = term.split(/\s+/).filter(Boolean);
  const wordClauses = words.map((w) => {
    const ew = escapeJql(w);
    return `(summary ~ "${ew}" OR description ~ "${ew}" OR comment ~ "${ew}")`;
  });

  // 단어 간 AND 결합 (모든 단어가 포함된 결과)
  clauses.push(wordClauses.length === 1 ? wordClauses[0] : wordClauses.join(' AND '));

  return clauses.join(' AND ');
}

function loadSelectedProjects(accountId: string): string[] {
  // localStorage에서 동기적으로 로드 (비동기 Electron API보다 먼저 반영)
  try {
    const raw = localStorage.getItem(`lyra:jira:selectedProjects:${accountId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

async function loadSelectedProjectsAsync(accountId: string): Promise<string[]> {
  try {
    if (window.workspaceAPI?.settings) {
      return await window.workspaceAPI.settings.getSelectedProjects(accountId);
    }
    // 웹 폴백
    const raw = localStorage.getItem(`lyra:jira:selectedProjects:${accountId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

function saveSelectedProjects(accountId: string, keys: string[]): void {
  try {
    if (window.workspaceAPI?.settings) {
      window.workspaceAPI.settings.setSelectedProjects(accountId, keys);
    }
    // 웹에서도 동작하도록 localStorage에도 저장
    localStorage.setItem(`lyra:jira:selectedProjects:${accountId}`, JSON.stringify(keys));
  } catch { /* ignore */ }
}

interface StatusCount { name: string; category: string; count: number }

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
};

const JiraDashboard = () => {
  const { activeAccount } = useAccount();
  const myDisplayName = (activeAccount?.metadata as Record<string, unknown>)?.userDisplayName as string | undefined;
  const history = useHistory();
  const { addTab } = useTabs();

  // 우클릭 컨텍스트 메뉴 (새 탭으로 열기)
  const [itemContextMenu, setItemContextMenu] = useState<{ x: number; y: number; path: string; label: string } | null>(null);

  const handleItemContextMenu = (e: React.MouseEvent, path: string, label: string) => {
    e.preventDefault();
    e.stopPropagation();
    // zoom: 1.2 보정 — fixed 포지션이 zoom 컨테이너 안에 있으므로 좌표를 나눠야 정확
    const zoom = 1.2;
    setItemContextMenu({ x: e.clientX / zoom, y: e.clientY / zoom, path, label });
  };

  const handleOpenInNewTab = () => {
    if (!itemContextMenu) return;
    addTab('jira', itemContextMenu.path, itemContextMenu.label);
    setItemContextMenu(null);
  };

  // 계정이 변경되면 캐시 초기화
  const currentAccountId = activeAccount?.id || '';
  const isCacheValid = cache.accountId === currentAccountId && currentAccountId !== '';

  // 전체 이슈 (내 담당)
  const [myIssues, setMyIssues] = useState<NormalizedIssue[]>(isCacheValid ? cache.myIssues : []);
  const [isLoading, setIsLoading] = useState(false);

  // 완료(Done) 상태별 개수 (별도 조회)
  const [doneCounts, setDoneCounts] = useState<StatusCount[]>(isCacheValid ? (cache as any).doneCounts || [] : []);

  // 상태별 개수 (myIssues + doneCounts 합산)
  const statusCounts = useMemo(() => {
    const countMap = new Map<string, { category: string; count: number }>();
    for (const issue of myIssues) {
      if (isEpicType(issue.issueTypeName)) continue;
      const name = issue.statusName || '기타';
      const cat = issue.statusCategory || '';
      const entry = countMap.get(name);
      if (entry) entry.count++;
      else countMap.set(name, { category: cat, count: 1 });
    }
    // 완료 상태 합산
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
  }, [myIssues, doneCounts]);

  // 프로젝트 (스페이스) 필터 — 다중 선택, localStorage 저장
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

  // 자동완성 (제목 기반)
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

  // 사이드바 프로젝트 브라우즈 모드 (스페이스 설정과 독립)
  const [browseProjectKey, setBrowseProjectKey] = useState<string | null>(isCacheValid ? cache.browseProjectKey : null);
  const [browseEpics, setBrowseEpics] = useState<NormalizedIssue[]>(isCacheValid ? cache.browseEpics : []);
  const [browseChildrenMap, setBrowseChildrenMap] = useState<Record<string, NormalizedIssue[]>>(isCacheValid ? cache.browseChildrenMap : {});
  const [isBrowseLoading, setIsBrowseLoading] = useState(false);
  const [browseExpandedKeys, setBrowseExpandedKeys] = useState<Set<string>>(isCacheValid ? cache.browseExpandedKeys : new Set());
  const [, setBrowseLoadingChildren] = useState<Set<string>>(new Set());
  const [browseLoadedChildren, setBrowseLoadedChildren] = useState<Set<string>>(isCacheValid ? cache.browseLoadedChildren : new Set());

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

  const { target: transitionTarget, transitions, isLoading: isTransitionLoading, dropdownRef: transitionRef, open: openTransitionDropdown, execute: executeTransition, close: closeTransition } = useTransitionDropdown({
    accountId: activeAccount?.id,
    serviceType: 'jira',
    onTransitioned: handleTransitioned,
  });

  // 계정 변경 시 state 초기화 + 저장된 프로젝트 로드
  const prevAccountIdRef = useRef(currentAccountId);
  useEffect(() => {
    if (prevAccountIdRef.current === currentAccountId) return;
    prevAccountIdRef.current = currentAccountId;

    // 이전 계정 데이터 초기화
    setMyIssues([]);
    setProjects([]);
    setSelectedProjects([]);
    setSearchQuery('');
    setSearchResults(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setExpandedEpics(new Set());

    if (!currentAccountId) return;

    // 새 계정의 저장된 프로젝트 로드
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

  // 사이드바에서 프로젝트 브라우즈 이벤트 수신 (스페이스 설정과 독립)
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
        // 선택 해제 → 기본 뷰로 복귀
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
    (cache as any).doneCounts = doneCounts;
    cache.browseProjectKey = browseProjectKey;
    cache.browseEpics = browseEpics;
    cache.browseChildrenMap = browseChildrenMap;
    cache.browseExpandedKeys = browseExpandedKeys;
    cache.browseLoadedChildren = browseLoadedChildren;
  }, [currentAccountId, myIssues, projects, selectedProjects, searchQuery, searchResults, expandedEpics, statusCounts, defaultChildrenMap, defaultExpandedChildren, doneCounts, browseProjectKey, browseEpics, browseChildrenMap, browseExpandedKeys, browseLoadedChildren]);

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

  /** key IN (...) 로 이슈 일괄 조회 (없는 키만) */
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

  /** parent IN (...) 로 하위 이슈 조회 (Epic Link 포함). projectFilter가 있으면 해당 프로젝트만 */
  const fetchChildren = useCallback(async (parentKeys: string[], projectFilter?: string[]): Promise<NormalizedIssue[]> => {
    if (parentKeys.length === 0 || !activeAccount) return [];
    const allChildren: NormalizedIssue[] = [];
    const seenKeys = new Set<string>();
    const pc = projectFilter && projectFilter.length > 0 ? `${buildProjectClause(projectFilter)} AND ` : '';

    // 1) parent 필드 기반 조회
    try {
      const jql = `${pc}parent IN (${parentKeys.join(',')}) ORDER BY created ASC`;
      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'jira',
        action: 'searchIssues',
        params: { jql, maxResults: 200, skipCache: true },
      });
      for (const issue of parseIssues(result)) {
        if (!seenKeys.has(issue.key)) {
          allChildren.push(issue);
          seenKeys.add(issue.key);
        }
      }
    } catch { /* ignore */ }

    // 2) Epic Link (classic Jira) 폴백 — parent에서 누락된 이슈 보완
    try {
      const jql = `${pc}"Epic Link" IN (${parentKeys.join(',')}) ORDER BY created ASC`;
      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'jira',
        action: 'searchIssues',
        params: { jql, maxResults: 200, skipCache: true },
      });
      for (const issue of parseIssues(result)) {
        if (!seenKeys.has(issue.key)) {
          // Epic Link로 찾은 이슈의 parentKey가 비어있으면 에픽 키로 설정
          if (!issue.parentKey && parentKeys.length === 1) {
            issue.parentKey = parentKeys[0];
          }
          allChildren.push(issue);
          seenKeys.add(issue.key);
        }
      }
    } catch { /* Epic Link 필드가 없는 인스턴스에서는 무시 */ }

    return allChildren;
  }, [activeAccount]);

  /** 이슈 목록의 모든 하위 항목을 재귀적으로 일괄 로드 → defaultChildrenMap에 저장 */
  const loadAllDescendants = useCallback(async (issues: NormalizedIssue[], projectFilter?: string[]) => {
    const childrenMap: Record<string, NormalizedIssue[]> = {};
    const loaded = new Set<string>();

    // subtaskCount > 0 인 이슈들의 키를 수집
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
            const children = await fetchChildren([key], projectFilter);
            childrenMap[key] = children;
            for (const child of children) {
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

  /** 기본 모드 온디맨드 하위 이슈 로드 (Split View / 페이지 이동 후에도 동작) */
  const loadDefaultChildren = useCallback(async (parentKey: string) => {
    // 이미 로드된 키 → 데이터 있으므로 바로 확장
    if (defaultLoadedChildrenRef.current.has(parentKey)) {
      setDefaultExpandedChildren((prev) => {
        const next = new Set(prev);
        next.add(parentKey);
        return next;
      });
      return;
    }

    setDefaultLoadingChildren((prev) => new Set(prev).add(parentKey));
    try {
      const children = await fetchChildren([parentKey], selectedProjects);
      setDefaultChildrenMap((prev) => ({
        ...prev,
        [parentKey]: children,
      }));
      // 데이터 로드 완료 후 확장
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
      const allKeys = new Set(issues.map((i) => i.key));

      // 1단계: 직접 부모 조회 (하위작업→스토리, 스토리→에픽)
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

      // 2단계: 조부모 조회 (하위작업→스토리→에픽 체인 완성)
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
      // 하위 항목 일괄 로드 (N-depth, 프로젝트 필터 적용)
      loadAllDescendants(issues, selectedProjects.length > 0 ? selectedProjects : undefined);
    } catch (err) {
      console.error('[JiraDashboard] fetchMyIssues error:', err);
      setMyIssues([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeAccount, selectedProjects, loadAllDescendants]);

  // 완료(Done) 상태별 개수 조회 (nextPageToken 기반 페이지네이션)
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
          if (isEpicType(issue.issueTypeName)) continue;
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
        // 에픽만 조회 (최대 500건)
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

  // 브라우즈 모드에서 하위 이슈 비동기 로드 → childrenMap에 저장
  const loadBrowseChildren = useCallback(async (parentKey: string) => {
    if (browseLoadedChildren.has(parentKey)) return;

    setBrowseLoadingChildren((prev) => new Set(prev).add(parentKey));
    try {
      const children = await fetchChildren([parentKey]);
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
  // (모두 펼치기 → 상세 이동 → 복귀 시, 비동기 로드가 완료되지 않은 항목 재로드)
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

      // ── 1단계: 부모 조회 (스토리→에픽, 하위항목→스토리) ──
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

      // ── 2단계: 조부모 조회 (하위항목→스토리→에픽 체인 완성) ──
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

      // ── 3단계: 에픽의 하위 스토리 조회 ──
      const pf = selectedProjects.length > 0 ? selectedProjects : undefined;
      const epicKeys = issues
        .filter((i) => isEpicType(i.issueTypeName))
        .map((i) => i.key);
      const storyIssues = await fetchChildren(epicKeys, pf);
      for (const s of storyIssues) {
        if (!allKeys.has(s.key)) {
          issues.push(s);
          allKeys.add(s.key);
        } else if (s.parentKey) {
          // 기존 이슈의 parentKey가 비어있으면 fetchChildren 결과로 보완
          const idx = issues.findIndex((i) => i.key === s.key);
          if (idx >= 0 && !issues[idx].parentKey) {
            issues[idx] = { ...issues[idx], parentKey: s.parentKey, parentSummary: s.parentSummary || issues[idx].parentSummary };
          }
        }
      }

      // ── 4단계: 스토리의 하위항목 조회 ──
      const storyKeys = issues
        .filter((i) => !isEpicType(i.issueTypeName) && !isSubTaskType(i.issueTypeName))
        .filter((i) => epicKeys.length === 0 || i.parentKey) // 에픽 바로 아래 항목만
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
      // 검색 결과의 에픽을 자동 펼침
      setExpandedEpics(new Set(issues.filter((i) => isEpicType(i.issueTypeName)).map((i) => i.key).concat('__no_epic__')));
      // 하위 항목 일괄 로드 (N-depth, 프로젝트 필터 적용)
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

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // 최초 마운트 시 비동기 프로젝트 설정 로드 (계정 변경이 아닌 경우)
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
  }, [activeAccount, projectsReady, fetchProjects, fetchMyIssues, fetchDoneCounts]);

  const goToIssue = (key: string) => {
    if (key) history.push(`/jira/issue/${key}`);
  };

  const toggleEpic = (epicKey: string) => {
    setExpandedEpics((prev) => {
      const next = new Set(prev);
      if (next.has(epicKey)) {
        next.delete(epicKey);
      } else {
        next.add(epicKey);
      }
      return next;
    });
  };

  const expandAll = useCallback((groups: EpicGroup[]) => {
    setExpandedEpics(new Set(groups.map((g) => g.key)));
    // N-depth: defaultChildrenMap에 하위 항목이 있는 모든 키를 펼침
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

  // 스페이스 설정 모달용 필터링 (Hook은 early return 전에 호출)
  const filteredProjects = React.useMemo(() => {
    const q = spaceFilter.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q)
    );
  }, [projects, spaceFilter]);

  // 브라우즈 모드에서 에픽 토글 (하위 이슈 비동기 로드 포함)
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

  if (!activeAccount || !isAtlassianAccount(activeAccount.serviceType)) {
    return (
      <Layout>
        <CenterContent>
          <EmptyCenter>
            Atlassian 계정을 추가하고 활성화해주세요. 계정 설정에서 Atlassian을 연결할 수 있습니다.
          </EmptyCenter>
        </CenterContent>
      </Layout>
    );
  }

  // 표시할 데이터: 검색 결과가 있으면 검색 결과, 없으면 내 이슈
  const isSearchMode = searchResults !== null;
  const displayIssues = isSearchMode ? searchResults : myIssues;
  const epicGroups = groupByEpic(displayIssues);
  epicGroupsRef.current = epicGroups;

  // 브라우즈 모드 테이블 내 하위 항목 재귀 렌더링 (browseChildrenMap 기반)
  const renderBrowseChildren = (parentKey: string, depth: number): React.ReactNode[] => {
    const children = browseChildrenMap[parentKey] || [];
    const rows: React.ReactNode[] = [];

    for (const issue of children) {
      const childChildren = browseChildrenMap[issue.key] || [];
      const canExpand = issue.subtaskCount > 0 || childChildren.length > 0;
      const isChildExpanded = browseExpandedKeys.has(issue.key);

      rows.push(
        <IssueRow
          key={issue.key || issue.id}
          onClick={() => {
            if (canExpand) {
              loadBrowseChildren(issue.key);
              setBrowseExpandedKeys((prev) => {
                const next = new Set(prev);
                if (next.has(issue.key)) next.delete(issue.key);
                else next.add(issue.key);
                return next;
              });
            }
          }}
          onContextMenu={(e) => handleItemContextMenu(e, `/jira/issue/${issue.key}`, `${issue.key} ${issue.summary}`)}
        >
          <IssueKeyCell style={{ paddingLeft: `${depth * 24}px` }}>
            {canExpand ? (
              <SubTaskToggle>
                {isChildExpanded ? '▼' : '▶'}
              </SubTaskToggle>
            ) : (
              <SubTaskToggleSpacer />
            )}
            <JiraTaskIcon type={resolveTaskType(issue.issueTypeName)} size={18} />
            <IssueTypeLabel $color={TASK_TYPE_COLORS[resolveTaskType(issue.issueTypeName)]}>
              {TASK_TYPE_LABELS[resolveTaskType(issue.issueTypeName)]}
            </IssueTypeLabel>
            <IssueKey
              onClick={(e) => { e.stopPropagation(); goToIssue(issue.key); }}
            >
              {issue.key}
            </IssueKey>
          </IssueKeyCell>
          <IssueSummary>{issue.summary || '(제목 없음)'}</IssueSummary>
          <StatusBadgeBtn
            $color={getStatusColor(issue.statusName, issue.statusCategory)}
            onClick={(e) => {
              e.stopPropagation();
              openTransitionDropdown(issue.key, issue.statusName, e);
            }}
          >
            {issue.statusName || '-'}
            <ChevronIcon>▾</ChevronIcon>
          </StatusBadgeBtn>
          <AssigneeText $isMe={issue.assigneeName === myDisplayName}>{issue.assigneeName || '미지정'}</AssigneeText>
        </IssueRow>,
      );

      if (isChildExpanded) {
        rows.push(...renderBrowseChildren(issue.key, depth + 1));
      }
    }

    return rows;
  };

  // 기본 모드(내 담당/검색) N-depth 하위 항목 재귀 렌더링
  const renderDefaultChildren = (parentKey: string, depth: number): React.ReactNode[] => {
    const children = defaultChildrenMap[parentKey] || [];
    if (children.length === 0) return [];

    const rows: React.ReactNode[] = [];

    for (const issue of children) {
      const childChildren = defaultChildrenMap[issue.key] || [];
      const canExpand = issue.subtaskCount > 0 || childChildren.length > 0;
      const isChildExpanded = defaultExpandedChildren.has(issue.key);
      const isChildLoading = defaultLoadingChildren.has(issue.key);

      rows.push(
        <IssueRow
          key={issue.key || issue.id}
          onClick={() => {
            if (canExpand) {
              if (isChildExpanded) {
                setDefaultExpandedChildren((prev) => {
                  const next = new Set(prev);
                  next.delete(issue.key);
                  return next;
                });
              } else {
                loadDefaultChildren(issue.key);
              }
            }
          }}
          onContextMenu={(e) => handleItemContextMenu(e, `/jira/issue/${issue.key}`, `${issue.key} ${issue.summary}`)}
        >
          <IssueKeyCell style={{ paddingLeft: `${depth * 24}px` }}>
            {canExpand ? (
              <SubTaskToggle>
                {isChildLoading ? <Loader size={10} /> : isChildExpanded ? '▼' : '▶'}
              </SubTaskToggle>
            ) : (
              <SubTaskToggleSpacer />
            )}
            <JiraTaskIcon type={resolveTaskType(issue.issueTypeName)} size={18} />
            <IssueTypeLabel $color={TASK_TYPE_COLORS[resolveTaskType(issue.issueTypeName)]}>
              {TASK_TYPE_LABELS[resolveTaskType(issue.issueTypeName)]}
            </IssueTypeLabel>
            <IssueKey
              onClick={(e) => { e.stopPropagation(); goToIssue(issue.key); }}
            >
              {issue.key}
            </IssueKey>
          </IssueKeyCell>
          <IssueSummary>{issue.summary || '(제목 없음)'}</IssueSummary>
          <StatusBadgeBtn
            $color={getStatusColor(issue.statusName, issue.statusCategory)}
            onClick={(e) => {
              e.stopPropagation();
              openTransitionDropdown(issue.key, issue.statusName, e);
            }}
          >
            {issue.statusName || '-'}
            <ChevronIcon>▾</ChevronIcon>
          </StatusBadgeBtn>
          <AssigneeText $isMe={issue.assigneeName === myDisplayName}>{issue.assigneeName || '미지정'}</AssigneeText>
        </IssueRow>,
      );

      if (isChildExpanded) {
        rows.push(...renderDefaultChildren(issue.key, depth + 1));
      }
    }

    return rows;
  };

  return (
    <Layout>
      <Toolbar>
        <Logo>
          {hasServiceIcon('jira') && (
            <LogoIconWrap>{getServiceIcon('jira', 24)}</LogoIconWrap>
          )}
          Jira
        </Logo>
        <SearchWrapper ref={searchWrapperRef}>
          <SpaceFilterBtn onClick={() => { setSpaceFilter(''); setShowSpaceSettings(true); }}>
            스페이스
            {selectedProjects.length > 0 && (
              <SpaceCount>{selectedProjects.length}</SpaceCount>
            )}
          </SpaceFilterBtn>
          <SearchInputWrapper>
            <SearchInput
              data-search-input
              placeholder="티켓 번호, 제목, 내용 검색..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (showSuggestions && activeSuggestionIdx >= 0 && suggestions[activeSuggestionIdx]) {
                    goToIssue(suggestions[activeSuggestionIdx].key);
                    setShowSuggestions(false);
                  } else {
                    setShowSuggestions(false);
                    searchIssues();
                  }
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActiveSuggestionIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActiveSuggestionIdx((prev) => Math.max(prev - 1, -1));
                } else if (e.key === 'Escape') {
                  setShowSuggestions(false);
                }
              }}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
            />
            {showSuggestions && (
              <SuggestDropdown>
                {suggestions.map((issue, idx) => (
                  <SuggestItem
                    key={issue.key}
                    $active={idx === activeSuggestionIdx}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      goToIssue(issue.key);
                      setShowSuggestions(false);
                    }}
                    onMouseEnter={() => setActiveSuggestionIdx(idx)}
                  >
                    <SuggestIcon>
                      <JiraTaskIcon type={resolveTaskType(issue.issueTypeName)} size={16} />
                    </SuggestIcon>
                    <SuggestKey>{issue.key}</SuggestKey>
                    <SuggestSummary>{issue.summary || '(제목 없음)'}</SuggestSummary>
                    <SuggestStatus $color={getStatusColor(issue.statusName, issue.statusCategory)}>
                      {issue.statusName}
                    </SuggestStatus>
                  </SuggestItem>
                ))}
                {isSuggestLoading && <SuggestLoading>검색 중...</SuggestLoading>}
              </SuggestDropdown>
            )}
            {isSuggestLoading && !showSuggestions && searchQuery.trim() && (
              <SuggestDropdown>
                <SuggestLoading>검색 중...</SuggestLoading>
              </SuggestDropdown>
            )}
          </SearchInputWrapper>
          <SearchButton onClick={() => { setShowSuggestions(false); searchIssues(); }} disabled={isSearching}>
            {isSearching ? '검색 중...' : '검색'}
          </SearchButton>
          {searchResults !== null && (
            <ClearButton onClick={clearSearch}>초기화</ClearButton>
          )}
        </SearchWrapper>
        <RefreshBtn onClick={() => { fetchMyIssues(); fetchDoneCounts(); }} disabled={isLoading}>
          새로고침
        </RefreshBtn>
      </Toolbar>

      {!browseProjectKey && !isSearchMode && statusCounts.length > 0 && (
        <StatusSummaryBar>
          {statusCounts.map((sc) => {
            const total = statusCounts.reduce((s, c) => s + c.count, 0);
            return (
              <StatusSummaryItem key={sc.name}>
                <StatusDot $color={getStatusColor(sc.name, sc.category)} />
                <StatusSummaryName>{sc.name}</StatusSummaryName>
                <StatusSummaryCount>{sc.count}</StatusSummaryCount>
                <StatusSummaryPercent>
                  {total > 0 ? Math.round((sc.count / total) * 100) : 0}%
                </StatusSummaryPercent>
              </StatusSummaryItem>
            );
          })}
          <StatusSummaryTotal>
            합계 <strong>{statusCounts.reduce((s, c) => s + c.count, 0)}</strong>
          </StatusSummaryTotal>
        </StatusSummaryBar>
      )}

      <Content>
        {browseProjectKey ? (
          /* ── 사이드바 프로젝트 브라우즈 모드 (에픽 기반) ── */
          <>
            <SectionHeader>
              <SectionTitle>
                {browseProjectKey} 전체 이슈 ({browseEpics.length}건)
              </SectionTitle>
              {browseEpics.length > 0 && (
                <ToggleAllButtons>
                  <SmallBtn onClick={() => {
                    const allKeys = new Set<string>();
                    browseEpics.forEach((e) => allKeys.add(e.key));
                    // browseChildrenMap에 하위 항목이 있는 모든 키도 펼침
                    for (const [key, children] of Object.entries(browseChildrenMap)) {
                      if (children.length > 0) allKeys.add(key);
                    }
                    setBrowseExpandedKeys(allKeys);
                    browseEpics.forEach((e) => loadBrowseChildren(e.key));
                  }}>모두 펼치기</SmallBtn>
                  <SmallBtn onClick={() => setBrowseExpandedKeys(new Set())}>모두 접기</SmallBtn>
                </ToggleAllButtons>
              )}
            </SectionHeader>

            {isBrowseLoading ? (
              <LoadingArea>
                <Spinner />
                <LoadingText>에픽 조회 중</LoadingText>
              </LoadingArea>
            ) : browseEpics.length === 0 ? (
              <Empty>에픽이 없습니다.</Empty>
            ) : (
              <EpicList>
                {browseEpics.map((epic) => {
                  const isExpanded = browseExpandedKeys.has(epic.key);
                  const epicChildren = browseChildrenMap[epic.key] || [];
                  return (
                    <EpicCard key={epic.key}>
                      <EpicHeader onClick={() => toggleBrowseEpic(epic.key)}>
                        <EpicHeaderLeft>
                          <EpicToggle>{isExpanded ? '▼' : '▶'}</EpicToggle>
                          <JiraTaskIcon type={resolveTaskType(epic.issueTypeName)} size={18} />
                          <IssueTypeLabel $color={TASK_TYPE_COLORS[resolveTaskType(epic.issueTypeName)]}>
                            {TASK_TYPE_LABELS[resolveTaskType(epic.issueTypeName)]}
                          </IssueTypeLabel>
                          <EpicKey
                            onClick={(e) => { e.stopPropagation(); goToIssue(epic.key); }}
                            onContextMenu={(e) => handleItemContextMenu(e, `/jira/issue/${epic.key}`, epic.key)}
                          >
                            {epic.key}
                          </EpicKey>
                          <EpicSummary>{epic.summary}</EpicSummary>
                        </EpicHeaderLeft>
                        {epic.statusName ? (
                          <StatusBadgeBtn
                            $color={getStatusColor(epic.statusName, epic.statusCategory)}
                            onClick={(e) => {
                              e.stopPropagation();
                              openTransitionDropdown(epic.key, epic.statusName, e);
                            }}
                          >
                            {epic.statusName}
                            <ChevronIcon>▾</ChevronIcon>
                          </StatusBadgeBtn>
                        ) : <span />}
                        <EpicAssignee>{epic.assigneeName || '미지정'}</EpicAssignee>
                        <EpicCount>{epicChildren.length}</EpicCount>
                      </EpicHeader>

                      {isExpanded && (
                        <IssueTable>
                          {epicChildren.length > 0 && (
                            <TableHeader>
                              <span>키</span>
                              <span>요약</span>
                              <span>상태</span>
                              <span>담당자</span>
                            </TableHeader>
                          )}
                          {epicChildren.map((issue) => {
                            const childChildren = browseChildrenMap[issue.key] || [];
                            const canExpand = issue.subtaskCount > 0 || childChildren.length > 0;
                            const isChildExpanded = browseExpandedKeys.has(issue.key);
                            return (
                              <React.Fragment key={issue.key || issue.id}>
                                <IssueRow
                                  onClick={() => {
                                    if (canExpand) {
                                      loadBrowseChildren(issue.key);
                                      setBrowseExpandedKeys((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(issue.key)) next.delete(issue.key);
                                        else next.add(issue.key);
                                        return next;
                                      });
                                    }
                                  }}
                                  onContextMenu={(e) => handleItemContextMenu(e, `/jira/issue/${issue.key}`, `${issue.key} ${issue.summary}`)}
                                >
                                  <IssueKeyCell>
                                    {canExpand ? (
                                      <SubTaskToggle>
                                        {isChildExpanded ? '▼' : '▶'}
                                      </SubTaskToggle>
                                    ) : (
                                      <SubTaskToggleSpacer />
                                    )}
                                    <JiraTaskIcon type={resolveTaskType(issue.issueTypeName)} size={18} />
                                    <IssueTypeLabel $color={TASK_TYPE_COLORS[resolveTaskType(issue.issueTypeName)]}>
                                      {TASK_TYPE_LABELS[resolveTaskType(issue.issueTypeName)]}
                                    </IssueTypeLabel>
                                    <IssueKey
                                      onClick={(e) => { e.stopPropagation(); goToIssue(issue.key); }}
                                    >
                                      {issue.key}
                                    </IssueKey>
                                  </IssueKeyCell>
                                  <IssueSummary>{issue.summary || '(제목 없음)'}</IssueSummary>
                                  <StatusBadgeBtn
                                    $color={getStatusColor(issue.statusName, issue.statusCategory)}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openTransitionDropdown(issue.key, issue.statusName, e);
                                    }}
                                  >
                                    {issue.statusName || '-'}
                                    <ChevronIcon>▾</ChevronIcon>
                                  </StatusBadgeBtn>
                                  <AssigneeText $isMe={issue.assigneeName === myDisplayName}>{issue.assigneeName || '미지정'}</AssigneeText>
                                </IssueRow>
                                {isChildExpanded && renderBrowseChildren(issue.key, 1)}
                              </React.Fragment>
                            );
                          })}
                        </IssueTable>
                      )}
                    </EpicCard>
                  );
                })}
              </EpicList>
            )}
          </>
        ) : (
          /* ── 기본 모드 (내 담당 / 검색) ── */
          <>
            <SectionHeader>
              <SectionTitle>
                {isSearchMode
                  ? `검색 결과 (${epicGroups.reduce((n, g) => n + g.children.length, 0)}건)`
                  : `내 담당 이슈 (${epicGroups.reduce((n, g) => n + g.children.length, 0)}건)`}
              </SectionTitle>
              {epicGroups.length > 0 && (
                <ToggleAllButtons>
                  <SmallBtn onClick={() => expandAll(epicGroups)}>모두 펼치기</SmallBtn>
                  <SmallBtn onClick={collapseAll}>모두 접기</SmallBtn>
                </ToggleAllButtons>
              )}
            </SectionHeader>

            {isLoading || isSearching ? (
              <LoadingArea>
                <Spinner />
                <LoadingText>{isSearching ? '검색 중' : '로딩 중'}</LoadingText>
              </LoadingArea>
            ) : epicGroups.length === 0 ? (
              <Empty>
                {isSearchMode
                  ? '검색 결과가 없습니다.'
                  : '담당된 이슈가 없습니다.'}
              </Empty>
            ) : (
              <EpicList>
                {epicGroups.map((group) => {
                  const isExpanded = expandedEpics.has(group.key);
                  return (
                    <EpicCard key={group.key}>
                      <EpicHeader onClick={() => toggleEpic(group.key)}>
                        <EpicHeaderLeft>
                          <EpicToggle>{isExpanded ? '▼' : '▶'}</EpicToggle>
                          {group.key !== '__no_epic__' && (
                            <>
                              <JiraTaskIcon type={resolveTaskType(group.issueTypeName)} size={18} />
                              <IssueTypeLabel $color={TASK_TYPE_COLORS[resolveTaskType(group.issueTypeName)]}>
                                {TASK_TYPE_LABELS[resolveTaskType(group.issueTypeName)]}
                              </IssueTypeLabel>
                              <EpicKey
                                onClick={(e) => { e.stopPropagation(); goToIssue(group.key); }}
                                onContextMenu={(e) => handleItemContextMenu(e, `/jira/issue/${group.key}`, group.key)}
                              >
                                {group.key}
                              </EpicKey>
                            </>
                          )}
                          <EpicSummary>{group.summary}</EpicSummary>
                        </EpicHeaderLeft>
                        {group.key !== '__no_epic__' && group.statusName ? (
                          <StatusBadgeBtn
                            $color={getStatusColor(group.statusName, group.statusCategory)}
                            onClick={(e) => {
                              e.stopPropagation();
                              openTransitionDropdown(group.key, group.statusName, e);
                            }}
                          >
                            {group.statusName}
                            <ChevronIcon>▾</ChevronIcon>
                          </StatusBadgeBtn>
                        ) : <span />}
                        <EpicAssignee>
                          {group.key !== '__no_epic__' ? (group.assigneeName || '미지정') : ''}
                        </EpicAssignee>
                        <EpicCount>{group.children.length}</EpicCount>
                      </EpicHeader>

                      {isExpanded && (
                        <IssueTable>
                          <TableHeader>
                            <span>키</span>
                            <span>요약</span>
                            <span>상태</span>
                            <span>담당자</span>
                          </TableHeader>
                          {group.children.map((issue) => {
                            const childChildren = defaultChildrenMap[issue.key] || [];
                            const canExpand = issue.subtaskCount > 0 || childChildren.length > 0;
                            const isChildExpanded = defaultExpandedChildren.has(issue.key);
                            const isChildLoading = defaultLoadingChildren.has(issue.key);
                            return (
                              <React.Fragment key={issue.key || issue.id}>
                                <IssueRow
                                  onClick={() => {
                                    if (canExpand) {
                                      if (isChildExpanded) {
                                        setDefaultExpandedChildren((prev) => {
                                          const next = new Set(prev);
                                          next.delete(issue.key);
                                          return next;
                                        });
                                      } else {
                                        loadDefaultChildren(issue.key);
                                      }
                                    }
                                  }}
                                  onContextMenu={(e) => handleItemContextMenu(e, `/jira/issue/${issue.key}`, `${issue.key} ${issue.summary}`)}
                                >
                                  <IssueKeyCell>
                                    {canExpand ? (
                                      <SubTaskToggle>
                                        {isChildLoading ? <Loader size={10} /> : isChildExpanded ? '▼' : '▶'}
                                      </SubTaskToggle>
                                    ) : (
                                      <SubTaskToggleSpacer />
                                    )}
                                    <JiraTaskIcon type={resolveTaskType(issue.issueTypeName)} size={18} />
                                    <IssueTypeLabel $color={TASK_TYPE_COLORS[resolveTaskType(issue.issueTypeName)]}>
                                      {TASK_TYPE_LABELS[resolveTaskType(issue.issueTypeName)]}
                                    </IssueTypeLabel>
                                    <IssueKey
                                      onClick={(e) => { e.stopPropagation(); goToIssue(issue.key); }}
                                    >
                                      {issue.key}
                                    </IssueKey>
                                  </IssueKeyCell>
                                  <IssueSummary>{issue.summary || '(제목 없음)'}</IssueSummary>
                                  <StatusBadgeBtn
                                    $color={getStatusColor(issue.statusName, issue.statusCategory)}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openTransitionDropdown(issue.key, issue.statusName, e);
                                    }}
                                  >
                                    {issue.statusName || '-'}
                                    <ChevronIcon>▾</ChevronIcon>
                                  </StatusBadgeBtn>
                                  <AssigneeText $isMe={issue.assigneeName === myDisplayName}>{issue.assigneeName || '미지정'}</AssigneeText>
                                </IssueRow>
                                {isChildExpanded && renderDefaultChildren(issue.key, 1)}
                              </React.Fragment>
                            );
                          })}
                        </IssueTable>
                      )}
                    </EpicCard>
                  );
                })}
              </EpicList>
            )}
          </>
        )}
      </Content>

      {/* 스페이스 설정 모달 */}
      {showSpaceSettings && (
        <SpaceSettingsOverlay onClick={() => setShowSpaceSettings(false)}>
          <SpaceSettingsPanel onClick={(e) => e.stopPropagation()}>
            <SpaceSettingsHeader>
              <SpaceSettingsTitle>스페이스 필터 설정</SpaceSettingsTitle>
              <SpaceSettingsClose onClick={() => setShowSpaceSettings(false)}>✕</SpaceSettingsClose>
            </SpaceSettingsHeader>
            <SpaceSettingsDesc>
              선택한 스페이스의 이슈만 조회 및 검색됩니다.
              {selectedProjects.length > 0
                ? ` (${selectedProjects.length}개 선택됨)`
                : ' (전체)'}
            </SpaceSettingsDesc>
            <SpaceSearchRow>
              <SpaceSearchInput
                placeholder="스페이스 검색..."
                value={spaceFilter}
                onChange={(e) => setSpaceFilter(e.target.value)}
                autoFocus
              />
              <SmallBtn
                onClick={() => {
                  const keys = filteredProjects.map((p) => p.key);
                  setSelectedProjects((prev) => Array.from(new Set(prev.concat(keys))));
                }}
              >
                전체 선택
              </SmallBtn>
              <SmallBtn
                onClick={() => {
                  if (spaceFilter) {
                    const keys = new Set(filteredProjects.map((p) => p.key));
                    setSelectedProjects((prev) => prev.filter((k) => !keys.has(k)));
                  } else {
                    setSelectedProjects([]);
                  }
                }}
              >
                전체 해제
              </SmallBtn>
            </SpaceSearchRow>
            <SpaceList>
              {/* 선택된 스페이스 (고정 영역) */}
              {(() => {
                const selectedSet = new Set(selectedProjects);
                const pinned = filteredProjects.filter((p) => selectedSet.has(p.key));
                const unpinned = filteredProjects.filter((p) => !selectedSet.has(p.key));
                return (
                  <>
                    {pinned.length > 0 && (
                      <>
                        <SpaceSectionLabel>선택됨</SpaceSectionLabel>
                        {pinned.map((p) => (
                          <SpaceItem
                            key={p.key}
                            $active
                            onClick={() => {
                              setSelectedProjects((prev) => prev.filter((k) => k !== p.key));
                            }}
                          >
                            <SpaceCheckbox $checked>{'✓'}</SpaceCheckbox>
                            <SpaceItemName>{p.name}</SpaceItemName>
                            <SpaceItemKey>{p.key}</SpaceItemKey>
                          </SpaceItem>
                        ))}
                      </>
                    )}
                    {unpinned.length > 0 && (
                      <>
                        {pinned.length > 0 && <SpaceSectionLabel>전체</SpaceSectionLabel>}
                        {unpinned.map((p) => (
                          <SpaceItem
                            key={p.key}
                            $active={false}
                            onClick={() => {
                              setSelectedProjects((prev) => [...prev, p.key]);
                            }}
                          >
                            <SpaceCheckbox $checked={false} />
                            <SpaceItemName>{p.name}</SpaceItemName>
                            <SpaceItemKey>{p.key}</SpaceItemKey>
                          </SpaceItem>
                        ))}
                      </>
                    )}
                    {pinned.length === 0 && unpinned.length === 0 && (
                      <SpaceEmptyMsg>일치하는 스페이스가 없습니다.</SpaceEmptyMsg>
                    )}
                  </>
                );
              })()}
            </SpaceList>
            <SpaceSettingsFooter>
              <SaveBtn
                onClick={() => {
                  saveSelectedProjects(currentAccountId, selectedProjects);
                  setShowSpaceSettings(false);
                  // 사이드바에 스페이스 변경 알림
                  window.dispatchEvent(new CustomEvent('lyra:space-settings-changed'));
                  // 변경 후 목록 새로고침
                  fetchMyIssues();
                  fetchDoneCounts();
                }}
              >
                저장
              </SaveBtn>
            </SpaceSettingsFooter>
          </SpaceSettingsPanel>
        </SpaceSettingsOverlay>
      )}

      {transitionTarget && (
        <JiraTransitionDropdown
          target={transitionTarget}
          transitions={transitions}
          isLoading={isTransitionLoading}
          dropdownRef={transitionRef}
          onSelect={executeTransition}
          onClose={closeTransition}
        />
      )}
      {/* 아이템 우클릭 메뉴 */}
      {itemContextMenu && (
        <ItemContextOverlay onClick={() => setItemContextMenu(null)}>
          <ItemContextBox
            style={{ left: itemContextMenu.x, top: itemContextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <ItemContextMenuItem onClick={handleOpenInNewTab}>
              새 탭으로 열기
            </ItemContextMenuItem>
          </ItemContextBox>
        </ItemContextOverlay>
      )}
    </Layout>
  );
};

export default JiraDashboard;

const Layout = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  min-height: 0;
  background: ${jiraTheme.bg.subtle};
  overflow: hidden;
  zoom: 1.2;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: ${jiraTheme.bg.default};
  border-bottom: 1px solid ${jiraTheme.border};
  flex-wrap: wrap;
  flex-shrink: 0;

  @media (max-width: 900px) {
    padding: 0.75rem 1rem;
    gap: 0.5rem;
  }
`;

const StatusSummaryBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.5rem;
  background: ${jiraTheme.bg.subtle};
  border-bottom: 1px solid ${jiraTheme.border};
  flex-wrap: wrap;
  flex-shrink: 0;
`;

const StatusSummaryItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  background: ${jiraTheme.bg.default};
  border-radius: 6px;
  font-size: 0.75rem;
`;

const StatusDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const StatusSummaryName = styled.span`
  color: ${jiraTheme.text.primary};
  font-weight: 600;
`;

const StatusSummaryCount = styled.span`
  color: ${jiraTheme.text.primary};
  font-weight: 700;
`;

const StatusSummaryPercent = styled.span`
  color: ${jiraTheme.text.secondary};
  font-size: 0.6875rem;
`;

const StatusSummaryTotal = styled.div`
  margin-left: auto;
  font-size: 0.75rem;
  color: ${jiraTheme.text.secondary};

  strong {
    color: ${jiraTheme.text.primary};
    font-weight: 700;
  }
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1.125rem;
  color: ${jiraTheme.text.primary};
  flex-shrink: 0;
`;

const LogoIconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;

  & > svg { width: 100%; height: 100%; }
`;

const SearchWrapper = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
`;

const SpaceFilterBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid ${jiraTheme.border};
  border-radius: 20px;
  font-size: 0.8125rem;
  background: ${jiraTheme.bg.subtle};
  color: ${jiraTheme.text.primary};
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ${transition};

  &:hover {
    background: ${jiraTheme.bg.hover};
    border-color: ${jiraTheme.primary};
  }
`;

const SpaceCount = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 0.25rem;
  border-radius: 9px;
  background: ${jiraTheme.primary};
  color: white;
  font-size: 0.6875rem;
  font-weight: 600;
`;

const SearchInputWrapper = styled.div`
  flex: 1;
  position: relative;
  min-width: 120px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2rem;
  border: 1px solid ${jiraTheme.border};
  border-radius: 20px;
  font-size: 0.875rem;
  background: ${jiraTheme.bg.subtle} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2397A0AF' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E") no-repeat 0.5rem center;
  box-sizing: border-box;

  &::placeholder { color: ${jiraTheme.text.muted}; }
  &:focus {
    outline: none;
    border-color: ${jiraTheme.primary};
    background-color: ${jiraTheme.bg.default};
  }
`;

const SuggestDropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: ${jiraTheme.bg.default};
  border: 1px solid ${jiraTheme.border};
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 200;
  max-height: 420px;
  overflow-y: auto;
  max-height: 360px;
  overflow-y: auto;
`;

const SuggestItem = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  background: ${({ $active }) => $active ? jiraTheme.bg.hover : 'transparent'};
  transition: background 0.1s;

  &:hover { background: ${jiraTheme.bg.hover}; }
  &:not(:last-child) { border-bottom: 1px solid ${jiraTheme.border}; }
`;

const SuggestIcon = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
`;

const SuggestKey = styled.span`
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${jiraTheme.primary};
  min-width: 80px;
`;

const SuggestSummary = styled.span`
  flex: 1;
  font-size: 0.8125rem;
  color: ${jiraTheme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SuggestStatus = styled.span<{ $color?: string }>`
  flex-shrink: 0;
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.125rem 0.375rem;
  border-radius: 20px;
  background: ${({ $color }) => $color || jiraTheme.status.default};
  color: white;
`;

const SuggestLoading = styled.div`
  padding: 0.75rem;
  text-align: center;
  font-size: 0.8125rem;
  color: ${jiraTheme.text.muted};
`;

const SearchButton = styled.button`
  padding: 0.5rem 1rem;
  background: ${jiraTheme.primary};
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ${transition};
  flex-shrink: 0;

  &:hover { background: ${jiraTheme.primaryHover}; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const ClearButton = styled.button`
  padding: 0.5rem 0.75rem;
  background: transparent;
  color: ${jiraTheme.text.secondary};
  border: 1px solid ${jiraTheme.border};
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  flex-shrink: 0;

  &:hover { background: ${jiraTheme.bg.hover}; color: ${jiraTheme.text.primary}; }
`;

const RefreshBtn = styled.button`
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  background: transparent;
  border: 1px solid ${jiraTheme.border};
  border-radius: 20px;
  color: ${jiraTheme.text.secondary};
  cursor: pointer;
  flex-shrink: 0;

  &:hover { background: ${jiraTheme.bg.hover}; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const Content = styled.main`
  flex: 1;
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;

  @media (max-width: 900px) {
    padding: 1rem 0.75rem;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
`;

const ToggleAllButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const SmallBtn = styled.button`
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background: transparent;
  border: 1px solid ${jiraTheme.border};
  border-radius: 20px;
  color: ${jiraTheme.text.secondary};
  cursor: pointer;

  &:hover { background: ${jiraTheme.bg.hover}; color: ${jiraTheme.text.primary}; }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const LoadingArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 4rem 2rem;
`;

const Spinner = styled.div`
  width: 1.5rem;
  height: 1.5rem;
  border: 2.5px solid ${jiraTheme.border};
  border-top-color: ${jiraTheme.primary};
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;

const LoadingText = styled.span`
  font-size: 0.8125rem;
  color: ${jiraTheme.text.secondary};
`;

const Empty = styled.div`
  padding: 4rem 2rem;
  text-align: center;
  color: ${jiraTheme.text.secondary};
`;

const CenterContent = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 20vh;
`;

const EmptyCenter = styled.div`
  text-align: center;
  color: ${jiraTheme.text.muted};
  font-size: 0.95rem;
`;

const EpicList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const EpicCard = styled.div`
  border-radius: 6px;
  border: 1px solid ${jiraTheme.border};
  overflow: hidden;
`;

const EpicHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr minmax(70px, 110px) minmax(70px, 110px) auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.625rem 1rem;
  background: #F8F9FB;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ${transition};
  min-width: 0;
  border-left: 3px solid ${jiraTheme.issueType.epic};

  &:hover { background: ${jiraTheme.bg.hover}; }

  @media (max-width: 900px) {
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
  }
`;

const EpicHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
`;

const EpicToggle = styled.span`
  font-size: 0.625rem;
  color: ${jiraTheme.text.muted};
  width: 0.875rem;
  flex-shrink: 0;
`;

const EpicKey = styled.span`
  font-weight: 600;
  font-size: 0.8125rem;
  color: ${jiraTheme.issueType.epic};
  flex-shrink: 0;
  cursor: pointer;

  &:hover { text-decoration: underline; }
`;

const EpicSummary = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`;

const EpicAssignee = styled.span`
  font-size: 0.75rem;
  color: ${jiraTheme.text.secondary};
  white-space: nowrap;
`;

const EpicCount = styled.span`
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${jiraTheme.issueType.epic};
  background: #EDE8F5;
  border-radius: 10px;
  padding: 0.125rem 0.5rem;
  flex-shrink: 0;
`;

const IssueTable = styled.div``;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(140px, 220px) 1fr minmax(70px, 110px) minmax(70px, 110px);
  gap: 0.75rem;
  padding: 0.4rem 1rem 0.4rem 2.25rem;
  background: #ECEEF2;
  border-top: 1px solid ${jiraTheme.border};
  font-size: 0.6875rem;
  font-weight: 700;
  color: ${jiraTheme.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.03em;
  text-align: center;

  @media (max-width: 900px) {
    grid-template-columns: minmax(80px, 120px) 1fr minmax(60px, 90px);
    gap: 0.5rem;
    padding-left: 1.25rem;

    span:nth-child(4) { display: none; }
  }

  @media (max-width: 600px) {
    grid-template-columns: minmax(70px, 100px) 1fr;
    gap: 0.375rem;
    padding-left: 1rem;

    span:nth-child(3),
    span:nth-child(4) { display: none; }
  }
`;

const IssueRow = styled.div`
  display: grid;
  grid-template-columns: minmax(140px, 220px) 1fr minmax(70px, 110px) minmax(70px, 110px);
  gap: 0.75rem;
  padding: 0.5rem 1rem 0.5rem 2.25rem;
  background: ${jiraTheme.bg.default};
  border-top: 1px solid #F0F1F3;
  cursor: pointer;
  transition: background 0.12s ${transition};
  align-items: center;

  &:first-of-type { border-top: none; }
  &:hover { background: #F5F7FA; }

  @media (max-width: 900px) {
    grid-template-columns: minmax(80px, 120px) 1fr minmax(60px, 90px);
    gap: 0.5rem;
    padding-left: 1.25rem;
  }

  @media (max-width: 600px) {
    grid-template-columns: minmax(70px, 100px) 1fr;
    gap: 0.375rem;
    padding-left: 1rem;
  }
`;

const IssueKeyCell = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
`;

const IssueKey = styled.span`
  font-weight: 600;
  color: ${jiraTheme.primary};
  font-size: 0.8125rem;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

const IssueTypeLabel = styled.span<{ $color: string }>`
  font-weight: 700;
  font-size: 0.6875rem;
  color: ${({ $color }) => $color};
  white-space: nowrap;
  flex-shrink: 0;
`;

const IssueSummary = styled.span`
  font-size: 0.8125rem;
  color: ${jiraTheme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StatusBadgeBtn = styled.button<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1rem 0.375rem;
  font-size: 0.625rem;
  font-weight: 600;
  border-radius: 20px;
  background: ${({ $color }) => $color || jiraTheme.status.default};
  color: white;
  text-align: center;
  letter-spacing: 0.01em;
  border: none;
  cursor: pointer;
  justify-self: center;
  transition: filter 0.15s;

  &:hover { filter: brightness(0.9); }

  @media (max-width: 600px) { display: none; }
`;


const ChevronIcon = styled.span`
  font-size: 0.625rem;
  line-height: 1;
  opacity: 0.8;
`;

const AssigneeText = styled.span<{ $isMe?: boolean }>`
  font-size: 0.75rem;
  color: ${({ $isMe }) => ($isMe ? jiraTheme.primary : jiraTheme.text.secondary)};
  font-weight: ${({ $isMe }) => ($isMe ? 600 : 400)};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;

  @media (max-width: 900px) { display: none; }
`;


const SpaceSettingsOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

const SpaceSettingsPanel = styled.div`
  background: ${jiraTheme.bg.default};
  border-radius: 6px;
  border: 1px solid ${jiraTheme.border};
  width: 420px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`;

const SpaceSettingsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid ${jiraTheme.border};
`;

const SpaceSettingsTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
`;

const SpaceSettingsClose = styled.button`
  background: none;
  border: none;
  font-size: 1rem;
  color: ${jiraTheme.text.muted};
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;

  &:hover { color: ${jiraTheme.text.primary}; }
`;

const SpaceSettingsDesc = styled.div`
  padding: 0.75rem 1.25rem;
  font-size: 0.8125rem;
  color: ${jiraTheme.text.secondary};
  border-bottom: 1px solid ${jiraTheme.border};
`;

const SpaceSearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-bottom: 1px solid ${jiraTheme.border};
`;

const SpaceSearchInput = styled.input`
  flex: 1;
  padding: 0.375rem 0.625rem;
  border: 1px solid ${jiraTheme.border};
  border-radius: 20px;
  font-size: 0.8125rem;
  background: ${jiraTheme.bg.subtle};
  color: ${jiraTheme.text.primary};

  &::placeholder { color: ${jiraTheme.text.muted}; }
  &:focus {
    outline: none;
    border-color: ${jiraTheme.primary};
    background: ${jiraTheme.bg.default};
  }
`;

const SpaceList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
  max-height: 400px;
`;

const SpaceSectionLabel = styled.div`
  padding: 0.375rem 1.25rem 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${jiraTheme.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid ${jiraTheme.border};
  margin-bottom: 0.125rem;

  &:not(:first-of-type) {
    margin-top: 0.375rem;
    border-top: 1px solid ${jiraTheme.border};
    padding-top: 0.5rem;
  }
`;

const SpaceEmptyMsg = styled.div`
  padding: 1.5rem;
  text-align: center;
  font-size: 0.8125rem;
  color: ${jiraTheme.text.muted};
`;

const SpaceItem = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 1.25rem;
  cursor: pointer;
  transition: background 0.1s;
  background: ${({ $active }) => $active ? jiraTheme.primaryLight : 'transparent'};

  &:hover {
    background: ${({ $active }) => $active ? jiraTheme.primaryLight : jiraTheme.bg.hover};
  }
`;

const SpaceCheckbox = styled.span<{ $checked: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 20px;
  border: 2px solid ${({ $checked }) => $checked ? jiraTheme.primary : jiraTheme.border};
  background: ${({ $checked }) => $checked ? jiraTheme.primary : 'transparent'};
  color: white;
  font-size: 0.6875rem;
  font-weight: 700;
  flex-shrink: 0;
`;

const SpaceItemName = styled.span`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${jiraTheme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`;

const SpaceItemKey = styled.span`
  font-size: 0.75rem;
  color: ${jiraTheme.text.muted};
  flex-shrink: 0;
`;

const SpaceSettingsFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid ${jiraTheme.border};
`;

const SaveBtn = styled.button`
  padding: 0.5rem 1.25rem;
  background: ${jiraTheme.primary};
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ${transition};

  &:hover { background: ${jiraTheme.primaryHover}; }
`;

// ─── Item Context Menu ─────────────────────────

const ItemContextOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 500;
`;

const ItemContextBox = styled.div`
  position: fixed;
  background: ${jiraTheme.bg.default};
  border: 1px solid ${jiraTheme.border};
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  padding: 0.25rem 0;
  z-index: 501;
`;

const ItemContextMenuItem = styled.div`
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  color: ${jiraTheme.text.primary};
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: ${jiraTheme.bg.subtle};
  }
`;

// ── 브라우즈 모드 스타일 ──
const SubTaskToggle = styled.span`
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.5625rem;
  color: ${jiraTheme.text.secondary};
  cursor: pointer;
  flex-shrink: 0;
  border-radius: 3px;
  margin-right: 2px;

  svg {
    animation: spin 1s linear infinite;
  }

  &:hover {
    background: ${jiraTheme.border};
  }
`;

const SubTaskToggleSpacer = styled.span`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-right: 2px;
`;


