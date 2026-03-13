import { useEffect } from 'react';
import { Switch, Route, Redirect, MemoryRouter, useHistory, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import Header from 'components/layout/Header';
import JiraPage from 'pages/JiraPage';
import ConfluencePage from 'pages/ConfluencePage';
import AccountSettings from 'pages/AccountSettings';
import StatsPage from 'pages/StatsPage';
import NotFound from 'pages/NotFound';
import Modal from 'containers/modal';
import Snackbar from 'containers/common/Snackbar';
import { theme } from 'lib/styles/theme';
import { useTabs } from 'modules/contexts/splitView';
import type { Tab } from 'modules/contexts/splitView';

/** 메뉴 순서 (단축키 [ ] 로 이동할 때 사용) */
const MENU_PATHS = ['/jira', '/confluence'] as const;

/** 메뉴 id → 컴포넌트 매핑 */
const PANEL_MAP: Record<string, React.ComponentType> = {
  jira: JiraPage,
  confluence: ConfluencePage,
  settings: AccountSettings,
};

/** 메뉴 id → 초기 경로 */
const INITIAL_PATH: Record<string, string> = {
  jira: '/jira',
  confluence: '/confluence',
  settings: '/settings',
};

const SingleView = () => (
  <Switch>
    <Redirect from="/" to="/jira" exact />
    <Route path="/jira" component={JiraPage} />
    <Route path="/confluence" component={ConfluencePage} />
    <Route path="/settings" component={AccountSettings} exact />
    <Route path="/stats" component={StatsPage} exact />
    <Route path="*" component={NotFound} />
  </Switch>
);

/** Split View용 독립 패널 (MemoryRouter로 격리) */
const IsolatedPanel = ({ menuId }: { menuId: string }) => {
  const Component = PANEL_MAP[menuId];
  if (!Component) return null;
  const initialPath = INITIAL_PATH[menuId] || '/';

  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <Switch>
        <Route path={initialPath} component={Component} />
        <Route path="/" component={Component} />
      </Switch>
    </MemoryRouter>
  );
};

/** 탭용 독립 패널 (MemoryRouter로 격리) */
const TabPanel = ({ tab }: { tab: Tab }) => {
  const Component = PANEL_MAP[tab.menuId];
  if (!Component) return null;
  const basePath = INITIAL_PATH[tab.menuId] || '/';

  return (
    <MemoryRouter initialEntries={[tab.initialPath]}>
      <Switch>
        <Route path={basePath} component={Component} />
        <Route path="/" component={Component} />
      </Switch>
    </MemoryRouter>
  );
};

const LayoutPage = () => {
  const { tabs, activeTabId, closeTab, isSplit, leftPanel, rightPanel } = useTabs();
  const history = useHistory();
  const location = useLocation();

  const hasTabs = tabs.length > 0;
  const activeTab = activeTabId ? tabs.find((t) => t.id === activeTabId) : null;
  const hasSplit = isSplit && leftPanel && rightPanel;
  // 메인 뷰: Split View도 없고 활성 탭도 없을 때
  const showMain = !hasSplit && !activeTab;
  // Split View: Split 활성이고 탭이 선택되지 않았을 때
  const showSplit = hasSplit && !activeTab;

  // 글로벌 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable;

      // CmdOrCtrl+L → 검색창 포커스
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>('[data-search-input]');
        if (el) el.focus();
        return;
      }

      // CmdOrCtrl+- → 모두 접기
      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('lyra:collapse-all'));
        return;
      }

      // CmdOrCtrl++ → 모두 펼치기 (= 또는 + 키)
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('lyra:expand-all'));
        return;
      }

      // CmdOrCtrl+, → 환경설정
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        history.push('/settings');
        return;
      }

      // CmdOrCtrl+; → 프로필 변경 토글
      if ((e.metaKey || e.ctrlKey) && e.key === ';') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('lyra:toggle-profile'));
        return;
      }

      // CmdOrCtrl+W → 활성 탭 닫기
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        if (activeTabId) {
          e.preventDefault();
          closeTab(activeTabId);
          return;
        }
      }

      // 입력 중이면 [ ] 무시
      if (isInput) return;
      if (isSplit) return;
      if (hasTabs && activeTabId) return;

      if (e.key === '[' || e.key === ']') {
        const currentIdx = MENU_PATHS.findIndex((p) => location.pathname.startsWith(p));
        if (currentIdx === -1) return;
        const next = e.key === '['
          ? (currentIdx - 1 + MENU_PATHS.length) % MENU_PATHS.length
          : (currentIdx + 1) % MENU_PATHS.length;
        history.push(MENU_PATHS[next]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, location.pathname, hasTabs, activeTabId, isSplit, closeTab]);

  return (
    <Page>
      <Header />

      {/* Split View (display 토글로 상태 유지) */}
      {hasSplit && (
        <SplitContainer $visible={showSplit as boolean}>
          <SplitPanel>
            <IsolatedPanel menuId={leftPanel!} />
          </SplitPanel>
          <SplitDivider />
          <SplitPanel>
            <IsolatedPanel menuId={rightPanel!} />
          </SplitPanel>
        </SplitContainer>
      )}

      {/* 메인 뷰 */}
      <MainContent $visible={showMain}>
        <SingleView />
      </MainContent>

      {/* 탭 패널 (숨김/표시로 상태 유지) */}
      {tabs.map((tab) => (
        <TabContent key={tab.id} $visible={activeTabId === tab.id}>
          <TabPanel tab={tab} />
        </TabContent>
      ))}

      <Modal />
      <Snackbar />
    </Page>
  );
};

export default LayoutPage;

// ─── Styled Components ─────────────────────────

const Page = styled.div`
  height: 100vh;
  background: ${theme.bgPrimary};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const MainContent = styled.div<{ $visible: boolean }>`
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  ${({ $visible }) => !$visible && `
    visibility: hidden;
    position: absolute;
    width: 0;
    height: 0;
    overflow: hidden;
    pointer-events: none;
  `}
`;

const TabContent = styled.div<{ $visible: boolean }>`
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  display: ${({ $visible }) => ($visible ? 'flex' : 'none')};
  flex-direction: column;
`;

const SplitContainer = styled.div<{ $visible: boolean }>`
  display: ${({ $visible }) => ($visible ? 'flex' : 'none')};
  flex: 1;
  min-height: 0;
`;

const SplitPanel = styled.div`
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

const SplitDivider = styled.div`
  width: 2px;
  background: ${theme.border};
  flex-shrink: 0;
`;
