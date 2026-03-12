import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { theme } from 'lib/styles/theme';
import { transition } from 'lib/styles/styles';
import { getServiceIcon, hasServiceIcon } from 'lib/icons/services';
import { useSplitView } from 'modules/contexts/splitView';
import { useAccount } from 'modules/contexts/account';

/** 메뉴 정의 (settings는 Split View 대상에서 제외) */
const MENUS = [
  { id: 'jira', path: '/jira', label: 'Jira', icon: 'jira' },
] as const;

const Header = () => {
  const location = useLocation();
  const history = useHistory();
  const { isSplit, leftPanel, rightPanel, openSplit, closeSplit } = useSplitView();
  const { accounts, activeAccount, setActive } = useAccount();

  // 프로필 드롭다운 상태
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // 컨텍스트 메뉴 상태
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; menuId: string } | null>(null);
  const contextRef = useRef<HTMLDivElement>(null);

  // 현재 활성 메뉴 id
  const activeMenuId = MENUS.find((m) => location.pathname.startsWith(m.path))?.id || '';

  const handleContextMenu = (e: React.MouseEvent, menuId: string) => {
    if (menuId === activeMenuId && !isSplit) return;
    if (menuId === 'settings') return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, menuId });
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

  const handleGoHome = () => {
    setProfileOpen(false);
    if (isSplit) closeSplit();
    history.push('/jira');
  };

  const handleGoSettings = () => {
    setProfileOpen(false);
    if (isSplit) closeSplit();
    history.push('/settings');
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

  return (
    <>
      <Nav>
        <NavLeft>
          <AppTitle to="/jira" onClick={(e) => {
            if (isSplit) {
              e.preventDefault();
              handleGoHome();
            }
          }}>
            Lyra
          </AppTitle>

          <NavDivider />

          {MENUS.map((menu) => {
            const isActive = isSplit
              ? menu.id === leftPanel || menu.id === rightPanel
              : location.pathname.startsWith(menu.path);
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

          {isSplit && (
            <SplitIndicator onClick={handleCloseSplit}>
              Split View
              <CloseIcon>&times;</CloseIcon>
            </SplitIndicator>
          )}
        </NavLeft>

        <NavRight ref={profileRef}>
          <ProfileButton
            onClick={() => setProfileOpen((v) => !v)}
            $active={profileOpen || location.pathname === '/settings'}
          >
            <ProfileSvg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </ProfileSvg>
          </ProfileButton>

          {profileOpen && (
            <ProfileDropdown $hasAccounts={accounts.length > 0}>
              {accounts.length > 0 && (
                <PanelAccounts>
                  <PanelTitle>계정</PanelTitle>
                  {Array.from(new Set(accounts.map((a) => a.serviceType))).map((serviceType) => {
                    const group = accounts.filter((a) => a.serviceType === serviceType);
                    return (
                      <React.Fragment key={serviceType}>
                        <AccountGroupLabel>
                          {hasServiceIcon(serviceType) && (
                            <SectionIconWrap>{getServiceIcon(serviceType, 13)}</SectionIconWrap>
                          )}
                          {serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}
                        </AccountGroupLabel>
                        {group.map((account) => {
                          const isActive = activeAccount?.id === account.id;
                          return (
                            <AccountItem
                              key={account.id}
                              $active={isActive}
                              onClick={() => {
                                if (!isActive) setActive(account.id);
                                setProfileOpen(false);
                              }}
                            >
                              <AccountInfo>
                                <AccountName>{account.displayName}</AccountName>
                                {'baseUrl' in account.credentials && (
                                  <AccountMeta>
                                    {(account.credentials as { baseUrl?: string }).baseUrl}
                                  </AccountMeta>
                                )}
                              </AccountInfo>
                              {isActive && (
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
                    );
                  })}
                </PanelAccounts>
              )}
              <PanelMenu>
                <PanelTitle>메뉴</PanelTitle>
                <MenuItem onClick={handleGoSettings}>
                  <MenuIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </MenuIcon>
                  계정 설정
                </MenuItem>
              </PanelMenu>
            </ProfileDropdown>
          )}
        </NavRight>
      </Nav>

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
  position: relative;
  display: flex;
  align-items: center;
`;

const AppTitle = styled(Link)`
  font-size: 1.05rem;
  font-weight: 700;
  color: ${theme.blue};
  text-decoration: none;
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

const SplitIndicator = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin-left: 0.5rem;
  padding: 0.2rem 0.5rem;
  background: ${theme.blueLight};
  border: 1px solid ${theme.blueLighter};
  border-radius: 20px;
  color: ${theme.blueDarker};
  font-size: 0.6875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ${transition};

  &:hover {
    background: ${theme.blueLighter};
  }
`;

const CloseIcon = styled.span`
  font-size: 0.875rem;
  line-height: 1;
`;

const ProfileButton = styled.button<{ $active?: boolean }>`
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

const ProfileSvg = styled.svg`
  width: 1.125rem;
  height: 1.125rem;
`;

const ProfileDropdown = styled.div<{ $hasAccounts: boolean }>`
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  display: flex;
  background: ${theme.bgPrimary};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 200;
  overflow: hidden;
`;

const PanelAccounts = styled.div`
  width: 220px;
  padding: 0.5rem 0;
  border-right: 1px solid ${theme.border};
  max-height: 320px;
  overflow-y: auto;
`;

const PanelMenu = styled.div`
  width: 160px;
  padding: 0.5rem 0;
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

const AccountItem = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.375rem 0.875rem;
  cursor: pointer;
  transition: background 0.1s;
  background: ${({ $active }) => ($active ? theme.blueLight : 'transparent')};

  &:hover {
    background: ${({ $active }) => ($active ? theme.blueLight : theme.bgTertiary)};
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

const MenuItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.875rem;
  font-size: 0.8125rem;
  color: ${theme.textPrimary};
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: ${theme.bgTertiary};
  }
`;

const MenuIcon = styled.svg`
  width: 0.9375rem;
  height: 0.9375rem;
  flex-shrink: 0;
`;

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
