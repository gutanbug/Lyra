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

type SettingsTab = 'account' | 'shortcuts';

const SIDEBAR_MENUS: { id: SettingsTab; label: string }[] = [
  { id: 'account', label: '계정 설정' },
  { id: 'shortcuts', label: '단축키 관리' },
];

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const CMD = isMac ? '⌘' : 'Ctrl';

const SHORTCUT_SECTIONS = [
  {
    title: '탐색',
    items: [
      { label: '검색창 포커스', keys: [CMD, 'L'] },
      { label: '이전 메뉴', keys: ['['] },
      { label: '다음 메뉴', keys: [']'] },
    ],
  },
  {
    title: '보기',
    items: [
      { label: '모두 접기', keys: [CMD, '-'] },
      { label: '모두 펼치기', keys: [CMD, '+'] },
    ],
  },
  {
    title: '일반',
    items: [
      { label: '환경설정', keys: [CMD, ','] },
      { label: '프로필 변경', keys: [CMD, ';'] },
    ],
  },
];

/** 계정 설정 패널 */
const AccountPanel = () => {
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
    <>
      <PanelHeader>
        <PanelTitle>계정 설정</PanelTitle>
        {isElectron && (
          <AddButton onClick={() => setModalMode('add')}>+ 계정 추가</AddButton>
        )}
      </PanelHeader>
      {!isElectron && (
        <ElectronOnly>
          계정 관리는 Electron 데스크톱 앱에서만 사용할 수 있습니다. pnpm electron:dev 로 실행해주세요.
        </ElectronOnly>
      )}
      <AccountList onEdit={isElectron ? handleEdit : undefined} />

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
    </>
  );
};

/** 단축키 관리 패널 */
const ShortcutsPanel = () => (
  <>
    <PanelHeader>
      <PanelTitle>단축키 관리</PanelTitle>
    </PanelHeader>
    <ShortcutList>
      {SHORTCUT_SECTIONS.map((section) => (
        <ShortcutSection key={section.title}>
          <ShortcutSectionTitle>{section.title}</ShortcutSectionTitle>
          {section.items.map((item) => (
            <ShortcutRow key={item.label}>
              <ShortcutLabel>{item.label}</ShortcutLabel>
              <KbdGroup>
                {item.keys.map((k, i) => (
                  <span key={i}>
                    {i > 0 && <KbdPlus>+ </KbdPlus>}
                    <Kbd>{k}</Kbd>
                  </span>
                ))}
              </KbdGroup>
            </ShortcutRow>
          ))}
        </ShortcutSection>
      ))}
    </ShortcutList>
  </>
);

const AccountSettings = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');

  return (
    <Page>
      <Helmet>
        <title>환경설정 - Workspace</title>
      </Helmet>
      <SettingsLayout>
        <Sidebar>
          <SidebarHeader>
            <BackButton onClick={() => history.push('/jira')}>
              <ArrowLeft size={16} />
            </BackButton>
            <SidebarTitle>환경설정</SidebarTitle>
          </SidebarHeader>
          <SidebarNav>
            {SIDEBAR_MENUS.map((menu) => (
              <SidebarItem
                key={menu.id}
                $active={activeTab === menu.id}
                onClick={() => setActiveTab(menu.id)}
              >
                {menu.label}
              </SidebarItem>
            ))}
          </SidebarNav>
        </Sidebar>
        <ContentArea>
          {activeTab === 'account' && <AccountPanel />}
          {activeTab === 'shortcuts' && <ShortcutsPanel />}
        </ContentArea>
      </SettingsLayout>
    </Page>
  );
};

export default AccountSettings;

// ─── Styled Components ─────────────────────────

const Page = styled.div`
  width: 100%;
  flex: 1;
  min-height: 100%;
  background: ${theme.bgPrimary};
  display: flex;
  flex-direction: column;
  zoom: 1.2;
`;

const SettingsLayout = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
`;

const Sidebar = styled.aside`
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid ${theme.border};
  background: ${theme.bgSecondary};
  display: flex;
  flex-direction: column;
  padding: 1.25rem 0;
`;

const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1rem 1rem;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid ${theme.border};
  border-radius: 50%;
  background: ${theme.bgPrimary};
  color: ${theme.textSecondary};
  cursor: pointer;
  transition: all 0.15s ${transition};

  &:hover {
    border-color: ${theme.blue};
    color: ${theme.blue};
    background: ${theme.blueLight};
  }
`;

const SidebarTitle = styled.span`
  font-size: 1rem;
  font-weight: 700;
  color: ${theme.textPrimary};
`;

const SidebarNav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0 0.5rem;
`;

const SidebarItem = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 6px;
  background: ${({ $active }) => ($active ? theme.blueLight : 'transparent')};
  color: ${({ $active }) => ($active ? theme.blue : theme.textSecondary)};
  font-size: 0.8125rem;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  cursor: pointer;
  transition: all 0.15s ${transition};
  text-align: left;

  &:hover {
    background: ${({ $active }) => ($active ? theme.blueLight : theme.bgTertiary)};
    color: ${({ $active }) => ($active ? theme.blue : theme.textPrimary)};
  }
`;

const ContentArea = styled.main`
  flex: 1;
  min-width: 0;
  padding: 1.5rem 2rem;
  overflow-y: auto;
  max-width: 600px;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
`;

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
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

// ─── Shortcut styles ─────────────────────────

const ShortcutList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const ShortcutSection = styled.div``;

const ShortcutSectionTitle = styled.div`
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.5rem;
`;

const ShortcutRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
`;

const ShortcutLabel = styled.span`
  font-size: 0.8125rem;
  color: ${theme.textPrimary};
`;

const KbdGroup = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
`;

const KbdPlus = styled.span`
  font-size: 0.75rem;
  color: ${theme.textMuted};
`;

const Kbd = styled.kbd`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  padding: 0.15rem 0.5rem;
  background: ${theme.bgTertiary};
  border: 1px solid ${theme.border};
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: inherit;
  font-weight: 500;
  color: ${theme.textSecondary};
  box-shadow: 0 1px 0 ${theme.border};
`;
