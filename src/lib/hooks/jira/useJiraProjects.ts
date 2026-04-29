import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { integrationController } from 'controllers/account';
import {
  loadSelectedProjects,
  loadSelectedProjectsAsync,
  saveSelectedProjects,
} from 'lib/utils/storageHelpers';
import type { JiraProject } from 'types/jira';

export interface UseJiraProjectsOptions {
  accountId: string;
  activeAccount: { id: string } | null | undefined;
  cached?: {
    projects?: JiraProject[];
    selectedProjects?: string[];
    spaceFilter?: string;
  };
}

export interface UseJiraProjectsResult {
  projects: JiraProject[];
  setProjects: React.Dispatch<React.SetStateAction<JiraProject[]>>;
  selectedProjects: string[];
  setSelectedProjects: React.Dispatch<React.SetStateAction<string[]>>;
  spaceFilter: string;
  setSpaceFilter: React.Dispatch<React.SetStateAction<string>>;
  filteredProjects: JiraProject[];
  projectsReady: boolean;
  setProjectsReady: React.Dispatch<React.SetStateAction<boolean>>;
  fetchProjects: () => Promise<void>;
  handleSaveSpaceSettings: () => void;
}

/**
 * Jira Dashboard 프로젝트(스페이스) 필터 상태 + 조회.
 * selectedProjects는 localStorage 영속(계정별). cached가 있으면 우선.
 * handleSaveSpaceSettings는 저장 + 이벤트 디스패치만 수행하며,
 * composer에서 fetchMyIssues/fetchDoneCounts 등의 후속 동작을 합성한다.
 */
export function useJiraProjects({
  accountId,
  activeAccount,
  cached,
}: UseJiraProjectsOptions): UseJiraProjectsResult {
  const isCacheValid = Boolean(cached && cached.projects);

  const [projects, setProjects] = useState<JiraProject[]>(cached?.projects ?? []);
  const [selectedProjects, setSelectedProjects] = useState<string[]>(
    cached?.selectedProjects ?? loadSelectedProjects(accountId),
  );
  const [spaceFilter, setSpaceFilter] = useState<string>(cached?.spaceFilter ?? '');
  const [projectsReady, setProjectsReady] = useState<boolean>(
    isCacheValid || loadSelectedProjects(accountId).length > 0,
  );

  // 계정 변경 시 화면 리셋 + localStorage/async 재로드
  const prevAccountIdRef = useRef(accountId);
  useEffect(() => {
    if (prevAccountIdRef.current === accountId) return;
    prevAccountIdRef.current = accountId;

    setProjects([]);
    setSelectedProjects([]);

    if (!accountId) return;

    const localKeys = loadSelectedProjects(accountId);
    if (localKeys.length > 0) {
      setSelectedProjects(localKeys);
      setProjectsReady(true);
    }
    loadSelectedProjectsAsync(accountId).then((keys) => {
      if (keys.length > 0) setSelectedProjects(keys);
      setProjectsReady(true);
    });
  }, [accountId]);

  // 최초 마운트 시 비동기 프로젝트 설정 로드
  const initialLoadRef = useRef(false);
  useEffect(() => {
    if (initialLoadRef.current || !accountId) return;
    initialLoadRef.current = true;
    if (!projectsReady) {
      loadSelectedProjectsAsync(accountId).then((keys) => {
        if (keys.length > 0) setSelectedProjects(keys);
        setProjectsReady(true);
      });
    }
  }, [accountId, projectsReady]);

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

  const filteredProjects = useMemo(() => {
    const q = spaceFilter.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q),
    );
  }, [projects, spaceFilter]);

  const handleSaveSpaceSettings = useCallback(() => {
    saveSelectedProjects(accountId, selectedProjects);
    window.dispatchEvent(new CustomEvent('lyra:space-settings-changed'));
  }, [accountId, selectedProjects]);

  return {
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
  };
}
