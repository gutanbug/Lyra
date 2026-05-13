import styled from 'styled-components';
import { theme } from 'lib/styles/theme';
import { getServiceIcon } from 'lib/icons/services';
import { useAccount } from 'modules/contexts/account';

/**
 * GitHub 페이지의 좌측 사이드바.
 * M4: 등록된 GitHub 계정 목록 + 리포 목록 placeholder.
 * M5+: 각 계정별 리포 목록 트리, OpenRepo 등 액션 추가.
 */
const GitHubSidebar = () => {
  const { accounts } = useAccount();
  const githubAccounts = accounts.filter((a) => a.serviceType === 'github');

  return (
    <Container>
      <SectionHeader>
        <SectionIconWrap>{getServiceIcon('github', 16)}</SectionIconWrap>
        <SectionTitle>GitHub 계정</SectionTitle>
      </SectionHeader>
      {githubAccounts.length === 0 ? (
        <EmptyState>
          등록된 GitHub 계정이 없습니다.
          <br />
          환경설정 → 계정 설정에서 GitHub 계정을 추가하세요.
        </EmptyState>
      ) : (
        <AccountList>
          {githubAccounts.map((a) => (
            <AccountItem key={a.id}>
              <AccountName>{a.displayName}</AccountName>
              {'baseUrl' in a.credentials && (
                <AccountMeta>
                  {(a.credentials as { baseUrl?: string }).baseUrl}
                </AccountMeta>
              )}
            </AccountItem>
          ))}
        </AccountList>
      )}

      <Divider />
      <PlaceholderHint>
        리포 목록은 다음 마일스톤에서 제공됩니다.
      </PlaceholderHint>
    </Container>
  );
};

export default GitHubSidebar;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem 1rem;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.25rem 0.5rem;
`;

const SectionIconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  & > svg { width: 100%; height: 100%; }
`;

const SectionTitle = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${theme.textPrimary};
`;

const AccountList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const AccountItem = styled.li`
  padding: 0.4rem 0.5rem;
  border-radius: 6px;
  background: ${theme.bgPrimary};
  border: 1px solid ${theme.border};
`;

const AccountName = styled.div`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${theme.textPrimary};
`;

const AccountMeta = styled.div`
  font-size: 0.6875rem;
  color: ${theme.textMuted};
  margin-top: 0.125rem;
`;

const EmptyState = styled.div`
  padding: 0.75rem 0.5rem;
  font-size: 0.8125rem;
  color: ${theme.textMuted};
  line-height: 1.5;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${theme.border};
  margin: 0.25rem 0;
`;

const PlaceholderHint = styled.div`
  font-size: 0.75rem;
  color: ${theme.textMuted};
  padding: 0 0.5rem;
`;
