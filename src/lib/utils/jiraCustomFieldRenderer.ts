import { formatDate } from 'lib/utils/jiraUtils';
import type { JiraProjectField } from 'types/jira';

/**
 * Jira 필드 schema와 raw 값을 사람 읽을 수 있는 단일 문자열로 변환.
 * 지원하지 않는 schema는 null 반환 → 호출자는 해당 필드를 표시 생략.
 */
export const formatFieldValue = (
  field: JiraProjectField,
  raw: unknown,
): string | null => {
  if (raw === null || raw === undefined || raw === '') return null;

  const { type, items } = field.schema;

  // 기본 스칼라
  if (type === 'string' || type === 'number') {
    return String(raw);
  }

  // 날짜류
  if (type === 'date') {
    return typeof raw === 'string' ? raw.slice(0, 10) : String(raw);
  }
  if (type === 'datetime') {
    return typeof raw === 'string' ? formatDate(raw) : String(raw);
  }

  // 단일 객체류
  if (type === 'option') {
    const o = raw as Record<string, unknown>;
    return (o.value ?? o.name ?? o.id ?? '') as string || null;
  }
  if (type === 'user') {
    const o = raw as Record<string, unknown>;
    return (o.displayName ?? o.name ?? '') as string || null;
  }
  if (type === 'priority' || type === 'status' || type === 'resolution') {
    const o = raw as Record<string, unknown>;
    return (o.name ?? '') as string || null;
  }
  if (type === 'project') {
    const o = raw as Record<string, unknown>;
    return (o.name ?? o.key ?? '') as string || null;
  }
  if (type === 'issuetype') {
    const o = raw as Record<string, unknown>;
    return (o.name ?? '') as string || null;
  }

  // 배열류
  if (type === 'array' && Array.isArray(raw)) {
    if (raw.length === 0) return null;
    if (items === 'string') return raw.map(String).join(', ');
    if (items === 'option') {
      return raw
        .map((v) => {
          const o = v as Record<string, unknown>;
          return (o.value ?? o.name ?? o.id ?? '') as string;
        })
        .filter(Boolean)
        .join(', ');
    }
    if (items === 'version' || items === 'component') {
      return raw
        .map((v) => {
          const o = v as Record<string, unknown>;
          return (o.name ?? o.id ?? '') as string;
        })
        .filter(Boolean)
        .join(', ');
    }
    if (items === 'user' || items === 'group') {
      return raw
        .map((v) => {
          const o = v as Record<string, unknown>;
          return (o.displayName ?? o.name ?? '') as string;
        })
        .filter(Boolean)
        .join(', ');
    }
    if (items === 'issuelinks' || items === 'attachment' || items === 'worklog') {
      // 별도 섹션·UI에서 다루므로 MetaItem으로는 표시하지 않음
      return null;
    }
    // 알 수 없는 array items: 길이만 표시
    return `${raw.length} 항목`;
  }

  // 알 수 없는 타입
  return null;
};
