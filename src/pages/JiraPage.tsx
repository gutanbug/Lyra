import { Helmet } from 'react-helmet-async';
import { Switch, Route, useRouteMatch } from 'react-router-dom';
import JiraDashboard from 'containers/jira/JiraDashboard';
import JiraIssueDetail from 'containers/jira/JiraIssueDetail';
import SidebarLayout from 'components/sidebar/SidebarLayout';
import JiraSidebar from 'components/sidebar/JiraSidebar';
import styled from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: ${jiraTheme.bg.subtle};
`;

const JiraPage = () => {
  const { path } = useRouteMatch();

  return (
    <Page>
      <Helmet>
        <title>Jira - Workspace</title>
      </Helmet>
      <SidebarLayout sidebar={<JiraSidebar />}>
        <Switch>
          <Route path={`${path}${path.endsWith('/jira') ? '' : '/jira'}/issue/:issueKey`} component={JiraIssueDetail} />
          <Route path={`${path}/issue/:issueKey`} component={JiraIssueDetail} />
          <Route path={path} component={JiraDashboard} exact />
        </Switch>
      </SidebarLayout>
    </Page>
  );
};

export default JiraPage;
