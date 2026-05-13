import { Helmet } from 'react-helmet-async';
import styled from 'styled-components';
import { theme } from 'lib/styles/theme';

/**
 * 로컬 Git 저장소 그래프 페이지.
 * M4: placeholder. M5에서 OpenRepoButton + RepoGraphContainer가 본문을 채운다.
 * M6에서 CommitGraph 컴포넌트가 추가된다.
 */
const RepoGraphPage = () => {
  return (
    <Page>
      <Helmet>
        <title>로컬 저장소 - Workspace</title>
      </Helmet>
      <Body>
        <Title>로컬 Git 저장소</Title>
        <Hint>
          저장소 열기와 커밋 그래프 시각화는 다음 마일스톤(M5/M6)에서 추가됩니다.
        </Hint>
      </Body>
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
