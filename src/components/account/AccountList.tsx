import React from 'react';
import styled from 'styled-components';
import type { Account } from 'types/account';
import { isAtlassianAccount, isGitHostAccount } from 'types/account';
import { accountController } from 'controllers/account';
import { useAccount } from 'modules/contexts/account';
import { newSnackbar } from 'modules/actions/snackbar';
import { snackbarContext } from 'modules/contexts/snackbar';
import { getServiceIcon, hasServiceIcon } from 'lib/icons/services';
import { theme } from 'lib/styles/theme';
import { transition } from 'lib/styles/styles';

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  width: 100%;
`;

const Item = styled.li<{ $active?: boolean; $selected?: boolean }>`
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 20px;
  margin-bottom: 10px;
  background: ${theme.color.surface};
  border: 1px solid ${({ $active, $selected }) =>
    ($selected ? theme.color.accent : $active ? theme.color.accent : theme.color.borderDefault)};
  border-radius: ${theme.radius.card};
  box-shadow: ${({ $active, $selected }) => (($selected || $active) ? theme.shadow.cardHover : theme.shadow.card)};
  cursor: pointer;
  transition: border-color ${theme.motion.fast}, box-shadow ${theme.motion.fast}, transform ${theme.motion.fast};

  ${({ $selected }) => !$selected && `
    &:hover { transform: translateY(-2px); box-shadow: ${theme.shadow.cardHover}; }
  `}
`;

const Info = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
`;

const Name = styled.span`
  font-family: ${theme.font.body};
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${theme.color.gray8};
`;

const Meta = styled.span`
  font-family: ${theme.font.body};
  font-size: 13px;
  color: ${theme.color.gray5};
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
`;

const Button = styled.button<{ $variant?: 'primary' | 'danger' }>`
  padding: 8px 14px;
  font-family: ${theme.font.body};
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  border: 1px solid transparent;
  border-radius: ${theme.radius.ctl};
  cursor: pointer;
  transition: background ${theme.motion.fast}, color ${theme.motion.fast}, border-color ${theme.motion.fast};

  ${({ $variant }) =>
    $variant === 'danger'
      ? `
    background: ${theme.color.dangerSoft};
    color: ${theme.color.dangerInk};
    border-color: ${theme.color.dangerSoft};
    &:hover { background: #f9d6da; }
  `
      : `
    background: ${theme.color.accentSoft};
    color: ${theme.color.accentStrong};
    border-color: ${theme.color.accentSoft};
    &:hover { background: #d8e9ff; }
  `}
`;

const Empty = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 25rem);
  color: ${theme.textMuted};
  font-size: 0.95rem;
`;

const AccountIconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  width: 1.25rem;
  height: 1.25rem;
  margin-right: 0.5rem;
  vertical-align: middle;
  flex-shrink: 0;

  & > svg { width: 100%; height: 100%; }
`;

interface AccountListProps {
  onEdit?: (account: Account) => void;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
}

const AccountList = ({ onEdit, onSelect, selectedId }: AccountListProps) => {
  const { accounts, activeAccount, refresh, setActive } = useAccount();
  const { dispatch: snackbarDispatch } = React.useContext(snackbarContext);

  const handleSetActive = async (id: string) => {
    try {
      await setActive(id);
      newSnackbar(snackbarDispatch, '활성 계정이 변경되었습니다.', 'SUCCESS');
    } catch (err) {
      newSnackbar(snackbarDispatch, '활성 계정 변경에 실패했습니다.', 'ERROR');
    }
  };

  const handleRemove = async (account: Account) => {
    if (!window.confirm(`"${account.displayName}" 계정을 삭제하시겠습니까?`)) return;

    try {
      await accountController.remove(account.id);
      newSnackbar(snackbarDispatch, '계정이 삭제되었습니다.', 'SUCCESS');
      refresh();
    } catch (err) {
      newSnackbar(snackbarDispatch, '계정 삭제에 실패했습니다.', 'ERROR');
    }
  };

  if (accounts.length === 0) {
    return (
      <Empty>계정을 추가해주세요.</Empty>
    );
  }

  /**
   * 계정 그룹 분류:
   * - atlassian: Jira/Confluence 등 — 단일 활성 계정 개념 유지
   * - gitHost: GitHub/GitLab — 등록한 모든 계정이 동시에 사용됨, 활성화 개념 없음
   * - others: 기타(Notion/Trello/Slack 등 향후)
   */
  const atlassianAccounts = accounts.filter((a) => isAtlassianAccount(a.serviceType));
  const gitHostAccounts = accounts.filter((a) => isGitHostAccount(a.serviceType));
  const otherAccounts = accounts.filter(
    (a) => !isAtlassianAccount(a.serviceType) && !isGitHostAccount(a.serviceType),
  );

  const renderItem = (account: Account) => {
    const isGitHost = isGitHostAccount(account.serviceType);
    return (
      <Item
        key={account.id}
        $active={!isGitHost && activeAccount?.id === account.id}
        $selected={selectedId === account.id}
        onClick={() => onSelect?.(account.id)}
      >
        <Info>
          <Name>
            {hasServiceIcon(account.serviceType) ? (
              <>
                <AccountIconWrap>{getServiceIcon(account.serviceType, 20)}</AccountIconWrap>
                {account.displayName}
              </>
            ) : (
              account.displayName
            )}
          </Name>
          <Meta>
            {account.serviceType.charAt(0).toUpperCase() + account.serviceType.slice(1)}
            {'baseUrl' in account.credentials &&
              ` · ${(account.credentials as { baseUrl?: string }).baseUrl}`}
          </Meta>
        </Info>
        <Actions>
          {!isGitHost && activeAccount?.id !== account.id && (
            <Button onClick={() => handleSetActive(account.id)}>활성화</Button>
          )}
          {onEdit && (
            <Button onClick={() => onEdit(account)}>수정</Button>
          )}
          <Button $variant="danger" onClick={() => handleRemove(account)}>
            삭제
          </Button>
        </Actions>
      </Item>
    );
  };

  return (
    <>
      {atlassianAccounts.length > 0 && (
        <Section>
          <SectionHeader>Atlassian</SectionHeader>
          <List>{atlassianAccounts.map(renderItem)}</List>
        </Section>
      )}
      {gitHostAccounts.length > 0 && (
        <Section>
          <SectionHeader>Github / Gitlab</SectionHeader>
          <List>{gitHostAccounts.map(renderItem)}</List>
        </Section>
      )}
      {otherAccounts.length > 0 && (
        <Section>
          <SectionHeader>기타</SectionHeader>
          <List>{otherAccounts.map(renderItem)}</List>
        </Section>
      )}
    </>
  );
};

const Section = styled.section`
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionHeader = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

export default AccountList;
