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
});
