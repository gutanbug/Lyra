import styled from 'styled-components';
import { GitBranch, RefreshCw, X } from 'lucide-react';
import { theme } from 'lib/styles/theme';
import { transition } from 'lib/styles/styles';
import { useLocalRepo } from 'modules/contexts/localRepo';
import OpenRepoButton from './OpenRepoButton';

/**
 * 로컬 Git 저장소 컨테이너.
 * M5: 열린 repo의 HEAD/branches/remotes 표시. 커밋 그래프는 M6.
 */
const RepoGraphContainer = () => {
  const { currentRepo, errorCode, errorMessage, refresh, close, clearError } = useLocalRepo();

  if (errorCode && !currentRepo) {
    return (
      <Empty>
        <ErrorBlock>
          <ErrorTitle>저장소를 열 수 없습니다</ErrorTitle>
          <ErrorMessage>
            {errorCode === 'NOT_A_REPO'
              ? '선택한 디렉토리는 Git 저장소가 아닙니다.'
              : errorMessage || '알 수 없는 오류'}
          </ErrorMessage>
          <ErrorActions>
            <OpenRepoButton label="다시 시도" />
            <SecondaryAction type="button" onClick={clearError}>
              닫기
            </SecondaryAction>
          </ErrorActions>
        </ErrorBlock>
      </Empty>
    );
  }

  if (!currentRepo) {
    return (
      <Empty>
        <EmptyTitle>아직 열린 저장소가 없습니다</EmptyTitle>
        <EmptyHint>로컬 디렉토리를 선택해 Git 저장소를 엽니다.</EmptyHint>
        <OpenRepoButton />
      </Empty>
    );
  }

  const localBranches = currentRepo.branches.filter((b) => b.scope === 'local');
  const remoteBranches = currentRepo.branches.filter((b) => b.scope === 'remote');

  return (
    <Layout>
      <Toolbar>
        <ToolbarLeft>
          <RepoPath title={currentRepo.path}>{currentRepo.path}</RepoPath>
          <HeadBadge>
            <GitBranch size={12} />
            <span>{currentRepo.detached ? `detached @ ${currentRepo.head.slice(0, 8)}` : currentRepo.head || '(no HEAD)'}</span>
          </HeadBadge>
        </ToolbarLeft>
        <ToolbarRight>
          <IconAction type="button" title="다시 읽기" onClick={refresh}>
            <RefreshCw size={14} />
          </IconAction>
          <OpenRepoButton $variant="secondary" label="다른 저장소 열기" />
          <IconAction type="button" title="저장소 닫기" onClick={close}>
            <X size={14} />
          </IconAction>
        </ToolbarRight>
      </Toolbar>

      <Body>
        <SectionGrid>
          <Section>
            <SectionTitle>로컬 브랜치 ({localBranches.length})</SectionTitle>
            {localBranches.length === 0 ? (
              <EmptyHint>로컬 브랜치가 없습니다.</EmptyHint>
            ) : (
              <BranchList>
                {localBranches.map((b) => (
                  <BranchItem key={`local:${b.name}`}>
                    <BranchName>{b.name}</BranchName>
                    <BranchSha>{b.sha.slice(0, 8)}</BranchSha>
                  </BranchItem>
                ))}
              </BranchList>
            )}
          </Section>

          <Section>
            <SectionTitle>원격 브랜치 ({remoteBranches.length})</SectionTitle>
            {remoteBranches.length === 0 ? (
              <EmptyHint>원격 브랜치가 없습니다.</EmptyHint>
            ) : (
              <BranchList>
                {remoteBranches.map((b) => (
                  <BranchItem key={`remote:${b.name}`}>
                    <BranchName>{b.name}</BranchName>
                    <BranchSha>{b.sha.slice(0, 8)}</BranchSha>
                  </BranchItem>
                ))}
              </BranchList>
            )}
          </Section>

          <Section>
            <SectionTitle>원격 ({Object.keys(currentRepo.remotes).length})</SectionTitle>
            {Object.keys(currentRepo.remotes).length === 0 ? (
              <EmptyHint>원격이 없습니다.</EmptyHint>
            ) : (
              <RemoteList>
                {Object.entries(currentRepo.remotes).map(([name, url]) => (
                  <RemoteItem key={name}>
                    <RemoteName>{name}</RemoteName>
                    <RemoteUrl title={url}>{url}</RemoteUrl>
                  </RemoteItem>
                ))}
              </RemoteList>
            )}
          </Section>
        </SectionGrid>

        <PlaceholderGraph>
          커밋 그래프는 M6에서 추가됩니다.
        </PlaceholderGraph>
      </Body>
    </Layout>
  );
};

export default RepoGraphContainer;

const Layout = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid ${theme.border};
  background: ${theme.bgSecondary};
`;

const ToolbarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
`;

const ToolbarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
`;

const RepoPath = styled.span`
  font-family: 'SFMono-Regular', Menlo, monospace;
  font-size: 0.8125rem;
  color: ${theme.textPrimary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 480px;
`;

const HeadBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.5rem;
  border-radius: 12px;
  background: ${theme.blueLight};
  color: ${theme.blueDarker};
  font-size: 0.75rem;
  font-weight: 600;
`;

const IconAction = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid ${theme.border};
  border-radius: 50%;
  background: ${theme.bgPrimary};
  color: ${theme.textSecondary};
  cursor: pointer;
  transition: border-color 0.15s ${transition}, color 0.15s ${transition};

  &:hover {
    border-color: ${theme.blue};
    color: ${theme.blue};
  }
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
`;

const Section = styled.section`
  background: ${theme.bgSecondary};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  padding: 0.75rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const BranchList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 240px;
  overflow-y: auto;
`;

const BranchItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  background: ${theme.bgPrimary};
`;

const BranchName = styled.span`
  font-size: 0.8125rem;
  color: ${theme.textPrimary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const BranchSha = styled.span`
  font-family: 'SFMono-Regular', Menlo, monospace;
  font-size: 0.6875rem;
  color: ${theme.textMuted};
  flex-shrink: 0;
`;

const RemoteList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const RemoteItem = styled.li`
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.35rem 0.5rem;
  border-radius: 4px;
  background: ${theme.bgPrimary};
`;

const RemoteName = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${theme.textPrimary};
`;

const RemoteUrl = styled.span`
  font-family: 'SFMono-Regular', Menlo, monospace;
  font-size: 0.6875rem;
  color: ${theme.textMuted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PlaceholderGraph = styled.div`
  border: 1px dashed ${theme.border};
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  color: ${theme.textMuted};
  font-size: 0.875rem;
`;

const Empty = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem;
`;

const EmptyTitle = styled.h2`
  margin: 0;
  font-size: 1.125rem;
  color: ${theme.textPrimary};
`;

const EmptyHint = styled.div`
  font-size: 0.875rem;
  color: ${theme.textMuted};
`;

const ErrorBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  padding: 1.25rem;
  border: 1px solid ${theme.border};
  border-left: 3px solid #d92d20;
  border-radius: 8px;
  background: ${theme.bgSecondary};
`;

const ErrorTitle = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: ${theme.textPrimary};
`;

const ErrorMessage = styled.div`
  font-size: 0.85rem;
  color: ${theme.textMuted};
`;

const ErrorActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.5rem;
`;

const SecondaryAction = styled.button`
  padding: 0.5rem 0.9rem;
  background: transparent;
  color: ${theme.textPrimary};
  border: 1px solid ${theme.border};
  border-radius: 20px;
  font-size: 0.85rem;
  cursor: pointer;
`;
