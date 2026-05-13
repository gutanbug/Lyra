import { Helmet } from 'react-helmet-async';
import styled from 'styled-components';
import SidebarLayout from 'components/sidebar/SidebarLayout';
import GitHubSidebar from 'components/sidebar/GitHubSidebar';
import { theme } from 'lib/styles/theme';

/**
 * GitHub 통합 페이지.
 * M4: 사이드바 + 본문 placeholder. 본문 컨텐츠(리포 대시보드 등)는 후속 마일스톤에서 채운다.
 */
const GitHubPage = () => {
  return (
    <Page>
      <Helmet>
        <title>GitHub - Workspace</title>
      </Helmet>
      <SidebarLayout sidebar={<GitHubSidebar />}>
        <Body>
          <Title>GitHub</Title>
          <Hint>
            리포지토리 목록·PR·이슈 등 GitHub 기능은 다음 마일스톤에서 추가됩니다.
          </Hint>
        </Body>
      </SidebarLayout>
    </Page>
  );
};

export default GitHubPage;

const Page = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: ${theme.bgPrimary};
`;

const Body = styled.div`
  padding: 2rem;
`;

const Title = styled.h1`
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: ${theme.textPrimary};
`;

const Hint = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: ${theme.textMuted};
`;
