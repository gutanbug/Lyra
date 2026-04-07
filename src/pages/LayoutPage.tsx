import { useEffect, lazy, Suspense } from 'react';
import { Switch, Route, Redirect, MemoryRouter, useHistory, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import Header from 'components/layout/Header';
import Modal from 'containers/modal';
import Snackbar from 'containers/common/Snackbar';

const JiraPage = lazy(() => import('pages/JiraPage'));
const ConfluencePage = lazy(() => import('pages/ConfluencePage'));
const AccountSettings = lazy(() => import('pages/AccountSettings'));
const StatsPage = lazy(() => import('pages/StatsPage'));
const NotFound = lazy(() => import('pages/NotFound'));
import { theme } from 'lib/styles/theme';
import { useTabs } from 'modules/contexts/tab';
import type { Tab } from 'modules/contexts/tab';
import { useSplitView } from 'modules/contexts/splitView';

/** 마우스 뒤로가기/앞으로가기 이벤트를 라우터 히스토리에 연결 */
const useMouseNavigation = (active: boolean) => {
  const history = useHistory();

  useEffect(() => {
    if (!active) return;
    const handleNav = (e: Event) => {
      const dir = (e as CustomEvent).detail;
      if (dir === 'back') history.goBack();
      else if (dir === 'forward') history.goForward();
    };
    window.addEventListener('lyra:navigate', handleNav);
    return () => window.removeEventListener('lyra:navigate', handleNav);
  }, [history, active]);
};

/** 라우터에 마우스 네비게이션 연결 (active일 때만 반응) */
const NavigationBridge = ({ active = true }: { active?: boolean }) => {
  useMouseNavigation(active);
  return null;
};

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

const SingleView = ({ navActive }: { navActive: boolean }) => (
  <>
    <NavigationBridge active={navActive} />
    <Suspense fallback={null}>
      <Switch>
        <Redirect from="/" to="/jira" exact />
        <Route path="/jira" component={JiraPage} />
        <Route path="/confluence" component={ConfluencePage} />
        <Route path="/settings" component={AccountSettings} exact />
        <Route path="/stats" component={StatsPage} exact />
        <Route path="*" component={NotFound} />
      </Switch>
    </Suspense>
  </>
);

/** Split View용 독립 패널 (MemoryRouter로 격리) */
const IsolatedPanel = ({ menuId, navActive = false }: { menuId: string; navActive?: boolean }) => {
  const Component = PANEL_MAP[menuId];
  if (!Component) return null;
  const initialPath = INITIAL_PATH[menuId] || '/';

  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <NavigationBridge active={navActive} />
      <Suspense fallback={null}>
        <Switch>
          <Route path={initialPath} component={Component} />
          <Route path="/" component={Component} />
        </Switch>
      </Suspense>
    </MemoryRouter>
  );
};

/** 탭용 독립 패널 (MemoryRouter로 격리) */
const TabPanel = ({ tab, navActive = false }: { tab: Tab; navActive?: boolean }) => {
  const Component = PANEL_MAP[tab.menuId];
  if (!Component) return null;
  const basePath = INITIAL_PATH[tab.menuId] || '/';

  return (
    <MemoryRouter initialEntries={[tab.initialPath]}>
      <NavigationBridge active={navActive} />
      <Suspense fallback={null}>
        <Switch>
          <Route path={basePath} component={Component} />
          <Route path="/" component={Component} />
        </Switch>
      </Suspense>
    </MemoryRouter>
  );
};

const LayoutPage = () => {
  const { tabs, activeTabId, closeTab, activateTab, deactivateTab } = useTabs();
  const { isSplit, leftPanel, rightPanel } = useSplitView();
  const history = useHistory();
  const location = useLocation();

  const hasTabs = tabs.length > 0;
  const activeTab = activeTabId ? tabs.find((t) => t.id === activeTabId) : null;
  const hasSplit = isSplit && leftPanel && rightPanel;
  // 메인 뷰: Split View도 없고 활성 탭도 없을 때
  const showMain = !hasSplit && !activeTab;
  // Split View: Split 활성이고 탭이 선택되지 않았을 때
  const showSplit = hasSplit && !activeTab;

  // 마우스 뒤로가기/앞으로가기 버튼
  useEffect(() => {
    const handleMouseNav = (e: MouseEvent) => {
      // button 3 = 뒤로가기, button 4 = 앞으로가기
      if (e.button === 3 || e.button === 4) {
        e.preventDefault();
        const dir = e.button === 3 ? 'back' : 'forward';
        window.dispatchEvent(new CustomEvent('lyra:navigate', { detail: dir }));
      }
    };
    window.addEventListener('mousedown', handleMouseNav);
    return () => window.removeEventListener('mousedown', handleMouseNav);
  }, []);

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

      // - → 모두 접기 (입력 요소가 아닌 경우에만)
      if (e.key === '-' && !e.metaKey && !e.ctrlKey && !e.altKey && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable)) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('lyra:collapse-all'));
        return;
      }

      // + → 모두 펼치기 (입력 요소가 아닌 경우에만)
      if ((e.key === '=' || e.key === '+') && !e.metaKey && !e.ctrlKey && !e.altKey && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable)) {
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

      // CmdOrCtrl+1~9 → 탭 전환 (1=메인, 2~9=탭 1~8)
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
        const num = parseInt(e.key, 10);
        if (tabs.length > 0) {
          e.preventDefault();
          if (num === 1) {
            deactivateTab();
          } else {
            const tabIndex = num - 2;
            if (tabIndex < tabs.length) {
              activateTab(tabs[tabIndex].id);
            }
          }
        }
        return;
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
  }, [history, location.pathname, hasTabs, activeTabId, isSplit, closeTab, tabs, activateTab, deactivateTab]);

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
        <SingleView navActive={showMain} />
      </MainContent>

      {/* 탭 패널 (숨김/표시로 상태 유지) */}
      {tabs.map((tab) => (
        <TabContent key={tab.id} $visible={activeTabId === tab.id}>
          <TabPanel tab={tab} navActive={activeTabId === tab.id} />
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
