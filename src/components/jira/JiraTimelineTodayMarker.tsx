import styled from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { dayToPx } from 'lib/utils/jiraTimelineRange';

interface Props {
  rangeStart: Date;
  pxPerDay: number;
  height: number;
  /** 상단에 "오늘" 플래그 라벨 표시 여부. 기본 true. */
  showFlag?: boolean;
}

const JiraTimelineTodayMarker = ({ rangeStart, pxPerDay, height, showFlag = true }: Props) => {
  const left = dayToPx(new Date(), rangeStart, pxPerDay);
  return (
    <Line $left={left} $height={height} aria-hidden>
      {showFlag && <Flag>오늘</Flag>}
    </Line>
  );
};

const Line = styled.div<{ $left: number; $height: number }>`
  position: absolute;
  top: 0;
  left: ${({ $left }) => $left}px;
  width: 2px;
  height: ${({ $height }) => $height}px;
  background: ${jiraTheme.timeline.today};
  z-index: 4;
  pointer-events: none;
`;

const Flag = styled.span`
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  padding: 2px 6px;
  background: ${jiraTheme.timeline.today};
  color: #ffffff;
  font-family: ${jiraTheme.font.brand};
  font-size: 9.5px;
  font-weight: 700;
  border-radius: 0 0 6px 6px;
  white-space: nowrap;
`;

export default JiraTimelineTodayMarker;
