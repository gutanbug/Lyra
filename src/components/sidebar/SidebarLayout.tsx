import React, { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from 'lib/styles/theme';
import { PanelLeftClose } from 'lucide-react';

interface Props {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const SidebarLayout = ({ sidebar, children }: Props) => {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  // CmdOrCtrl + \ 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle]);

  return (
    <Wrapper>
      <SidebarPanel $open={open}>
        <SidebarHeader>
          <CloseBtn onClick={toggle} title="메뉴 닫기 (⌘\)">
            <PanelLeftClose size={16} />
          </CloseBtn>
        </SidebarHeader>
        <SidebarContent>{sidebar}</SidebarContent>
      </SidebarPanel>
      <MainPanel>
        {children}
      </MainPanel>
    </Wrapper>
  );
};

export default SidebarLayout;

const Wrapper = styled.div`
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

const SidebarPanel = styled.div<{ $open: boolean }>`
  width: 280px;
  min-width: 280px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: ${theme.bgSecondary};
  border-right: 1px solid ${theme.border};
  transition: margin-left 0.2s ease;
  margin-left: ${({ $open }) => ($open ? '0' : '-280px')};
  flex-shrink: 0;
`;

const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 10px;
  flex-shrink: 0;
`;

const SidebarContent = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
`;

const CloseBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: ${theme.textMuted};
  cursor: pointer;

  &:hover {
    background: ${theme.bgTertiary};
    color: ${theme.textPrimary};
  }
`;

const MainPanel = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
`;
