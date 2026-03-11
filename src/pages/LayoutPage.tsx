import { Switch, Route, Redirect, MemoryRouter } from 'react-router-dom';
import styled from 'styled-components';
import Header from 'components/layout/Header';
import JiraPage from 'pages/JiraPage';
import AccountSettings from 'pages/AccountSettings';
import NotFound from 'pages/NotFound';
import Modal from 'containers/modal';
import Snackbar from 'containers/common/Snackbar';
import { theme } from 'lib/styles/theme';
import { useSplitView } from 'modules/contexts/splitView';

/** 메뉴 id → 컴포넌트 매핑 */
const PANEL_MAP: Record<string, React.ComponentType> = {
  jira: JiraPage,
  settings: AccountSettings,
};

/** 메뉴 id → 초기 경로 */
const INITIAL_PATH: Record<string, string> = {
  jira: '/jira',
  settings: '/settings',
};

const SingleView = () => (
  <Switch>
    <Redirect from="/" to="/jira" exact />
    <Route path="/jira" component={JiraPage} />
    <Route path="/settings" component={AccountSettings} exact />
    <Route path="*" component={NotFound} />
  </Switch>
);

/** 독립 라우팅을 가진 패널 (MemoryRouter로 격리) */
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

const LayoutPage = () => {
  const { isSplit, leftPanel, rightPanel } = useSplitView();

  return (
    <Page>
      <Header />
      {isSplit && leftPanel && rightPanel ? (
        <SplitContainer>
          <SplitPanel>
            <IsolatedPanel menuId={leftPanel} />
          </SplitPanel>
          <SplitDivider />
          <SplitPanel>
            <IsolatedPanel menuId={rightPanel} />
          </SplitPanel>
        </SplitContainer>
      ) : (
        <SingleView />
      )}
      <Modal />
      <Snackbar />
    </Page>
  );
};

export default LayoutPage;

// ─── Styled Components ─────────────────────────

const Page = styled.div`
  min-height: 100vh;
  background: ${theme.bgPrimary};
  display: flex;
  flex-direction: column;
`;

const SplitContainer = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
`;

const SplitPanel = styled.div`
  flex: 1;
  min-width: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
`;

const SplitDivider = styled.div`
  width: 2px;
  background: ${theme.border};
  flex-shrink: 0;
`;
