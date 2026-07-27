import {
  useMemo,
  useRef,
  useEffect,
  useState,
  useCallback,
  useLayoutEffect,
} from 'react';
import styled from 'styled-components';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { jiraTheme } from 'lib/styles/jiraTheme';
import {
  computeTimelineRange,
  enumerateMonths,
  enumerateDays,
  enumerateQuarters,
  enumerateYears,
  dayToPx,
  scaleStepDays,
  PX_PER_DAY,
  type TimelineScale,
} from 'lib/utils/jiraTimelineRange';
import JiraTimelineHeader from './JiraTimelineHeader';
import JiraTimelineBar from './JiraTimelineBar';
import JiraTimelineTodayMarker from './JiraTimelineTodayMarker';
import JiraTaskIcon, { resolveTaskType } from './JiraTaskIcon';
import type { EpicGroup, NormalizedIssue } from 'types/jira';

export interface TimelineDependency { from: string; to: string; }

interface Props {
  epicGroups: EpicGroup[];
  expandedEpics: Set<string>;
  defaultChildrenMap: Record<string, NormalizedIssue[]>;
  onToggleEpic: (key: string) => void;
  onGoToIssue: (key: string) => void;
  isLoading: boolean;
  /** 트리 헤더 좌측에 삽입되는 슬롯 (예: 뷰 모드 토글). */
  headerActionSlot?: React.ReactNode;
  /** 패널 상단 툴바 우측에 들어가는 컨트롤 (스케일/오늘/의존성). */
  toolbarSlot?: React.ReactNode;
  /** 시간축 스케일. */
  scale?: TimelineScale;
  /** 의존성 화살표 표시 여부. */
  showDependencies?: boolean;
  /** 의존성 데이터 (선행 → 후행). */
  dependencies?: TimelineDependency[];
  /** 막대 드래그 시 호출. 미지정 시 드래그 비활성. */
  onIssueDateChange?: (issueKey: string, next: { startDate: string; endDate: string }) => void;
  /** 외부 "오늘로 이동" 트리거. 값이 바뀔 때마다 스크롤. */
  todayJumpToken?: number;
}

const ROW_H = 36;
const DEFAULT_TREE_W = 300;
const MIN_TREE_W = 240;
const MAX_TREE_W = 600;
const SPLITTER_W = 6;
const HEADER_TOTAL_H: Record<TimelineScale, number> = {
  week: 26 + 34,
  month: 26 + 30,
  quarter: 26 + 30,
};

type Row =
  | { type: 'epic'; data: EpicGroup; epicKey: string }
  | { type: 'child'; data: NormalizedIssue; epicKey: string };

type StatusBucket = 'done' | 'review' | 'inProgress' | 'todo';

function classifyStatus(name: string, category: string): StatusBucket {
  const c = (category || '').toLowerCase().trim();
  const n = (name || '').toLowerCase().trim();
  if (c === 'done' || n.includes('완료') || n.includes('done')) return 'done';
  if (n.includes('리뷰') || n.includes('review')) return 'review';
  if (c === 'indeterminate' || n.includes('진행') || n.includes('progress')) return 'inProgress';
  return 'todo';
}

const STATUS_WEIGHT: Record<StatusBucket, number> = {
  done: 1,
  review: 0.85,
  inProgress: 0.5,
  todo: 0,
};

function computeEpicProgress(children: NormalizedIssue[]): number {
  if (children.length === 0) return 0;
  const total = children.reduce(
    (acc, c) => acc + STATUS_WEIGHT[classifyStatus(c.statusName, c.statusCategory)],
    0,
  );
  return Math.round((total / children.length) * 100);
}

function computeEpicDates(
  epic: EpicGroup,
  children: NormalizedIssue[],
  overrides: Map<string, { startDate: string; endDate: string }>,
): { startDate: string; endDate: string } {
  const starts: number[] = [];
  const ends: number[] = [];
  const consider = (s?: string, e?: string) => {
    if (s) {
      const sd = new Date(s).getTime();
      if (!isNaN(sd)) starts.push(sd);
    }
    if (e) {
      const ed = new Date(e).getTime();
      if (!isNaN(ed)) ends.push(ed);
    }
  };
  const epicOv = overrides.get(epic.key);
  consider(epicOv?.startDate ?? epic.startDate, epicOv?.endDate ?? epic.duedate);
  for (const c of children) {
    const ov = overrides.get(c.key);
    consider(ov?.startDate ?? c.startDate, ov?.endDate ?? c.duedate);
  }
  return {
    startDate: starts.length ? new Date(Math.min(...starts)).toISOString() : '',
    endDate: ends.length ? new Date(Math.max(...ends)).toISOString() : '',
  };
}

const JiraIssueTimeline = ({
  epicGroups,
  expandedEpics,
  defaultChildrenMap,
  onToggleEpic,
  onGoToIssue,
  isLoading,
  headerActionSlot,
  toolbarSlot,
  scale = 'month',
  showDependencies = false,
  dependencies = [],
  onIssueDateChange,
  todayJumpToken,
}: Props) => {
  const pxPerDay = PX_PER_DAY[scale];

  // 낙관적 드래그 오버라이드 (로컬 상태 — 부모에서 onIssueDateChange로 영구화).
  const [dateOverrides, setDateOverrides] = useState<Map<string, { startDate: string; endDate: string }>>(
    () => new Map(),
  );
  const handleDateChange = useCallback(
    (issueKey: string, next: { startDate: string; endDate: string }) => {
      setDateOverrides((prev) => {
        const m = new Map(prev);
        m.set(issueKey, next);
        return m;
      });
      onIssueDateChange?.(issueKey, next);
    },
    [onIssueDateChange],
  );

  // 가시 행 + 범위 + 헤더 셀 계산
  const { rows, range, months, days, quarters, years, totalWidth, rowMeta } = useMemo(() => {
    const rs: Row[] = [];
    const dateInputs: { startDate?: string; endDate?: string }[] = [];
    const meta: Record<string, { startDate: string; endDate: string; progress?: number }> = {};

    for (const g of epicGroups) {
      const kids = defaultChildrenMap[g.key] ?? g.children ?? [];
      const epicDates = computeEpicDates(g, kids, dateOverrides);
      meta[g.key] = { ...epicDates, progress: computeEpicProgress(kids) };

      rs.push({ type: 'epic', data: g, epicKey: g.key });
      dateInputs.push(epicDates);

      if (expandedEpics.has(g.key)) {
        for (const c of kids) {
          const ov = dateOverrides.get(c.key);
          const sd = ov?.startDate ?? c.startDate;
          const ed = ov?.endDate ?? c.duedate;
          meta[c.key] = { startDate: sd, endDate: ed };
          rs.push({ type: 'child', data: c, epicKey: g.key });
          dateInputs.push({ startDate: sd, endDate: ed });
        }
      }
    }
    const rng = computeTimelineRange(dateInputs);
    const ms = enumerateMonths(rng.start, rng.end, pxPerDay);
    const ds = scale === 'week' ? enumerateDays(rng.start, rng.end, pxPerDay) : undefined;
    const qs = scale !== 'week' ? enumerateQuarters(rng.start, rng.end, pxPerDay) : undefined;
    const ys = scale === 'quarter' ? enumerateYears(rng.start, rng.end, pxPerDay) : undefined;
    const total = ms.reduce((acc, m) => acc + m.widthPx, 0);
    return { rows: rs, range: rng, months: ms, days: ds, quarters: qs, years: ys, totalWidth: total, rowMeta: meta };
  }, [epicGroups, expandedEpics, defaultChildrenMap, dateOverrides, pxPerDay, scale]);

  // 차트 스크롤 컨테이너 + 트리 본문 (세로 스크롤 동기화용)
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const treeBodyRef = useRef<HTMLDivElement>(null);
  const syncGuardRef = useRef(false);

  const scrollToToday = useCallback(() => {
    if (!chartScrollRef.current) return;
    const left = dayToPx(new Date(), range.start, pxPerDay);
    chartScrollRef.current.scrollLeft = Math.max(0, left - 280);
  }, [range.start, pxPerDay]);

  // 마운트 + 스케일 변경 + 외부 todayJumpToken 변경 시 오늘로 정렬
  useLayoutEffect(() => {
    // 다음 프레임에 한 번 더 — 레이아웃 반영 후
    scrollToToday();
    const id = window.requestAnimationFrame(scrollToToday);
    return () => window.cancelAnimationFrame(id);
  }, [scrollToToday, scale, todayJumpToken]);

  const onChartScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (syncGuardRef.current) {
      syncGuardRef.current = false;
      return;
    }
    if (treeBodyRef.current) {
      syncGuardRef.current = true;
      treeBodyRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  }, []);
  const onTreeScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (syncGuardRef.current) {
      syncGuardRef.current = false;
      return;
    }
    if (chartScrollRef.current) {
      syncGuardRef.current = true;
      chartScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  }, []);

  // 범위 내비
  const jumpBy = useCallback((direction: -1 | 1) => {
    if (!chartScrollRef.current) return;
    chartScrollRef.current.scrollLeft += direction * scaleStepDays(scale) * pxPerDay;
  }, [scale, pxPerDay]);

  // 트리 폭 조절
  const [treeWidth, setTreeWidth] = useState<number>(DEFAULT_TREE_W);
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);
  const onSplitterMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startW: treeWidth };
      const onMove = (ev: MouseEvent) => {
        const ctx = dragRef.current;
        if (!ctx) return;
        const next = ctx.startW + (ev.clientX - ctx.startX);
        setTreeWidth(Math.max(MIN_TREE_W, Math.min(MAX_TREE_W, next)));
      };
      const onUp = () => {
        dragRef.current = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [treeWidth],
  );

  useEffect(() => () => {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // 의존성 라인 좌표 계산
  const depPaths = useMemo(() => {
    if (!showDependencies || dependencies.length === 0) return [];
    const indexByKey = new Map<string, number>();
    rows.forEach((r, i) => {
      const key = (r.data as { key: string }).key;
      if (!indexByKey.has(key)) indexByKey.set(key, i);
    });
    const out: { id: string; d: string }[] = [];
    for (const dep of dependencies) {
      const fi = indexByKey.get(dep.from);
      const ti = indexByKey.get(dep.to);
      if (fi === undefined || ti === undefined) continue;
      const fMeta = rowMeta[dep.from];
      const tMeta = rowMeta[dep.to];
      if (!fMeta?.endDate || !tMeta?.startDate) continue;
      const fEnd = new Date(fMeta.endDate);
      const tStart = new Date(tMeta.startDate);
      if (isNaN(fEnd.getTime()) || isNaN(tStart.getTime())) continue;
      const x1 = dayToPx(fEnd, range.start, pxPerDay) + pxPerDay;
      const x2 = dayToPx(tStart, range.start, pxPerDay);
      const y1 = fi * ROW_H + ROW_H / 2;
      const y2 = ti * ROW_H + ROW_H / 2;
      const gap = Math.max(16, Math.abs(x2 - x1) / 2);
      out.push({
        id: `${dep.from}->${dep.to}`,
        d: `M ${x1} ${y1} C ${x1 + gap} ${y1} ${x2 - gap} ${y2} ${x2} ${y2}`,
      });
    }
    return out;
  }, [showDependencies, dependencies, rows, rowMeta, range.start, pxPerDay]);

  const emptyMessage = isLoading && epicGroups.length === 0
    ? '로딩 중…'
    : !isLoading && epicGroups.length === 0
      ? '표시할 이슈가 없습니다.'
      : null;
  const bodyHeight = rows.length * ROW_H;

  if (emptyMessage) {
    return (
      <EmptyLayout>
        <Toolbar>
          {headerActionSlot}
          <ToolbarRight>{toolbarSlot}</ToolbarRight>
        </Toolbar>
        <Empty>{emptyMessage}</Empty>
      </EmptyLayout>
    );
  }

  return (
    <Panel>
      <Toolbar>
        {headerActionSlot}
        <ToolbarRight>
          {toolbarSlot}
          <RangeNav role="group" aria-label="시간 범위 이동">
            <RangeBtn type="button" aria-label="이전" onClick={() => jumpBy(-1)}>
              <ChevronLeft size={14} />
            </RangeBtn>
            <RangeBtn type="button" onClick={scrollToToday}>오늘</RangeBtn>
            <RangeBtn type="button" aria-label="다음" onClick={() => jumpBy(1)}>
              <ChevronRight size={14} />
            </RangeBtn>
          </RangeNav>
        </ToolbarRight>
      </Toolbar>

      <Layout $treeWidth={treeWidth}>
        <TreeCol>
          <TreeHeader $h={HEADER_TOTAL_H[scale]}>
            <TreeHeaderLabel>업무</TreeHeaderLabel>
          </TreeHeader>
          <TreeBody ref={treeBodyRef} onScroll={onTreeScroll}>
            {rows.map((r, i) => {
              const key = (r.data as { key: string }).key;
              if (r.type === 'epic') {
                const g = r.data as EpicGroup;
                const progress = rowMeta[key]?.progress ?? 0;
                return (
                  <TreeRow key={`tree-epic-${key}-${i}`} $h={ROW_H}>
                    <EpicLabel onClick={() => onToggleEpic(r.epicKey)}>
                      <Chevron>
                        {expandedEpics.has(r.epicKey) ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </Chevron>
                      <JiraTaskIcon type={resolveTaskType(g.issueTypeName)} size={16} />
                      <KeyText>{key}</KeyText>
                      <SummaryText $epic>{g.summary}</SummaryText>
                      <EpicPct>{progress}%</EpicPct>
                    </EpicLabel>
                  </TreeRow>
                );
              }
              const c = r.data as NormalizedIssue;
              return (
                <TreeRow key={`tree-child-${key}-${i}`} $h={ROW_H}>
                  <ChildLabel onClick={() => onGoToIssue(key)}>
                    <Indent />
                    <JiraTaskIcon type={resolveTaskType(c.issueTypeName)} size={16} />
                    <KeyText>{key}</KeyText>
                    <SummaryText>{c.summary}</SummaryText>
                  </ChildLabel>
                </TreeRow>
              );
            })}
          </TreeBody>
        </TreeCol>

        <Splitter
          role="separator"
          aria-orientation="vertical"
          aria-label="트리 폭 조절"
          onMouseDown={onSplitterMouseDown}
        >
          <SplitterHandle />
        </Splitter>

        <ChartCol ref={chartScrollRef} onScroll={onChartScroll}>
          <ChartInner $width={totalWidth}>
            <JiraTimelineHeader
              scale={scale}
              totalWidth={totalWidth}
              months={months}
              days={days}
              quarters={quarters}
              years={years}
            />
            <ChartBody $width={totalWidth} $height={bodyHeight}>
              {rows.map((r, i) => {
                const key = (r.data as { key: string }).key;
                const meta = rowMeta[key];
                if (!meta) return null;
                const isEpic = r.type === 'epic';
                return (
                  <RowBg key={`bg-${key}-${i}`} $top={i * ROW_H} $h={ROW_H} $width={totalWidth}>
                    <JiraTimelineBar
                      startDate={meta.startDate}
                      endDate={meta.endDate}
                      rangeStart={range.start}
                      pxPerDay={pxPerDay}
                      statusName={(r.data as { statusName: string }).statusName}
                      statusCategory={(r.data as { statusCategory: string }).statusCategory}
                      variant={isEpic ? 'epic' : 'child'}
                      title={(r.data as { summary: string }).summary}
                      progress={isEpic ? meta.progress : undefined}
                      onClick={() => onGoToIssue(key)}
                      onDateChange={!isEpic ? (next) => handleDateChange(key, next) : undefined}
                    />
                  </RowBg>
                );
              })}
              {depPaths.length > 0 && (
                <DepSvg width={totalWidth} height={bodyHeight}>
                  <defs>
                    <marker
                      id="lyra-tl-dep-arrow"
                      viewBox="0 0 8 8"
                      refX="7"
                      refY="4"
                      markerWidth="7"
                      markerHeight="7"
                      orient="auto-start-reverse"
                    >
                      <path d="M0,0 L8,4 L0,8 z" fill={jiraTheme.timeline.dep} />
                    </marker>
                  </defs>
                  {depPaths.map((p) => (
                    <path
                      key={p.id}
                      d={p.d}
                      fill="none"
                      stroke={jiraTheme.timeline.dep}
                      strokeWidth={1.6}
                      markerEnd="url(#lyra-tl-dep-arrow)"
                    />
                  ))}
                </DepSvg>
              )}
              <JiraTimelineTodayMarker
                rangeStart={range.start}
                pxPerDay={pxPerDay}
                height={bodyHeight}
              />
            </ChartBody>
          </ChartInner>
        </ChartCol>
      </Layout>
    </Panel>
  );
};

// ── Styled ──

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${jiraTheme.border};
  border-radius: 14px;
  overflow: hidden;
  background: ${jiraTheme.bg.default};
  box-shadow: 0 1px 2px rgba(28, 27, 26, 0.05), 0 10px 30px rgba(28, 27, 26, 0.06);
  flex: 1;
  min-height: 0;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 14px;
  border-bottom: 1px solid ${jiraTheme.border};
  background: ${jiraTheme.bg.default};
`;

const ToolbarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  margin-left: auto;
`;

const RangeNav = styled.div`
  display: inline-flex;
  align-items: center;
  background: ${jiraTheme.bg.default};
  border: 1px solid ${jiraTheme.border};
  border-radius: 10px;
  overflow: hidden;
`;

const RangeBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 26px;
  padding: 0 10px;
  border: none;
  background: transparent;
  color: ${jiraTheme.text.secondary};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms ease;
  &:hover { background: ${jiraTheme.bg.tile}; color: ${jiraTheme.text.primary}; }
  & + & { border-left: 1px solid ${jiraTheme.border}; }
`;

const Layout = styled.div<{ $treeWidth: number }>`
  display: grid;
  grid-template-columns: ${({ $treeWidth }) => $treeWidth}px ${SPLITTER_W}px 1fr;
  flex: 1;
  min-height: 0;
  background: ${jiraTheme.bg.default};
`;

const TreeCol = styled.div`
  background: ${jiraTheme.bg.default};
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const TreeHeader = styled.div<{ $h: number }>`
  height: ${({ $h }) => $h}px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: ${jiraTheme.text.muted};
  border-bottom: 1px solid ${jiraTheme.border};
  background: ${jiraTheme.bg.default};
  flex: 0 0 ${({ $h }) => $h}px;
`;

const TreeHeaderLabel = styled.span`
  margin-left: auto;
`;

const TreeBody = styled.div`
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
`;

const TreeRow = styled.div<{ $h: number }>`
  height: ${({ $h }) => $h}px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid ${jiraTheme.hairline};
  font-size: 12.5px;
  color: ${jiraTheme.text.primary};
`;

const EpicLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  width: 100%;
  min-width: 0;
  font-weight: 600;
`;

const Chevron = styled.span`
  display: inline-flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  color: ${jiraTheme.text.muted};
`;

const ChildLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  width: 100%;
  min-width: 0;
  padding-left: 22px;
`;

const Indent = styled.span`
  width: 0;
  flex: 0 0 0;
`;

const KeyText = styled.span`
  color: ${jiraTheme.text.muted};
  font-family: ${jiraTheme.font.brand};
  font-size: 11px;
  font-weight: 600;
  flex: 0 0 auto;
`;

const SummaryText = styled.span<{ $epic?: boolean }>`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
  color: ${({ $epic }) => ($epic ? jiraTheme.text.primary : jiraTheme.text.secondary)};
  font-weight: ${({ $epic }) => ($epic ? 600 : 400)};
`;

const EpicPct = styled.span`
  font-family: ${jiraTheme.font.brand};
  font-size: 11px;
  font-weight: 700;
  color: ${jiraTheme.timeline.epic};
  flex: 0 0 auto;
`;

const Splitter = styled.div`
  position: relative;
  width: ${SPLITTER_W}px;
  cursor: col-resize;
  background: ${jiraTheme.border};
  user-select: none;
  &:hover > span,
  &:active > span {
    background: ${jiraTheme.primary};
  }
`;

const SplitterHandle = styled.span`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 36px;
  border-radius: 1px;
  background: ${jiraTheme.text.muted};
  opacity: 0.5;
  transition: background 120ms ease, opacity 120ms ease;
`;

const ChartCol = styled.div`
  position: relative;
  overflow: auto;
  min-width: 0;
`;

const ChartInner = styled.div<{ $width: number }>`
  width: ${({ $width }) => $width}px;
  position: relative;
`;

const ChartBody = styled.div<{ $width: number; $height: number }>`
  position: relative;
  width: ${({ $width }) => $width}px;
  height: ${({ $height }) => $height}px;
`;

const RowBg = styled.div<{ $top: number; $h: number; $width: number }>`
  position: absolute;
  top: ${({ $top }) => $top}px;
  left: 0;
  height: ${({ $h }) => $h}px;
  width: ${({ $width }) => $width}px;
  border-bottom: 1px solid ${jiraTheme.hairline};
`;

const DepSvg = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 3;
`;

const EmptyLayout = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${jiraTheme.border};
  border-radius: 14px;
  overflow: hidden;
  background: ${jiraTheme.bg.default};
`;

const Empty = styled.div`
  padding: 40px;
  text-align: center;
  color: ${jiraTheme.text.muted};
  font-size: 13px;
  background: ${jiraTheme.bg.default};
`;

export default JiraIssueTimeline;
