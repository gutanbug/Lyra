import { useCallback, useEffect, useRef, useState } from 'react';
import { isEpicType } from 'lib/utils/jiraUtils';
import type { NormalizedIssue, EpicGroup } from 'types/jira';

export interface UseJiraExpandStateOptions {
  accountId: string;
  activeAccount: { id: string } | null | undefined;
  myIssues: NormalizedIssue[];
  fetchChildren: (parentKeys: string[], projectFilter?: string[], isEpic?: boolean) => Promise<NormalizedIssue[]>;
  selectedProjects: string[];
  /** 단축키 처리 시 전달할 epic 그룹 ref (composer에서 주입) */
  epicGroupsRef: React.RefObject<EpicGroup[]>;
  /** 브라우즈 모드에서는 expand-all/collapse-all을 이 오버라이드로 위임한다 */
  browseOverride?: {
    isActive: () => boolean;
    expandAll: () => void;
    collapseAll: () => void;
  };
  cached?: {
    expandedEpics?: Set<string>;
    defaultChildrenMap?: Record<string, NormalizedIssue[]>;
    defaultExpandedChildren?: Set<string>;
  };
}

export interface UseJiraExpandStateResult {
  expandedEpics: Set<string>;
  setExpandedEpics: React.Dispatch<React.SetStateAction<Set<string>>>;
  defaultChildrenMap: Record<string, NormalizedIssue[]>;
  setDefaultChildrenMap: React.Dispatch<React.SetStateAction<Record<string, NormalizedIssue[]>>>;
  defaultExpandedChildren: Set<string>;
  setDefaultExpandedChildren: React.Dispatch<React.SetStateAction<Set<string>>>;
  defaultLoadingChildren: Set<string>;
  loadDefaultChildren: (epicKey: string) => Promise<void>;
  loadAllDescendants: (issues: NormalizedIssue[], projectFilter?: string[]) => Promise<void>;
  toggleEpic: (epicKey: string) => void;
  expandAll: (groups: EpicGroup[]) => void;
  collapseAll: () => void;
}

/**
 * Jira Dashboard 기본(내 이슈/검색) 모드의 에픽 확장 상태 훅.
 * expandedEpics/defaultChildrenMap/defaultExpandedChildren 상태와
 * 하위 이슈 N-depth 로딩, 전역 단축키(lyra:expand-all/collapse-all) 처리를 담당한다.
 * 브라우즈 모드에서는 `browseOverride`로 단축키 처리를 위임한다.
 */
export function useJiraExpandState({
  activeAccount: _activeAccount,
  myIssues,
  fetchChildren,
  selectedProjects,
  epicGroupsRef,
  browseOverride,
  cached,
}: UseJiraExpandStateOptions): UseJiraExpandStateResult {
  // _activeAccount는 현재 직접 사용되지 않지만 향후 가드용으로 옵션 유지
  void _activeAccount;

  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(cached?.expandedEpics ?? new Set());
  const [defaultChildrenMap, setDefaultChildrenMap] = useState<Record<string, NormalizedIssue[]>>(cached?.defaultChildrenMap ?? {});
  const [defaultExpandedChildren, setDefaultExpandedChildren] = useState<Set<string>>(cached?.defaultExpandedChildren ?? new Set());
  const [defaultLoadingChildren, setDefaultLoadingChildren] = useState<Set<string>>(new Set());
  const defaultLoadedChildrenRef = useRef<Set<string>>(
    cached?.defaultChildrenMap ? new Set(Object.keys(cached.defaultChildrenMap)) : new Set()
  );

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

    // 이슈 타입 확인: myIssues에서 찾기
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
  useEffect(() => {
    const onExpand = () => {
      if (browseOverride && browseOverride.isActive()) {
        browseOverride.expandAll();
      } else {
        expandAll(epicGroupsRef.current ?? []);
      }
    };
    const onCollapse = () => {
      if (browseOverride && browseOverride.isActive()) {
        browseOverride.collapseAll();
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
  }, [expandAll, collapseAll, browseOverride, epicGroupsRef]);

  return {
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
  };
}
