import React, { createContext, useContext, useState, useCallback } from 'react';

// ─── Types ─────────────────────────────────

export interface Tab {
  id: string;
  name: string;
  menuId: string;
  initialPath: string;
}

interface TabState {
  // ─── Tab API ───
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (menuId: string, initialPath: string, name?: string) => string;
  closeTab: (tabId: string) => void;
  activateTab: (tabId: string) => void;
  deactivateTab: () => void;
  renameTab: (tabId: string, name: string) => void;
  closeAllTabs: () => void;

  // ─── Split View API ───
  isSplit: boolean;
  leftPanel: string | null;
  rightPanel: string | null;
  openSplit: (currentMenuId: string, newMenuId: string) => void;
  closeSplit: () => void;
}

let tabCounter = 0;
function generateTabId(): string {
  tabCounter += 1;
  return `tab-${Date.now()}-${tabCounter}`;
}

const TabContext = createContext<TabState>({
  tabs: [],
  activeTabId: null,
  addTab: () => '',
  closeTab: () => {},
  activateTab: () => {},
  deactivateTab: () => {},
  renameTab: () => {},
  closeAllTabs: () => {},
  isSplit: false,
  leftPanel: null,
  rightPanel: null,
  openSplit: () => {},
  closeSplit: () => {},
});

export const useSplitView = () => useContext(TabContext);
export const useTabs = () => useContext(TabContext);

export const SplitViewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ─── Tab state ───
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const counterRef = React.useRef(0);

  // ─── Split View state (독립) ───
  const [isSplit, setIsSplit] = useState(false);
  const [leftPanel, setLeftPanel] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<string | null>(null);

  // ─── Tab actions ───
  const addTab = useCallback((menuId: string, initialPath: string, name?: string) => {
    const id = generateTabId();
    counterRef.current += 1;
    const label = name || `Tab ${counterRef.current}`;
    const newTab: Tab = { id, name: label, menuId, initialPath };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(id);
    // Split View 해제
    setIsSplit(false);
    setLeftPanel(null);
    setRightPanel(null);
    return id;
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === tabId);
      const next = prev.filter((t) => t.id !== tabId);
      setActiveTabId((prevActive) => {
        if (prevActive !== tabId) return prevActive;
        if (next.length === 0) return null;
        const newIdx = Math.min(idx, next.length - 1);
        return next[newIdx].id;
      });
      return next;
    });
  }, []);

  const activateTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    // Split View 해제
    setIsSplit(false);
    setLeftPanel(null);
    setRightPanel(null);
  }, []);

  const deactivateTab = useCallback(() => {
    setActiveTabId(null);
  }, []);

  const renameTab = useCallback((tabId: string, name: string) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, name } : t)));
  }, []);

  const closeAllTabs = useCallback(() => {
    setTabs([]);
    setActiveTabId(null);
  }, []);

  // ─── Split View actions ───
  const openSplit = useCallback((currentMenuId: string, newMenuId: string) => {
    setLeftPanel(currentMenuId);
    setRightPanel(newMenuId);
    setIsSplit(true);
    // 탭 비활성
    setActiveTabId(null);
  }, []);

  const closeSplit = useCallback(() => {
    setIsSplit(false);
    setLeftPanel(null);
    setRightPanel(null);
  }, []);

  return (
    <TabContext.Provider
      value={{
        tabs, activeTabId,
        addTab, closeTab, activateTab, deactivateTab, renameTab, closeAllTabs,
        isSplit, leftPanel, rightPanel, openSplit, closeSplit,
      }}
    >
      {children}
    </TabContext.Provider>
  );
};
