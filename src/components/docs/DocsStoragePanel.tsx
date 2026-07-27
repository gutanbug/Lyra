import styled from 'styled-components';
import { FolderOpen, X } from 'lucide-react';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { DocsOverlay, DocsModal } from 'lib/styles/docsCommon';

const DocsStoragePanel = () => {
  const {
    state, closeStorage, chooseStorageFolder, resetStorageFolder, openStorageFolder,
  } = useDocs();
  if (!state.storageOpen) return null;
  const statusColor = state.storageStatusKind === 'ok' ? docsTheme.status['완료'].ink
    : state.storageStatusKind === 'err' ? '#e5484d' : docsTheme.muted;

  return (
    <DocsOverlay data-docs-menu onClick={closeStorage}>
      <DocsModal style={{ width: 480, maxWidth: '94vw' }} onClick={(e) => e.stopPropagation()}>
        <Head>
          <Logo><FolderOpen size={16} /></Logo>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 16, fontWeight: 700 }}>문서 저장 위치</div>
            <div style={{ fontSize: 12, color: docsTheme.muted }}>모든 문서는 아래 로컬 폴더에 파일로 저장됩니다</div>
          </div>
          <Close onClick={closeStorage}><X size={16} /></Close>
        </Head>
        <Body>
          <Field>
            <Label>현재 경로</Label>
            <PathBox title={state.storagePath}>{state.storagePath || '불러오는 중…'}</PathBox>
          </Field>
          <Actions>
            <BtnAccent onClick={chooseStorageFolder}>다른 폴더 선택…</BtnAccent>
            <Btn onClick={resetStorageFolder}>기본 경로로 재설정</Btn>
            <Btn onClick={openStorageFolder}>폴더 열기</Btn>
          </Actions>
          {state.storageStatus && <Status style={{ color: statusColor }}>{state.storageStatus}</Status>}
          <Note>
            문서·데이터베이스·첨부파일이 이 폴더 안에 저장되며, 클라우드로 자동 동기화되지 않습니다.
            폴더를 변경하면 새 위치에 이미 저장된 문서가 있을 경우 그 내용을 불러오고,
            비어 있으면 현재 문서를 새 위치로 옮겨 저장합니다.
          </Note>
        </Body>
      </DocsModal>
    </DocsOverlay>
  );
};

export default DocsStoragePanel;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 18px 22px;
  border-bottom: 1px solid ${docsTheme.hairline};
`;

const Logo = styled.span`
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: ${docsTheme.accent};
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
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
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${docsTheme.text2};
`;

const PathBox = styled.div`
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  color: ${docsTheme.text};
  background: ${docsTheme.surfaceSoft};
  border: 1.5px solid ${docsTheme.border};
  border-radius: 9px;
  padding: 10px 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Actions = styled.div`
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
  align-items: center;
`;

const Btn = styled.button`
  appearance: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid ${docsTheme.border};
  background: ${docsTheme.surface};
  color: ${docsTheme.text};
  border-radius: 9px;
  padding: 10px 15px;
  &:hover { background: ${docsTheme.hover}; }
`;

const BtnAccent = styled(Btn)`
  border: none;
  background: ${docsTheme.accent};
  color: #fff;
  &:hover { background: ${docsTheme.accent}; opacity: .92; }
`;

const Status = styled.span`
  font-size: 12.5px;
  font-weight: 600;
`;

const Note = styled.div`
  font-size: 11.5px;
  color: ${docsTheme.muted};
  line-height: 1.6;
  border-top: 1px solid ${docsTheme.hairline};
  padding-top: 12px;
`;
