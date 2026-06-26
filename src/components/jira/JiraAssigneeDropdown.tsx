import { RefObject, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';
import type { JiraAssignableUser } from 'types/jira';

interface Props {
  target: { issueKey: string; top: number; left: number };
  users: JiraAssignableUser[];
  isLoading: boolean;
  dropdownRef: RefObject<HTMLDivElement>;
  myAccountId?: string;
  myDisplayName?: string;
  myAvatarUrl?: string;
  onSearch: (query: string) => void;
  onSelect: (issueKey: string, accountId: string | null, displayName: string) => void;
  onClose: () => void;
}

const JiraAssigneeDropdown = ({ target, users, isLoading, dropdownRef, myAccountId, myDisplayName, myAvatarUrl, onSearch, onSelect, onClose }: Props) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(value);
    }, 250);
  }, [onSearch]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return createPortal(
    <Overlay onClick={onClose}>
      <Dropdown
        ref={dropdownRef}
        style={{ top: target.top, left: target.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <SearchInput
          ref={inputRef}
          type="text"
          placeholder="사용자 검색..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
        />
        <UserList>
          <Item onClick={() => onSelect(target.issueKey, null, '')}>
            <UnassignedIcon>—</UnassignedIcon>
            <UserName>담당자 없음</UserName>
          </Item>
          {myAccountId && myDisplayName && (
            <Item onClick={() => onSelect(target.issueKey, myAccountId, myDisplayName)}>
              {myAvatarUrl ? (
                <Avatar src={myAvatarUrl} alt={myDisplayName} />
              ) : (
                <AvatarPlaceholder>{myDisplayName.charAt(0)}</AvatarPlaceholder>
              )}
              <UserName>나에게 할당</UserName>
            </Item>
          )}
          {isLoading ? (
            <Message>검색 중...</Message>
          ) : users.length === 0 ? (
            <Message>검색 결과가 없습니다.</Message>
          ) : (
            users.filter((u) => u.accountId !== myAccountId).map((u) => (
              <Item
                key={u.accountId}
                onClick={() => onSelect(target.issueKey, u.accountId, u.displayName)}
              >
                {u.avatarUrl ? (
                  <Avatar src={u.avatarUrl} alt={u.displayName} />
                ) : (
                  <AvatarPlaceholder>{u.displayName.charAt(0)}</AvatarPlaceholder>
                )}
                <UserName>{u.displayName}</UserName>
              </Item>
            ))
          )}
        </UserList>
      </Dropdown>
    </Overlay>,
    document.getElementById('portal-root') || document.body
  );
};

export default JiraAssigneeDropdown;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
`;

const Dropdown = styled.div`
  position: fixed;
  transform: translateX(-50%);
  background: ${jiraTheme.bg.default};
  border: 1px solid ${jiraTheme.border};
  border-radius: ${jiraTheme.radius.ctl};
  box-shadow: ${jiraTheme.shadow.cardHover};
  z-index: 10000;
  min-width: 220px;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const SearchInput = styled.input`
  padding: 12px 14px;
  border: none;
  border-bottom: 1px solid ${jiraTheme.hairline};
  font-family: ${jiraTheme.font.body};
  font-size: 13.5px;
  color: ${jiraTheme.text.primary};
  background: transparent;
  outline: none;

  &::placeholder { color: ${jiraTheme.text.muted}; }
`;

const UserList = styled.div`
  max-height: 260px;
  overflow-y: auto;
  padding: 4px 0;
`;

const Item = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  font-family: ${jiraTheme.font.body};
  font-size: 13.5px;
  color: ${jiraTheme.text.primary};
  cursor: pointer;
  white-space: nowrap;
  transition: background ${jiraTheme.motion.fast};

  &:hover { background: ${jiraTheme.hairline}; }
`;

const Avatar = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
`;

const AvatarPlaceholder = styled.span`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${jiraTheme.primary};
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${jiraTheme.font.body};
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
`;

const UnassignedIcon = styled.span`
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: ${jiraTheme.text.muted};
  flex-shrink: 0;
`;


const UserName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Message = styled.div`
  padding: 0.75rem;
  text-align: center;
  font-size: 0.75rem;
  color: ${jiraTheme.text.muted};
`;
