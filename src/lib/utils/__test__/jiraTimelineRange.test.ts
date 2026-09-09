import { describe, it, expect } from 'vitest';
import {
  computeTimelineRange,
  dayToPx,
  PX_PER_DAY,
  enumerateMonths,
  enumerateDays,
  enumerateQuarters,
  enumerateYears,
  pxToDays,
  addDays,
  toIsoDate,
  scaleStepDays,
} from 'lib/utils/jiraTimelineRange';

const weekPx = PX_PER_DAY.week;
const monthPx = PX_PER_DAY.month;
const quarterPx = PX_PER_DAY.quarter;

describe('jiraTimelineRange', () => {
  it('빈 입력이면 오늘 기준 양쪽으로 패딩 확장', () => {
    const today = new Date('2026-06-29T00:00:00.000Z');
    const r = computeTimelineRange([], today);
    expect(r.start.getTime()).toBeLessThan(today.getTime());
    expect(r.end.getTime()).toBeGreaterThan(today.getTime());
  });

  it('범위의 시작은 그 달 1일, 끝은 그 달 말일로 정렬', () => {
    const today = new Date('2026-06-29T00:00:00.000Z');
    const r = computeTimelineRange([], today);
    expect(r.start.getUTCDate()).toBe(1);
    const lastDay = new Date(Date.UTC(r.end.getUTCFullYear(), r.end.getUTCMonth() + 1, 0)).getUTCDate();
    expect(r.end.getUTCDate()).toBe(lastDay);
  });

  it('dayToPx — 같은 날은 0, 다음 날은 1 * pxPerDay', () => {
    const start = new Date('2026-06-01T00:00:00.000Z');
    expect(dayToPx(start, start, monthPx)).toBe(0);
    const next = new Date('2026-06-02T00:00:00.000Z');
    expect(dayToPx(next, start, monthPx)).toBe(monthPx);
    expect(dayToPx(next, start, weekPx)).toBe(weekPx);
  });

  it('dayToPx — date에 시각이 있어도 정수 일 오프셋', () => {
    const start = new Date('2026-06-01T00:00:00.000Z');
    const nextAft = new Date('2026-06-02T15:45:00.000Z');
    expect(dayToPx(nextAft, start, weekPx)).toBe(weekPx);
  });

  it('pxToDays — 픽셀 → 일 정수 변환 (반올림)', () => {
    expect(pxToDays(26, 26)).toBe(1);
    expect(pxToDays(38, 26)).toBe(1);
    expect(pxToDays(39, 26)).toBe(2);
    expect(pxToDays(-26, 26)).toBe(-1);
    expect(pxToDays(0, 0)).toBe(0);
  });

  it('addDays — UTC 자정 기준 일수 가감', () => {
    const d = new Date('2026-06-01T10:00:00.000Z');
    const plus2 = addDays(d, 2);
    expect(plus2.getUTCDate()).toBe(3);
    expect(plus2.getUTCHours()).toBe(0);
  });

  it('toIsoDate — UTC 기준 YYYY-MM-DD', () => {
    const d = new Date('2026-06-09T23:30:00.000Z');
    expect(toIsoDate(d)).toBe('2026-06-09');
  });

  it('enumerateMonths — 월별 셀 + offset/width', () => {
    const months = enumerateMonths(
      new Date('2026-06-01T00:00:00.000Z'),
      new Date('2026-08-15T00:00:00.000Z'),
      monthPx,
    );
    expect(months.map((m) => `${m.year}-${m.month}`)).toEqual(['2026-6', '2026-7', '2026-8']);
    expect(months[0].daysInMonth).toBe(30);
    expect(months[0].offsetPx).toBe(0);
    expect(months[0].widthPx).toBe(30 * monthPx);
    expect(months[1].offsetPx).toBe(30 * monthPx);
  });

  it('enumerateDays — 일별 셀 + isToday/isWeekend 플래그', () => {
    const days = enumerateDays(
      new Date('2026-06-29T00:00:00.000Z'),
      new Date('2026-07-05T00:00:00.000Z'),
      weekPx,
      new Date('2026-06-30T00:00:00.000Z'),
    );
    expect(days).toHaveLength(7);
    const today = days.find((d) => d.isToday);
    expect(today?.day).toBe(30);
    const saturday = days.find((d) => d.weekday === 6);
    expect(saturday?.isWeekend).toBe(true);
  });

  it('enumerateQuarters — 시작 월을 분기 시작으로 정렬', () => {
    const qs = enumerateQuarters(
      new Date('2026-02-15T00:00:00.000Z'),
      new Date('2026-08-15T00:00:00.000Z'),
      quarterPx,
    );
    expect(qs[0]).toMatchObject({ year: 2026, quarter: 1 });
    expect(qs.map((q) => q.quarter)).toEqual([1, 2, 3]);
    // Q1 = Jan(31) + Feb(28) + Mar(31) = 90일
    expect(qs[0].widthPx).toBeCloseTo(90 * quarterPx, 3);
  });

  it('enumerateYears — 년별 셀 + 윤년/평년 구분', () => {
    const ys = enumerateYears(
      new Date('2026-06-01T00:00:00.000Z'),
      new Date('2028-03-01T00:00:00.000Z'),
      quarterPx,
    );
    expect(ys.map((y) => y.year)).toEqual([2026, 2027, 2028]);
    expect(ys[0].widthPx).toBeCloseTo(365 * quarterPx, 3);
  });

  it('scaleStepDays — 주/월/분기 → 7/30/91', () => {
    expect(scaleStepDays('week')).toBe(7);
    expect(scaleStepDays('month')).toBe(30);
    expect(scaleStepDays('quarter')).toBe(91);
  });
});
