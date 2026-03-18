import { lazy, Suspense } from 'react';
import { Helmet } from 'react-helmet-async';
import { Switch, Route, useRouteMatch } from 'react-router-dom';
import ConfluenceDashboard from 'containers/confluence/ConfluenceDashboard';
import SidebarLayout from 'components/sidebar/SidebarLayout';
import ConfluenceSidebar from 'components/sidebar/ConfluenceSidebar';
import styled from 'styled-components';
import { theme } from 'lib/styles/theme';

const ConfluencePageDetail = lazy(() => import('containers/confluence/ConfluencePageDetail'));

const Page = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: ${theme.bgPrimary};
`;

const ConfluencePage = () => {
  const { path } = useRouteMatch();

  return (
    <Page>
      <Helmet>
        <title>Confluence - Workspace</title>
      </Helmet>
      <SidebarLayout sidebar={<ConfluenceSidebar />}>
        <Suspense fallback={null}>
          <Switch>
            <Route path={`${path}${path.endsWith('/confluence') ? '' : '/confluence'}/page/:pageId`} component={ConfluencePageDetail} />
            <Route path={`${path}/page/:pageId`} component={ConfluencePageDetail} />
            <Route path={path} component={ConfluenceDashboard} exact />
          </Switch>
        </Suspense>
      </SidebarLayout>
    </Page>
  );
};

export default ConfluencePage;
