import styled from 'styled-components';
import { AlertTriangle } from 'lucide-react';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { DocsOverlay, DocsModal } from 'lib/styles/docsCommon';

const DocsDeleteConfirmModal = () => {
  const { state, cancelDeletePage, confirmDeletePage } = useDocs();
  const { deleteConfirm } = state;
  if (!deleteConfirm) return null;

  return (
    <DocsOverlay data-docs-menu onClick={cancelDeletePage}>
      <DocsModal style={{ width: 380, maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
        <Body>
          <IconWrap><AlertTriangle size={20} color={docsTheme.danger} /></IconWrap>
          <Title>페이지를 삭제할까요?</Title>
          <Desc>
            <PageLabel>{deleteConfirm.icon || '📄'} {deleteConfirm.title}</PageLabel>
            {deleteConfirm.childCount > 0
              ? `과(와) 하위 항목 ${deleteConfirm.childCount}개가 함께 휴지통으로 이동합니다.`
              : '을(를) 휴지통으로 이동합니다.'}
          </Desc>
          <Actions>
            <CancelBtn onClick={cancelDeletePage}>취소</CancelBtn>
            <DeleteBtn onClick={confirmDeletePage}>삭제</DeleteBtn>
          </Actions>
        </Body>
      </DocsModal>
    </DocsOverlay>
  );
};

export default DocsDeleteConfirmModal;

const Body = styled.div`
  padding: 22px 22px 18px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
`;

const IconWrap = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${docsTheme.danger}1a;
  margin-bottom: 6px;
`;

const Title = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${docsTheme.text};
`;

const Desc = styled.div`
  font-size: 13px;
  line-height: 1.5;
  color: ${docsTheme.text2};
`;

const PageLabel = styled.span`
  font-weight: 700;
  color: ${docsTheme.text};
`;

const Actions = styled.div`
  width: 100%;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
`;

const CancelBtn = styled.button`
  appearance: none;
  border: 1px solid ${docsTheme.border};
  background: ${docsTheme.surface};
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: ${docsTheme.text2};
  padding: 8px 16px;
  border-radius: ${docsTheme.radius.ctl};
  &:hover { background: ${docsTheme.hover}; }
`;

const DeleteBtn = styled.button`
  appearance: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: ${docsTheme.danger};
  padding: 8px 16px;
  border-radius: ${docsTheme.radius.ctl};
  &:hover { opacity: .9; }
`;
