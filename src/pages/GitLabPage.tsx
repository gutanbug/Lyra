import { Helmet } from 'react-helmet-async';
import styled from 'styled-components';
import SidebarLayout from 'components/sidebar/SidebarLayout';
import GitLabSidebar from 'components/sidebar/GitLabSidebar';
import { theme } from 'lib/styles/theme';

/**
 * GitLab 통합 페이지.
 * M4: 사이드바 + 본문 placeholder. 본문 컨텐츠(프로젝트·MR·이슈 등)는 후속 마일스톤.
 */
const GitLabPage = () => {
  return (
    <Page>
      <Helmet>
        <title>GitLab - Workspace</title>
      </Helmet>
      <SidebarLayout sidebar={<GitLabSidebar />}>
        <Body>
          <Title>GitLab</Title>
          <Hint>
            프로젝트 목록·MR·이슈 등 GitLab 기능은 다음 마일스톤에서 추가됩니다.
          </Hint>
        </Body>
      </SidebarLayout>
    </Page>
  );
};

export default GitLabPage;

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
