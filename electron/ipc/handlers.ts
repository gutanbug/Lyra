import { ipcMain, shell } from 'electron';
import { AccountManager } from '../account/manager';
import { SettingsManager } from '../settings/store';
import { getAdapter, getAvailableServices } from '../integrations/registry';

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
  ipcMain.handle('account:remove', (_, id: string) => AccountManager.remove(id));
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
}
