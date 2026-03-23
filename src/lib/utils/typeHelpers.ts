/**
 * 공통 타입 변환 헬퍼
 * API 응답 등 unknown 타입의 안전한 변환에 사용
 */

/** unknown → string (number도 변환) */
export function str(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return '';
}

/** unknown → Record<string, unknown> | null (배열 제외) */
export function obj(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

/** 날짜 포맷 (ko-KR) */
export function formatDate(dateStr: string, dateOnly = false): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return dateOnly ? d.toLocaleDateString('ko-KR') : d.toLocaleString('ko-KR');
  } catch {
    return dateStr;
  }
}
