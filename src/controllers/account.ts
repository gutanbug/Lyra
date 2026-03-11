import type { Account, AccountInput } from 'types/account';

declare const window: Window & {
  workspaceAPI?: {
    account: {
      getAll: () => Promise<Account[]>;
      getByService: (type: string) => Promise<Account[]>;
      add: (account: AccountInput) => Promise<Account>;
      update: (id: string, updates: Partial<AccountInput>) => Promise<Account | null>;
      remove: (id: string) => Promise<boolean>;
      setActive: (id: string | null) => Promise<void>;
      getActive: () => Promise<Account | null>;
    };
    integration: {
      getAvailable: () => Promise<{ type: string; displayName: string; icon?: string }[]>;
      validate: (payload: { serviceType: string; credentials: unknown }) => Promise<boolean>;
      invoke: (payload: {
        accountId: string;
        serviceType: string;
        action: string;
        params?: Record<string, unknown>;
      }) => Promise<unknown>;
    };
  };
};

const api = () => window.workspaceAPI;
if (!api()) {
  console.warn('workspaceAPI is not available (running in browser without Electron)');
}

export const accountController = {
  getAll: () => api()?.account.getAll() ?? Promise.resolve([]),
  getByService: (serviceType: string) =>
    api()?.account.getByService(serviceType) ?? Promise.resolve([]),
  add: (account: AccountInput) => api()?.account.add(account) ?? Promise.reject(new Error('workspaceAPI not available')),
  update: (id: string, updates: Partial<AccountInput>) =>
    api()?.account.update(id, updates) ?? Promise.reject(new Error('workspaceAPI not available')),
  remove: (id: string) => api()?.account.remove(id) ?? Promise.resolve(false),
  setActive: (id: string | null) => api()?.account.setActive(id) ?? Promise.resolve(),
  getActive: () => api()?.account.getActive() ?? Promise.resolve(null),
};

export const integrationController = {
  getAvailable: () =>
    api()?.integration.getAvailable() ?? Promise.resolve([]),
  validate: (serviceType: string, credentials: unknown) =>
    api()?.integration.validate({ serviceType, credentials }) ?? Promise.resolve(false),
  invoke: (payload: {
    accountId: string;
    serviceType: string;
    action: string;
    params?: Record<string, unknown>;
  }) =>
    api()?.integration.invoke(payload) ?? Promise.reject(new Error('workspaceAPI not available')),
};
