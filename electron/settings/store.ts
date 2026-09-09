import Store from 'electron-store';

export interface ProjectFieldEntry {
  id: string;
  enabled: boolean;
  /** 사용자 라벨 오버라이드 (없으면 원본 필드명 사용) */
  label?: string;
}

export interface ProjectFieldConfig {
  /** 사용자 지정 순서 + 활성/라벨 */
  fields: ProjectFieldEntry[];
}

interface SettingsStore {
  /** 계정별 선택된 프로젝트 키 { [accountId]: string[] } */
  selectedProjects: Record<string, string[]>;
  /** 계정별 선택된 Confluence 스페이스 키 { [accountId]: string[] } */
  selectedSpaces: Record<string, string[]>;
  /** 계정·프로젝트별 필드 표시 설정 { [accountId]: { [projectKey]: ProjectFieldConfig } } */
  projectFieldConfigs: Record<string, Record<string, ProjectFieldConfig>>;
  /** Docs 로컬 저장소 경로 (미지정 시 기본 경로 사용) */
  docsStoragePath?: string;
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

  getProjectFieldConfig(accountId: string, projectKey: string): ProjectFieldConfig | null {
    const all = store.get('projectFieldConfigs', {} as Record<string, Record<string, ProjectFieldConfig>>);
    const byProject = all[accountId];
    if (!byProject) return null;
    return byProject[projectKey] ?? null;
  },

  setProjectFieldConfig(accountId: string, projectKey: string, config: ProjectFieldConfig): void {
    const all = store.get('projectFieldConfigs', {} as Record<string, Record<string, ProjectFieldConfig>>);
    if (!all[accountId]) all[accountId] = {};
    all[accountId][projectKey] = config;
    store.set('projectFieldConfigs', all);
  },

  getDocsStoragePath(): string | undefined {
    return store.get('docsStoragePath');
  },

  setDocsStoragePath(path: string): void {
    store.set('docsStoragePath', path);
  },

  resetDocsStoragePath(): void {
    store.delete('docsStoragePath');
  },

  /** 계정 삭제 시 관련 설정 모두 제거 */
  removeAccount(accountId: string): void {
    const projects = store.get('selectedProjects', {});
    delete projects[accountId];
    store.set('selectedProjects', projects);

    const spaces = store.get('selectedSpaces', {});
    delete spaces[accountId];
    store.set('selectedSpaces', spaces);

    const fieldConfigs = store.get('projectFieldConfigs', {} as Record<string, Record<string, ProjectFieldConfig>>);
    delete fieldConfigs[accountId];
    store.set('projectFieldConfigs', fieldConfigs);
  },
};
