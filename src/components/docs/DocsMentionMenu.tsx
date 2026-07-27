import styled from 'styled-components';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { DocsPopup, DocsPopupLabel } from 'lib/styles/docsCommon';

const DocsMentionMenu = () => {
  const { state, filteredPages, chooseMention, openMenu } = useDocs();
  const { mention } = state;
  if (!mention) return null;

  const items = filteredPages(mention.query);

  return (
    <DocsPopup data-docs-menu style={{ left: mention.x, top: mention.y, width: 284, maxHeight: 300, overflowY: 'auto' }}>
      <DocsPopupLabel>페이지 연결</DocsPopupLabel>
      {items.length === 0 && <Empty>일치하는 페이지 없음</Empty>}
      {items.map((p, idx) => (
        <Item
          key={p.id}
          $active={idx === mention.active}
          onMouseEnter={() => openMenu('mention', { ...mention, active: idx })}
          onClick={() => chooseMention(p.id)}
        >
          <span style={{ fontSize: 16, flex: '0 0 auto' }}>{p.icon}</span>
          <Title>{p.title || '제목 없음'}</Title>
          {p.type === 'db' && <Badge>DB</Badge>}
        </Item>
      ))}
    </DocsPopup>
  );
};

export default DocsMentionMenu;

const Empty = styled.div`
  padding: 14px 10px;
  font-size: 13px;
  color: ${docsTheme.muted};
  text-align: center;
`;

const Item = styled.button<{ $active: boolean }>`
  width: 100%;
  appearance: none;
  border: none;
  cursor: pointer;
  background: ${({ $active }) => ($active ? docsTheme.hover : 'transparent')};
  border-radius: 8px;
  padding: 7px 9px;
  display: flex;
  align-items: center;
  gap: 9px;
  text-align: left;
`;

const Title = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 500;
  color: ${docsTheme.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Badge = styled.span`
  flex: 0 0 auto;
  font-size: 10px;
  font-weight: 700;
  color: ${docsTheme.muted};
  background: ${docsTheme.surfaceSoft};
  border: 1px solid ${docsTheme.border};
  border-radius: 5px;
  padding: 0 5px;
  font-family: 'Sora', sans-serif;
`;
