import Store from 'electron-store';

interface SettingsStore {
  /** 계정별 선택된 프로젝트 키 { [accountId]: string[] } */
  selectedProjects: Record<string, string[]>;
  /** 계정별 선택된 Confluence 스페이스 키 { [accountId]: string[] } */
  selectedSpaces: Record<string, string[]>;
}

const store = new Store<SettingsStore>({
  name: 'workspace-settings',
});

export const SettingsManager = {
  getSelectedProjects(accountId: string): string[] {
    const all = store.get('selectedProjects', {});
    return all[accountId] || [];
  },

  setSelectedProjects(accountId: string, keys: string[]): void {
    const all = store.get('selectedProjects', {});
    all[accountId] = keys;
    store.set('selectedProjects', all);
  },

  getSelectedSpaces(accountId: string): string[] {
    const all = store.get('selectedSpaces', {});
    return all[accountId] || [];
  },

  setSelectedSpaces(accountId: string, keys: string[]): void {
    const all = store.get('selectedSpaces', {});
    all[accountId] = keys;
    store.set('selectedSpaces', all);
  },

  /** 계정 삭제 시 관련 설정 모두 제거 */
  removeAccount(accountId: string): void {
    const projects = store.get('selectedProjects', {});
    delete projects[accountId];
    store.set('selectedProjects', projects);

    const spaces = store.get('selectedSpaces', {});
    delete spaces[accountId];
    store.set('selectedSpaces', spaces);
  },
};
