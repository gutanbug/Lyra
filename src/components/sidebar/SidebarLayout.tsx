import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { theme } from 'lib/styles/theme';
import { PanelLeftClose } from 'lucide-react';
import { useSplitView } from 'modules/contexts/splitView';

/**
 * 자식 트리에서 현재 사이드바를 토글할 수 있도록 노출.
 * Split View에서 두 개의 SidebarLayout이 동시에 마운트될 때 window 이벤트
 * 기반 토글은 두 사이드바를 동시에 열어버린다 — 따라서 각자의 자식만 자기
 * SidebarLayout을 토글하도록 React Context로 한정.
 */
interface SidebarContextValue {
  open: boolean;
  toggle: () => void;
}
const SidebarContext = createContext<SidebarContextValue | null>(null);

export const useSidebarToggle = (): SidebarContextValue => {
  const ctx = useContext(SidebarContext);
  // SidebarLayout 외부에서 호출돼도 안전하게 no-op 반환
  return ctx ?? { open: false, toggle: () => {} };
};

const MIN_WIDTH = 200;
const MAX_WIDTH = 500;
const DEFAULT_WIDTH = 280;
const STORAGE_KEY = 'lyra:sidebar-width';

function loadWidth(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v) {
      const n = Number(v);
      if (n >= MIN_WIDTH && n <= MAX_WIDTH) return n;
    }
  } catch { /* ignore */ }
  return DEFAULT_WIDTH;
}

interface Props {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const SidebarLayout = ({ sidebar, children }: Props) => {
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(loadWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const { isSplit } = useSplitView();

  // CmdOrCtrl + \ 단축키 — Split View에서는 focus가 자기 wrapper 안에 있을 때만 반응
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!((e.metaKey || e.ctrlKey) && e.key === '\\')) return;
      if (isSplit) {
        const active = document.activeElement;
        if (!wrapperRef.current || !active || !wrapperRef.current.contains(active)) return;
      }
      e.preventDefault();
      toggle();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle, isSplit]);

  // window 이벤트 기반 토글은 Split View에서 두 사이드바 동시 토글 문제를 일으키므로
  // 제거. 자식 컴포넌트는 useSidebarToggle() 훅으로 자기 사이드바만 제어해야 한다.

  // 드래그 핸들러
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      const delta = e.clientX - startX.current;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW.current + delta));
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // 너비 저장
      setWidth((w) => {
        try { localStorage.setItem(STORAGE_KEY, String(w)); } catch { /* ignore */ }
        return w;
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  return (
    <SidebarContext.Provider value={{ open, toggle }}>
      <Wrapper ref={wrapperRef}>
        <SidebarPanel $open={open} $width={width}>
          <SidebarHeader>
            <CloseBtn onClick={toggle} title="메뉴 닫기 (⌘\)">
              <PanelLeftClose size={16} />
            </CloseBtn>
          </SidebarHeader>
          <SidebarContent>{sidebar}</SidebarContent>
        </SidebarPanel>
        {open && <ResizeHandle onMouseDown={onResizeStart} />}
        <MainPanel>
          {children}
        </MainPanel>
      </Wrapper>
    </SidebarContext.Provider>
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

const SidebarPanel = styled.div<{ $open: boolean; $width: number }>`
  width: ${({ $width }) => $width}px;
  min-width: ${({ $width }) => $width}px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: ${theme.bgSecondary};
  border-right: 1px solid ${theme.border};
  transition: margin-left 0.2s ease;
  margin-left: ${({ $open, $width }) => ($open ? '0' : `-${$width}px`)};
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

const ResizeHandle = styled.div`
  width: 4px;
  cursor: col-resize;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  background: transparent;
  transition: background 0.15s ease;

  &:hover,
  &:active {
    background: ${theme.blue};
  }
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