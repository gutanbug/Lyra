import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { theme } from 'lib/styles/theme';
import { useAccount } from 'modules/contexts/account';
import { integrationController } from 'controllers/account';
import JiraTaskIcon from 'components/jira/JiraTaskIcon';
import { Search, Loader, ChevronDown, ChevronRight, LayoutGrid, X } from 'lucide-react';

interface JiraProject {
  key: string;
  name: string;
}

interface JiraBoard {
  id: number;
  name: string;
  type: string;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** localStorage / Electron settings에서 스페이스 설정 읽기 */
async function loadSpaceSettings(accountId: string): Promise<string[]> {
  try {
    if ((window as any).workspaceAPI?.settings) {
      return await (window as any).workspaceAPI.settings.getSelectedProjects(accountId);
    }
    const raw = localStorage.getItem(`lyra:jira:selectedProjects:${accountId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

const JiraSidebar = () => {
  const { activeAccount } = useAccount();
  const history = useHistory();

  const [allProjects, setAllProjects] = useState<JiraProject[]>([]);
  const [spaceKeys, setSpaceKeys] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // 보드 토글: projectKey → 펼침/접힘 + 캐시
  const [expandedBoards, setExpandedBoards] = useState<Set<string>>(new Set());
  const [boardsByProject, setBoardsByProject] = useState<Record<string, JiraBoard[]>>({});
  const [loadingBoards, setLoadingBoards] = useState<Set<string>>(new Set());

  // 스페이스 설정 로드
  useEffect(() => {
    if (!activeAccount) return;
    loadSpaceSettings(activeAccount.id).then(setSpaceKeys);
  }, [activeAccount]);

  // 스페이스 설정 변경 감지 (대시보드에서 저장 시)
  useEffect(() => {
    const handler = () => {
      if (activeAccount) {
        loadSpaceSettings(activeAccount.id).then(setSpaceKeys);
      }
    };
    window.addEventListener('lyra:space-settings-changed', handler);
    return () => window.removeEventListener('lyra:space-settings-changed', handler);
  }, [activeAccount]);

  // 프로젝트 목록 로드
  useEffect(() => {
    if (!activeAccount) return;
    setLoadingProjects(true);
    integrationController.invoke({
      accountId: activeAccount.id,
      serviceType: 'jira',
      action: 'getProjects',
      params: {},
    }).then((result) => {
      const raw = Array.isArray(result) ? result : [];
      const list = raw.map((p: unknown) => {
        const po = p as Record<string, unknown>;
        return { key: str(po.key), name: str(po.name) };
      }).filter((p: JiraProject) => p.key)
        .sort((a: JiraProject, b: JiraProject) => a.name.localeCompare(b.name));
      setAllProjects(list);
    }).catch(() => setAllProjects([]))
      .finally(() => setLoadingProjects(false));
  }, [activeAccount]);

  // 스페이스 설정 기반 프로젝트 필터링
  const visibleProjects = spaceKeys.length > 0
    ? allProjects.filter((p) => spaceKeys.includes(p.key))
    : allProjects;

  const handleProjectClick = useCallback((projectKey: string) => {
    // 동일 스페이스 재클릭은 해제로 동작 — "선택 해제" 버튼과 동일한 효과
    setSelectedKey((prev) => {
      const isDeselect = prev === projectKey;
      window.dispatchEvent(new CustomEvent('lyra:sidebar-browse-project', {
        detail: { projectKey: isDeselect ? null : projectKey },
      }));
      return isDeselect ? null : projectKey;
    });
    history.push('/jira');
  }, [history]);

  // 보드 토글: 펼치면 lazy fetch
  const toggleBoards = useCallback(async (projectKey: string) => {
    setExpandedBoards((prev) => {
      const next = new Set(prev);
      if (next.has(projectKey)) next.delete(projectKey);
      else next.add(projectKey);
      return next;
    });
    if (boardsByProject[projectKey] !== undefined) return; // 이미 캐시
    if (!activeAccount) return;
    setLoadingBoards((prev) => new Set(prev).add(projectKey));
    try {
      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'jira',
        action: 'getProjectBoards',
        params: { projectKey },
      });
      const list = (Array.isArray(result) ? result : []) as Array<Record<string, unknown>>;
      const boards: JiraBoard[] = list
        .map((b) => ({
          id: Number(b.id ?? 0),
          name: String(b.name ?? ''),
          type: String(b.type ?? ''),
        }))
        .filter((b) => b.id && b.name);
      setBoardsByProject((prev) => ({ ...prev, [projectKey]: boards }));
    } catch {
      setBoardsByProject((prev) => ({ ...prev, [projectKey]: [] }));
    } finally {
      setLoadingBoards((prev) => {
        const next = new Set(prev);
        next.delete(projectKey);
        return next;
      });
    }
  }, [activeAccount, boardsByProject]);

  const handleBoardClick = useCallback((projectKey: string, board: JiraBoard) => {
    setSelectedKey(projectKey);
    history.push('/jira');
    // 대시보드 browse 모드를 board scope로 전환
    window.dispatchEvent(new CustomEvent('lyra:sidebar-browse-board', {
      detail: { projectKey, boardId: board.id, boardName: board.name },
    }));
  }, [history]);

  // 선택 해제
  const handleClearSelection = useCallback(() => {
    setSelectedKey(null);
    history.push('/jira');
    window.dispatchEvent(new CustomEvent('lyra:sidebar-browse-project', {
      detail: { projectKey: null },
    }));
  }, [history]);

  const filtered = filter
    ? visibleProjects.filter((p) =>
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      p.key.toLowerCase().includes(filter.toLowerCase())
    )
    : visibleProjects;

  return (
    <Container>
      <SearchBox>
        <SearchIconWrap><Search size={14} /></SearchIconWrap>
        <SearchInput
          placeholder="스페이스 검색"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </SearchBox>

      <TitleRow>
        <SidebarTitle>스페이스</SidebarTitle>
        {selectedKey && (
          <ClearBtn onClick={handleClearSelection} title="선택 해제">
            <X size={14} /> 선택 해제
          </ClearBtn>
        )}
      </TitleRow>

      {loadingProjects ? (
        <LoadingRow><Loader size={14} /><span>로딩 중...</span></LoadingRow>
      ) : filtered.length === 0 ? (
        <EmptyMsg>{filter ? '검색 결과가 없습니다.' : '스페이스가 없습니다.'}</EmptyMsg>
      ) : (
        <ProjectList>
          {filtered.map((p) => {
            const isActive = selectedKey === p.key;
            const isExpanded = expandedBoards.has(p.key);
            const boards = boardsByProject[p.key];
            const isLoadingBoards = loadingBoards.has(p.key);
            return (
              <ProjectCard key={p.key} $active={isActive}>
                <ProjectHeader $active={isActive} onClick={() => handleProjectClick(p.key)}>
                  <ProjectIconWrap>
                    <JiraTaskIcon type="task" size={20} />
                  </ProjectIconWrap>
                  <ProjectInfo>
                    <ProjectName>{p.name}</ProjectName>
                    <ProjectKey>{p.key}</ProjectKey>
                  </ProjectInfo>
                  <BoardsToggle
                    type="button"
                    title="보드 보기"
                    onClick={(e) => { e.stopPropagation(); toggleBoards(p.key); }}
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </BoardsToggle>
                </ProjectHeader>
                {isExpanded && (
                  <BoardList>
                    {isLoadingBoards ? (
                      <BoardEmpty><Loader size={12} /> 보드 로딩 중...</BoardEmpty>
                    ) : !boards || boards.length === 0 ? (
                      <BoardEmpty>보드가 없습니다.</BoardEmpty>
                    ) : (
                      boards.map((b) => (
                        <BoardItem key={b.id} onClick={() => handleBoardClick(p.key, b)}>
                          <LayoutGrid size={12} />
                          <BoardName>{b.name}</BoardName>
                        </BoardItem>
                      ))
                    )}
                  </BoardList>
                )}
              </ProjectCard>
            );
          })}
        </ProjectList>
      )}
    </Container>
  );
};

export default JiraSidebar;

// ── Styled Components ──

const Container = styled.div`
  font-family: ${theme.font.body};
  font-size: 13px;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const SearchBox = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 12px 10px;
  padding: 10px 12px;
  background: ${theme.color.gray0};
  border: 1.5px solid ${theme.color.borderStrong};
  border-radius: ${theme.radius.ctl};
  transition: border-color ${theme.motion.fast}, background ${theme.motion.fast};

  &:focus-within {
    border-color: ${theme.color.accent};
    background: ${theme.color.surface};
  }
`;

const SearchIconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  color: #a39d96;
  flex-shrink: 0;
`;

const SearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: ${theme.font.body};
  font-size: 13px;
  color: ${theme.color.gray8};

  &::placeholder { color: ${theme.color.gray5}; }
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px;
  margin-bottom: 4px;
`;

const SidebarTitle = styled.div`
  font-weight: 700;
  font-size: 11px;
  color: ${theme.color.gray5};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const ClearBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 11px;
  border: 1px solid ${theme.color.borderStrong};
  border-radius: 99px;
  background: ${theme.color.surface};
  color: ${theme.color.gray6};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  line-height: 1;
  transition: background ${theme.motion.fast}, color ${theme.motion.fast}, border-color ${theme.motion.fast};

  & svg { flex-shrink: 0; }

  &:hover {
    background: ${theme.color.hairline};
    color: ${theme.color.gray8};
    border-color: ${theme.color.gray5};
  }
`;

const ProjectList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ProjectCard = styled.div<{ $active: boolean }>`
  position: relative;
  border-radius: ${theme.radius.ctl};
  background: ${({ $active }) => ($active ? theme.color.accentSoft : 'transparent')};
  overflow: hidden;
  transition: background ${theme.motion.fast};

  ${({ $active }) => $active && `
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 18px;
      background: ${theme.color.accent};
      border-radius: 0 3px 3px 0;
    }
  `}

  &:hover {
    background: ${({ $active }) => ($active ? theme.color.accentSoft : theme.color.hairline)};
  }
`;

const ProjectHeader = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px 13px;
  cursor: pointer;
  color: ${({ $active }) => ($active ? theme.color.gray8 : theme.color.gray6)};
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
`;

const ProjectIconWrap = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ProjectInfo = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  gap: 2px;
`;

const ProjectName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
`;

const ProjectKey = styled.span`
  font-size: 0.6875rem;
  color: ${theme.textMuted};
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
`;

const BoardsToggle = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: ${theme.textMuted};
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: ${theme.textPrimary};
  }
`;

const BoardList = styled.div`
  border-top: 1px solid ${theme.border};
  background: ${theme.bgSecondary};
  padding: 4px 0;
`;

const BoardItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 24px;
  cursor: pointer;
  font-size: 0.75rem;
  color: ${theme.textSecondary};

  &:hover {
    background: ${theme.bgTertiary};
    color: ${theme.textPrimary};
  }
`;

const BoardName = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const BoardType = styled.span`
  font-size: 0.6875rem;
  color: ${theme.textMuted};
  text-transform: lowercase;
`;

const BoardEmpty = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px 6px 24px;
  font-size: 0.75rem;
  color: ${theme.textMuted};

  svg { animation: spin 1s linear infinite; }
`;

const LoadingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  color: ${theme.textMuted};
  font-size: 0.8125rem;

  svg {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const EmptyMsg = styled.div`
  padding: 12px;
  color: ${theme.textMuted};
  font-size: 0.8125rem;
`;
