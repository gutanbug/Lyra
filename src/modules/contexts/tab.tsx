import React, { createContext, useContext, useState, useCallback } from 'react';

// ─── Types ─────────────────────────────────

export interface Tab {
  id: string;
  name: string;
  menuId: string;
  initialPath: string;
}

interface TabState {
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (menuId: string, initialPath: string, name?: string) => string;
  closeTab: (tabId: string) => void;
  activateTab: (tabId: string) => void;
  deactivateTab: () => void;
  renameTab: (tabId: string, name: string) => void;
  closeAllTabs: () => void;
  setActiveTabId: React.Dispatch<React.SetStateAction<string | null>>;
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
  setActiveTabId: () => {},
});

export const useTabs = () => useContext(TabContext);

export const TabProvider = ({ children }: { children: React.ReactNode }) => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const counterRef = React.useRef(0);

  const addTab = useCallback((menuId: string, initialPath: string, name?: string) => {
    counterRef.current += 1;
    const id = `tab-${Date.now()}-${counterRef.current}`;
    const label = name || `Tab ${counterRef.current}`;
    const newTab: Tab = { id, name: label, menuId, initialPath };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(id);
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

  return (
    <TabContext.Provider
      value={{
        tabs, activeTabId, setActiveTabId,
        addTab, closeTab, activateTab, deactivateTab, renameTab, closeAllTabs,
      }}
    >
      {children}
    </TabContext.Provider>
  );
};

export default TabProvider;
