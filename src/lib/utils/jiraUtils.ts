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
 * category에 Jira statusCategory.key('done'|'indeterminate'|'new'),
 * name(영/한), colorName이 들어올 수 있으므로 카테고리 신호를 우선 신뢰한다.
 * 이름 키워드 폴백은 카테고리에서 신호가 없을 때만 사용 (예: "수정완료"가
 * 카테고리=진행 중인데 이름의 "완료" 때문에 done으로 오분류되는 문제 방지).
 */
export function getStatusColor(name: string, category: string): string {
  const c = category.toLowerCase().trim();
  // 1) statusCategory.key 정확 매칭
  if (c === 'done') return jiraTheme.status.done;
  if (c === 'indeterminate') return jiraTheme.status.inProgress;
  if (c === 'new') return jiraTheme.status.todo;
  // 2) colorName 매칭
  if (c === 'green') return jiraTheme.status.done;
  if (c === 'yellow' || c === 'blue-gray') return jiraTheme.status.inProgress;
  // 3) 카테고리 키워드 매칭 (한국어 name 포함: "진행 중", "완료", "할 일")
  if (c.includes('progress') || c.includes('진행') || c.includes('indeterminate')) return jiraTheme.status.inProgress;
  if (c.includes('done') || c.includes('완료')) return jiraTheme.status.done;
  if (c.includes('to do') || c.includes('todo') || c.includes('해야') || c.includes('할 일')) return jiraTheme.status.todo;
  // 4) 카테고리에 신호가 없을 때만 이름 키워드 폴백
  const n = name.toLowerCase();
  if (n.includes('progress') || n.includes('진행')) return jiraTheme.status.inProgress;
  if (n.includes('done') || n.includes('완료')) return jiraTheme.status.done;
  if (n.includes('to do') || n.includes('해야') || n.includes('할 일')) return jiraTheme.status.todo;
  return jiraTheme.status.default;
}

/**
 * 상태가 "완료(done)" 카테고리인지 판별.
 * getStatusColor와 동일한 우선순위 규칙을 따른다 — 카테고리 신호를 우선 신뢰하고,
 * 진행 중을 완료보다 먼저 검사해 "수정완료"처럼 이름에 완료가 포함된 진행 상태의
 * 오분류를 방지한다.
 */
export function isDoneStatus(statusName: string, statusCategory: string): boolean {
  const c = statusCategory.toLowerCase().trim();
  // 1) statusCategory.key / colorName 정확 매칭
  if (c === 'done' || c === 'green') return true;
  if (c === 'indeterminate' || c === 'new' || c === 'yellow' || c === 'blue-gray') return false;
  // 2) 카테고리 키워드 매칭 (진행을 완료보다 먼저 검사)
  if (c.includes('progress') || c.includes('진행') || c.includes('indeterminate')) return false;
  if (c.includes('done') || c.includes('완료')) return true;
  if (c.includes('to do') || c.includes('todo') || c.includes('해야') || c.includes('할 일')) return false;
  // 3) 카테고리에 신호가 없을 때만 이름 키워드 폴백
  const n = statusName.toLowerCase();
  if (n.includes('progress') || n.includes('진행')) return false;
  if (n.includes('done') || n.includes('완료')) return true;
  return false;
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
  const c = category.toLowerCase().trim();
  // 새 디자인 시스템 — palette.ts 정합 (teal4/blue4/gray6/gray5)
  if (c === 'done' || c === 'green') return '#12b886';
  if (c === 'indeterminate' || c === 'yellow' || c === 'blue-gray') return '#007bff';
  if (c === 'new') return '#5d5957';
  // 키워드 폴백 (진행을 완료보다 먼저 검사 — "수정완료" 등 오분류 방지)
  if (c.includes('progress') || c.includes('진행') || c.includes('indeterminate')) return '#007bff';
  if (c.includes('done') || c.includes('완료')) return '#12b886';
  if (c.includes('to do') || c.includes('todo') || c.includes('해야') || c.includes('할 일')) return '#5d5957';
  return '#8c8582';
}

export const KEY_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/i;

/** 숫자만 입력된 경우 (예: "123") */
export const NUMBER_ONLY_PATTERN = /^\d+$/;
