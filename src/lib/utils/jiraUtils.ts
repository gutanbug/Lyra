import { jiraTheme } from 'lib/styles/jiraTheme';

export function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

export function obj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

export function isEpicType(typeName: string): boolean {
  return typeName.toLowerCase().includes('epic') || typeName === '에픽';
}

export function isSubTaskType(typeName: string): boolean {
  const t = typeName.toLowerCase();
  return t.includes('sub-task') || t.includes('subtask') || t === '하위 작업';
}

export function getStatusColor(name: string, category: string): string {
  const s = (name + ' ' + category).toLowerCase();
  if (s.includes('done') || s.includes('완료')) return jiraTheme.status.done;
  if (s.includes('progress') || s.includes('진행')) return jiraTheme.status.inProgress;
  return jiraTheme.status.default;
}

export function getPriorityColor(priority: string): string {
  if (!priority) return jiraTheme.priority.default;
  const p = priority.toLowerCase();
  if (p.includes('highest') || p.includes('critical') || p.includes('긴급')) return jiraTheme.priority.highest;
  if (p.includes('high') || p.includes('높음')) return jiraTheme.priority.high;
  if (p.includes('medium') || p.includes('보통')) return jiraTheme.priority.medium;
  if (p.includes('low') || p.includes('낮음')) return jiraTheme.priority.low;
  return jiraTheme.priority.default;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString('ko-KR');
  } catch {
    return dateStr;
  }
}

export function escapeJql(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export const KEY_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/i;
