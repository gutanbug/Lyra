import Store from 'electron-store';

interface SettingsStore {
  /** 계정별 선택된 프로젝트 키 { [accountId]: string[] } */
  selectedProjects: Record<string, string[]>;
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
};
