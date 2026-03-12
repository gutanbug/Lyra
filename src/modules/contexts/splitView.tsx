import React, { createContext, useContext, useState, useCallback } from 'react';

export interface PanelRoute {
  /** 메뉴 식별자 (예: 'jira', 'settings') */
  id: string;
  /** 라우트 경로 (예: '/jira') */
  path: string;
  /** 표시 이름 */
  label: string;
}

interface SplitViewState {
  /** Split View 활성화 여부 */
  isSplit: boolean;
  /** 왼쪽 패널 메뉴 id */
  leftPanel: string | null;
  /** 오른쪽 패널 메뉴 id */
  rightPanel: string | null;
  /** Split View 시작: 기존 메뉴를 왼쪽, 새 메뉴를 오른쪽으로 */
  openSplit: (currentMenuId: string, newMenuId: string) => void;
  /** Split View 종료 */
  closeSplit: () => void;
}

const SplitViewContext = createContext<SplitViewState>({
  isSplit: false,
  leftPanel: null,
  rightPanel: null,
  openSplit: () => {},
  closeSplit: () => {},
});

export const useSplitView = () => useContext(SplitViewContext);

export const SplitViewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSplit, setIsSplit] = useState(false);
  const [leftPanel, setLeftPanel] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<string | null>(null);

  const openSplit = useCallback((currentMenuId: string, newMenuId: string) => {
    setLeftPanel(currentMenuId);
    setRightPanel(newMenuId);
    setIsSplit(true);
  }, []);

  const closeSplit = useCallback(() => {
    setIsSplit(false);
    setLeftPanel(null);
    setRightPanel(null);
  }, []);

  return (
    <SplitViewContext.Provider value={{ isSplit, leftPanel, rightPanel, openSplit, closeSplit }}>
      {children}
    </SplitViewContext.Provider>
  );
};
