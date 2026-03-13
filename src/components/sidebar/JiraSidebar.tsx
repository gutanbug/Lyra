import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { theme } from 'lib/styles/theme';
import { useAccount } from 'modules/contexts/account';
import { integrationController } from 'controllers/account';
import JiraTaskIcon from 'components/jira/JiraTaskIcon';
import { Search, Loader } from 'lucide-react';

interface JiraProject {
  key: string;
  name: string;
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
    setSelectedKey((prev) => prev === projectKey ? null : projectKey);
    history.push('/jira');
    // 독립적 이벤트: 스페이스 설정을 변경하지 않음
    window.dispatchEvent(new CustomEvent('lyra:sidebar-browse-project', {
      detail: { projectKey },
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
          placeholder="프로젝트 검색"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </SearchBox>

      <SidebarTitle>프로젝트</SidebarTitle>

      {selectedKey && (
        <ClearBtn onClick={handleClearSelection}>
          ✕ 선택 해제
        </ClearBtn>
      )}

      {loadingProjects ? (
        <LoadingRow><Loader size={14} /><span>로딩 중...</span></LoadingRow>
      ) : filtered.length === 0 ? (
        <EmptyMsg>{filter ? '검색 결과가 없습니다.' : '프로젝트가 없습니다.'}</EmptyMsg>
      ) : (
        <ProjectList>
          {filtered.map((p) => (
            <ProjectItem
              key={p.key}
              $active={selectedKey === p.key}
              onClick={() => handleProjectClick(p.key)}
            >
              <JiraTaskIcon type="task" size={20} />
              <ProjectName>{p.name}</ProjectName>
              <ProjectKey>{p.key}</ProjectKey>
            </ProjectItem>
          ))}
        </ProjectList>
      )}
    </Container>
  );
};

export default JiraSidebar;

// ── Styled Components ──

const Container = styled.div`
  font-size: 0.8125rem;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const SearchBox = styled.div`
  position: relative;
  margin: 0 10px 8px;
`;

const SearchIconWrap = styled.span`
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: ${theme.textMuted};
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 6px 8px 6px 28px;
  border: 1px solid ${theme.border};
  border-radius: 6px;
  background: ${theme.bgPrimary};
  color: ${theme.textPrimary};
  font-size: 0.8125rem;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: ${theme.blue};
  }

  &::placeholder {
    color: ${theme.textMuted};
  }
`;

const SidebarTitle = styled.div`
  padding: 4px 12px;
  font-weight: 600;
  font-size: 0.6875rem;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ClearBtn = styled.button`
  margin: 0 10px 6px;
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background: ${theme.bgTertiary};
  color: ${theme.textSecondary};
  font-size: 0.75rem;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: ${theme.border};
  }
`;

const ProjectList = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const ProjectItem = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  cursor: pointer;
  color: ${({ $active }) => ($active ? theme.blue : theme.textPrimary)};
  background: ${({ $active }) => ($active ? theme.blueLight : 'transparent')};
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  font-size: 0.8125rem;
  transition: background 0.1s ease;

  &:hover {
    background: ${({ $active }) => ($active ? theme.blueLight : theme.bgTertiary)};
  }
`;

const ProjectName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
`;

const ProjectKey = styled.span`
  font-size: 0.6875rem;
  color: ${theme.textMuted};
  flex-shrink: 0;
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
