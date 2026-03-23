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
