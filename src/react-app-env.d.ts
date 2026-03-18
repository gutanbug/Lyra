declare global {
  interface Window {
    electronAPI?: {
      versions: {
        node: string;
        chrome: string;
        electron: string;
      };
      openExternal: (url: string) => Promise<void>;
    };
    workspaceAPI?: {
      settings: {
        getSelectedProjects: (accountId: string) => Promise<string[]>;
        setSelectedProjects: (accountId: string, keys: string[]) => Promise<void>;
        getSelectedSpaces: (accountId: string) => Promise<string[]>;
        setSelectedSpaces: (accountId: string, keys: string[]) => Promise<void>;
      };
      account: {
        getAll: () => Promise<unknown[]>;
        getByService: (type: string) => Promise<unknown[]>;
        add: (account: unknown) => Promise<unknown>;
        update: (id: string, updates: unknown) => Promise<unknown>;
        remove: (id: string) => Promise<boolean>;
        setActive: (id: string | null) => Promise<void>;
        getActive: () => Promise<unknown>;
      };
      integration: {
        getAvailable: () => Promise<{ type: string; displayName: string; icon?: string }[]>;
        validate: (payload: { serviceType: string; credentials: unknown }) => Promise<boolean>;
        invoke: (payload: unknown) => Promise<unknown>;
      };
    };
  }
}

export {};
