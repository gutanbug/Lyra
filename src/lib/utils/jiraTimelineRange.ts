/**
 * 타임라인 뷰의 가시 시간 범위 + 픽셀 변환 유틸.
 * 순수 함수 — 테스트 용이.
 *
 * pxPerDay는 zoom 레벨에 따라 가변. 모든 변환 함수에 명시적으로 전달.
 */

export type TimelineScale = 'week' | 'month' | 'quarter';

/** zoom 레벨별 일당 픽셀 폭. design_handoff_jira_timeline/README 기준. */
export const PX_PER_DAY: Record<TimelineScale, number> = {
  week: 26,
  month: 8,
  quarter: 3.4,
};

const DAY_MS = 86_400_000;

export interface TimelineRange { start: Date; end: Date; }

export interface DateInput {
  startDate?: string;
  endDate?: string;
}

export interface MonthCell {
  year: number;
  /** 1-12 */
  month: number;
  daysInMonth: number;
  widthPx: number;
  offsetPx: number;
}

export interface DayCell {
  year: number;
  month: number;
  day: number;
  /** 0=일, 1=월, ..., 6=토 */
  weekday: number;
  isToday: boolean;
  isWeekend: boolean;
  widthPx: number;
  offsetPx: number;
}

export interface QuarterCell {
  year: number;
  /** 1-4 */
  quarter: 1 | 2 | 3 | 4;
  widthPx: number;
  offsetPx: number;
}

export interface YearCell {
  year: number;
  widthPx: number;
  offsetPx: number;
}

function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Date를 그 날의 UTC 자정 ms로 정규화. TZ/시간대 영향 제거. */
function toUtcMidnightMs(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** 가시 범위 계산 — 입력 날짜의 min/max + today를 포함하여 양 끝에 14일 패딩.
 *  반환 start/end는 항상 UTC 자정 정렬되며, start는 그 달 1일, end는 그 달 말일로 확장. */
export function computeTimelineRange(items: DateInput[], today: Date = new Date()): TimelineRange {
  const dates: number[] = [toUtcMidnightMs(today)];
  for (const it of items) {
    const s = parseDate(it.startDate);
    const e = parseDate(it.endDate);
    if (s) dates.push(toUtcMidnightMs(s));
    if (e) dates.push(toUtcMidnightMs(e));
  }
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  const paddedMin = new Date(min - 14 * DAY_MS);
  const paddedMax = new Date(max + 14 * DAY_MS);
  // 시작은 그 달 1일, 끝은 그 달 말일.
  const start = new Date(Date.UTC(paddedMin.getUTCFullYear(), paddedMin.getUTCMonth(), 1));
  const end = new Date(Date.UTC(paddedMax.getUTCFullYear(), paddedMax.getUTCMonth() + 1, 0));
  return { start, end };
}

/** 날짜를 픽셀로 변환 (rangeStart 기준 일 단위).
 *  두 Date의 시간/타임존을 무시하고 UTC 자정으로 정규화 후 정수 일 오프셋. */
export function dayToPx(date: Date, rangeStart: Date, pxPerDay: number): number {
  const days = Math.round((toUtcMidnightMs(date) - toUtcMidnightMs(rangeStart)) / DAY_MS);
  return days * pxPerDay;
}

/** 픽셀 오프셋을 일수로 역변환 (드래그 스냅용). */
export function pxToDays(px: number, pxPerDay: number): number {
  if (pxPerDay <= 0) return 0;
  return Math.round(px / pxPerDay);
}

/** Date에 일수를 더한 새 Date (UTC). */
export function addDays(date: Date, days: number): Date {
  return new Date(toUtcMidnightMs(date) + days * DAY_MS);
}

/** Date를 YYYY-MM-DD로 직렬화 (UTC 기준). */
export function toIsoDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 범위 내 월 셀 enumerate — UTC 기준. */
export function enumerateMonths(start: Date, end: Date, pxPerDay: number): MonthCell[] {
  const out: MonthCell[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor.getTime() <= end.getTime()) {
    const year = cursor.getUTCFullYear();
    const monthIdx = cursor.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
    const monthStart = new Date(Date.UTC(year, monthIdx, 1));
    out.push({
      year,
      month: monthIdx + 1,
      daysInMonth,
      widthPx: daysInMonth * pxPerDay,
      offsetPx: dayToPx(monthStart, start, pxPerDay),
    });
    cursor.setUTCMonth(monthIdx + 1);
  }
  return out;
}

/** 범위 내 일 셀 enumerate — UTC 기준. */
export function enumerateDays(start: Date, end: Date, pxPerDay: number, today: Date = new Date()): DayCell[] {
  const out: DayCell[] = [];
  const todayKey = `${today.getUTCFullYear()}-${today.getUTCMonth()}-${today.getUTCDate()}`;
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  while (cursor.getTime() <= end.getTime()) {
    const year = cursor.getUTCFullYear();
    const monthIdx = cursor.getUTCMonth();
    const day = cursor.getUTCDate();
    const weekday = cursor.getUTCDay();
    const cellKey = `${year}-${monthIdx}-${day}`;
    out.push({
      year,
      month: monthIdx + 1,
      day,
      weekday,
      isToday: cellKey === todayKey,
      isWeekend: weekday === 0 || weekday === 6,
      widthPx: pxPerDay,
      offsetPx: dayToPx(cursor, start, pxPerDay),
    });
    cursor.setUTCDate(day + 1);
  }
  return out;
}

/** 범위 내 분기 셀 enumerate — UTC 기준. 각 분기는 3개월 길이로 계산. */
export function enumerateQuarters(start: Date, end: Date, pxPerDay: number): QuarterCell[] {
  const out: QuarterCell[] = [];
  // start의 월을 분기 시작 월(1/4/7/10)로 정렬.
  const startMonth = Math.floor(start.getUTCMonth() / 3) * 3;
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), startMonth, 1));
  while (cursor.getTime() <= end.getTime()) {
    const year = cursor.getUTCFullYear();
    const monthIdx = cursor.getUTCMonth();
    const quarter = (Math.floor(monthIdx / 3) + 1) as 1 | 2 | 3 | 4;
    const nextStart = new Date(Date.UTC(year, monthIdx + 3, 1));
    const daysInQuarter = Math.round((nextStart.getTime() - cursor.getTime()) / DAY_MS);
    out.push({
      year,
      quarter,
      widthPx: daysInQuarter * pxPerDay,
      offsetPx: dayToPx(cursor, start, pxPerDay),
    });
    cursor.setUTCMonth(monthIdx + 3);
  }
  return out;
}

/** 범위 내 년 셀 enumerate — UTC 기준. */
export function enumerateYears(start: Date, end: Date, pxPerDay: number): YearCell[] {
  const out: YearCell[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), 0, 1));
  while (cursor.getTime() <= end.getTime()) {
    const year = cursor.getUTCFullYear();
    const nextStart = new Date(Date.UTC(year + 1, 0, 1));
    const daysInYear = Math.round((nextStart.getTime() - cursor.getTime()) / DAY_MS);
    out.push({
      year,
      widthPx: daysInYear * pxPerDay,
      offsetPx: dayToPx(cursor, start, pxPerDay),
    });
    cursor.setUTCFullYear(year + 1);
  }
  return out;
}

/** 스케일별 한 칸(다음/이전 네비게이션) 일수. */
export function scaleStepDays(scale: TimelineScale): number {
  switch (scale) {
    case 'week': return 7;
    case 'month': return 30;
    case 'quarter': return 91;
  }
}
