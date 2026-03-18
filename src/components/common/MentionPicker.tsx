import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';

export interface MentionUser {
  accountId: string;
  displayName: string;
  avatarUrl: string;
  emailAddress?: string;
}

interface MentionPickerProps {
  users: MentionUser[];
  isLoading: boolean;
  selectedIndex: number;
  onSelect: (user: MentionUser) => void;
}

const MentionPicker = ({
  users,
  isLoading,
  selectedIndex,
  onSelect,
}: MentionPickerProps) => {
  const listRef = useRef<HTMLDivElement>(null);

  // 선택된 항목이 보이도록 스크롤
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex] as HTMLElement;
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isLoading && users.length === 0) return null;

  return (
    <Panel>
      {isLoading && users.length === 0 ? (
        <LoadingRow>검색 중...</LoadingRow>
      ) : (
        <List ref={listRef}>
          {users.map((user, idx) => (
            <UserRow
              key={user.accountId}
              $active={idx === selectedIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(user);
              }}
            >
              <Avatar src={user.avatarUrl} alt="" />
              <UserInfo>
                <UserName>{user.displayName}</UserName>
                {user.emailAddress && <UserEmail>{user.emailAddress}</UserEmail>}
              </UserInfo>
            </UserRow>
          ))}
          {isLoading && users.length > 0 && <LoadingRow>검색 중...</LoadingRow>}
        </List>
      )}
    </Panel>
  );
};

export default MentionPicker;

/* ─── Styled Components ─── */

const Panel = styled.div`
  position: absolute;
  bottom: 100%;
  left: 0;
  z-index: 100;
  min-width: 240px;
  max-width: 320px;
  max-height: 200px;
  margin-bottom: 4px;
  background: ${jiraTheme.bg.default};
  border: 1px solid ${jiraTheme.border};
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
  overflow: hidden;
`;

const List = styled.div`
  max-height: 200px;
  overflow-y: auto;
  padding: 4px 0;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${jiraTheme.border};
    border-radius: 3px;
  }
`;

const UserRow = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  background: ${({ $active }) => ($active ? jiraTheme.bg.hover : 'transparent')};
  transition: background 0.08s;

  &:hover {
    background: ${jiraTheme.bg.hover};
  }
`;

const Avatar = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const UserName = styled.span`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${jiraTheme.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UserEmail = styled.span`
  font-size: 0.6875rem;
  color: ${jiraTheme.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const LoadingRow = styled.div`
  padding: 8px 12px;
  font-size: 0.8125rem;
  color: ${jiraTheme.text.secondary};
`;
