/**
 * localStorage / Electron API 스토리지 헬퍼
 * Jira 프로젝트 선택, Confluence 스페이스 선택 등 영속 설정 관리
 */

// ── Jira 프로젝트 ──

export function loadSelectedProjects(accountId: string): string[] {
  try {
    const raw = localStorage.getItem(`lyra:jira:selectedProjects:${accountId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

export async function loadSelectedProjectsAsync(accountId: string): Promise<string[]> {
  try {
    if ((window as any).workspaceAPI?.settings) {
      return await (window as any).workspaceAPI.settings.getSelectedProjects(accountId);
    }
    const raw = localStorage.getItem(`lyra:jira:selectedProjects:${accountId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

export function saveSelectedProjects(accountId: string, keys: string[]): void {
  try {
    if ((window as any).workspaceAPI?.settings) {
      (window as any).workspaceAPI.settings.setSelectedProjects(accountId, keys);
    }
    localStorage.setItem(`lyra:jira:selectedProjects:${accountId}`, JSON.stringify(keys));
  } catch { /* ignore */ }
}

// ── Jira 상태 필터 ──

/**
 * 저장된 상태 필터를 로드한다.
 * - null: 저장된 적이 없음 (최초 진입 → 호출부에서 전체 선택 기본값 적용)
 * - string[]: 저장된 적이 있음 (빈 배열이면 사용자가 명시적으로 모두 해제한 상태)
 */
export function loadSelectedStatuses(accountId: string): string[] | null {
  try {
    const raw = localStorage.getItem(`lyra:jira:selectedStatuses:${accountId}`);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* ignore */ }
  return null;
}

export function saveSelectedStatuses(accountId: string, statuses: string[]): void {
  try {
    localStorage.setItem(`lyra:jira:selectedStatuses:${accountId}`, JSON.stringify(statuses));
  } catch { /* ignore */ }
}

// ── Confluence 스페이스 ──

/**
 * 동기 버전 stub — ConfluenceDashboard 초기 렌더링 시 호출되지만,
 * 실제 로드는 loadSelectedSpacesAsync가 담당. 동기 localStorage 접근이
 * Electron 환경에서 불필요하므로 빈 배열을 반환.
 */
export function loadSelectedSpaces(_accountId: string): string[] {
  return [];
}

export async function loadSelectedSpacesAsync(accountId: string): Promise<string[]> {
  try {
    if ((window as any).workspaceAPI?.settings) {
      return await (window as any).workspaceAPI.settings.getSelectedSpaces?.(accountId) ?? [];
    }
    const raw = localStorage.getItem(`lyra:confluence:selectedSpaces:${accountId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

export function saveSelectedSpaces(accountId: string, keys: string[]): void {
  try {
    if ((window as any).workspaceAPI?.settings) {
      (window as any).workspaceAPI.settings.setSelectedSpaces?.(accountId, keys);
    }
    localStorage.setItem(`lyra:confluence:selectedSpaces:${accountId}`, JSON.stringify(keys));
  } catch { /* ignore */ }
}

// ── Jira 프로젝트 필드 설정 ──

export interface ProjectFieldEntry {
  id: string;
  enabled: boolean;
  label?: string;
}

export interface ProjectFieldConfig {
  fields: ProjectFieldEntry[];
  /** 타임라인 뷰에서 시작일로 사용할 customfield ID (예: 'customfield_10015'). 미지정이면 undefined. */
  startDateFieldId?: string;
}

/**
 * localStorage에 사용되는 필드 설정 키 형식.
 * `storage` 이벤트로 cross-window 동기화 시 키 매칭에 사용되므로 export.
 */
export const projectFieldConfigStorageKey = (accountId: string, projectKey: string) =>
  `lyra:jira:projectFieldConfig:${accountId}:${projectKey}`;

const fieldConfigKey = projectFieldConfigStorageKey;

export async function loadProjectFieldConfigAsync(
  accountId: string,
  projectKey: string,
): Promise<ProjectFieldConfig | null> {
  try {
    if ((window as any).workspaceAPI?.settings?.getProjectFieldConfig) {
      const cfg = await (window as any).workspaceAPI.settings.getProjectFieldConfig(
        accountId,
        projectKey,
      );
      if (cfg && Array.isArray(cfg.fields)) return cfg as ProjectFieldConfig;
    }
    const raw = localStorage.getItem(fieldConfigKey(accountId, projectKey));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.fields)) return parsed as ProjectFieldConfig;
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * 필드 설정 저장.
 *
 * 저장 순서가 cross-window 동기화 정확성을 좌우하므로 변경 시 주의:
 *  1) electron-store(IPC)에 먼저 write 완료까지 await — IPC가 신뢰 저장소
 *  2) localStorage.setItem — 이 호출이 다른 윈도우에서 `storage` 이벤트를 발화
 *  3) 같은 윈도우용 CustomEvent dispatch
 *
 * 에러 처리 원칙:
 *  - IPC 환경(Electron)에서 IPC가 실패하면 throw — localStorage만 쓴 채 성공으로
 *    위장하면 다른 윈도우가 storage 이벤트로 깨어나 IPC로 재조회할 때 stale을
 *    읽어 inconsistency가 생긴다.
 *  - IPC 미가용 환경(브라우저 전용)에서는 localStorage가 신뢰 저장소.
 *  - localStorage write가 실패해도 throw — 호출자가 사용자에게 알릴 수 있도록.
 */
export async function saveProjectFieldConfig(
  accountId: string,
  projectKey: string,
  config: ProjectFieldConfig,
): Promise<void> {
  const setRemote = (window as any).workspaceAPI?.settings?.setProjectFieldConfig as
    | ((aid: string, pk: string, c: unknown) => Promise<void>)
    | undefined;
  if (setRemote) {
    // IPC 실패는 그대로 throw — 부분 성공으로 인한 cross-window 비일관성 방지
    await setRemote(accountId, projectKey, config);
  }
  localStorage.setItem(fieldConfigKey(accountId, projectKey), JSON.stringify(config));
  window.dispatchEvent(
    new CustomEvent('lyra:project-field-config-changed', {
      detail: { accountId, projectKey },
    }),
  );
}
