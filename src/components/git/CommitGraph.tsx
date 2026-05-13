import { useMemo } from 'react';
import styled from 'styled-components';
import type { Commit, GraphNode } from 'types/git';
import { layoutGraph, maxLaneCount, paletteByLane } from 'lib/utils/gitGraphLayout';
import { theme } from 'lib/styles/theme';

interface Props {
  commits: Commit[];
}

const ROW_HEIGHT = 24;
const LANE_WIDTH = 16;
const NODE_RADIUS = 5;
const EDGE_WIDTH = 1.6;
const RIGHT_PAD = 8;

/**
 * 커밋 그래프 + 메타데이터 컬럼.
 * - 한 행 = ROW_HEIGHT(24px), lane 폭 = LANE_WIDTH(16px).
 * - SVG는 전체 그래프(최대 lane 수 × LANE_WIDTH + 여백)를 단일 캔버스로 그린다.
 * - 각 commit node = 원. parentLinks별로 부모 행/lane까지 라인.
 *   - 같은 lane: 직선
 *   - 다른 lane: 단순 직선(베지어 등 향상은 후속)
 * - parent SHA가 윈도우 밖이면 SVG 캔버스 끝으로 연장.
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
      <GraphCanvas style={{ width: graphWidth, minWidth: graphWidth }}>
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
              return (
                <line
                  key={`${n.sha}-${p.parentSha}-${i}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={paletteByLane(p.parentLane)}
                  strokeWidth={EDGE_WIDTH}
                  strokeLinecap="round"
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
      </GraphCanvas>

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

const GraphCanvas = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  background: ${theme.bgPrimary};

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
