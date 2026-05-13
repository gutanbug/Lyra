import { Helmet } from 'react-helmet-async';
import styled from 'styled-components';
import RepoGraphContainer from 'containers/localGit/RepoGraphContainer';
import { theme } from 'lib/styles/theme';

/**
 * 로컬 Git 저장소 페이지.
 * M5: RepoGraphContainer가 OpenRepoButton + HEAD/branches 표시를 담당.
 * M6에서 컨테이너가 CommitGraph로 본문을 채운다.
 */
const RepoGraphPage = () => {
  return (
    <Page>
      <Helmet>
        <title>로컬 저장소 - Workspace</title>
      </Helmet>
      <RepoGraphContainer />
    </Page>
  );
};

export default RepoGraphPage;

const Page = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: ${theme.bgPrimary};
`;
