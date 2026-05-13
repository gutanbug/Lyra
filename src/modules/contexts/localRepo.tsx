import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { LocalRepo } from 'types/git';
import { localGitController } from 'controllers/account';

/**
 * 열린 로컬 Git 저장소들의 상태.
 * GitKraken처럼 여러 repo를 탭으로 동시에 열고 전환할 수 있도록 멀티 repo 모델.
 *
 * M7: watcher 통합 — repo가 열리면 main process에서 `.git/HEAD/refs/index`를 감시.
 * 변경 이벤트는 300ms debounce 후 해당 repo의 meta를 자동 갱신 → CommitsArea도 함께 재조회.
 */
interface LocalRepoContextValue {
  openedRepos: LocalRepo[];
  currentRepoId: string | null;
  currentRepo: LocalRepo | null;
  isOpening: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  /**
   * 시스템 git 설치 상태. Provider mount 시 1회 확인.
   * - `null`: 아직 확인 안 됨
   * - `true`: 설치됨
   * - `false`: 미설치 (또는 PATH에 없음) → onboarding 안내 필요
   */
  gitInstalled: boolean | null;
  gitVersion: string | null;
  openWithDialog: () => Promise<void>;
  openByPath: (absPath: string) => Promise<void>;
  switchRepo: (repoId: string) => void;
  closeRepo: (repoId: string) => void;
  /** 현재 활성 repo의 meta를 다시 조회. */
  refresh: () => Promise<void>;
  /** 특정 repo의 meta를 다시 조회 (watcher 콜백이 사용). */
  refreshRepo: (repoId: string) => Promise<void>;
  clearError: () => void;
}

const noopAsync = async () => {};
const noop = () => {};

export const localRepoContext = createContext<LocalRepoContextValue>({
  openedRepos: [],
  currentRepoId: null,
  currentRepo: null,
  isOpening: false,
  errorCode: null,
  errorMessage: null,
  gitInstalled: null,
  gitVersion: null,
  openWithDialog: noopAsync,
  openByPath: noopAsync,
  switchRepo: noop,
  closeRepo: noop,
  refresh: noopAsync,
  refreshRepo: noopAsync,
  clearError: noop,
});

export const useLocalRepo = () => useContext(localRepoContext);

/** watcher 이벤트가 도착했을 때 적용할 debounce 지연. */
const WATCHER_DEBOUNCE_MS = 300;

const LocalRepoProvider = ({ children }: { children: React.ReactNode }) => {
  const [openedRepos, setOpenedRepos] = useState<LocalRepo[]>([]);
  const [currentRepoId, setCurrentRepoId] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [gitInstalled, setGitInstalled] = useState<boolean | null>(null);
  const [gitVersion, setGitVersion] = useState<string | null>(null);

  // M8: 부트 시 1회 git CLI 설치 여부 확인.
  useEffect(() => {
    let cancelled = false;
    localGitController.checkInstalled().then((result) => {
      if (cancelled) return;
      setGitInstalled(result.installed);
      setGitVersion(result.version ?? null);
    }).catch(() => {
      if (cancelled) return;
      setGitInstalled(false);
      setGitVersion(null);
    });
    return () => { cancelled = true; };
  }, []);

  const currentRepo = openedRepos.find((r) => r.id === currentRepoId) ?? null;

  // 최신 openedRepos를 watcher 콜백이 참조하기 위한 ref.
  const openedReposRef = useRef(openedRepos);
  useEffect(() => {
    openedReposRef.current = openedRepos;
  }, [openedRepos]);

  const clearError = useCallback(() => {
    setErrorCode(null);
    setErrorMessage(null);
  }, []);

  const refreshRepo = useCallback(async (repoId: string) => {
    try {
      const meta = await localGitController.getRepoMeta(repoId);
      setOpenedRepos((prev) => prev.map((r) => (r.id === meta.id ? meta : r)));
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setErrorCode(err.code || 'UNKNOWN');
      setErrorMessage(err.message || '저장소 상태를 갱신할 수 없습니다.');
    }
  }, []);

  const openByPath = useCallback(async (absPath: string) => {
    setIsOpening(true);
    clearError();
    try {
      const repo = await localGitController.openRepo(absPath);
      setOpenedRepos((prev) => {
        const idx = prev.findIndex((r) => r.id === repo.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = repo;
          return next;
        }
        return [...prev, repo];
      });
      setCurrentRepoId(repo.id);
      // M7: 새 repo는 watcher 시작.
      localGitController.watch(repo.id, repo.path).catch(() => {
        /* watcher 등록 실패는 치명적이지 않음 — 사용자는 수동 새로고침 사용 가능. */
      });
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setErrorCode(err.code || 'UNKNOWN');
      setErrorMessage(err.message || '저장소를 열 수 없습니다.');
    } finally {
      setIsOpening(false);
    }
  }, [clearError]);

  const openWithDialog = useCallback(async () => {
    clearError();
    let path: string | null = null;
    try {
      path = await localGitController.openDialog();
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setErrorCode(err.code || 'UNKNOWN');
      setErrorMessage(err.message || '다이얼로그를 열 수 없습니다.');
      return;
    }
    if (!path) return;
    await openByPath(path);
  }, [clearError, openByPath]);

  const switchRepo = useCallback((repoId: string) => {
    setCurrentRepoId(repoId);
    clearError();
  }, [clearError]);

  const closeRepo = useCallback((repoId: string) => {
    // M7: watcher 해제.
    localGitController.unwatch(repoId).catch(() => { /* ignore */ });
    setOpenedRepos((prev) => {
      const remaining = prev.filter((r) => r.id !== repoId);
      setCurrentRepoId((curId) => {
        if (curId !== repoId) return curId;
        return remaining.length > 0 ? remaining[remaining.length - 1].id : null;
      });
      return remaining;
    });
    clearError();
  }, [clearError]);

  const refresh = useCallback(async () => {
    if (!currentRepoId) return;
    await refreshRepo(currentRepoId);
  }, [currentRepoId, refreshRepo]);

  /**
   * Watcher 이벤트 구독 — Provider 마운트 시 한 번 등록, unmount 시 해제.
   * 콜백은 ref를 통해 최신 openedRepos 참조.
   * repoId별 debounce 타이머로 잦은 변경을 합쳐 한 번만 refresh.
   */
  useEffect(() => {
    const debounceMap = new Map<string, ReturnType<typeof setTimeout>>();

    const unsubscribe = localGitController.onRepoChanged(({ repoId }) => {
      // 현재 열려있는 repo만 처리 (탭 닫혔는데 main에서 이벤트가 늦게 와도 무시).
      if (!openedReposRef.current.some((r) => r.id === repoId)) return;

      const existing = debounceMap.get(repoId);
      if (existing) clearTimeout(existing);
      debounceMap.set(repoId, setTimeout(() => {
        debounceMap.delete(repoId);
        // 디바운스 후에도 여전히 열려있는지 재확인.
        if (openedReposRef.current.some((r) => r.id === repoId)) {
          refreshRepo(repoId);
        }
      }, WATCHER_DEBOUNCE_MS));
    });

    return () => {
      unsubscribe();
      for (const t of debounceMap.values()) clearTimeout(t);
      debounceMap.clear();
    };
  }, [refreshRepo]);

  /**
   * Provider unmount 시 열려있던 모든 repo의 watcher 정리.
   * (앱 종료/페이지 이동 시 main 측 파일 핸들 누수 방지.)
   */
  useEffect(() => {
    return () => {
      for (const repo of openedReposRef.current) {
        localGitController.unwatch(repo.id).catch(() => { /* ignore */ });
      }
    };
  }, []);

  return (
    <localRepoContext.Provider
      value={{
        openedRepos,
        currentRepoId,
        currentRepo,
        isOpening,
        errorCode,
        errorMessage,
        gitInstalled,
        gitVersion,
        openWithDialog,
        openByPath,
        switchRepo,
        closeRepo,
        refresh,
        refreshRepo,
        clearError,
      }}
    >
      {children}
    </localRepoContext.Provider>
  );
};

export default LocalRepoProvider;
