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
        getProjectFieldConfig?: (
          accountId: string,
          projectKey: string,
        ) => Promise<import('lib/utils/storageHelpers').ProjectFieldConfig | null>;
        setProjectFieldConfig?: (
          accountId: string,
          projectKey: string,
          config: import('lib/utils/storageHelpers').ProjectFieldConfig,
        ) => Promise<void>;
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
      agents: {
        getAllStatus: () => Promise<import('types/agent').AgentStatus[]>;
        getStatus: (id: import('types/agent').AgentId) => Promise<import('types/agent').AgentStatus>;
        login: (id: import('types/agent').AgentId) => Promise<{ ok: boolean; pid: number | null; message: string }>;
        logout: (id: import('types/agent').AgentId) => Promise<{ ok: boolean; message: string }>;
        setApiKey: (id: import('types/agent').AgentId, key: string | null) => Promise<import('types/agent').AgentStatus>;
        setBinaryPath: (id: import('types/agent').AgentId, binaryPath: string | null) => Promise<import('types/agent').AgentStatus>;
        startTurn: (payload: {
          turnId: string;
          agentId: import('types/agent').AgentId;
          prompt: string;
          sessionId?: string | null;
          permissionMode?: 'default' | 'acceptEdits' | 'plan' | 'bypassPermissions';
        }) => Promise<{ ok: boolean; message?: string }>;
        cancelTurn: (turnId: string) => Promise<boolean>;
        onTurnEvent: (
          handler: (event: {
            turnId: string;
            type:
              | 'chunk'
              | 'meta'
              | 'end'
              | 'error'
              | 'block_start'
              | 'block_delta'
              | 'block_stop'
              | 'tool_result';
            text?: string;
            sessionId?: string;
            model?: string;
            message?: string;
            costUsd?: number;
            index?: number;
            blockKind?: 'text' | 'thinking' | 'tool_use';
            toolName?: string;
            toolUseId?: string;
            textDelta?: string;
            thinkingDelta?: string;
            jsonDelta?: string;
            resultText?: string;
            isError?: boolean;
          }) => void,
        ) => () => void;
        listCommands: (
          id: import('types/agent').AgentId,
        ) => Promise<Array<{ name: string; description: string; source: string }>>;
        onPermissionRequest: (
          handler: (request: {
            requestId: string;
            turnId: string;
            toolName: string;
            input: unknown;
          }) => void,
        ) => () => void;
        respondPermission: (response: {
          requestId: string;
          behavior: 'allow' | 'deny';
          updatedInput?: unknown;
          message?: string;
        }) => Promise<boolean>;
      };
    };
  }
}

export {};
