import React, { createContext, useContext, useState, useCallback } from 'react';

// ─── Types ─────────────────────────────────

interface AgentSidebarState {
  open: boolean;
  toggle: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
}

const AgentSidebarContext = createContext<AgentSidebarState>({
  open: false,
  toggle: () => {},
  openSidebar: () => {},
  closeSidebar: () => {},
});

export const useAgentSidebar = () => useContext(AgentSidebarContext);

export const AgentSidebarProvider = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const openSidebar = useCallback(() => setOpen(true), []);
  const closeSidebar = useCallback(() => setOpen(false), []);

  return (
    <AgentSidebarContext.Provider value={{ open, toggle, openSidebar, closeSidebar }}>
      {children}
    </AgentSidebarContext.Provider>
  );
};

export default AgentSidebarProvider;
