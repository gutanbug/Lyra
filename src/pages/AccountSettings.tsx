import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowLeft } from 'lucide-react';
import AddAccountForm from 'components/account/AddAccountForm';
import AccountList from 'components/account/AccountList';
import { useAccount } from 'modules/contexts/account';
import { theme } from 'lib/styles/theme';
import { transition } from 'lib/styles/styles';
import type { Account } from 'types/account';

const AccountSettings = () => {
  const history = useHistory();
  const { refresh } = useAccount();
  const isElectron = typeof window !== 'undefined' && !!window.workspaceAPI;
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Account | undefined>(undefined);

  const handleSuccess = () => {
    refresh();
    setModalMode(null);
    setEditTarget(undefined);
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setEditTarget(undefined);
  };

  const handleEdit = (account: Account) => {
    setEditTarget(account);
    setModalMode('edit');
  };

  return (
    <Page>
      <Helmet>
        <title>계정 설정 - Workspace</title>
      </Helmet>
      <Content>
        <TitleRow>
          <TitleLeft>
            <BackButton onClick={() => history.push('/jira')}>
              <ArrowLeft size={18} />
            </BackButton>
            <Title>계정 설정</Title>
          </TitleLeft>
          {isElectron && (
            <AddButton onClick={() => setModalMode('add')}>+ 계정 추가</AddButton>
          )}
        </TitleRow>
        {!isElectron && (
          <ElectronOnly>
            계정 관리는 Electron 데스크톱 앱에서만 사용할 수 있습니다. pnpm electron:dev 로 실행해주세요.
          </ElectronOnly>
        )}
        <AccountList onEdit={isElectron ? handleEdit : undefined} />
      </Content>

      {modalMode && (
        <ModalOverlay onClick={handleCloseModal}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{modalMode === 'edit' ? '계정 수정' : '계정 추가'}</ModalTitle>
              <CloseButton onClick={handleCloseModal}>&times;</CloseButton>
            </ModalHeader>
            <AddAccountForm
              key={editTarget?.id || 'new'}
              onSuccess={handleSuccess}
              editAccount={modalMode === 'edit' ? editTarget : undefined}
            />
          </ModalBox>
        </ModalOverlay>
      )}
    </Page>
  );
};

export default AccountSettings;

// ─── Styled Components ─────────────────────────

const Page = styled.div`
  width: 100%;
  min-height: 100vh;
  background: ${theme.bgPrimary};
  display: flex;
  flex-direction: column;
  align-items: center;
  zoom: 1.2;
`;

const Content = styled.main`
  width: 100%;
  max-width: 600px;
  padding: 2rem;
  box-sizing: border-box;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

const TitleLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid ${theme.border};
  border-radius: 50%;
  background: ${theme.bgSecondary};
  color: ${theme.textSecondary};
  cursor: pointer;
  transition: all 0.15s ${transition};

  &:hover {
    border-color: ${theme.blue};
    color: ${theme.blue};
    background: ${theme.blueLight};
  }
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.5rem;
  color: ${theme.textPrimary};
`;

const AddButton = styled.button`
  padding: 0.4rem 0.875rem;
  background: ${theme.blue};
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ${transition};

  &:hover {
    background: ${theme.blueDark};
  }
`;

const ElectronOnly = styled.p`
  padding: 1rem;
  background: ${theme.blueLight};
  border: 1px solid ${theme.blueLighter};
  border-radius: 8px;
  color: ${theme.blueDarker};
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
`;

const ModalBox = styled.div`
  width: 100%;
  max-width: 460px;
  background: ${theme.bgPrimary};
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${theme.border};
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${theme.textPrimary};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.375rem;
  color: ${theme.textMuted};
  cursor: pointer;
  line-height: 1;
  padding: 0;

  &:hover {
    color: ${theme.textPrimary};
  }
`;
