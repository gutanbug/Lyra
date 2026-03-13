import { Helmet } from 'react-helmet-async';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowLeft } from 'lucide-react';
import { theme } from 'lib/styles/theme';
import { transition } from 'lib/styles/styles';

const StatsPage = () => {
  const history = useHistory();

  return (
    <Page>
      <Helmet>
        <title>통계 - Workspace</title>
      </Helmet>
      <Container>
        <HeaderRow>
          <BackButton onClick={() => history.push('/jira')}>
            <ArrowLeft size={16} />
          </BackButton>
          <Title>사용자 통계</Title>
        </HeaderRow>
        <PlaceholderCard>
          <PlaceholderText>통계 기능이 준비 중입니다.</PlaceholderText>
        </PlaceholderCard>
      </Container>
    </Page>
  );
};

export default StatsPage;

const Page = styled.div`
  flex: 1;
  min-height: 100vh;
  background: ${theme.bgSecondary};
  zoom: 1.2;
`;

const Container = styled.div`
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid ${theme.border};
  border-radius: 50%;
  background: ${theme.bgPrimary};
  color: ${theme.textSecondary};
  cursor: pointer;
  transition: all 0.15s ${transition};

  &:hover {
    border-color: ${theme.blue};
    color: ${theme.blue};
    background: ${theme.blueLight};
  }
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: ${theme.textPrimary};
`;

const PlaceholderCard = styled.div`
  padding: 4rem 2rem;
  background: ${theme.bgPrimary};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  text-align: center;
`;

const PlaceholderText = styled.span`
  font-size: 0.875rem;
  color: ${theme.textMuted};
`;
