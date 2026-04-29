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
  };
}

export interface UseJiraBrowseModeResult {
  browseProjectKey: string | null;
  browseEpics: NormalizedIssue[];
  browseChildrenMap: Record<string, NormalizedIssue[]>;
  isBrowseLoading: boolean;
  browseExpandedKeys: Set<string>;
  browseLoadedChildren: Set<string>;
  setBrowseExpandedKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  setBrowseEpics: React.Dispatch<React.SetStateAction<NormalizedIssue[]>>;
  setBrowseChildrenMap: React.Dispatch<React.SetStateAction<Record<string, NormalizedIssue[]>>>;
  loadBrowseChildren: (epicKey: string) => Promise<void>;
  toggleBrowseEpic: (epicKey: string) => void;
}

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
  const [browseEpics, setBrowseEpics] = useState<NormalizedIssue[]>(cached?.browseEpics ?? []);
  const [browseChildrenMap, setBrowseChildrenMap] = useState<Record<string, NormalizedIssue[]>>(cached?.browseChildrenMap ?? {});
  const [isBrowseLoading, setIsBrowseLoading] = useState(false);
  const [browseExpandedKeys, setBrowseExpandedKeys] = useState<Set<string>>(cached?.browseExpandedKeys ?? new Set());
  const [, setBrowseLoadingChildren] = useState<Set<string>>(new Set());
  const [browseLoadedChildren, setBrowseLoadedChildren] = useState<Set<string>>(cached?.browseLoadedChildren ?? new Set());

  // 사이드바에서 프로젝트 브라우즈 이벤트 수신
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const key = detail?.projectKey as string | null;
      setBrowseProjectKey(key ?? null);
      setBrowseEpics([]);
      setBrowseChildrenMap({});
      setBrowseExpandedKeys(new Set());
      setBrowseLoadedChildren(new Set());
    };
    window.addEventListener('lyra:sidebar-browse-project', handler);
    return () => window.removeEventListener('lyra:sidebar-browse-project', handler);
  }, []);

  // 캐시 복원 후 최초 마운트에서 에픽 재조회를 생략하기 위한 플래그
  const browseFetchDone = useRef(Boolean(cached && cached.browseProjectKey === browseProjectKey && (cached.browseEpics?.length ?? 0) > 0));

  // ── 사이드바 프로젝트 브라우즈: 에픽만 조회 ──
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
  };
}
