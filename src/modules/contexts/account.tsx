import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Account } from 'types/account';
import { accountController } from 'controllers/account';

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

  return (
    <accountContext.Provider value={{ accounts, activeAccount, isLoading, refresh, setActive }}>
      {children}
    </accountContext.Provider>
  );
};

export default AccountProvider;
