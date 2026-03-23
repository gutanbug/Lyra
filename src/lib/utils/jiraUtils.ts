import { jiraTheme } from 'lib/styles/jiraTheme';

// 공통 헬퍼는 typeHelpers에서 re-export
export { str, obj, formatDate } from 'lib/utils/typeHelpers';

export function isEpicType(typeName: string): boolean {
  return typeName.toLowerCase().includes('epic') || typeName === '에픽';
}

export function isSubTaskType(typeName: string): boolean {
  const t = typeName.toLowerCase();
  return t.includes('sub-task') || t.includes('subtask') || t === '하위 작업';
}

/**
 * 상태 뱃지 색상.
 * category에 Jira statusCategory.key('done'|'indeterminate'|'new') 또는
 * name/colorName이 들어올 수 있으므로, key 정확 매칭을 우선 적용.
 */
export function getStatusColor(name: string, category: string): string {
  const c = category.toLowerCase();
  // statusCategory.key 정확 매칭 (가장 신뢰할 수 있음)
  if (c === 'done') return jiraTheme.status.done;
  if (c === 'indeterminate') return jiraTheme.status.inProgress;
  if (c === 'new') return jiraTheme.status.todo;
  // colorName 매칭
  if (c === 'green') return jiraTheme.status.done;
  if (c === 'yellow' || c === 'blue-gray') return jiraTheme.status.inProgress;
  // name 키워드 폴백 (category + statusName)
  const s = (name + ' ' + category).toLowerCase();
  if (s.includes('done') || s.includes('완료') || s.includes('green')) return jiraTheme.status.done;
  if (s.includes('progress') || s.includes('진행') || s.includes('indeterminate')) return jiraTheme.status.inProgress;
  if (s.includes('to do') || s.includes('해야')) return jiraTheme.status.todo;
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

export function escapeJql(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function getStatusCategoryColor(category: string): string {
  const c = category.toLowerCase();
  if (c === 'done' || c === 'green') return '#36B37E';
  if (c === 'indeterminate' || c === 'yellow' || c === 'blue-gray') return '#0052CC';
  if (c === 'new') return '#42526E';
  // name 키워드 폴백
  if (c.includes('done') || c.includes('완료') || c.includes('green')) return '#36B37E';
  if (c.includes('progress') || c.includes('진행') || c.includes('indeterminate')) return '#0052CC';
  if (c.includes('to do') || c.includes('해야')) return '#42526E';
  return '#6B778C';
}

export const KEY_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/i;

/** 숫자만 입력된 경우 (예: "123") */
export const NUMBER_ONLY_PATTERN = /^\d+$/;
