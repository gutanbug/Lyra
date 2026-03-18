import React from 'react';
import styled from 'styled-components';
import type { Account } from 'types/account';
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
  padding: 1rem 1.25rem;
  margin-bottom: 0.5rem;
  background: ${({ $active }) => ($active ? theme.blueLight : theme.bgSecondary)};
  border: 2px solid ${({ $active, $selected }) => ($selected ? theme.blue : $active ? theme.blue : theme.border)};
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s;

  ${({ $selected }) => !$selected && `
    &:hover { border-color: ${theme.textMuted}; }
  `}
`;

const Info = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const Name = styled.span`
  font-weight: 600;
  color: ${theme.textPrimary};
`;

const Meta = styled.span`
  font-size: 0.75rem;
  color: ${theme.textSecondary};
`;

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const Button = styled.button<{ $variant?: 'primary' | 'danger' }>`
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ${transition};

  ${({ $variant }) =>
    $variant === 'danger'
      ? `
    background: #fef2f2;
    color: ${theme.error};
    &:hover { background: #fee2e2; }
  `
      : `
    background: ${theme.blueLight};
    color: ${theme.blue};
    &:hover { background: ${theme.blueLighter}; }
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
      <Empty>계정을 추가하고 활성화해주세요.</Empty>
    );
  }

  return (
    <List>
      {accounts.map((account) => (
        <Item
          key={account.id}
          $active={activeAccount?.id === account.id}
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
            {activeAccount?.id !== account.id && (
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
      ))}
    </List>
  );
};

export default AccountList;
