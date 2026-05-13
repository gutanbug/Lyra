import { useMemo, useState } from 'react';
import styled, { css } from 'styled-components';
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
/** 그래프 패널의 기본 가시 폭. 더 넓은 그래프는 자체 가로 스크롤로 좌우 이동. */
const GRAPH_PANE_WIDTH = 360;
/** 행 배경 lane 색상 알파(저채도). hover 시 더 진해진다. */
const ROW_BG_ALPHA = 0.07;
const ROW_BG_HOVER_ALPHA = 0.16;
const ROW_BG_SELECTED_ALPHA = 0.22;

/**
 * 커밋 그래프 + 메타데이터 컬럼.
 * 레이아웃:
 *  - 좌측 GraphPane(360px 고정 폭 + 자체 가로 스크롤): SVG로 lane 라인 + 노드.
 *  - 우측 CommitList: 메시지/refs/author/date.
 *  - 두 영역의 동일 행이 같은 lane 색 옅은 배경을 가져 시각적 매칭. hover 시 진해지고 클릭 시 선택 강조.
 *
 * SVG:
 *  - 한 행 = ROW_HEIGHT, lane 폭 = LANE_WIDTH.
 *  - 행 배경 rect(lane 색, 저알파) 먼저 그린 뒤 그 위에 edges → 노드 원.
 *  - 같은 lane: 직선; 다른 lane: 시작 부근 짧은 곡선 + 부모까지 직선 ("fork-and-drop").
 *  - parent SHA가 윈도우 밖이면 SVG 캔버스 하단까지 연장 — "lane이 화면 밖으로 이어진다" 시그널.
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

  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);

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
            {/* 1) 행 배경 — lane 색 옅은 톤. hover/selected는 더 진하게. */}
            {nodes.map((n) => {
              const alpha =
                selectedRow === n.row ? ROW_BG_SELECTED_ALPHA :
                hoverRow === n.row ? ROW_BG_HOVER_ALPHA :
                ROW_BG_ALPHA;
              return (
                <rect
                  key={`bg-${n.sha}`}
                  x={0}
                  y={n.row * ROW_HEIGHT}
                  width={graphWidth}
                  height={ROW_HEIGHT}
                  fill={hexWithAlpha(n.color, alpha)}
                />
              );
            })}

            {/* 2) parent edges */}
            {nodes.flatMap((n) =>
              n.parentLinks.map((p, i) => {
                const parentRow = shaToRow.get(p.parentSha);
                const x1 = laneX(n.lane);
                const y1 = rowY(n.row);
                const x2 = laneX(p.parentLane);
                // parent가 윈도우 밖이면 캔버스 하단까지 연장(시각적 "off-screen 이어짐" 표시).
                const y2 = parentRow !== undefined ? rowY(parentRow) : totalHeight + ROW_HEIGHT;
                const key = `${n.sha}-${p.parentSha}-${i}`;
                const stroke = paletteByLane(p.parentLane);

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
                const transitionEnd = Math.min(y1 + ROW_HEIGHT * 1.1, y2);
                if (transitionEnd >= y2 - 0.5) {
                  const midY = (y1 + y2) / 2;
                  const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
                  return <path key={key} d={d} stroke={stroke} strokeWidth={EDGE_WIDTH} strokeLinecap="round" fill="none" />;
                }
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

            {/* 3) node circles */}
            {nodes.map((n) => (
              <circle
                key={n.sha}
                cx={laneX(n.lane)}
                cy={rowY(n.row)}
                r={NODE_RADIUS}
                fill={n.color}
                stroke={theme.bgPrimary}
                strokeWidth={1.8}
              />
            ))}

            {/* 4) hover/selected 행 좌측 강조선 */}
            {hoverRow !== null && (
              <line
                x1={0}
                y1={hoverRow * ROW_HEIGHT}
                x2={0}
                y2={(hoverRow + 1) * ROW_HEIGHT}
                stroke={theme.blue}
                strokeWidth={2}
              />
            )}
            {selectedRow !== null && selectedRow !== hoverRow && (
              <line
                x1={0}
                y1={selectedRow * ROW_HEIGHT}
                x2={0}
                y2={(selectedRow + 1) * ROW_HEIGHT}
                stroke={theme.blue}
                strokeWidth={2}
              />
            )}
          </svg>
        </GraphInner>
      </GraphPane>

      <CommitList>
        {commits.map((c, i) => {
          const node = nodes[i];
          const isHover = hoverRow === i;
          const isSelected = selectedRow === i;
          const bgAlpha = isSelected ? ROW_BG_SELECTED_ALPHA : isHover ? ROW_BG_HOVER_ALPHA : ROW_BG_ALPHA;
          return (
            <CommitRow
              key={c.sha}
              style={{
                height: ROW_HEIGHT,
                background: hexWithAlpha(node.color, bgAlpha),
              }}
              $selected={isSelected}
              onMouseEnter={() => setHoverRow(i)}
              onMouseLeave={() => setHoverRow((prev) => (prev === i ? null : prev))}
              onClick={() => setSelectedRow((prev) => (prev === i ? null : i))}
            >
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
              <CommitDate>{formatDate(c.author.date)}</CommitDate>
            </CommitRow>
          );
        })}
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

/** `#rrggbb` → `rgba(r,g,b,a)` 변환. 잘못된 입력은 투명 처리. */
function hexWithAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(0,0,0,0)`;
  const v = parseInt(m[1], 16);
  const r = (v >> 16) & 0xff;
  const g = (v >> 8) & 0xff;
  const b = v & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}

const Wrapper = styled.div`
  display: flex;
  align-items: stretch;
  min-height: 0;
`;

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

const CommitRow = styled.div<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.5rem;
  font-size: 0.8125rem;
  color: ${theme.textPrimary};
  cursor: pointer;
  border-left: 2px solid transparent;
  ${({ $selected }) =>
    $selected &&
    css`
      border-left-color: ${theme.blue};
    `}
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
