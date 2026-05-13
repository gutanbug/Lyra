import React, { createContext, useCallback, useContext, useState } from 'react';
import type { LocalRepo } from 'types/git';
import { localGitController } from 'controllers/account';

/**
 * 현재 열린 로컬 Git 저장소 상태.
 * M5: 한 번에 하나의 repo만 활성화. recent repos 등 멀티 트래킹은 후속(M7+) 단계.
 */
interface LocalRepoContextValue {
  currentRepo: LocalRepo | null;
  isOpening: boolean;
  /** 최근 에러 코드(없으면 null). 'NOT_A_REPO' 등 */
  errorCode: string | null;
  errorMessage: string | null;
  /** 다이얼로그로 디렉토리를 선택해 repo 열기. 사용자가 취소하면 무동작. */
  openWithDialog: () => Promise<void>;
  /** 절대 경로 직접 지정해 repo 열기. (recent repos 복원용) */
  openByPath: (absPath: string) => Promise<void>;
  /** 현재 repo 메타 재조회. */
  refresh: () => Promise<void>;
  /** 현재 repo를 닫고 idle 상태로. */
  close: () => void;
  /** 에러 상태 클리어. */
  clearError: () => void;
}

const noopAsync = async () => {};
const noop = () => {};

export const localRepoContext = createContext<LocalRepoContextValue>({
  currentRepo: null,
  isOpening: false,
  errorCode: null,
  errorMessage: null,
  openWithDialog: noopAsync,
  openByPath: noopAsync,
  refresh: noopAsync,
  close: noop,
  clearError: noop,
});

export const useLocalRepo = () => useContext(localRepoContext);

const LocalRepoProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentRepo, setCurrentRepo] = useState<LocalRepo | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setErrorCode(null);
    setErrorMessage(null);
  }, []);

  const openByPath = useCallback(async (absPath: string) => {
    setIsOpening(true);
    clearError();
    try {
      const repo = await localGitController.openRepo(absPath);
      setCurrentRepo(repo);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setErrorCode(err.code || 'UNKNOWN');
      setErrorMessage(err.message || '저장소를 열 수 없습니다.');
      setCurrentRepo(null);
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

  const refresh = useCallback(async () => {
    if (!currentRepo) return;
    try {
      const meta = await localGitController.getRepoMeta(currentRepo.id);
      setCurrentRepo(meta);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setErrorCode(err.code || 'UNKNOWN');
      setErrorMessage(err.message || '저장소 상태를 갱신할 수 없습니다.');
    }
  }, [currentRepo]);

  const close = useCallback(() => {
    setCurrentRepo(null);
    clearError();
  }, [clearError]);

  return (
    <localRepoContext.Provider
      value={{
        currentRepo,
        isOpening,
        errorCode,
        errorMessage,
        openWithDialog,
        openByPath,
        refresh,
        close,
        clearError,
      }}
    >
      {children}
    </localRepoContext.Provider>
  );
};

export default LocalRepoProvider;
