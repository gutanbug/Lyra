import { useEffect } from 'react';

/**
 * 계정별로 격리된 in-memory 캐시 슬롯. HMR/테스트 리셋이 가능하며,
 * 계정 전환 후 복귀 시 이전 state 스냅샷을 복원하는 용도로 사용한다.
 */
export interface AccountScopedCacheStore<T> {
  get(accountId: string): T | undefined;
  set(accountId: string, value: T): void;
  has(accountId: string): boolean;
  clear(accountId: string): void;
  _resetAll(): void;
}

export function createAccountScopedCache<T>(): AccountScopedCacheStore<T> {
  const store = new Map<string, T>();
  return {
    get: (accountId) => store.get(accountId),
    set: (accountId, value) => {
      store.set(accountId, value);
    },
    has: (accountId) => store.has(accountId),
    clear: (accountId) => {
      store.delete(accountId);
    },
    _resetAll: () => {
      store.clear();
    },
  };
}

/**
 * deps 변경 시 현재 accountId slot에 build()의 결과를 기록한다.
 * 훅 반환값이 없으며, 외부에서 store.get(accountId)로 복원한다.
 */
export function useAccountScopedCache<T>(
  store: AccountScopedCacheStore<T>,
  accountId: string,
  deps: ReadonlyArray<unknown>,
  build: () => T,
): void {
  useEffect(() => {
    if (!accountId) return;
    store.set(accountId, build());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, ...deps]);
}
