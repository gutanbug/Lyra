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
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // 화살표 키/Enter가 대상으로 삼을 평탄화된 옵션 목록(렌더 순서와 동일).
  const listUsers = users.filter((u) => u.accountId !== myAccountId);
  const hasMe = Boolean(myAccountId && myDisplayName);
  const options: { accountId: string | null; displayName: string }[] = [
    { accountId: null, displayName: '' },
    ...(hasMe ? [{ accountId: myAccountId as string, displayName: myDisplayName as string }] : []),
    ...listUsers.map((u) => ({ accountId: u.accountId, displayName: u.displayName })),
  ];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 검색 결과가 바뀌면 활성 항목을 첫 옵션으로 되돌린다.
  useEffect(() => {
    setActiveIndex(0);
  }, [users, query]);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(value);
    }, 250);
  }, [onSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = options[activeIndex];
      if (o) onSelect(target.issueKey, o.accountId, o.displayName);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const usersStart = 1 + (hasMe ? 1 : 0);

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
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded
          aria-controls="assignee-listbox"
          aria-activedescendant={`assignee-opt-${activeIndex}`}
          aria-autocomplete="list"
        />
        <UserList id="assignee-listbox" role="listbox" aria-label="담당자">
          <Item
            id="assignee-opt-0"
            role="option"
            aria-selected={activeIndex === 0}
            $active={activeIndex === 0}
            onMouseEnter={() => setActiveIndex(0)}
            onClick={() => onSelect(target.issueKey, null, '')}
          >
            <UnassignedIcon>—</UnassignedIcon>
            <UserName>담당자 없음</UserName>
          </Item>
          {hasMe && (
            <Item
              id="assignee-opt-1"
              role="option"
              aria-selected={activeIndex === 1}
              $active={activeIndex === 1}
              onMouseEnter={() => setActiveIndex(1)}
              onClick={() => onSelect(target.issueKey, myAccountId as string, myDisplayName as string)}
            >
              {myAvatarUrl ? (
                <Avatar src={myAvatarUrl} alt={myDisplayName} />
              ) : (
                <AvatarPlaceholder>{(myDisplayName as string).charAt(0)}</AvatarPlaceholder>
              )}
              <UserName>나에게 할당</UserName>
            </Item>
          )}
          {isLoading ? (
            <Message>검색 중...</Message>
          ) : listUsers.length === 0 ? (
            <Message>검색 결과가 없습니다.</Message>
          ) : (
            listUsers.map((u, i) => {
              const idx = usersStart + i;
              return (
                <Item
                  key={u.accountId}
                  id={`assignee-opt-${idx}`}
                  role="option"
                  aria-selected={activeIndex === idx}
                  $active={activeIndex === idx}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => onSelect(target.issueKey, u.accountId, u.displayName)}
                >
                  {u.avatarUrl ? (
                    <Avatar src={u.avatarUrl} alt={u.displayName} />
                  ) : (
                    <AvatarPlaceholder>{u.displayName.charAt(0)}</AvatarPlaceholder>
                  )}
                  <UserName>{u.displayName}</UserName>
                </Item>
              );
            })
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

const Item = styled.div<{ $active?: boolean }>`
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
  background: ${({ $active }) => ($active ? jiraTheme.hairline : 'transparent')};

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
