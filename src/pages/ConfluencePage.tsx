import { Helmet } from 'react-helmet-async';
import { Switch, Route, useRouteMatch } from 'react-router-dom';
import ConfluenceDashboard from 'containers/confluence/ConfluenceDashboard';
import ConfluencePageDetail from 'containers/confluence/ConfluencePageDetail';
import styled from 'styled-components';
import { theme } from 'lib/styles/theme';

const Page = styled.div`
  min-height: 100vh;
  background: ${theme.bgPrimary};
`;

const ConfluencePage = () => {
  const { path } = useRouteMatch();

  return (
    <Page>
      <Helmet>
        <title>Confluence - Workspace</title>
      </Helmet>
      <Switch>
        <Route path={`${path}${path.endsWith('/confluence') ? '' : '/confluence'}/page/:pageId`} component={ConfluencePageDetail} />
        <Route path={`${path}/page/:pageId`} component={ConfluencePageDetail} />
        <Route path={path} component={ConfluenceDashboard} exact />
      </Switch>
    </Page>
  );
};

export default ConfluencePage;
