import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import styled from 'styled-components';
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  GitBranch,
  RefreshCw,
  Plus,
  X,
} from 'lucide-react';
import { theme } from 'lib/styles/theme';
import { gitTheme } from 'lib/styles/gitTheme';
import { transition } from 'lib/styles/styles';
import { useLocalRepo } from 'modules/contexts/localRepo';
import { localGitController } from 'controllers/account';
import type { Commit, LocalRepo } from 'types/git';
import CommitGraph from 'components/git/CommitGraph';

const DEFAULT_COMMITS_LIMIT = 500;

/** 절대 경로의 마지막 세그먼트(=폴더 이름)를 추출. */
function basename(p: string): string {
  const trimmed = p.replace(/[/\\]+$/, '');
  const idx = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
  return idx >= 0 ? trimmed.slice(idx + 1) : trimmed;
}

/**
 * GitKraken-style Git 워크스페이스 페이지.
 * - 상단: 열린 repo 탭 바 (멀티 repo)
 * - 좌측 사이드바: 카테고리별 collapsible 섹션 (LOCAL/REMOTE/TAGS/STASHES/WORKTREES/CLOUD PATCHES/ISSUES/TEAMS)
 * - 중앙: 커밋 그래프 영역 (M6에서 본격 구현)
 * - 우측 사이드바: 변경 사항 패널 (스테이징 UI는 별도 마일스톤)
 */
const GitWorkspacePage = () => {
  const {
    openedRepos,
    currentRepoId,
    currentRepo,
    isOpening,
    errorCode,
    errorMessage,
    gitInstalled,
    openWithDialog,
    switchRepo,
    closeRepo,
    refresh,
    clearError,
  } = useLocalRepo();

  // M8: 시스템 git이 PATH에 없으면 onboarding 안내 — 저장소 열기 자체가 불가하므로 우선 표시.
  if (gitInstalled === false) {
    return (
      <Page>
        <Helmet><title>Git - Workspace</title></Helmet>
        <Empty>
          <EmptyTitle>Git이 설치되어 있지 않습니다</EmptyTitle>
          <EmptyHint>
            Lyra는 시스템 PATH에 등록된 <code>git</code> CLI를 사용해 로컬 저장소를 읽습니다.<br />
            아래 경로에서 OS에 맞는 git을 설치한 뒤 Lyra를 다시 실행해주세요.
          </EmptyHint>
          <GitInstallList>
            <li><strong>macOS</strong>: Xcode Command Line Tools (<code>xcode-select --install</code>) 또는 Homebrew (<code>brew install git</code>)</li>
            <li><strong>Windows</strong>: <a href="https://git-scm.com/download/win" onClick={(e) => { e.preventDefault(); window.electronAPI?.openExternal('https://git-scm.com/download/win'); }}>git-scm.com/download/win</a></li>
            <li><strong>Linux</strong>: <code>sudo apt install git</code> / <code>sudo dnf install git</code> / 패키지 매니저 사용</li>
          </GitInstallList>
        </Empty>
      </Page>
    );
  }

  if (openedRepos.length === 0) {
    return (
      <Page>
        <Helmet><title>Git - Workspace</title></Helmet>
        <Empty>
          <EmptyTitle>아직 열린 저장소가 없습니다</EmptyTitle>
          <EmptyHint>로컬 디렉토리를 선택해 Git 저장소를 엽니다.</EmptyHint>
          <PrimaryButton type="button" disabled={isOpening} onClick={openWithDialog}>
            <FolderOpen size={16} />
            <span>{isOpening ? '여는 중…' : '저장소 열기'}</span>
          </PrimaryButton>
          {errorCode && (
            <ErrorBlock>
              <ErrorTitle>저장소를 열 수 없습니다</ErrorTitle>
              <ErrorMessage>
                {errorCode === 'NOT_A_REPO'
                  ? '선택한 디렉토리는 Git 저장소가 아닙니다.'
                  : errorMessage || '알 수 없는 오류'}
              </ErrorMessage>
              <SecondaryAction type="button" onClick={clearError}>닫기</SecondaryAction>
            </ErrorBlock>
          )}
        </Empty>
      </Page>
    );
  }

  return (
    <Page>
      <Helmet>
        <title>{currentRepo ? `${basename(currentRepo.path)} - Git` : 'Git - Workspace'}</title>
      </Helmet>

      <RepoTabBar>
        {openedRepos.map((repo) => {
          const isActive = repo.id === currentRepoId;
          const name = basename(repo.path);
          return (
            <RepoTab key={repo.id} $active={isActive} onClick={() => switchRepo(repo.id)}>
              <FolderOpen size={12} />
              <RepoTabName title={repo.path}>{name}</RepoTabName>
              <RepoTabClose
                onClick={(e) => { e.stopPropagation(); closeRepo(repo.id); }}
                aria-label={`${name} 탭 닫기`}
              >
                <X size={12} />
              </RepoTabClose>
            </RepoTab>
          );
        })}
        <NewRepoTab type="button" disabled={isOpening} onClick={openWithDialog} aria-label="새 저장소 열기">
          <Plus size={14} />
        </NewRepoTab>
      </RepoTabBar>

      {currentRepo ? (
        <Workspace>
          <LeftSidebar>
            <LeftSidebarHeader>
              <HeadBadge>
                <GitBranch size={12} />
                <span>
                  {currentRepo.detached
                    ? `detached @ ${currentRepo.head.slice(0, 8)}`
                    : currentRepo.head || '(no HEAD)'}
                </span>
              </HeadBadge>
              <IconAction type="button" title="다시 읽기" onClick={refresh}>
                <RefreshCw size={12} />
              </IconAction>
            </LeftSidebarHeader>
            <LeftSidebarBody>
              <LocalBranchesSection repo={currentRepo} />
              <RemoteBranchesSection repo={currentRepo} />
              <WorktreesSection repo={currentRepo} />
              <StashesSection repo={currentRepo} />
              <TagsSection repo={currentRepo} />
              <RemotesSection repo={currentRepo} />
              <PlaceholderSection title="CLOUD PATCHES" hint="외부 PR/MR 동기화 — 후속 마일스톤" />
              <PlaceholderSection title="ISSUES" hint="GitHub/GitLab 이슈 — 후속 마일스톤" />
              <PlaceholderSection title="TEAMS" hint="협업 정보 — 후속 마일스톤" />
            </LeftSidebarBody>
          </LeftSidebar>

          <Center>
            <CenterHeader>
              <CenterRepoPath title={currentRepo.path}>{currentRepo.path}</CenterRepoPath>
            </CenterHeader>
            <CenterBody>
              <CommitsArea repo={currentRepo} />
            </CenterBody>
          </Center>

          <RightSidebar>
            <RightSidebarHeader>변경 사항</RightSidebarHeader>
            <RightSidebarBody>
              <PlaceholderSection title="UNSTAGED FILES" hint="작업 영역의 변경 — 후속 마일스톤" />
              <PlaceholderSection title="STAGED FILES" hint="커밋 후보 — 후속 마일스톤" />
              <CommitComposerPlaceholder>
                커밋 메시지 입력 / 스테이징 UI는 후속 마일스톤에서 추가됩니다.
              </CommitComposerPlaceholder>
            </RightSidebarBody>
          </RightSidebar>
        </Workspace>
      ) : (
        <Empty>
          <EmptyHint>저장소 탭을 선택해주세요.</EmptyHint>
        </Empty>
      )}
    </Page>
  );
};

export default GitWorkspacePage;

// ─── 커밋 영역 ─────────────────────────

/**
 * currentRepo가 바뀌거나 새로고침되면 commits를 다시 가져오는 컨테이너.
 * repo.head/branches가 변경될 때마다 refetch (간단한 식별자로 사용).
 */
const CommitsArea = ({ repo }: { repo: LocalRepo }) => {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // repo.id + branches 신호 변경 시 refetch.
  // (Watcher 통합은 M7에서 — 현재는 명시적 refresh 호출 시점에 branches 시그니처가 바뀌는 패턴에 의존.)
  const branchesSig = repo.branches.map((b) => `${b.scope}:${b.name}@${b.sha}`).join('|');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    localGitController
      .getCommits(repo.id, repo.path, { limit: DEFAULT_COMMITS_LIMIT })
      .then((cs) => {
        if (cancelled) return;
        setCommits(cs);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const err = e as { message?: string };
        setError(err.message || '커밋을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo.id, repo.path, branchesSig]);

  if (loading && commits.length === 0) {
    return <CommitsHint>커밋을 불러오는 중…</CommitsHint>;
  }
  if (error) {
    return <CommitsHint>{error}</CommitsHint>;
  }
  if (commits.length === 0) {
    return <CommitsHint>아직 커밋이 없습니다.</CommitsHint>;
  }
  return (
    <CommitsScroll>
      <CommitGraph commits={commits} />
    </CommitsScroll>
  );
};

const CommitsScroll = styled.div`
  flex: 1;
  min-height: 0;
  /* 세로 스크롤만 — 가로는 그래프 패널 내부에서 자체 처리.
     메시지 컬럼은 항상 보이도록 외부 가로 스크롤 차단. */
  overflow-y: auto;
  overflow-x: hidden;
  background: ${theme.bgPrimary};
  border: 1px solid ${theme.border};
  border-radius: 8px;
`;

const CommitsHint = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.textMuted};
  font-size: 0.875rem;
`;

// ─── Collapsible 섹션 컴포넌트 ─────────────────────────

interface SectionShellProps {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}
const SectionShell = ({ title, count, defaultOpen = false, children }: SectionShellProps) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <SectionWrap>
      <SectionHeader onClick={() => setOpen((v) => !v)}>
        <SectionChevron>
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </SectionChevron>
        <SectionTitle>{title}</SectionTitle>
        {typeof count === 'number' && <SectionCount>{count}</SectionCount>}
      </SectionHeader>
      {open && <SectionBody>{children}</SectionBody>}
    </SectionWrap>
  );
};

const PlaceholderSection = ({ title, hint }: { title: string; hint: string }) => (
  <SectionShell title={title}>
    <PlaceholderHint>{hint}</PlaceholderHint>
  </SectionShell>
);

// ─── 각 데이터 섹션 ─────────────────────────

const LocalBranchesSection = ({ repo }: { repo: LocalRepo }) => {
  const branches = repo.branches.filter((b) => b.scope === 'local');
  return (
    <SectionShell title="LOCAL" count={branches.length} defaultOpen>
      {branches.length === 0 ? (
        <PlaceholderHint>로컬 브랜치가 없습니다.</PlaceholderHint>
      ) : (
        <ItemList>
          {branches.map((b) => (
            <Item key={b.name} $active={!repo.detached && b.name === repo.head}>
              <ItemLabel>{b.name}</ItemLabel>
              <ItemSha>{b.sha.slice(0, 8)}</ItemSha>
            </Item>
          ))}
        </ItemList>
      )}
    </SectionShell>
  );
};

const RemoteBranchesSection = ({ repo }: { repo: LocalRepo }) => {
  const branches = repo.branches.filter((b) => b.scope === 'remote');
  return (
    <SectionShell title="REMOTE" count={branches.length}>
      {branches.length === 0 ? (
        <PlaceholderHint>원격 브랜치가 없습니다.</PlaceholderHint>
      ) : (
        <ItemList>
          {branches.map((b) => (
            <Item key={b.name}>
              <ItemLabel>{b.name}</ItemLabel>
              <ItemSha>{b.sha.slice(0, 8)}</ItemSha>
            </Item>
          ))}
        </ItemList>
      )}
    </SectionShell>
  );
};

const WorktreesSection = ({ repo }: { repo: LocalRepo }) => (
  <SectionShell title="WORKTREES" count={repo.worktrees.length}>
    {repo.worktrees.length === 0 ? (
      <PlaceholderHint>추가 worktree가 없습니다.</PlaceholderHint>
    ) : (
      <ItemList>
        {repo.worktrees.map((w) => (
          <Item key={w.path}>
            <ItemLabel title={w.path}>{w.branch || (w.primary ? '(primary)' : 'detached')}</ItemLabel>
            <ItemSha>{w.sha.slice(0, 8)}</ItemSha>
          </Item>
        ))}
      </ItemList>
    )}
  </SectionShell>
);

const StashesSection = ({ repo }: { repo: LocalRepo }) => (
  <SectionShell title="STASHES" count={repo.stashes.length}>
    {repo.stashes.length === 0 ? (
      <PlaceholderHint>stash가 없습니다.</PlaceholderHint>
    ) : (
      <ItemList>
        {repo.stashes.map((s) => (
          <Item key={s.index}>
            <ItemLabel title={s.message}>{s.message}</ItemLabel>
            <ItemSha>@{s.index}</ItemSha>
          </Item>
        ))}
      </ItemList>
    )}
  </SectionShell>
);

const TagsSection = ({ repo }: { repo: LocalRepo }) => (
  <SectionShell title="TAGS" count={repo.tags.length}>
    {repo.tags.length === 0 ? (
      <PlaceholderHint>tag가 없습니다.</PlaceholderHint>
    ) : (
      <ItemList>
        {repo.tags.map((t) => (
          <Item key={t.name}>
            <ItemLabel>{t.name}</ItemLabel>
            <ItemSha>{t.sha.slice(0, 8)}</ItemSha>
          </Item>
        ))}
      </ItemList>
    )}
  </SectionShell>
);

const RemotesSection = ({ repo }: { repo: LocalRepo }) => {
  const entries = Object.entries(repo.remotes);
  return (
    <SectionShell title="REMOTES" count={entries.length}>
      {entries.length === 0 ? (
        <PlaceholderHint>원격이 없습니다.</PlaceholderHint>
      ) : (
        <ItemList>
          {entries.map(([name, url]) => (
            <Item key={name}>
              <ItemLabel>{name}</ItemLabel>
              <ItemUrl title={url}>{url}</ItemUrl>
            </Item>
          ))}
        </ItemList>
      )}
    </SectionShell>
  );
};

// ─── styled-components ─────────────────────────

const Page = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: ${theme.color.pageBg};
`;

const RepoTabBar = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: ${theme.color.pageBg};
  border-bottom: 1px solid ${gitTheme.divider};
  overflow-x: auto;
  flex-shrink: 0;

  &::-webkit-scrollbar { display: none; }
`;

const RepoTab = styled.div<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 13px;
  border: 1px solid ${({ $active }) => ($active ? theme.color.borderStrong : 'transparent')};
  border-radius: 10px;
  background: ${({ $active }) => ($active ? 'rgba(0,123,255,.09)' : 'transparent')};
  color: ${({ $active }) => ($active ? theme.color.gray8 : theme.color.gray5)};
  box-shadow: ${({ $active }) => ($active ? theme.shadow.tabActive : 'none')};
  font-family: ${theme.font.body};
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  letter-spacing: -0.01em;
  cursor: pointer;
  flex-shrink: 0;
  transition: background ${theme.motion.fast}, color ${theme.motion.fast};

  &:hover { color: ${theme.color.gray8}; }
`;

const RepoTabName = styled.span`
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RepoTabClose = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: ${theme.color.gray5};
  border-radius: 6px;
  cursor: pointer;
  padding: 0;
  transition: background ${theme.motion.fast}, color ${theme.motion.fast};

  &:hover { background: ${theme.color.hairline}; color: ${theme.color.gray8}; }
`;

const NewRepoTab = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px dashed ${theme.color.borderStrong};
  border-radius: 10px;
  background: transparent;
  color: ${theme.color.gray5};
  cursor: pointer;
  transition: color ${theme.motion.fast}, border-color ${theme.motion.fast}, background ${theme.motion.fast};

  &:hover { color: ${theme.color.accent}; border-color: ${theme.color.accent}; background: ${theme.color.accentSoft}; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const Workspace = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
`;

const LeftSidebar = styled.aside`
  width: 230px;
  flex-shrink: 0;
  border-right: 1px solid ${gitTheme.divider};
  background: ${gitTheme.bg.pane};
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const LeftSidebarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid ${gitTheme.divider};
`;

const LeftSidebarBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 8px 18px;
`;

const Center = styled.section`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: ${theme.color.surface};
`;

const CenterHeader = styled.div`
  padding: 12px 18px;
  border-bottom: 1px solid ${gitTheme.divider};
  background: ${theme.color.surface};
`;

const CenterRepoPath = styled.span`
  font-family: ${gitTheme.mono};
  font-size: 12.5px;
  color: ${theme.color.gray5};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
`;

const CenterBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 18px;
`;

const RightSidebar = styled.aside`
  width: 240px;
  flex-shrink: 0;
  border-left: 1px solid ${gitTheme.divider};
  background: ${gitTheme.bg.pane};
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const RightSidebarHeader = styled.div`
  padding: 12px 14px;
  font-family: ${theme.font.body};
  font-size: 11px;
  font-weight: 700;
  color: ${theme.color.gray5};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border-bottom: 1px solid ${gitTheme.divider};
`;

const RightSidebarBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 8px 18px;
`;

const CommitComposerPlaceholder = styled.div`
  margin: 12px;
  padding: 14px 16px;
  border: 1.5px dashed ${theme.color.borderStrong};
  border-radius: ${theme.radius.ctl};
  color: ${theme.color.gray5};
  font-family: ${theme.font.body};
  font-size: 12.5px;
  text-align: center;
`;

const HeadBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 99px;
  background: ${gitTheme.ref.head.bg};
  color: ${gitTheme.ref.head.ink};
  font-family: ${theme.font.body};
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.01em;
  min-width: 0;
  overflow: hidden;

  & > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: ${gitTheme.mono};
  }
`;

const IconAction = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: ${theme.radius.ctl};
  background: transparent;
  color: ${theme.color.gray5};
  cursor: pointer;
  transition: background ${theme.motion.fast}, color ${theme.motion.fast}, border-color ${theme.motion.fast};

  &:hover { color: ${theme.color.accent}; background: ${theme.color.surface}; border-color: ${theme.color.borderStrong}; }
`;

// ── Section internals ──

const SectionWrap = styled.div`
  margin-bottom: 8px;
`;

const SectionHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 8px;
  text-align: left;
  transition: background ${theme.motion.fast};

  &:hover { background: rgba(0,0,0,.03); }
`;

const SectionChevron = styled.span`
  display: inline-flex;
  align-items: center;
  color: ${gitTheme.text.faint};
`;

const SectionTitle = styled.span`
  font-family: ${theme.font.body};
  font-size: 11px;
  font-weight: 700;
  color: ${gitTheme.text.faint};
  letter-spacing: 0.08em;
  text-transform: uppercase;
  flex: 1;
`;

const SectionCount = styled.span`
  font-family: ${theme.font.body};
  font-size: 11px;
  font-weight: 600;
  color: ${theme.color.gray5};
  padding: 2px 8px;
  background: ${theme.color.gray1};
  border-radius: 99px;
  line-height: 1;
`;

const SectionBody = styled.div`
  padding: 4px 4px 8px;
`;

const ItemList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Item = styled.li<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 11px;
  border-radius: 11px;
  background: ${({ $active }) => ($active ? 'rgba(0,123,255,.09)' : 'transparent')};
  font-family: ${theme.font.body};
  font-size: 13px;
  color: ${({ $active }) => ($active ? theme.color.gray8 : theme.color.gray6)};
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  cursor: default;
  transition: background ${theme.motion.fast}, color ${theme.motion.fast};

  & svg { color: ${({ $active }) => ($active ? theme.color.accent : theme.color.gray5)}; }
  &:hover { background: ${({ $active }) => ($active ? 'rgba(0,123,255,.09)' : 'rgba(0,0,0,.03)')}; color: ${theme.color.gray8}; }
`;

const ItemLabel = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${gitTheme.mono};
`;

const ItemSha = styled.span`
  font-family: ${gitTheme.mono};
  font-size: 11.5px;
  color: ${gitTheme.text.faint};
  flex-shrink: 0;
`;

const ItemUrl = styled.span`
  font-family: ${gitTheme.mono};
  font-size: 11px;
  color: ${gitTheme.text.faint};
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PlaceholderHint = styled.div`
  font-family: ${theme.font.body};
  font-size: 12px;
  color: ${theme.color.gray5};
  padding: 6px 10px;
`;

const Empty = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 48px;
`;

const EmptyTitle = styled.h2`
  margin: 0;
  font-family: ${theme.font.body};
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${theme.color.gray8};
`;

const EmptyHint = styled.div`
  font-family: ${theme.font.body};
  font-size: 14px;
  color: ${theme.color.gray6};
  line-height: 1.5;
  text-align: center;
`;

const GitInstallList = styled.ul`
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-family: ${theme.font.body};
  font-size: 13.5px;
  color: ${theme.color.gray7};
  max-width: 560px;

  & > li {
    padding: 12px 14px;
    background: ${theme.color.surface};
    border: 1px solid ${theme.color.borderDefault};
    border-radius: ${theme.radius.ctl};
  }

  code {
    font-family: ${gitTheme.mono};
    font-size: 12.5px;
    background: ${theme.color.hairline};
    color: ${theme.color.gray8};
    padding: 2px 8px;
    border-radius: 6px;
  }

  a {
    color: ${theme.color.accent};
    cursor: pointer;
    text-decoration: underline;
  }
`;

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 13px 22px;
  border-radius: ${theme.radius.ctl};
  font-family: ${theme.font.body};
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  background: ${theme.color.accent};
  color: #fff;
  border: none;
  box-shadow: ${theme.shadow.btnAccent};
  transition: filter ${theme.motion.fast}, transform ${theme.motion.fast};

  &:hover:not(:disabled) { filter: brightness(1.07); transform: translateY(-1px); }
  &:active:not(:disabled) { transform: scale(0.98); }
  &:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
`;

const ErrorBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
  padding: 14px 18px;
  border: 1px solid ${theme.color.borderDefault};
  border-left: 3px solid ${theme.color.danger};
  border-radius: ${theme.radius.ctl};
  background: ${theme.color.surface};
  margin-top: 8px;
`;

const ErrorTitle = styled.div`
  font-family: ${theme.font.body};
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${theme.color.gray8};
`;

const ErrorMessage = styled.div`
  font-family: ${theme.font.body};
  font-size: 13px;
  color: ${theme.color.gray6};
`;

const SecondaryAction = styled.button`
  padding: 10px 18px;
  background: ${theme.color.hairline};
  color: ${theme.color.gray7};
  border: 1px solid ${theme.color.borderStrong};
  border-radius: ${theme.radius.ctl};
  font-family: ${theme.font.body};
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background ${theme.motion.fast};

  &:hover { background: ${theme.color.gray1}; }
`;
