import styled, { css } from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';
import type {
  MonthCell,
  DayCell,
  QuarterCell,
  YearCell,
  TimelineScale,
} from 'lib/utils/jiraTimelineRange';

interface Props {
  scale: TimelineScale;
  totalWidth: number;
  months?: MonthCell[];
  days?: DayCell[];
  quarters?: QuarterCell[];
  years?: YearCell[];
}

const MONTH_LABEL_KO = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const WEEKDAY_LABEL_KO = ['일', '월', '화', '수', '목', '금', '토'];
const TOP_ROW_H = 26;
const BOTTOM_ROW_H_WEEK = 34;
const BOTTOM_ROW_H_OTHER = 30;

/**
 * 스케일별 2-tier 헤더.
 *  week  : top=월, bottom=일
 *  month : top=분기, bottom=월
 *  quarter: top=년, bottom=분기
 */
const JiraTimelineHeader = ({ scale, totalWidth, months, days, quarters, years }: Props) => {
  const bottomH = scale === 'week' ? BOTTOM_ROW_H_WEEK : BOTTOM_ROW_H_OTHER;
  const totalH = TOP_ROW_H + bottomH;

  return (
    <Container $width={totalWidth} $height={totalH}>
      {/* TOP TIER */}
      <TopRow $width={totalWidth} $height={TOP_ROW_H}>
        {scale === 'week' && months?.map((m) => (
          <TopCell key={`m-${m.year}-${m.month}`} $offset={m.offsetPx} $width={m.widthPx}>
            {m.year}년 {MONTH_LABEL_KO[m.month - 1]}
          </TopCell>
        ))}
        {scale === 'month' && quarters?.map((q) => (
          <TopCell key={`q-${q.year}-${q.quarter}`} $offset={q.offsetPx} $width={q.widthPx}>
            {q.year} {q.quarter}분기
          </TopCell>
        ))}
        {scale === 'quarter' && years?.map((y) => (
          <TopCell key={`y-${y.year}`} $offset={y.offsetPx} $width={y.widthPx}>
            {y.year}
          </TopCell>
        ))}
      </TopRow>

      {/* BOTTOM TIER */}
      <BottomRow $width={totalWidth} $height={bottomH}>
        {scale === 'week' && days?.map((d) => (
          <DayCellBox
            key={`d-${d.year}-${d.month}-${d.day}`}
            $offset={d.offsetPx}
            $width={d.widthPx}
            $weekend={d.isWeekend}
            $today={d.isToday}
          >
            <DayNum $today={d.isToday} $weekend={d.isWeekend}>{d.day}</DayNum>
            <DayWeek $weekend={d.isWeekend} $today={d.isToday}>{WEEKDAY_LABEL_KO[d.weekday]}</DayWeek>
          </DayCellBox>
        ))}
        {scale === 'month' && months?.map((m) => (
          <BottomCell key={`bm-${m.year}-${m.month}`} $offset={m.offsetPx} $width={m.widthPx}>
            {MONTH_LABEL_KO[m.month - 1]}
          </BottomCell>
        ))}
        {scale === 'quarter' && quarters?.map((q) => (
          <BottomCell key={`bq-${q.year}-${q.quarter}`} $offset={q.offsetPx} $width={q.widthPx}>
            {q.quarter}분기
          </BottomCell>
        ))}
      </BottomRow>
    </Container>
  );
};

const Container = styled.div<{ $width: number; $height: number }>`
  position: sticky;
  top: 0;
  height: ${({ $height }) => $height}px;
  width: ${({ $width }) => $width}px;
  background: ${jiraTheme.bg.default};
  border-bottom: 1px solid ${jiraTheme.border};
  z-index: 2;
`;

const TopRow = styled.div<{ $width: number; $height: number }>`
  position: relative;
  height: ${({ $height }) => $height}px;
  width: ${({ $width }) => $width}px;
  border-bottom: 1px solid ${jiraTheme.borderStrong};
`;

const BottomRow = styled.div<{ $width: number; $height: number }>`
  position: relative;
  height: ${({ $height }) => $height}px;
  width: ${({ $width }) => $width}px;
`;

const cellBase = css<{ $offset: number; $width: number }>`
  position: absolute;
  left: ${({ $offset }) => $offset}px;
  width: ${({ $width }) => $width}px;
  height: 100%;
  display: flex;
  align-items: center;
`;

const TopCell = styled.div<{ $offset: number; $width: number }>`
  ${cellBase}
  padding-left: 10px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
  border-left: 1px solid ${jiraTheme.borderStrong};
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
`;

const BottomCell = styled.div<{ $offset: number; $width: number }>`
  ${cellBase}
  justify-content: center;
  font-size: 11.5px;
  font-weight: 500;
  color: ${jiraTheme.text.secondary};
  border-left: 1px solid ${jiraTheme.hairline};
`;

const DayCellBox = styled.div<{ $offset: number; $width: number; $weekend: boolean; $today: boolean }>`
  ${cellBase}
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-left: 1px solid ${jiraTheme.hairline};
  background: ${({ $today, $weekend }) =>
    $today ? jiraTheme.primaryLight : $weekend ? jiraTheme.timeline.weekend : 'transparent'};
`;

const DayNum = styled.span<{ $today: boolean; $weekend: boolean }>`
  color: ${({ $today, $weekend }) =>
    $today ? jiraTheme.primary : $weekend ? jiraTheme.timeline.today : jiraTheme.text.primary};
  font-weight: ${({ $today }) => ($today ? 700 : 500)};
  font-size: 11.5px;
  line-height: 1.15;
`;

const DayWeek = styled.span<{ $weekend: boolean; $today: boolean }>`
  color: ${({ $today, $weekend }) =>
    $today ? jiraTheme.primary : $weekend ? jiraTheme.timeline.today : jiraTheme.text.muted};
  font-size: 10px;
  line-height: 1.1;
`;

export default JiraTimelineHeader;
