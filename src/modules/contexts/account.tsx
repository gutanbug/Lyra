import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Account } from 'types/account';
import { isAtlassianAccount } from 'types/account';
import { accountController, integrationController } from 'controllers/account';

interface AccountContextValue {
  accounts: Account[];
  activeAccount: Account | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  setActive: (id: string | null) => Promise<void>;
}

export const accountContext = createContext<AccountContextValue>({
  accounts: [],
  activeAccount: null,
  isLoading: true,
  refresh: async () => {},
  setActive: async () => {},
});

export const useAccount = () => useContext(accountContext);

const AccountProvider = ({ children }: { children: React.ReactNode }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [all, active] = await Promise.all([
        accountController.getAll(),
        accountController.getActive(),
      ]);
      setAccounts((all ?? []) as Account[]);
      setActiveAccount((active ?? null) as Account | null);
    } catch (e) {
      console.error('Failed to load accounts', e);
      setAccounts([]);
      setActiveAccount(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setActive = useCallback(async (id: string | null) => {
    await accountController.setActive(id);
    await refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // activeAccount의 userDisplayName이 없으면 자동 복구
  const recoveryAttempted = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!activeAccount) return;
    const meta = (activeAccount.metadata || {}) as Record<string, unknown>;
    if (meta.userDisplayName) return;
    if (recoveryAttempted.current.has(activeAccount.id)) return;
    recoveryAttempted.current.add(activeAccount.id);

    if (!isAtlassianAccount(activeAccount.serviceType)) return;

    (async () => {
      try {
        const user = await integrationController.invoke({
          accountId: activeAccount.id,
          serviceType: 'jira',
          action: 'getCurrentUser',
          params: {},
        }) as Record<string, unknown>;
        if (user?.displayName) {
          await accountController.update(activeAccount.id, {
            metadata: { ...meta, userDisplayName: user.displayName, userAccountId: user.accountId || '' },
          });
          await refresh();
        }
      } catch (err) {
        console.error('[AccountProvider] userDisplayName recovery failed:', err);
      }
    })();
  }, [activeAccount, refresh]);

  return (
    <accountContext.Provider value={{ accounts, activeAccount, isLoading, refresh, setActive }}>
      {children}
    </accountContext.Provider>
  );
};

export default AccountProvider;
