import { Helmet } from 'react-helmet-async';
import { Switch, Route, useRouteMatch } from 'react-router-dom';
import JiraDashboard from 'containers/jira/JiraDashboard';
import JiraIssueDetail from 'containers/jira/JiraIssueDetail';
import styled from 'styled-components';
import { theme } from 'lib/styles/theme';

const Page = styled.div`
  min-height: 100vh;
  background: ${theme.bgPrimary};
`;

const JiraPage = () => {
  const { path } = useRouteMatch();

  return (
    <Page>
      <Helmet>
        <title>Jira - Workspace</title>
      </Helmet>
      <Switch>
        <Route path={`${path}${path.endsWith('/jira') ? '' : '/jira'}/issue/:issueKey`} component={JiraIssueDetail} />
        <Route path={`${path}/issue/:issueKey`} component={JiraIssueDetail} />
        <Route path={path} component={JiraDashboard} exact />
      </Switch>
    </Page>
  );
};

export default JiraPage;
