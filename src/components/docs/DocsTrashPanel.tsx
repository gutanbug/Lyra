import styled from 'styled-components';
import { Trash2, X, FileText, Database } from 'lucide-react';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { DocsOverlay, DocsModal } from 'lib/styles/docsCommon';

const DocsTrashPanel = () => {
  const { state, closeTrash, restoreTrash, purgeTrash } = useDocs();
  if (!state.trashOpen) return null;

  return (
    <DocsOverlay data-docs-menu onClick={closeTrash}>
      <DocsModal style={{ width: 520, maxWidth: '92vw', maxHeight: '76vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <Head>
          <Trash2 size={18} color={docsTheme.text2} />
          <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 16, fontWeight: 700, flex: 1 }}>휴지통</span>
          <Close onClick={closeTrash}><X size={16} /></Close>
        </Head>
        <Body>
          {state.trash.length === 0 && <Empty>휴지통이 비어 있습니다</Empty>}
          {state.trash.map((t) => {
            const isDb = t.pages[t.id]?.type === 'db';
            return (
              <Row key={t.id}>
                <span style={{ fontSize: 18, flex: '0 0 auto', display: 'inline-flex' }}>
                  {t.icon || (isDb ? <Database size={16} color={docsTheme.faint} /> : <FileText size={16} color={docsTheme.faint} />)}
                </span>
                <Title>{t.title}</Title>
                <RestoreBtn onClick={() => restoreTrash(t.id)}>복원</RestoreBtn>
                <PurgeBtn onClick={() => purgeTrash(t.id)}>영구 삭제</PurgeBtn>
              </Row>
            );
          })}
        </Body>
      </DocsModal>
    </DocsOverlay>
  );
};

export default DocsTrashPanel;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid ${docsTheme.hairline};
`;

const Close = styled.button`
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${docsTheme.muted};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  &:hover { background: ${docsTheme.hover}; }
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px;
`;

const Empty = styled.div`
  padding: 40px;
  text-align: center;
  font-size: 13.5px;
  color: ${docsTheme.muted};
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  border-radius: 10px;
  &:hover { background: ${docsTheme.surfaceSoft}; }
`;

const Title = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 500;
  color: ${docsTheme.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const RestoreBtn = styled.button`
  appearance: none;
  border: 1px solid ${docsTheme.border};
  background: ${docsTheme.surface};
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${docsTheme.text2};
  padding: 6px 12px;
  border-radius: 8px;
  &:hover { background: ${docsTheme.hover}; }
`;

const PurgeBtn = styled.button`
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: #e5484d;
  padding: 6px 10px;
  border-radius: 8px;
  &:hover { background: ${docsTheme.hover}; }
`;
