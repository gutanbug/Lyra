import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useTabs } from 'modules/contexts/tab';

// ─── Types ─────────────────────────────────

interface SplitViewState {
  isSplit: boolean;
  leftPanel: string | null;
  rightPanel: string | null;
  openSplit: (currentMenuId: string, newMenuId: string) => void;
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

export const SplitViewProvider = ({ children }: { children: React.ReactNode }) => {
  const { setActiveTabId } = useTabs();

  const [isSplit, setIsSplit] = useState(false);
  const [leftPanel, setLeftPanel] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<string | null>(null);

  const openSplit = useCallback((currentMenuId: string, newMenuId: string) => {
    setLeftPanel(currentMenuId);
    setRightPanel(newMenuId);
    setIsSplit(true);
    setActiveTabId(null);
  }, [setActiveTabId]);

  const closeSplit = useCallback(() => {
    setIsSplit(false);
    setLeftPanel(null);
    setRightPanel(null);
  }, []);

  const value = useMemo(
    () => ({ isSplit, leftPanel, rightPanel, openSplit, closeSplit }),
    [isSplit, leftPanel, rightPanel, openSplit, closeSplit],
  );

  return (
    <SplitViewContext.Provider value={value}>
      {children}
    </SplitViewContext.Provider>
  );
};

export default SplitViewProvider;
