import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { useDocsGlobalEvents } from 'lib/hooks/useDocsGlobalEvents';
import DocsSidebar from 'components/docs/DocsSidebar';
import DocsTopbar from 'components/docs/DocsTopbar';
import DocsDocView from 'components/docs/DocsDocView';
import DocsDbView from 'components/docs/DocsDbView';
import DocsSlashMenu from 'components/docs/DocsSlashMenu';
import DocsMentionMenu from 'components/docs/DocsMentionMenu';
import DocsFormatBar from 'components/docs/DocsFormatBar';
import DocsBlockMenu from 'components/docs/DocsBlockMenu';
import DocsPageMenu from 'components/docs/DocsPageMenu';
import DocsCommandPalette from 'components/docs/DocsCommandPalette';
import DocsTrashPanel from 'components/docs/DocsTrashPanel';
import DocsCloudPanel from 'components/docs/DocsCloudPanel';
import DocsStoragePanel from 'components/docs/DocsStoragePanel';
import DocsCellEditor from 'components/docs/DocsCellEditor';
import DocsFilterMenu from 'components/docs/DocsFilterMenu';
import DocsPasteMenu from 'components/docs/DocsPasteMenu';
import DocsMediaMenu from 'components/docs/DocsMediaMenu';
import DocsDeleteConfirmModal from 'components/docs/DocsDeleteConfirmModal';
import DocsRowDetail from 'components/docs/DocsRowDetail';

const DocsContainer = () => {
  const { state, addPage } = useDocs();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useDocsGlobalEvents();

  const page = state.pagesById[state.activeId];

  // 페이지 전환 시 스크롤 초기화
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [state.activeId]);

  return (
    <Root data-docs-root>
      <DocsSidebar />
      <Main>
        <DocsTopbar />
        <Scroll ref={scrollRef}>
          {!page ? (
            <EmptyState>
              <EmptyIcon>📄</EmptyIcon>
              <EmptyTitle>아직 페이지가 없어요</EmptyTitle>
              <EmptyDesc>첫 페이지를 만들고 워크스페이스를 시작해보세요.</EmptyDesc>
              <EmptyBtn onClick={() => addPage('sp_pub')}>＋ 새 페이지</EmptyBtn>
            </EmptyState>
          ) : page.type === 'db' ? <DocsDbView /> : <DocsDocView />}
        </Scroll>
      </Main>

      <DocsSlashMenu />
      <DocsMentionMenu />
      <DocsFormatBar />
      <DocsBlockMenu />
      <DocsPageMenu />
      <DocsCellEditor />
      <DocsFilterMenu />
      <DocsPasteMenu />
      <DocsMediaMenu />
      <DocsDeleteConfirmModal />
      <DocsCommandPalette />
      <DocsTrashPanel />
      <DocsCloudPanel />
      <DocsStoragePanel />
      <DocsRowDetail />
    </Root>
  );
};

export default DocsContainer;

const Root = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  background: ${docsTheme.bg};
  font-family: ${docsTheme.font.body};
  color: ${docsTheme.text};
  overflow: hidden;
`;

const Main = styled.main`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: ${docsTheme.surface};
`;

const Scroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
`;

const EmptyState = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 40px;
  text-align: center;
`;

const EmptyIcon = styled.div`
  font-size: 40px;
  margin-bottom: 6px;
`;

const EmptyTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${docsTheme.text};
`;

const EmptyDesc = styled.div`
  font-size: 13px;
  color: ${docsTheme.muted};
  margin-bottom: 14px;
`;

const EmptyBtn = styled.button`
  appearance: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  color: #fff;
  background: ${docsTheme.accent};
  border-radius: 9px;
  padding: 9px 16px;
  &:hover { opacity: .92; }
`;
