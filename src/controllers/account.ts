import type { Account, AccountInput } from 'types/account';
import { publishApiError } from 'lib/utils/apiErrorBus';

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
    github: {
      beginOAuth: (params: { baseUrl?: string; clientId?: string; scopes?: string[] }) => Promise<{
        deviceCode: string;
        userCode: string;
        verificationUri: string;
        expiresIn: number;
        interval: number;
        oauthBaseUrl: string;
        clientId: string;
        scopes: string[];
      }>;
      pollOAuth: (params: { baseUrl?: string; clientId?: string; deviceCode: string }) => Promise<
        | { status: 'pending' }
        | { status: 'slow_down'; intervalIncrease: number }
        | { status: 'success'; accessToken: string; scope: string; tokenType: string }
      >;
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
  /**
   * 모든 서비스(Jira/Confluence/...) 액션의 단일 진입점.
   * 실패 시 `apiErrorBus`로 publish하여 전역 스낵바에 노출되도록 한 뒤 그대로 re-throw —
   * 호출자의 인라인 에러 처리(catch)는 영향 없이 동작.
   */
  invoke: (payload: {
    accountId: string;
    serviceType: string;
    action: string;
    params?: Record<string, unknown>;
  }) => {
    const promise = api()?.integration.invoke(payload)
      ?? Promise.reject(new Error('workspaceAPI not available'));
    return promise.catch((error: unknown) => {
      publishApiError({ serviceType: payload.serviceType, action: payload.action, error });
      throw error;
    });
  },
};

export const gitHostOAuthController = {
  github: {
    begin: (params: { baseUrl?: string; clientId?: string; scopes?: string[] } = {}) =>
      api()?.github.beginOAuth(params) ?? Promise.reject(new Error('workspaceAPI not available')),
    poll: (params: { baseUrl?: string; clientId?: string; deviceCode: string }) =>
      api()?.github.pollOAuth(params) ?? Promise.reject(new Error('workspaceAPI not available')),
  },
};
