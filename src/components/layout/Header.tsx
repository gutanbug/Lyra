import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react';
import { Link, useLocation, useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { theme } from 'lib/styles/theme';
import { transition } from 'lib/styles/styles';
import { getServiceIcon, hasServiceIcon } from 'lib/icons/services';
import { useTabs } from 'modules/contexts/splitView';
import { useAccount } from 'modules/contexts/account';
import { isAtlassianAccount } from 'types/account';
import { newSnackbar } from 'modules/actions/snackbar';
import { snackbarContext } from 'modules/contexts/snackbar';
import type { Tab } from 'modules/contexts/splitView';

/** 메뉴 정의 */
const MENUS = [
  { id: 'jira', path: '/jira', label: 'Jira', icon: 'jira' },
  { id: 'confluence', path: '/confluence', label: 'Confluence', icon: 'confluence' },
] as const;

const Header = () => {
  const location = useLocation();
  const history = useHistory();
  const {
    tabs, activeTabId, addTab, closeTab, activateTab, deactivateTab, renameTab, closeAllTabs,
    isSplit, leftPanel, rightPanel, openSplit, closeSplit,
  } = useTabs();
  const { accounts, activeAccount, setActive } = useAccount();
  const { dispatch: snackbarDispatch } = useContext(snackbarContext);

  // 프로필 드롭다운 상태
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileIdx, setProfileIdx] = useState(-1);
  const profileRef = useRef<HTMLDivElement>(null);

  // 계정 flat 리스트 (방향키 탐색용)
  const flatAccounts = useMemo(() => accounts, [accounts]);

  // 컨텍스트 메뉴 상태 (메뉴 우클릭)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; menuId: string } | null>(null);
  const contextRef = useRef<HTMLDivElement>(null);

  // 탭 이름 편집 상태
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // 현재 활성 메뉴 id
  const activeMenuId = MENUS.find((m) => location.pathname.startsWith(m.path))?.id || '';

  const handleContextMenu = (e: React.MouseEvent, menuId: string) => {
    if (menuId === 'settings') return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, menuId });
  };

  const handleNewTab = () => {
    if (!contextMenu) return;
    const paths: Record<string, string> = { jira: '/jira', confluence: '/confluence' };
    addTab(contextMenu.menuId, paths[contextMenu.menuId] || `/${contextMenu.menuId}`);
    setContextMenu(null);
  };

  const handleSplitOpen = () => {
    if (!contextMenu) return;
    const currentId = isSplit ? (leftPanel || activeMenuId) : activeMenuId;
    openSplit(currentId, contextMenu.menuId);
    setContextMenu(null);
  };

  const handleCloseSplit = () => {
    closeSplit();
    setContextMenu(null);
  };

  const handleGoSettings = () => {
    setProfileOpen(false);
    deactivateTab();
    if (isSplit) closeSplit();
    history.push('/settings');
  };

  const handleGoStats = () => {
    deactivateTab();
    if (isSplit) closeSplit();
    history.push('/stats');
  };

  // 탭 더블클릭 → 이름 편집 시작
  const startRename = (tab: Tab) => {
    setEditingTabId(tab.id);
    setEditingName(tab.name);
    setTimeout(() => editInputRef.current?.select(), 0);
  };

  const commitRename = () => {
    if (editingTabId && editingName.trim()) {
      renameTab(editingTabId, editingName.trim());
    }
    setEditingTabId(null);
    setEditingName('');
  };

  // "메인" 탭 클릭 → 탭 비활성화, 기본 뷰로
  const handleMainTabClick = () => {
    deactivateTab();
  };

  // 외부 클릭 시 드롭다운/컨텍스트 메뉴 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      setContextMenu(null);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // CmdOrCtrl+; → 프로필 드롭다운 토글
  useEffect(() => {
    const handleToggleProfile = () => setProfileOpen((v) => {
      if (!v) {
        // 열릴 때: 현재 활성 계정의 인덱스를 선택
        const idx = flatAccounts.findIndex((a) => a.id === activeAccount?.id);
        setProfileIdx(idx >= 0 ? idx : 0);
      }
      return !v;
    });
    window.addEventListener('lyra:toggle-profile', handleToggleProfile);
    return () => window.removeEventListener('lyra:toggle-profile', handleToggleProfile);
  }, [flatAccounts, activeAccount]);

  // 프로필 드롭다운 닫힐 때 인덱스 초기화
  useEffect(() => {
    if (!profileOpen) setProfileIdx(-1);
  }, [profileOpen]);

  // 프로필 드롭다운 키보드 네비게이션
  const handleProfileSelect = useCallback(async (idx: number) => {
    const account = flatAccounts[idx];
    if (!account) return;
    const isAlreadyActive = activeAccount?.id === account.id;
    if (!isAlreadyActive) {
      try {
        await setActive(account.id);
        newSnackbar(snackbarDispatch, `프로필이 변경되었습니다. (${account.displayName})`, 'SUCCESS');
      } catch {
        newSnackbar(snackbarDispatch, '프로필 변경에 실패했습니다.', 'ERROR');
      }
    }
    setProfileOpen(false);
  }, [flatAccounts, activeAccount, setActive, snackbarDispatch]);

  useEffect(() => {
    if (!profileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setProfileIdx((prev) => (prev + 1) % flatAccounts.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setProfileIdx((prev) => (prev - 1 + flatAccounts.length) % flatAccounts.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (profileIdx >= 0) handleProfileSelect(profileIdx);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setProfileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [profileOpen, profileIdx, flatAccounts.length, handleProfileSelect]);

  return (
    <>
      <Nav>
        <NavLeft>
          <AppTitle>Lyra</AppTitle>

          <NavDivider />

          {MENUS.map((menu) => {
            const isActive = isSplit
              ? menu.id === leftPanel || menu.id === rightPanel
              : !activeTabId && location.pathname.startsWith(menu.path);
            return (
              <StyledLink
                key={menu.id}
                to={isSplit ? '#' : menu.path}
                $active={isActive}
                onClick={(e) => {
                  if (isSplit) {
                    e.preventDefault();
                    closeSplit();
                    history.push(menu.path);
                  }
                  if (activeTabId) deactivateTab();
                }}
                onContextMenu={(e) => handleContextMenu(e, menu.id)}
              >
                {menu.icon && hasServiceIcon(menu.icon) && (
                  <NavIconWrap>{getServiceIcon(menu.icon, 16)}</NavIconWrap>
                )}
                {menu.label}
              </StyledLink>
            );
          })}
        </NavLeft>

        <NavRight>
          {/* 프로필 버튼 */}
          <NavIconButton ref={profileRef}>
            <IconButton
              onClick={() => setProfileOpen((v) => !v)}
              $active={profileOpen}
            >
              <IconSvg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </IconSvg>
            </IconButton>

            {profileOpen && accounts.length > 0 && (
              <ProfileDropdown>
                <PanelTitle>계정</PanelTitle>
                {(() => {
                  const groupMap = new Map<string, typeof accounts>();
                  for (const a of accounts) {
                    const groupKey = isAtlassianAccount(a.serviceType) ? 'atlassian' : a.serviceType;
                    if (!groupMap.has(groupKey)) groupMap.set(groupKey, []);
                    groupMap.get(groupKey)!.push(a);
                  }
                  let flatIdx = 0;
                  return Array.from(groupMap.entries()).map(([groupKey, group]) => (
                    <React.Fragment key={groupKey}>
                      <AccountGroupLabel>
                        {hasServiceIcon(groupKey) && (
                          <SectionIconWrap>{getServiceIcon(groupKey, 13)}</SectionIconWrap>
                        )}
                        {groupKey.charAt(0).toUpperCase() + groupKey.slice(1)}
                      </AccountGroupLabel>
                      {group.map((account) => {
                        const isCurrentActive = activeAccount?.id === account.id;
                        const idx = flatIdx++;
                        const isHighlighted = idx === profileIdx;
                        return (
                          <AccountItem
                            key={account.id}
                            $active={isCurrentActive}
                            $highlighted={isHighlighted}
                            onClick={() => handleProfileSelect(idx)}
                            onMouseEnter={() => setProfileIdx(idx)}
                          >
                            <AccountInfo>
                              <AccountName>{account.displayName}</AccountName>
                              {'baseUrl' in account.credentials && (
                                <AccountMeta>
                                  {(account.credentials as { baseUrl?: string }).baseUrl}
                                </AccountMeta>
                              )}
                            </AccountInfo>
                            {isCurrentActive && (
                              <ActiveBadge>
                                <CheckSvg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="2,6 5,9 10,3" />
                                </CheckSvg>
                              </ActiveBadge>
                            )}
                          </AccountItem>
                        );
                      })}
                    </React.Fragment>
                  ));
                })()}
              </ProfileDropdown>
            )}
          </NavIconButton>

          {/* 통계 버튼 */}
          <IconButton
            onClick={handleGoStats}
            $active={location.pathname.startsWith('/stats')}
            title="통계"
          >
            <IconSvg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </IconSvg>
          </IconButton>

          {/* 설정 버튼 */}
          <IconButton
            onClick={handleGoSettings}
            $active={location.pathname.startsWith('/settings')}
          >
            <IconSvg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </IconSvg>
          </IconButton>
        </NavRight>
      </Nav>

      {/* 탭 바 (탭이 1개 이상일 때 표시) */}
      {tabs.length > 0 && (
        <TabBar>
          <TabItem
            $active={activeTabId === null}
            onClick={handleMainTabClick}
          >
            <TabLabel>메인</TabLabel>
          </TabItem>

          {tabs.map((tab) => {
            const isActive = activeTabId === tab.id;
            const isEditing = editingTabId === tab.id;
            return (
              <TabItem
                key={tab.id}
                $active={isActive}
                onClick={() => activateTab(tab.id)}
                onDoubleClick={() => startRename(tab)}
              >
                {tab.menuId && hasServiceIcon(tab.menuId) && (
                  <TabIconWrap>{getServiceIcon(tab.menuId, 13)}</TabIconWrap>
                )}
                {isEditing ? (
                  <TabInput
                    ref={editInputRef}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') { setEditingTabId(null); setEditingName(''); }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <TabLabel>{tab.name}</TabLabel>
                )}
                <TabClose
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                >
                  &times;
                </TabClose>
              </TabItem>
            );
          })}
        </TabBar>
      )}

      {/* 우클릭 컨텍스트 메뉴 */}
      {contextMenu && (
        <ContextOverlay onClick={() => setContextMenu(null)}>
          <ContextMenuBox
            ref={contextRef}
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <ContextMenuItem onClick={handleSplitOpen}>
              Split View로 열기
            </ContextMenuItem>
            {isSplit && (
              <ContextMenuItem onClick={handleCloseSplit}>
                Split View 닫기
              </ContextMenuItem>
            )}
            <ContextMenuDivider />
            <ContextMenuItem onClick={handleNewTab}>
              새 탭으로 열기
            </ContextMenuItem>
            {tabs.length > 0 && (
              <ContextMenuItem onClick={() => { closeAllTabs(); setContextMenu(null); }}>
                모든 탭 닫기
              </ContextMenuItem>
            )}
          </ContextMenuBox>
        </ContextOverlay>
      )}
    </>
  );
};

export default Header;

// ─── Styled Components ─────────────────────────

const Nav = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 3rem;
  background: ${theme.bgPrimary};
  border-bottom: 1px solid ${theme.border};
  zoom: 1.2;
`;

const NavLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1.25rem;
`;

const NavRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const NavIconButton = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const AppTitle = styled.span`
  font-size: 1.05rem;
  font-weight: 700;
  color: ${theme.blue};
  letter-spacing: -0.01em;
`;

const NavDivider = styled.div`
  width: 1px;
  height: 1.125rem;
  background: ${theme.border};
`;

const StyledLink = styled(Link)<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: ${({ $active }) => ($active ? theme.blue : theme.textSecondary)};
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: color 0.2s ${transition};

  &:hover {
    color: ${theme.blue};
  }
`;

const NavIconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;

  & > svg { width: 100%; height: 100%; }
`;

const IconButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 1.5px solid ${({ $active }) => ($active ? theme.blue : theme.border)};
  background: ${({ $active }) => ($active ? theme.blueLight : theme.bgSecondary)};
  color: ${({ $active }) => ($active ? theme.blue : theme.textSecondary)};
  cursor: pointer;
  transition: all 0.15s ${transition};

  &:hover {
    border-color: ${theme.blue};
    color: ${theme.blue};
    background: ${theme.blueLight};
  }
`;

const IconSvg = styled.svg`
  width: 1.125rem;
  height: 1.125rem;
`;

// ─── Tab Bar ─────────────────────────────────

const TabBar = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 0;
  padding: 0 2rem;
  background: ${theme.bgSecondary};
  border-bottom: 1px solid ${theme.border};
  height: 2.25rem;
  zoom: 1.2;
  overflow-x: auto;

  &::-webkit-scrollbar { display: none; }
`;

const TabItem = styled.div<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  height: 100%;
  padding: 0 0.75rem;
  font-size: 0.75rem;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  color: ${({ $active }) => ($active ? theme.textPrimary : theme.textSecondary)};
  background: ${({ $active }) => ($active ? theme.bgPrimary : 'transparent')};
  border-left: 1px solid ${({ $active }) => ($active ? theme.border : 'transparent')};
  border-right: 1px solid ${({ $active }) => ($active ? theme.border : 'transparent')};
  border-top: ${({ $active }) => ($active ? `2px solid ${theme.blue}` : '2px solid transparent')};
  border-bottom: ${({ $active }) => ($active ? 'none' : `1px solid ${theme.border}`)};
  margin-bottom: ${({ $active }) => ($active ? '-1px' : '0')};
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s, color 0.12s;
  min-width: 0;
  max-width: 180px;
  position: relative;

  &:hover {
    background: ${({ $active }) => ($active ? theme.bgPrimary : theme.bgTertiary)};
    color: ${theme.textPrimary};
  }
`;

const TabIconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  width: 0.8125rem;
  height: 0.8125rem;
  flex-shrink: 0;

  & > svg { width: 100%; height: 100%; }
`;

const TabLabel = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TabInput = styled.input`
  width: 80px;
  border: 1px solid ${theme.blue};
  border-radius: 3px;
  background: ${theme.bgPrimary};
  color: ${theme.textPrimary};
  font-size: 0.75rem;
  padding: 0.1rem 0.25rem;
  outline: none;
`;

const TabClose = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  font-size: 0.875rem;
  line-height: 1;
  border-radius: 3px;
  color: ${theme.textMuted};
  flex-shrink: 0;

  &:hover {
    background: rgba(0, 0, 0, 0.08);
    color: ${theme.textPrimary};
  }
`;

// ─── Profile Dropdown ─────────────────────────

const ProfileDropdown = styled.div`
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  background: ${theme.bgPrimary};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 200;
  overflow: hidden;
  width: 220px;
  padding: 0.5rem 0;
  max-height: 320px;
  overflow-y: auto;
`;

const PanelTitle = styled.div`
  padding: 0.25rem 0.875rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const AccountGroupLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.875rem 0.125rem;
  font-size: 0.625rem;
  font-weight: 600;
  color: ${theme.textMuted};
`;

const SectionIconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  width: 0.8125rem;
  height: 0.8125rem;
  flex-shrink: 0;

  & > svg { width: 100%; height: 100%; }
`;

const AccountItem = styled.div<{ $active?: boolean; $highlighted?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.375rem 0.875rem;
  cursor: pointer;
  transition: background 0.1s;
  background: ${({ $highlighted }) => ($highlighted ? theme.blueLight : 'transparent')};

  &:hover {
    background: ${theme.blueLight};
  }
`;

const AccountInfo = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const AccountName = styled.span`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${theme.textPrimary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const AccountMeta = styled.span`
  font-size: 0.6875rem;
  color: ${theme.textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ActiveBadge = styled.span`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  color: ${theme.blue};
`;

const CheckSvg = styled.svg`
  width: 0.75rem;
  height: 0.75rem;
`;

// ─── Context Menu ─────────────────────────

const ContextOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 500;
`;

const ContextMenuBox = styled.div`
  position: fixed;
  background: ${theme.bgPrimary};
  border: 1px solid ${theme.border};
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  padding: 0.25rem 0;
  z-index: 501;
`;

const ContextMenuItem = styled.div`
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  color: ${theme.textPrimary};
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: ${theme.bgTertiary};
  }
`;

const ContextMenuDivider = styled.div`
  height: 1px;
  background: ${theme.border};
  margin: 0.25rem 0;
`;
