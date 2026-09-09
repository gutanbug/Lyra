import styled from 'styled-components';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import type { DocsBlock } from 'types/docs';

interface Props {
  block: DocsBlock;
  dnd: { onDragOver: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void };
}

const BLOCK_DND_MIME = 'application/x-docs-block-id';

const DocsJiraBlock = ({ block, dnd }: Props) => {
  const {
    resolveIssueByKey, jiraType, setEmbedMode, removeBlock, addBelow, focusBlock, openBlockMenu,
  } = useDocs();

  const issue = resolveIssueByKey(block.issueKey || '') || {
    key: block.issueKey || '', summary: '', type: '', status: '', priority: '', assignee: '', url: '', host: '',
  };
  const tc = jiraType(issue.type);
  const isCard = (block.mode || 'card') === 'card';
  const statusMeta = issue.status ? docsTheme.status[issue.status] : null;
  const prMeta = issue.priority ? docsTheme.priority[issue.priority] : null;
  const avatarBg = docsTheme.avatar[issue.assignee] || '#8c8582';

  const onOpen = () => { if (issue.url) window.open(issue.url, '_blank', 'noopener'); };

  return (
    <Row style={{ padding: '5px 0' }} {...dnd}>
      <Gutter className="blk-gutter" style={{ top: 12 }}>
        <GutterBtn title="아래에 추가" onClick={() => { const nid = addBelow(block.id); focusBlock(nid, false); }}>＋</GutterBtn>
        <DragHandle
          title="블록 메뉴 · 드래그로 이동"
          draggable
          data-docs-menu
          onDragStart={(e) => e.dataTransfer.setData(BLOCK_DND_MIME, block.id)}
          onClick={(e) => { e.stopPropagation(); openBlockMenu(block.id, e.clientX, e.clientY); }}
        >⠿
        </DragHandle>
      </Gutter>

      {isCard ? (
        <Card onClick={onOpen}>
          <CardTop>
            <TypeSq style={{ background: tc.color }}>{tc.letter}</TypeSq>
            <IssueKey>{issue.key}</IssueKey>
            {statusMeta && <StatusChip style={{ background: statusMeta.bg, color: statusMeta.ink }}>{issue.status}</StatusChip>}
            {prMeta && <PrGlyph style={{ color: prMeta.color }}>{prMeta.glyph}</PrGlyph>}
            <Actions className="blk-gutter" onClick={(e) => e.stopPropagation()}>
              <MiniBtn $active={isCard} title="카드" onClick={() => setEmbedMode(block.id, 'card')}>▭</MiniBtn>
              <MiniBtn $active={!isCard} title="링크" onClick={() => setEmbedMode(block.id, 'link')}>🔖</MiniBtn>
              <MiniBtn title="삭제" onClick={() => removeBlock(block.id)}>🗑</MiniBtn>
            </Actions>
          </CardTop>
          <Summary>{issue.summary}</Summary>
          <CardBottom>
            {issue.assignee && <Avatar style={{ background: avatarBg }}>{issue.assignee[0]}</Avatar>}
            <span style={{ fontSize: 12, color: docsTheme.text2 }}>{issue.assignee}</span>
            <HostTag>
              <span style={{
                width: 15, height: 15, borderRadius: 3, background: '#2684ff', color: '#fff', fontSize: 9, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora',
              }}
              >J
              </span>
              Jira · {issue.host}
            </HostTag>
          </CardBottom>
        </Card>
      ) : (
        <LinkCard onClick={onOpen}>
          <LinkBody>
            <LinkTop>
              <TypeSq style={{ background: tc.color }}>{tc.letter}</TypeSq>
              <IssueKeySm>{issue.key}</IssueKeySm>
              {statusMeta && <StatusChip style={{ background: statusMeta.bg, color: statusMeta.ink }}>{issue.status}</StatusChip>}
            </LinkTop>
            <LinkSummary>{issue.summary}</LinkSummary>
            <LinkUrl>{issue.url || issue.host}</LinkUrl>
          </LinkBody>
          <LinkThumb>
            <span style={{
              width: 34, height: 34, borderRadius: 8, background: '#2684ff', color: '#fff', fontSize: 17, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora',
            }}
            >J
            </span>
          </LinkThumb>
          <Actions className="blk-gutter" style={{ position: 'absolute', top: 8, right: 8 }} onClick={(e) => e.stopPropagation()}>
            <MiniBtn $active={isCard} title="카드" onClick={() => setEmbedMode(block.id, 'card')}>▭</MiniBtn>
            <MiniBtn $active={!isCard} title="링크" onClick={() => setEmbedMode(block.id, 'link')}>🔖</MiniBtn>
            <MiniBtn title="삭제" onClick={() => removeBlock(block.id)}>🗑</MiniBtn>
          </Actions>
        </LinkCard>
      )}
    </Row>
  );
};

export default DocsJiraBlock;

const Row = styled.div`
  position: relative;
`;

const Gutter = styled.div`
  position: absolute;
  left: -54px;
  display: flex;
  gap: 1px;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.12s;
  ${Row}:hover & { opacity: 1; }
`;

const GutterBtn = styled.button`
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${docsTheme.faint};
  width: 20px;
  height: 22px;
  border-radius: 5px;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  &:hover { background: ${docsTheme.hover}; color: ${docsTheme.text2}; }
`;

const DragHandle = styled(GutterBtn)`
  width: 16px;
  font-size: 13px;
  cursor: grab;
`;

const Card = styled.div`
  border: 1px solid ${docsTheme.border};
  border-radius: 12px;
  padding: 14px 16px;
  background: ${docsTheme.surface};
  cursor: pointer;
  position: relative;
  transition: border-color 0.13s, box-shadow 0.13s;
  &:hover { border-color: ${docsTheme.borderStrong}; box-shadow: ${docsTheme.shadow}; }
`;

const CardTop = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 9px;
`;

const TypeSq = styled.span`
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: Sora, sans-serif;
`;

const IssueKey = styled.span`
  font-family: 'Sora', monospace;
  font-size: 12px;
  font-weight: 600;
  color: ${docsTheme.muted};
`;

const IssueKeySm = styled(IssueKey)`
  font-size: 11.5px;
`;

const StatusChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 7px;
  white-space: nowrap;
`;

const PrGlyph = styled.span`
  font-weight: 800;
  font-size: 14px;
`;

const Actions = styled.div`
  margin-left: auto;
  display: flex;
  gap: 3px;
`;

const MiniBtn = styled.button<{ $active?: boolean }>`
  appearance: none;
  cursor: pointer;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ $active }) => ($active ? docsTheme.accent : docsTheme.border)};
  background: ${({ $active }) => ($active ? docsTheme.accentSoft : docsTheme.surface)};
  color: ${({ $active }) => ($active ? docsTheme.accent : docsTheme.text2)};
`;

const Summary = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${docsTheme.text};
  line-height: 1.45;
  margin-bottom: 11px;
`;

const CardBottom = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Avatar = styled.span`
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10.5px;
  font-weight: 700;
  color: #fff;
`;

const HostTag = styled.span`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: ${docsTheme.muted};
`;

const LinkCard = styled.div`
  display: flex;
  align-items: stretch;
  border: 1px solid ${docsTheme.border};
  border-radius: 11px;
  overflow: hidden;
  background: ${docsTheme.surface};
  cursor: pointer;
  position: relative;
  transition: border-color 0.13s, box-shadow 0.13s;
  &:hover { border-color: ${docsTheme.borderStrong}; box-shadow: ${docsTheme.shadow}; }
`;

const LinkBody = styled.div`
  flex: 1;
  min-width: 0;
  padding: 12px 15px;
`;

const LinkTop = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 5px;
`;

const LinkSummary = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${docsTheme.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const LinkUrl = styled.div`
  font-size: 11.5px;
  color: ${docsTheme.muted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 3px;
`;

const LinkThumb = styled.div`
  flex: 0 0 88px;
  background: ${docsTheme.surfaceSoft};
  border-left: 1px solid ${docsTheme.border};
  display: flex;
  align-items: center;
  justify-content: center;
`;
