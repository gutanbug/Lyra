import Store from 'electron-store';
import type { AgentId } from './types';

interface AgentStore {
  /** 에이전트별 API 키 (env 대체 인증) */
  apiKeys: Partial<Record<AgentId, string>>;
  /** 에이전트별 바이너리 경로 오버라이드 */
  binaryPaths: Partial<Record<AgentId, string>>;
}

const store = new Store<AgentStore>({
  name: 'agent-settings',
  defaults: { apiKeys: {}, binaryPaths: {} },
});

export const AgentSettingsStore = {
  getApiKey(id: AgentId): string | null {
    const all = store.get('apiKeys', {});
    return all[id] ?? null;
  },

  setApiKey(id: AgentId, key: string | null): void {
    const all = store.get('apiKeys', {});
    if (key && key.trim()) all[id] = key.trim();
    else delete all[id];
    store.set('apiKeys', all);
  },

  getBinaryPath(id: AgentId): string | null {
    const all = store.get('binaryPaths', {});
    return all[id] ?? null;
  },

  setBinaryPath(id: AgentId, path: string | null): void {
    const all = store.get('binaryPaths', {});
    if (path && path.trim()) all[id] = path.trim();
    else delete all[id];
    store.set('binaryPaths', all);
  },
};
