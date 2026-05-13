import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
});

contextBridge.exposeInMainWorld('workspaceAPI', {
  settings: {
    getSelectedProjects: (accountId: string) =>
      ipcRenderer.invoke('settings:getSelectedProjects', accountId),
    setSelectedProjects: (accountId: string, keys: string[]) =>
      ipcRenderer.invoke('settings:setSelectedProjects', accountId, keys),
    getSelectedSpaces: (accountId: string) =>
      ipcRenderer.invoke('settings:getSelectedSpaces', accountId),
    setSelectedSpaces: (accountId: string, keys: string[]) =>
      ipcRenderer.invoke('settings:setSelectedSpaces', accountId, keys),
    getProjectFieldConfig: (accountId: string, projectKey: string) =>
      ipcRenderer.invoke('settings:getProjectFieldConfig', accountId, projectKey),
    setProjectFieldConfig: (accountId: string, projectKey: string, config: unknown) =>
      ipcRenderer.invoke('settings:setProjectFieldConfig', accountId, projectKey, config),
  },
  account: {
    getAll: () => ipcRenderer.invoke('account:getAll'),
    getByService: (type: string) => ipcRenderer.invoke('account:getByService', type),
    add: (account: unknown) => ipcRenderer.invoke('account:add', account),
    update: (id: string, updates: unknown) =>
      ipcRenderer.invoke('account:update', id, updates),
    remove: (id: string) => ipcRenderer.invoke('account:remove', id),
    setActive: (id: string | null) => ipcRenderer.invoke('account:setActive', id),
    getActive: () => ipcRenderer.invoke('account:getActive'),
  },
  integration: {
    getAvailable: () => ipcRenderer.invoke('integration:getAvailable'),
    validate: (payload: { serviceType: string; credentials: unknown }) =>
      ipcRenderer.invoke('integration:validate', payload),
    invoke: (payload: {
      accountId: string;
      serviceType: string;
      action: string;
      params?: Record<string, unknown>;
    }) => ipcRenderer.invoke('integration:invoke', payload),
  },
  github: {
    beginOAuth: (params: { baseUrl?: string; clientId?: string; scopes?: string[] }) =>
      ipcRenderer.invoke('github:beginOAuth', params),
    pollOAuth: (params: { baseUrl?: string; clientId?: string; deviceCode: string }) =>
      ipcRenderer.invoke('github:pollOAuth', params),
  },
  gitlab: {
    beginOAuth: (params: { baseUrl?: string; clientId?: string; scopes?: string[] }) =>
      ipcRenderer.invoke('gitlab:beginOAuth', params),
    pollOAuth: (params: { baseUrl?: string; clientId?: string; deviceCode: string }) =>
      ipcRenderer.invoke('gitlab:pollOAuth', params),
  },
  agents: {
    getAllStatus: () => ipcRenderer.invoke('agents:getAllStatus'),
    getStatus: (id: string) => ipcRenderer.invoke('agents:getStatus', id),
    login: (id: string) => ipcRenderer.invoke('agents:login', id),
    logout: (id: string) => ipcRenderer.invoke('agents:logout', id),
    setApiKey: (id: string, key: string | null) =>
      ipcRenderer.invoke('agents:setApiKey', id, key),
    setBinaryPath: (id: string, binaryPath: string | null) =>
      ipcRenderer.invoke('agents:setBinaryPath', id, binaryPath),
    startTurn: (payload: {
      turnId: string;
      agentId: string;
      prompt: string;
      sessionId?: string | null;
      permissionMode?: 'default' | 'acceptEdits' | 'plan' | 'bypassPermissions';
    }) => ipcRenderer.invoke('agents:startTurn', payload),
    cancelTurn: (turnId: string) => ipcRenderer.invoke('agents:cancelTurn', turnId),
    onTurnEvent: (handler: (event: unknown) => void) => {
      const listener = (_e: unknown, payload: unknown) => handler(payload);
      ipcRenderer.on('agents:turnEvent', listener);
      return () => {
        ipcRenderer.removeListener('agents:turnEvent', listener);
      };
    },
    listCommands: (id: string) => ipcRenderer.invoke('agents:listCommands', id),
    onPermissionRequest: (handler: (event: unknown) => void) => {
      const listener = (_e: unknown, payload: unknown) => handler(payload);
      ipcRenderer.on('agents:permissionRequest', listener);
      return () => {
        ipcRenderer.removeListener('agents:permissionRequest', listener);
      };
    },
    respondPermission: (response: {
      requestId: string;
      behavior: 'allow' | 'deny';
      updatedInput?: unknown;
      message?: string;
    }) => ipcRenderer.invoke('agents:permissionResponse', response),
  },
});
