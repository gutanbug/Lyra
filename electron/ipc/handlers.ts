import { ipcMain, shell } from 'electron';
import { AccountManager } from '../account/manager';
import { SettingsManager } from '../settings/store';
import { getAdapter, getAvailableServices } from '../integrations/registry';
import { AgentManager } from '../integrations/agents/manager';
import type { AgentId } from '../integrations/agents/types';
import { startTurn as startAgentTurn, cancelTurn as cancelAgentTurn } from '../integrations/agents/runner';
import type { StartTurnPayload, TurnEvent } from '../integrations/agents/runner';
import { discoverCommands } from '../integrations/agents/discovery';
import { permissionBridge } from '../integrations/agents/permission-bridge';
import type { PermissionRequest, PermissionResponse } from '../integrations/agents/permission-bridge';
import { BrowserWindow } from 'electron';
import { GitHubAdapter } from '../integrations/github/adapter';
import type { BeginOAuthParams, PollOAuthParams } from '../integrations/github/adapter';

export interface InvokePayload {
  accountId: string;
  serviceType: string;
  action: string;
  params?: Record<string, unknown>;
}

export function registerIpcHandlers(): void {
  // === 외부 브라우저 열기 ===
  ipcMain.handle('shell:openExternal', (_, url: string) => {
    if (typeof url === 'string' && /^https?:\/\//.test(url)) {
      return shell.openExternal(url);
    }
  });

  // === 계정 관리 ===
  ipcMain.handle('account:getAll', () => AccountManager.getAll());
  ipcMain.handle('account:getByService', (_, serviceType: string) =>
    AccountManager.getByService(serviceType)
  );
  ipcMain.handle('account:add', (_, account) => AccountManager.add(account));
  ipcMain.handle('account:update', (_, id: string, updates) =>
    AccountManager.update(id, updates)
  );
  ipcMain.handle('account:remove', (_, id: string) => {
    SettingsManager.removeAccount(id);
    return AccountManager.remove(id);
  });
  ipcMain.handle('account:setActive', (_, id: string | null) =>
    AccountManager.setActive(id)
  );
  ipcMain.handle('account:getActive', () => AccountManager.getActive());

  // === 설정 ===
  ipcMain.handle('settings:getSelectedProjects', (_, accountId: string) =>
    SettingsManager.getSelectedProjects(accountId)
  );
  ipcMain.handle('settings:setSelectedProjects', (_, accountId: string, keys: string[]) =>
    SettingsManager.setSelectedProjects(accountId, keys)
  );
  ipcMain.handle('settings:getSelectedSpaces', (_, accountId: string) =>
    SettingsManager.getSelectedSpaces(accountId)
  );
  ipcMain.handle('settings:setSelectedSpaces', (_, accountId: string, keys: string[]) =>
    SettingsManager.setSelectedSpaces(accountId, keys)
  );
  ipcMain.handle(
    'settings:getProjectFieldConfig',
    (_, accountId: string, projectKey: string) =>
      SettingsManager.getProjectFieldConfig(accountId, projectKey)
  );
  ipcMain.handle(
    'settings:setProjectFieldConfig',
    (_, accountId: string, projectKey: string, config: unknown) =>
      SettingsManager.setProjectFieldConfig(
        accountId,
        projectKey,
        config as Parameters<typeof SettingsManager.setProjectFieldConfig>[2]
      )
  );

  // === 사용 가능한 서비스 목록 ===
  ipcMain.handle('integration:getAvailable', () =>
    getAvailableServices().map((a) => ({
      type: a.serviceType,
      displayName: a.displayName,
      icon: a.icon,
    }))
  );

  // === 연결 검증 ===
  ipcMain.handle(
    'integration:validate',
    async (_, { serviceType, credentials }: { serviceType: string; credentials: unknown }) => {
      const adapter = getAdapter(serviceType);
      if (!adapter) throw new Error(`Integration not found: ${serviceType}`);
      return adapter.validateCredentials(credentials);
    }
  );

  // === 서비스별 액션 (accountId + serviceType + action + params) ===
  ipcMain.handle(
    'integration:invoke',
    async (_, payload: InvokePayload) => {
      const { accountId, serviceType, action, params = {} } = payload;

      const account = AccountManager.getById(accountId);
      if (!account) throw new Error('Account not found');

      const adapter = getAdapter(serviceType);
      if (!adapter) throw new Error(`Integration not found: ${serviceType}`);

      const actions = adapter.getActions();
      const handler = actions[action];
      if (!handler) throw new Error(`Action not found: ${action}`);

      const invokeParams = {
        credentials: account.credentials,
        ...params,
      };

      return handler(invokeParams);
    }
  );

  // === OAuth (계정 없이 호출 가능) ===
  ipcMain.handle(
    'github:beginOAuth',
    async (_, params: BeginOAuthParams) => GitHubAdapter.beginOAuth(params || {}),
  );
  ipcMain.handle(
    'github:pollOAuth',
    async (_, params: PollOAuthParams) => GitHubAdapter.pollOAuth(params),
  );

  // === AI Agent CLI 관리 ===
  ipcMain.handle('agents:getAllStatus', () => AgentManager.getAllStatus());
  ipcMain.handle('agents:getStatus', (_, id: AgentId) => AgentManager.getStatus(id));
  ipcMain.handle('agents:login', (_, id: AgentId) => AgentManager.login(id));
  ipcMain.handle('agents:logout', (_, id: AgentId) => AgentManager.logout(id));
  ipcMain.handle('agents:setApiKey', (_, id: AgentId, key: string | null) => {
    AgentManager.setApiKey(id, key);
    return AgentManager.getStatus(id);
  });
  ipcMain.handle('agents:setBinaryPath', (_, id: AgentId, binaryPath: string | null) => {
    AgentManager.setBinaryPath(id, binaryPath);
    return AgentManager.getStatus(id);
  });

  // === AI Agent Turn 스트리밍 ===
  ipcMain.handle('agents:startTurn', (event, payload: StartTurnPayload) => {
    const wc = event.sender;
    return startAgentTurn(payload, (e: TurnEvent) => {
      if (!wc.isDestroyed()) wc.send('agents:turnEvent', e);
    });
  });

  ipcMain.handle('agents:cancelTurn', (_, turnId: string) => cancelAgentTurn(turnId));

  ipcMain.handle('agents:listCommands', (_, id: AgentId) => discoverCommands(id));

  // permission bridge → 모든 BrowserWindow에 broadcast
  permissionBridge.on('permission_request', (req: PermissionRequest) => {
    for (const w of BrowserWindow.getAllWindows()) {
      if (!w.isDestroyed()) w.webContents.send('agents:permissionRequest', req);
    }
  });

  ipcMain.handle('agents:permissionResponse', (_e, response: PermissionResponse) => {
    return permissionBridge.respond(response);
  });
}
