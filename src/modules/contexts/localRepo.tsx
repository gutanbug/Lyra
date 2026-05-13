import React, { createContext, useCallback, useContext, useState } from 'react';
import type { LocalRepo } from 'types/git';
import { localGitController } from 'controllers/account';

/**
 * 열린 로컬 Git 저장소들의 상태.
 * GitKraken처럼 여러 repo를 탭으로 동시에 열고 전환할 수 있도록 멀티 repo 모델.
 */
interface LocalRepoContextValue {
  /** 현재 열려 있는 repo 목록 (탭 순서) */
  openedRepos: LocalRepo[];
  /** 활성 repo id */
  currentRepoId: string | null;
  /** openedRepos[currentRepoId] derived */
  currentRepo: LocalRepo | null;
  isOpening: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  /** 다이얼로그로 디렉토리 선택 후 열기. 이미 열려 있으면 해당 repo로 전환. */
  openWithDialog: () => Promise<void>;
  /** 절대 경로로 열기. 이미 열려 있으면 전환. */
  openByPath: (absPath: string) => Promise<void>;
  /** 탭 전환 */
  switchRepo: (repoId: string) => void;
  /** 탭 닫기. 활성 탭이면 인접 탭으로 전환. */
  closeRepo: (repoId: string) => void;
  /** 현재 repo 메타 재조회 */
  refresh: () => Promise<void>;
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
  openWithDialog: noopAsync,
  openByPath: noopAsync,
  switchRepo: noop,
  closeRepo: noop,
  refresh: noopAsync,
  clearError: noop,
});

export const useLocalRepo = () => useContext(localRepoContext);

const LocalRepoProvider = ({ children }: { children: React.ReactNode }) => {
  const [openedRepos, setOpenedRepos] = useState<LocalRepo[]>([]);
  const [currentRepoId, setCurrentRepoId] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentRepo = openedRepos.find((r) => r.id === currentRepoId) ?? null;

  const clearError = useCallback(() => {
    setErrorCode(null);
    setErrorMessage(null);
  }, []);

  const openByPath = useCallback(async (absPath: string) => {
    setIsOpening(true);
    clearError();
    try {
      const repo = await localGitController.openRepo(absPath);
      setOpenedRepos((prev) => {
        const idx = prev.findIndex((r) => r.id === repo.id);
        if (idx >= 0) {
          // 이미 열려있으면 최신 메타로 교체
          const next = [...prev];
          next[idx] = repo;
          return next;
        }
        return [...prev, repo];
      });
      setCurrentRepoId(repo.id);
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
    try {
      const meta = await localGitController.getRepoMeta(currentRepoId);
      setOpenedRepos((prev) => prev.map((r) => (r.id === meta.id ? meta : r)));
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setErrorCode(err.code || 'UNKNOWN');
      setErrorMessage(err.message || '저장소 상태를 갱신할 수 없습니다.');
    }
  }, [currentRepoId]);

  return (
    <localRepoContext.Provider
      value={{
        openedRepos,
        currentRepoId,
        currentRepo,
        isOpening,
        errorCode,
        errorMessage,
        openWithDialog,
        openByPath,
        switchRepo,
        closeRepo,
        refresh,
        clearError,
      }}
    >
      {children}
    </localRepoContext.Provider>
  );
};

export default LocalRepoProvider;
