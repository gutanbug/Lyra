import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { addDays, dayToPx, pxToDays, toIsoDate } from 'lib/utils/jiraTimelineRange';

type StatusKind = 'todo' | 'inProgress' | 'review' | 'done';

interface Props {
  startDate: string;
  endDate: string;
  rangeStart: Date;
  pxPerDay: number;
  statusName: string;
  statusCategory: string;
  variant: 'epic' | 'child';
  title: string;
  /** epic 변형에서만 사용 — 0~100 진행률. */
  progress?: number;
  /** click vs drag 구분된 단일 클릭 핸들러. */
  onClick?: () => void;
  /** 드래그 종료 시 호출. epic 변형에서는 비활성. */
  onDateChange?: (next: { startDate: string; endDate: string }) => void;
}

const DRAG_THRESHOLD_PX = 3;

function formatKoDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}

function classifyStatus(name: string, category: string): StatusKind {
  const c = category.toLowerCase().trim();
  const n = name.toLowerCase().trim();
  if (c === 'done' || n.includes('완료') || n.includes('done')) return 'done';
  if (n.includes('리뷰') || n.includes('review')) return 'review';
  if (c === 'indeterminate' || n.includes('진행') || n.includes('progress')) return 'inProgress';
  return 'todo';
}

function statusColor(kind: StatusKind): string {
  switch (kind) {
    case 'done': return jiraTheme.timeline.statusDone;
    case 'review': return jiraTheme.timeline.statusReview;
    case 'inProgress': return jiraTheme.timeline.statusProgress;
    case 'todo': return jiraTheme.bg.default;
  }
}

/**
 * 단일 이슈 막대.
 * variant=epic: 롤업 트랙(연한 보라) + progress% 채움 + 우측 % 라벨, 드래그 불가.
 * variant=child: 상태별 색 막대 (todo는 점선 미시작 박스), body 드래그 + 양 끝 리사이즈 핸들.
 */
const JiraTimelineBar = ({
  startDate,
  endDate,
  rangeStart,
  pxPerDay,
  statusName,
  statusCategory,
  variant,
  title,
  progress,
  onClick,
  onDateChange,
}: Props) => {
  const parsedStart = useMemo(() => {
    if (!startDate) return null;
    const d = new Date(startDate);
    return isNaN(d.getTime()) ? null : d;
  }, [startDate]);
  const parsedEnd = useMemo(() => {
    if (!endDate) return null;
    const d = new Date(endDate);
    return isNaN(d.getTime()) ? null : d;
  }, [endDate]);

  // 드래그 중 오프셋 (일 단위). mode에 따라 시작/끝 적용 범위 다름.
  const [drag, setDrag] = useState<{
    mode: 'move' | 'start' | 'end';
    deltaDays: number;
    pointerX: number;
    pointerY: number;
  } | null>(null);
  const dragRef = useRef<typeof drag>(null);
  dragRef.current = drag;

  const startDrag = useCallback(
    (mode: 'move' | 'start' | 'end') => (ev: React.MouseEvent) => {
      if (variant === 'epic' || !onDateChange || !parsedStart || !parsedEnd) return;
      ev.preventDefault();
      ev.stopPropagation();
      const originX = ev.clientX;
      let moved = false;
      const onMove = (mv: MouseEvent) => {
        const dx = mv.clientX - originX;
        if (!moved && Math.abs(dx) < DRAG_THRESHOLD_PX) return;
        moved = true;
        const deltaDays = pxToDays(dx, pxPerDay);
        setDrag({ mode, deltaDays, pointerX: mv.clientX, pointerY: mv.clientY });
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        const current = dragRef.current;
        if (current && moved && parsedStart && parsedEnd && onDateChange) {
          let nextStart = parsedStart;
          let nextEnd = parsedEnd;
          if (current.mode === 'move') {
            nextStart = addDays(parsedStart, current.deltaDays);
            nextEnd = addDays(parsedEnd, current.deltaDays);
          } else if (current.mode === 'start') {
            nextStart = addDays(parsedStart, current.deltaDays);
            if (nextStart.getTime() > parsedEnd.getTime()) nextStart = parsedEnd;
          } else {
            nextEnd = addDays(parsedEnd, current.deltaDays);
            if (nextEnd.getTime() < parsedStart.getTime()) nextEnd = parsedStart;
          }
          onDateChange({ startDate: toIsoDate(nextStart), endDate: toIsoDate(nextEnd) });
        } else if (!moved && onClick) {
          onClick();
        }
        setDrag(null);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.body.style.cursor = mode === 'move' ? 'grabbing' : 'ew-resize';
      document.body.style.userSelect = 'none';
    },
    [variant, onDateChange, onClick, parsedStart, parsedEnd, pxPerDay],
  );

  // cleanup on unmount.
  useEffect(() => () => {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  if (!parsedStart || !parsedEnd) return null;

  // 드래그 미리보기 적용된 표시용 날짜
  let displayStart = parsedStart;
  let displayEnd = parsedEnd;
  if (drag) {
    if (drag.mode === 'move') {
      displayStart = addDays(parsedStart, drag.deltaDays);
      displayEnd = addDays(parsedEnd, drag.deltaDays);
    } else if (drag.mode === 'start') {
      displayStart = addDays(parsedStart, drag.deltaDays);
      if (displayStart.getTime() > parsedEnd.getTime()) displayStart = parsedEnd;
    } else {
      displayEnd = addDays(parsedEnd, drag.deltaDays);
      if (displayEnd.getTime() < parsedStart.getTime()) displayEnd = parsedStart;
    }
  }

  const left = dayToPx(displayStart, rangeStart, pxPerDay);
  const right = dayToPx(displayEnd, rangeStart, pxPerDay) + pxPerDay;
  const width = Math.max(pxPerDay, right - left);

  if (variant === 'epic') {
    const pct = Math.max(0, Math.min(100, Math.round(progress ?? 0)));
    return (
      <EpicWrap $left={left} $width={width}>
        <EpicTrack
          role={onClick ? 'button' : undefined}
          tabIndex={onClick ? 0 : -1}
          aria-label={`${title} (${toIsoDate(parsedStart)} ~ ${toIsoDate(parsedEnd)}) ${pct}%`}
          onClick={onClick}
          onKeyDown={(ev) => {
            if (onClick && (ev.key === 'Enter' || ev.key === ' ')) {
              ev.preventDefault();
              onClick();
            }
          }}
        >
          <EpicFill $pct={pct} />
        </EpicTrack>
        <EpicPct>{pct}%</EpicPct>
      </EpicWrap>
    );
  }

  const kind = classifyStatus(statusName, statusCategory);
  const isTodo = kind === 'todo';
  const color = statusColor(kind);

  return (
    <ChildWrap $left={left} $width={width}>
      <ChildBar
        $color={color}
        $todo={isTodo}
        $dragging={!!drag}
        onMouseDown={startDrag('move')}
        role="button"
        tabIndex={0}
        title={`${title} (${toIsoDate(displayStart)} ~ ${toIsoDate(displayEnd)})`}
        aria-label={`${title} (${toIsoDate(displayStart)} ~ ${toIsoDate(displayEnd)})`}
        onKeyDown={(ev) => {
          if (onClick && (ev.key === 'Enter' || ev.key === ' ')) {
            ev.preventDefault();
            onClick();
          }
        }}
      >
        <ResizeHandle
          $side="left"
          onMouseDown={startDrag('start')}
          aria-label="시작일 조정"
        />
        <BarLabel $todo={isTodo}>{title}</BarLabel>
        <ResizeHandle
          $side="right"
          onMouseDown={startDrag('end')}
          aria-label="종료일 조정"
        />
      </ChildBar>
      {drag && (
        <DragTip $variant="dragging">
          {formatKoDate(toIsoDate(displayStart))} – {formatKoDate(toIsoDate(displayEnd))}
        </DragTip>
      )}
    </ChildWrap>
  );
};

const EpicWrap = styled.div<{ $left: number; $width: number }>`
  position: absolute;
  top: 0;
  left: ${({ $left }) => $left}px;
  width: ${({ $width }) => $width}px;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding-right: 2px;
`;

const EpicTrack = styled.div`
  flex: 1;
  height: 18px;
  background: ${jiraTheme.timeline.epicTrack};
  border: 1px solid ${jiraTheme.timeline.epicBd};
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: filter 120ms ease;
  &:hover { filter: brightness(0.98); }
`;

const EpicFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: ${jiraTheme.timeline.epic};
  opacity: 0.85;
`;

const EpicPct = styled.span`
  font-family: ${jiraTheme.font.brand};
  font-size: 10px;
  font-weight: 700;
  color: ${jiraTheme.timeline.epic};
  flex: 0 0 auto;
`;

const ChildWrap = styled.div<{ $left: number; $width: number }>`
  position: absolute;
  top: 0;
  left: ${({ $left }) => $left}px;
  width: ${({ $width }) => $width}px;
  height: 100%;
  display: flex;
  align-items: center;
`;

const barFillCss = css<{ $color: string; $todo: boolean }>`
  background: ${({ $color, $todo }) => ($todo ? jiraTheme.bg.default : $color)};
  border: ${({ $todo }) => ($todo ? `1.5px dashed ${jiraTheme.timeline.statusTodoBd}` : 'none')};
  color: ${({ $todo }) => ($todo ? jiraTheme.text.secondary : '#ffffff')};
`;

const ChildBar = styled.div<{ $color: string; $todo: boolean; $dragging: boolean }>`
  position: relative;
  flex: 1;
  height: 16px;
  padding: 0 9px;
  border-radius: 5px;
  ${barFillCss}
  display: flex;
  align-items: center;
  font-size: 11.5px;
  font-weight: 600;
  cursor: ${({ $dragging }) => ($dragging ? 'grabbing' : 'grab')};
  transition: filter 120ms ease, box-shadow 120ms ease;
  user-select: none;
  &:hover {
    filter: brightness(1.06);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
  }
`;

const BarLabel = styled.span<{ $todo: boolean }>`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${({ $todo }) => ($todo ? jiraTheme.text.secondary : '#ffffff')};
`;

const ResizeHandle = styled.div<{ $side: 'left' | 'right' }>`
  position: absolute;
  top: 0;
  ${({ $side }) => ($side === 'left' ? 'left: 0;' : 'right: 0;')}
  width: 7px;
  height: 100%;
  cursor: ew-resize;
  background: transparent;
  border-radius: ${({ $side }) => ($side === 'left' ? '5px 0 0 5px' : '0 5px 5px 0')};
  &:hover { background: rgba(255, 255, 255, 0.35); }
`;

const DragTip = styled.div<{ $variant: 'dragging' }>`
  position: absolute;
  bottom: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background: ${jiraTheme.text.primary};
  color: ${jiraTheme.bg.default};
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
`;

export default JiraTimelineBar;
