import { useMemo } from 'react';
import styled from 'styled-components';
import type { Commit, GraphNode } from 'types/git';
import { layoutGraph, maxLaneCount, paletteByLane } from 'lib/utils/gitGraphLayout';
import { theme } from 'lib/styles/theme';

interface Props {
  commits: Commit[];
}

const ROW_HEIGHT = 26;
const LANE_WIDTH = 22;
const NODE_RADIUS = 5;
const EDGE_WIDTH = 1.8;
const RIGHT_PAD = 12;
/** 그래프 패널의 기본 가시 폭 (사용자 가로 스크롤로 더 넓게 볼 수 있음). */
const GRAPH_PANE_WIDTH = 360;

/**
 * 커밋 그래프 + 메타데이터 컬럼.
 * 레이아웃:
 *  - 좌측 GraphPane: 고정 폭(GRAPH_PANE_WIDTH) + 자체 `overflow-x: auto`.
 *    그래프가 더 넓어도 패널 폭은 유지되고, 사용자가 가로 스크롤로 좌우 이동.
 *  - 우측 CommitList: 항상 보이는 메시지/작성자/sha/date 컬럼 (flex: 1).
 *  - 세로 스크롤은 두 영역이 함께 (외부 컨테이너에서 처리).
 *
 * SVG:
 *  - 한 행 = ROW_HEIGHT, lane 폭 = LANE_WIDTH.
 *  - 각 commit node = 원. parentLinks별로 부모 행/lane까지 라인.
 *    - 같은 lane: 직선
 *    - 다른 lane: 시작 부근의 짧은 곡선 + 부모까지 직선 수직 (GitKraken-style "fork-and-drop")
 *  - parent SHA가 윈도우 밖이면 캔버스 끝으로 짧은 fade.
 */
const CommitGraph = ({ commits }: Props) => {
  const nodes: GraphNode[] = useMemo(() => layoutGraph(commits), [commits]);
  const lanes = maxLaneCount(nodes);
  const graphWidth = lanes * LANE_WIDTH + RIGHT_PAD;
  const totalHeight = commits.length * ROW_HEIGHT;
  const shaToRow = useMemo(() => {
    const m = new Map<string, number>();
    for (let i = 0; i < commits.length; i++) m.set(commits[i].sha, i);
    return m;
  }, [commits]);

  if (commits.length === 0) {
    return <Empty>커밋이 없습니다.</Empty>;
  }

  const laneX = (lane: number) => lane * LANE_WIDTH + LANE_WIDTH / 2;
  const rowY = (row: number) => row * ROW_HEIGHT + ROW_HEIGHT / 2;

  return (
    <Wrapper>
      <GraphPane>
        <GraphInner style={{ width: graphWidth, height: totalHeight }}>
          <svg
            width={graphWidth}
            height={totalHeight}
            viewBox={`0 0 ${graphWidth} ${totalHeight}`}
            xmlns="http://www.w3.org/2000/svg"
          >
          {nodes.flatMap((n) =>
            n.parentLinks.map((p, i) => {
              const parentRow = shaToRow.get(p.parentSha);
              const x1 = laneX(n.lane);
              const y1 = rowY(n.row);
              const x2 = laneX(p.parentLane);
              const y2 = parentRow !== undefined ? rowY(parentRow) : y1 + ROW_HEIGHT * 2;
              const key = `${n.sha}-${p.parentSha}-${i}`;
              const stroke = paletteByLane(p.parentLane);

              // 같은 lane이면 직선.
              if (x1 === x2) {
                return (
                  <line
                    key={key}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={stroke}
                    strokeWidth={EDGE_WIDTH}
                    strokeLinecap="round"
                  />
                );
              }
              // Diagonal: 시작 부근에서만 짧게 곡선으로 lane 전환, 이후 부모까지 직선 vertical.
              // 한 행 정도(ROW_HEIGHT * 1.1)의 Y 거리 안에서 곡선을 마치고, 나머지는 수직선.
              const transitionEnd = Math.min(y1 + ROW_HEIGHT * 1.1, y2);
              if (transitionEnd >= y2 - 0.5) {
                // 부모가 바로 다음 행 정도로 가깝다면 짧은 S-curve 한 번이면 충분.
                const midY = (y1 + y2) / 2;
                const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
                return <path key={key} d={d} stroke={stroke} strokeWidth={EDGE_WIDTH} strokeLinecap="round" fill="none" />;
              }
              // 일반 케이스: 시작점에서 짧은 곡선으로 lane 변경 → transition end 부터 부모까지 수직선.
              const cpY = y1 + (transitionEnd - y1) * 0.55;
              const d = `M ${x1} ${y1} C ${x1} ${cpY}, ${x2} ${cpY}, ${x2} ${transitionEnd} L ${x2} ${y2}`;
              return (
                <path
                  key={key}
                  d={d}
                  stroke={stroke}
                  strokeWidth={EDGE_WIDTH}
                  strokeLinecap="round"
                  fill="none"
                />
              );
            }),
          )}
          {nodes.map((n) => (
            <circle
              key={n.sha}
              cx={laneX(n.lane)}
              cy={rowY(n.row)}
              r={NODE_RADIUS}
              fill={n.color}
              stroke={theme.bgPrimary}
              strokeWidth={1.5}
            />
          ))}
          </svg>
        </GraphInner>
      </GraphPane>

      <CommitList>
        {commits.map((c) => (
          <CommitRow key={c.sha} style={{ height: ROW_HEIGHT }}>
            <Subject title={c.subject}>
              {c.refs.length > 0 && (
                <RefList>
                  {c.refs.map((r) => (
                    <Ref key={r} $remote={r.startsWith('origin/') || r.includes('/HEAD')}>
                      {r}
                    </Ref>
                  ))}
                </RefList>
              )}
              <SubjectText>{c.subject}</SubjectText>
            </Subject>
            <Author title={`${c.author.name} <${c.author.email}>`}>{c.author.name}</Author>
            <Sha>{c.sha.slice(0, 8)}</Sha>
            <CommitDate>{formatDate(c.author.date)}</CommitDate>
          </CommitRow>
        ))}
      </CommitList>
    </Wrapper>
  );
};

export default CommitGraph;

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

const Wrapper = styled.div`
  display: flex;
  align-items: stretch;
  min-height: 0;
`;

/**
 * 고정 폭 그래프 패널. SVG가 더 넓을 경우 자체 가로 스크롤로 좌우 이동.
 * 메시지 컬럼(CommitList)은 항상 우측에 보이는 상태로 유지된다.
 */
const GraphPane = styled.div`
  width: ${GRAPH_PANE_WIDTH}px;
  min-width: ${GRAPH_PANE_WIDTH}px;
  max-width: ${GRAPH_PANE_WIDTH}px;
  overflow-x: auto;
  overflow-y: hidden;
  background: ${theme.bgPrimary};
  border-right: 1px solid ${theme.border};

  &::-webkit-scrollbar { height: 8px; }
  &::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 4px; }
  &::-webkit-scrollbar-thumb:hover { background: ${theme.textMuted}; }
`;

const GraphInner = styled.div`
  position: relative;

  & > svg {
    display: block;
  }
`;

const CommitList = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const CommitRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.5rem;
  font-size: 0.8125rem;
  color: ${theme.textPrimary};
  border-bottom: 1px solid ${theme.bgSecondary};

  &:hover {
    background: ${theme.bgTertiary};
  }
`;

const Subject = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  overflow: hidden;
`;

const SubjectText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RefList = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  flex-shrink: 0;
`;

const Ref = styled.span<{ $remote?: boolean }>`
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.05rem 0.4rem;
  border-radius: 10px;
  background: ${({ $remote }) => ($remote ? theme.bgTertiary : theme.blueLight)};
  color: ${({ $remote }) => ($remote ? theme.textSecondary : theme.blueDarker)};
  white-space: nowrap;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Author = styled.span`
  width: 110px;
  flex-shrink: 0;
  font-size: 0.75rem;
  color: ${theme.textMuted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Sha = styled.span`
  width: 72px;
  flex-shrink: 0;
  font-family: 'SFMono-Regular', Menlo, monospace;
  font-size: 0.6875rem;
  color: ${theme.textMuted};
`;

const CommitDate = styled.span`
  width: 116px;
  flex-shrink: 0;
  font-family: 'SFMono-Regular', Menlo, monospace;
  font-size: 0.6875rem;
  color: ${theme.textMuted};
  text-align: right;
`;

const Empty = styled.div`
  padding: 2rem;
  text-align: center;
  color: ${theme.textMuted};
  font-size: 0.875rem;
`;
