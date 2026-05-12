import { useCallback, useEffect, useRef, useState } from 'react';
import { integrationController } from 'controllers/account';
import { escapeJql } from 'lib/utils/jiraUtils';
import { parseIssues } from 'lib/utils/jiraNormalizers';
import type { NormalizedIssue } from 'types/jira';

export interface UseJiraBrowseModeOptions {
  accountId: string;
  activeAccount: { id: string } | null | undefined;
  fetchChildren: (parentKeys: string[], projectFilter?: string[], isEpic?: boolean) => Promise<NormalizedIssue[]>;
  cached?: {
    browseProjectKey?: string | null;
    browseEpics?: NormalizedIssue[];
    browseChildrenMap?: Record<string, NormalizedIssue[]>;
    browseExpandedKeys?: Set<string>;
    browseLoadedChildren?: Set<string>;
    /** 캐시 복원 시 무한 스크롤 토큰. 누락되면 100건 이상 로드가 막힌다. */
    browseNextPageToken?: string | null;
  };
}

export interface UseJiraBrowseModeResult {
  browseProjectKey: string | null;
  /** 보드 모드일 때만 채워짐 (스페이스 단독 브라우즈 시 null) */
  browseBoardId: number | null;
  browseBoardName: string | null;
  browseEpics: NormalizedIssue[];
  browseChildrenMap: Record<string, NormalizedIssue[]>;
  isBrowseLoading: boolean;
  /** 추가 페이지를 로드 중 (무한 스크롤 sentinel용) */
  isBrowseLoadingMore: boolean;
  /** 다음 페이지가 남아 있는지 여부 */
  hasMoreBrowseEpics: boolean;
  /** 캐시 영속화용 raw 페이지 토큰 (null=마지막 페이지, string=다음 토큰) */
  browseNextPageToken: string | null;
  browseExpandedKeys: Set<string>;
  browseLoadedChildren: Set<string>;
  setBrowseExpandedKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  setBrowseEpics: React.Dispatch<React.SetStateAction<NormalizedIssue[]>>;
  setBrowseChildrenMap: React.Dispatch<React.SetStateAction<Record<string, NormalizedIssue[]>>>;
  loadBrowseChildren: (epicKey: string) => Promise<void>;
  loadMoreBrowseEpics: () => Promise<void>;
  toggleBrowseEpic: (epicKey: string) => void;
}

const BROWSE_EPICS_PAGE_SIZE = 100;

/**
 * Jira 사이드바 프로젝트 브라우즈 모드 훅.
 * `lyra:sidebar-browse-project` 이벤트로 진입/종료를 수신하고,
 * 해당 프로젝트의 에픽 목록을 조회한 뒤 요청 시 하위 이슈를 lazy-load 한다.
 */
export function useJiraBrowseMode({
  activeAccount,
  fetchChildren,
  cached,
}: UseJiraBrowseModeOptions): UseJiraBrowseModeResult {
  const [browseProjectKey, setBrowseProjectKey] = useState<string | null>(cached?.browseProjectKey ?? null);
  const [browseBoardId, setBrowseBoardId] = useState<number | null>(null);
  const [browseBoardName, setBrowseBoardName] = useState<string | null>(null);
  const [browseBoardJql, setBrowseBoardJql] = useState<string | null>(null);
  const [browseEpics, setBrowseEpics] = useState<NormalizedIssue[]>(cached?.browseEpics ?? []);
  const [browseChildrenMap, setBrowseChildrenMap] = useState<Record<string, NormalizedIssue[]>>(cached?.browseChildrenMap ?? {});
  const [isBrowseLoading, setIsBrowseLoading] = useState(false);
  const [isBrowseLoadingMore, setIsBrowseLoadingMore] = useState(false);
  const [browseExpandedKeys, setBrowseExpandedKeys] = useState<Set<string>>(cached?.browseExpandedKeys ?? new Set());
  const [, setBrowseLoadingChildren] = useState<Set<string>>(new Set());
  const [browseLoadedChildren, setBrowseLoadedChildren] = useState<Set<string>>(cached?.browseLoadedChildren ?? new Set());
  // 다음 페이지 토큰. null=마지막 페이지, string=다음 토큰, undefined=첫 로드 전(미정).
  // 캐시에서 복원되면 첫 useEffect 페치를 건너뛰므로 캐시값을 즉시 사용한다.
  const [browseNextPageToken, setBrowseNextPageToken] = useState<string | null | undefined>(
    cached?.browseNextPageToken,
  );
  const browseLoadingMoreRef = useRef(false);

  // 공통 reset 헬퍼
  const resetBrowseState = useCallback(() => {
    setBrowseEpics([]);
    setBrowseChildrenMap({});
    setBrowseExpandedKeys(new Set());
    setBrowseLoadedChildren(new Set());
    setBrowseNextPageToken(undefined);
  }, []);

  // 사이드바: 프로젝트 브라우즈 이벤트 (보드 미선택 = 스페이스 전체)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const key = detail?.projectKey as string | null;
      setBrowseProjectKey(key ?? null);
      setBrowseBoardId(null);
      setBrowseBoardName(null);
      setBrowseBoardJql(null);
      resetBrowseState();
    };
    window.addEventListener('lyra:sidebar-browse-project', handler);
    return () => window.removeEventListener('lyra:sidebar-browse-project', handler);
  }, [resetBrowseState]);

  // 사이드바: 보드 브라우즈 이벤트 (보드 + 프로젝트 동시 set)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const projectKey = (detail?.projectKey as string | null) ?? null;
      const boardId = (detail?.boardId as number | null) ?? null;
      const boardName = (detail?.boardName as string | null) ?? null;
      setBrowseProjectKey(projectKey);
      setBrowseBoardId(boardId);
      setBrowseBoardName(boardName);
      setBrowseBoardJql(null); // 보드 전환 시 재조회
      resetBrowseState();
    };
    window.addEventListener('lyra:sidebar-browse-board', handler);
    return () => window.removeEventListener('lyra:sidebar-browse-board', handler);
  }, [resetBrowseState]);

  // 캐시 복원 후 최초 마운트에서 에픽 재조회를 생략하기 위한 플래그
  const browseFetchDone = useRef(Boolean(cached && cached.browseProjectKey === browseProjectKey && (cached.browseEpics?.length ?? 0) > 0));

  /**
   * 현재 browse 컨텍스트의 JQL prefix를 빌드.
   * - 보드 모드: 보드의 filter JQL을 그대로 base로 사용 (보드 단위 issue 범위 보장)
   *   ⚠️ 보드 filter JQL은 trailing `ORDER BY` 절을 포함할 수 있는데, AND로 합치면서
   *   괄호 안에 ORDER BY가 갇히면 JQL 파서가 거부한다(`예측했으나 'ORDER'이 도출됨` 400).
   *   → base에서 trailing `ORDER BY ...`를 제거한 뒤 wrapping. 정렬은 호출자의 suffix가 담당.
   * - 보드 JQL 로드 실패(빈 문자열): unscoped 쿼리 방지를 위해 **프로젝트 scope으로 폴백**.
   * - 스페이스 모드: project = X
   * - 어떤 scope도 없으면 null 반환 → 호출자가 페치 자체를 건너뜀.
   */
  /**
   * JQL의 trailing ORDER BY 절을 안전하게 제거.
   *
   * 단순 정규식으로 자르면 따옴표 안의 "ORDER BY" 문자열(예:
   * `summary ~ "ORDER BY hack" AND ...`)이나 서브쿼리 `(... ORDER BY ...)` 내부
   * ORDER BY까지 매칭되어 JQL이 깨질 수 있다. 따라서 따옴표/괄호 depth를
   * 추적하면서 **최상위 레벨**에서 등장하는 마지막 ORDER BY 키워드 위치만
   * 잘라낸다.
   */
  const stripTrailingOrderBy = (jql: string): string => {
    const s = jql.trim();
    let depth = 0;
    let inSingle = false;
    let inDouble = false;
    let lastTopLevel = -1;

    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (inSingle) {
        if (c === '\\' && i + 1 < s.length) { i++; continue; }
        if (c === "'") inSingle = false;
        continue;
      }
      if (inDouble) {
        if (c === '\\' && i + 1 < s.length) { i++; continue; }
        if (c === '"') inDouble = false;
        continue;
      }
      if (c === "'") { inSingle = true; continue; }
      if (c === '"') { inDouble = true; continue; }
      if (c === '(') { depth++; continue; }
      if (c === ')') { depth = Math.max(0, depth - 1); continue; }
      if (depth !== 0) continue;
      // top-level — ORDER BY 키워드 검사 (워드 경계 + 대소문자 무시)
      if ((c === 'O' || c === 'o') &&
          /^order\s+by\b/i.test(s.slice(i)) &&
          (i === 0 || /\s/.test(s[i - 1]))) {
        lastTopLevel = i;
      }
    }

    if (lastTopLevel === -1) return s;
    return s.slice(0, lastTopLevel).trimEnd();
  };

  const buildBrowseJql = useCallback((suffix: string): string | null => {
    if (browseBoardId) {
      if (browseBoardJql === null) return null; // 아직 보드 JQL 미로드
      const base = stripTrailingOrderBy(browseBoardJql.trim());
      if (base) return `(${base}) AND ${suffix}`;
      // 보드 JQL 로드 실패 — 프로젝트 scope으로 폴백
      if (browseProjectKey) {
        return `project = "${escapeJql(browseProjectKey)}" AND ${suffix}`;
      }
      return null;
    }
    if (browseProjectKey) {
      return `project = "${escapeJql(browseProjectKey)}" AND ${suffix}`;
    }
    return null;
  }, [browseBoardId, browseBoardJql, browseProjectKey]);

  // 보드 모드 진입 시 보드 JQL을 먼저 로드 (epic fetch는 JQL이 준비된 뒤 실행됨)
  useEffect(() => {
    if (!browseBoardId || !activeAccount) return;
    if (browseBoardJql !== null) return; // 이미 로드됨
    let cancelled = false;
    (async () => {
      try {
        const jql = await integrationController.invoke({
          accountId: activeAccount.id,
          serviceType: 'jira',
          action: 'getBoardFilterJql',
          params: { boardId: browseBoardId },
        });
        if (cancelled) return;
        setBrowseBoardJql(typeof jql === 'string' ? jql : '');
      } catch {
        if (!cancelled) setBrowseBoardJql(''); // 실패 시 빈 prefix → 안전
      }
    })();
    return () => { cancelled = true; };
  }, [browseBoardId, browseBoardJql, activeAccount]);

  // ── 사이드바 브라우즈: 에픽 첫 페이지 ──
  // Jira /search/jql는 페이지당 최대 100건이므로 nextPageToken으로 추가 페이지를 lazy 로드한다.
  // 보드 모드는 board JQL이 준비된 뒤에만 실행 (그 전에는 대기).
  useEffect(() => {
    if (!browseProjectKey || !activeAccount) return;
    if (browseBoardId && browseBoardJql === null) return; // 보드 JQL 대기
    if (browseFetchDone.current) {
      browseFetchDone.current = false;
      return;
    }
    const epicJql = buildBrowseJql('issuetype in (Epic, 에픽) ORDER BY created DESC');
    if (!epicJql) return;
    let cancelled = false;
    setIsBrowseLoading(true);
    setBrowseEpics([]);
    setBrowseChildrenMap({});
    setBrowseLoadedChildren(new Set());
    setBrowseNextPageToken(undefined);

    (async () => {
      try {
        const epicResult = await integrationController.invoke({
          accountId: activeAccount.id,
          serviceType: 'jira',
          action: 'searchIssues',
          params: {
            jql: epicJql,
            maxResults: BROWSE_EPICS_PAGE_SIZE,
            skipCache: true,
          },
        });
        if (cancelled) return;
        const epics = parseIssues(epicResult);
        setBrowseEpics(epics);
        const token = (epicResult as Record<string, unknown>)?.nextPageToken;
        setBrowseNextPageToken(typeof token === 'string' && token ? token : null);
      } catch (err) {
        console.error('[JiraDashboard] browse epics error:', err);
        if (!cancelled) {
          setBrowseEpics([]);
          setBrowseNextPageToken(null);
        }
      } finally {
        if (!cancelled) setIsBrowseLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [browseProjectKey, browseBoardId, browseBoardJql, activeAccount, buildBrowseJql]);

  // 다음 페이지 fetch — 무한 스크롤 sentinel에서 호출
  const loadMoreBrowseEpics = useCallback(async () => {
    if (!activeAccount || !browseProjectKey) return;
    if (!browseNextPageToken) return;          // 다음 페이지 없음 또는 첫 로드 전
    if (browseLoadingMoreRef.current) return;  // 이미 로딩 중 (중복 트리거 방지)
    const epicJql = buildBrowseJql('issuetype in (Epic, 에픽) ORDER BY created DESC');
    if (!epicJql) return;
    browseLoadingMoreRef.current = true;
    setIsBrowseLoadingMore(true);
    try {
      const epicResult = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'jira',
        action: 'searchIssues',
        params: {
          jql: epicJql,
          maxResults: BROWSE_EPICS_PAGE_SIZE,
          nextPageToken: browseNextPageToken,
          skipCache: true,
        },
      });
      const more = parseIssues(epicResult);
      // 중복 키 방어 — 동일 epic이 두 번 들어가지 않도록 이미 있는 key는 제외
      setBrowseEpics((prev) => {
        const seen = new Set(prev.map((e) => e.key));
        const next = more.filter((e) => !seen.has(e.key));
        return next.length > 0 ? [...prev, ...next] : prev;
      });
      const token = (epicResult as Record<string, unknown>)?.nextPageToken;
      setBrowseNextPageToken(typeof token === 'string' && token ? token : null);
    } catch (err) {
      console.error('[JiraDashboard] loadMoreBrowseEpics error:', err);
    } finally {
      browseLoadingMoreRef.current = false;
      setIsBrowseLoadingMore(false);
    }
  }, [activeAccount, browseProjectKey, browseNextPageToken, buildBrowseJql]);

  const hasMoreBrowseEpics = browseNextPageToken !== null && browseNextPageToken !== undefined;

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
  }, [fetchChildren, browseLoadedChildren, browseEpics]);

  // 캐시 복원 후 펼침 상태와 로드된 데이터 동기화
  const browseResyncDone = useRef(false);
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

  return {
    browseProjectKey,
    browseBoardId,
    browseBoardName,
    browseEpics,
    browseChildrenMap,
    isBrowseLoading,
    isBrowseLoadingMore,
    hasMoreBrowseEpics,
    browseNextPageToken: browseNextPageToken === undefined ? null : browseNextPageToken,
    browseExpandedKeys,
    browseLoadedChildren,
    setBrowseExpandedKeys,
    setBrowseEpics,
    setBrowseChildrenMap,
    loadBrowseChildren,
    loadMoreBrowseEpics,
    toggleBrowseEpic,
  };
}
