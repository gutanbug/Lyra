import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { theme } from 'lib/styles/theme';
import { useAccount } from 'modules/contexts/account';
import { integrationController } from 'controllers/account';
import { ChevronRight, ChevronDown, FolderOpen, FileText, Loader, Search, Settings } from 'lucide-react';

interface Space {
  id: string;
  key: string;
  name: string;
  type?: string;
}

interface PageNode {
  id: string;
  title: string;
  parentId: string | null;
  children: PageNode[];
  /** 자식 로드 가능 여부 (lazy loading) */
  hasChildren: boolean;
  /** 자식이 이미 로드되었는지 여부 */
  childrenLoaded: boolean;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** 스페이스 설정 로드 (localStorage / Electron settings) */
async function loadSelectedSpaces(accountId: string): Promise<string[]> {
  try {
    if ((window as any).workspaceAPI?.settings) {
      return await (window as any).workspaceAPI.settings.getSelectedSpaces?.(accountId) ?? [];
    }
    const raw = localStorage.getItem(`lyra:confluence:selectedSpaces:${accountId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

const ConfluenceSidebar = () => {
  const { activeAccount } = useAccount();
  const history = useHistory();

  // 설정된 스페이스 키 목록
  const [configuredSpaceKeys, setConfiguredSpaceKeys] = useState<string[]>([]);
  // 설정된 스페이스 정보 (API 조회 결과)
  const [configuredSpaces, setConfiguredSpaces] = useState<Space[]>([]);
  // 현재 선택된 스페이스 (한 개만)
  const [selectedSpaceKey, setSelectedSpaceKey] = useState<string | null>(null);
  // 페이지 트리
  const [pageTree, setPageTree] = useState<PageNode[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // 검색
  const [filter, setFilter] = useState('');
  // 로딩 상태
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);

  // 스페이스 설정 로드
  const loadSettings = useCallback(async () => {
    if (!activeAccount) return;
    setLoadingSettings(true);
    try {
      const keys = await loadSelectedSpaces(activeAccount.id);
      setConfiguredSpaceKeys(keys);
      // 설정된 스페이스가 비었으면 초기화
      if (keys.length === 0) {
        setConfiguredSpaces([]);
        setSelectedSpaceKey(null);
        setPageTree([]);
      }
    } catch { /* ignore */ }
    setLoadingSettings(false);
  }, [activeAccount]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // 대시보드에서 스페이스 설정 변경 시 동기화
  useEffect(() => {
    const handler = () => loadSettings();
    window.addEventListener('lyra:confluence-space-settings-changed', handler);
    return () => window.removeEventListener('lyra:confluence-space-settings-changed', handler);
  }, [loadSettings]);

  // 설정된 스페이스 키가 변경되면 API에서 스페이스 정보 조회
  useEffect(() => {
    if (!activeAccount || configuredSpaceKeys.length === 0) {
      setConfiguredSpaces([]);
      return;
    }
    setLoadingSpaces(true);
    integrationController.invoke({
      accountId: activeAccount.id,
      serviceType: 'confluence',
      action: 'getSpaces',
      params: {},
    }).then((result) => {
      const r = result as Record<string, unknown>;
      const raw = (r.results ?? []) as Record<string, unknown>[];
      const keySet = new Set(configuredSpaceKeys);
      const list = raw
        .map((s) => ({
          id: str(s.id),
          key: str(s.key),
          name: str(s.name),
          type: str(s.type),
        }))
        .filter((s) => s.key && keySet.has(s.key))
        .sort((a, b) => a.name.localeCompare(b.name));
      setConfiguredSpaces(list);

      // 선택된 스페이스가 설정 목록에 없으면 첫 번째로 자동 선택
      if (list.length > 0) {
        setSelectedSpaceKey((prev) => {
          if (prev && list.some((s) => s.key === prev)) return prev;
          return list[0].key;
        });
      } else {
        setSelectedSpaceKey(null);
        setPageTree([]);
      }
    }).catch(() => setConfiguredSpaces([]))
      .finally(() => setLoadingSpaces(false));
  }, [activeAccount, configuredSpaceKeys]);

  // 자식 로딩 중인 노드 ID
  const [loadingChildIds, setLoadingChildIds] = useState<Set<string>>(new Set());

  /** raw API 결과를 PageNode 배열로 변환 */
  const rawToNodes = useCallback((rawPages: Record<string, unknown>[]): PageNode[] => {
    return rawPages.map((p) => ({
      id: str(p.id),
      title: str(p.title),
      parentId: p.parentId ? str(p.parentId) : null,
      children: [],
      hasChildren: !!p.hasChildren,
      childrenLoaded: false,
    }));
  }, []);

  /** 트리에서 특정 노드의 children을 업데이트 (불변) */
  const updateNodeChildren = useCallback((nodes: PageNode[], targetId: string, children: PageNode[]): PageNode[] => {
    return nodes.map((node) => {
      if (node.id === targetId) {
        return { ...node, children, childrenLoaded: true, hasChildren: children.length > 0 };
      }
      if (node.children.length > 0) {
        const updated = updateNodeChildren(node.children, targetId, children);
        if (updated !== node.children) return { ...node, children: updated };
      }
      return node;
    });
  }, []);

  // 선택된 스페이스 변경 시 루트 페이지만 로드
  useEffect(() => {
    if (!activeAccount || !selectedSpaceKey) {
      setPageTree([]);
      return;
    }
    let cancelled = false;
    setLoadingPages(true);
    setPageTree([]);
    setExpandedIds(new Set());
    setLoadingChildIds(new Set());
    setFilter('');

    (async () => {
      try {
        const result = await integrationController.invoke({
          accountId: activeAccount.id,
          serviceType: 'confluence',
          action: 'getSpacePages',
          params: { spaceKey: selectedSpaceKey },
        });
        if (cancelled) return;

        const r = result as Record<string, unknown>;
        const rawPages = (r.results ?? []) as Record<string, unknown>[];
        const nodes = rawToNodes(rawPages);

        // Confluence 스페이스 홈 페이지 건너뛰기
        const finalRoots = (nodes.length === 1 && nodes[0].hasChildren)
          ? [{ ...nodes[0], childrenLoaded: false }] // 홈 페이지 1개면 자동 펼침 처리
          : nodes;

        if (!cancelled) setPageTree(finalRoots);
      } catch (err) {
        console.error('[ConfluenceSidebar] load error:', err);
        if (!cancelled) setPageTree([]);
      } finally {
        if (!cancelled) setLoadingPages(false);
      }
    })();

    return () => { cancelled = true; };
  }, [activeAccount, selectedSpaceKey, rawToNodes]);

  /** 자식 페이지 lazy 로드 */
  const loadChildren = useCallback(async (nodeId: string) => {
    if (!activeAccount) return;
    setLoadingChildIds((prev) => new Set(prev).add(nodeId));
    try {
      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'confluence',
        action: 'getChildPages',
        params: { pageId: nodeId },
      });
      const r = result as Record<string, unknown>;
      const rawPages = (r.results ?? []) as Record<string, unknown>[];
      const children = rawToNodes(rawPages);
      setPageTree((prev) => updateNodeChildren(prev, nodeId, children));
    } catch (err) {
      console.error('[ConfluenceSidebar] loadChildren error:', err);
      // 자식이 없는 것으로 표시
      setPageTree((prev) => updateNodeChildren(prev, nodeId, []));
    } finally {
      setLoadingChildIds((prev) => {
        const next = new Set(prev);
        next.delete(nodeId);
        return next;
      });
    }
  }, [activeAccount, rawToNodes, updateNodeChildren]);

  const handleSelectSpace = useCallback((spaceKey: string) => {
    setSelectedSpaceKey((prev) => (prev === spaceKey ? prev : spaceKey));
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const navigateToPage = useCallback((pageId: string) => {
    history.push(`/confluence/page/${pageId}`);
  }, [history]);

  // 검색 필터 적용된 트리
  const filterTree = useCallback((nodes: PageNode[], query: string): PageNode[] => {
    if (!query) return nodes;
    const q = query.toLowerCase();
    const result: PageNode[] = [];
    for (const node of nodes) {
      const filteredChildren = filterTree(node.children, query);
      if (node.title.toLowerCase().includes(q) || filteredChildren.length > 0) {
        result.push({ ...node, children: filteredChildren });
      }
    }
    return result;
  }, []);

  const displayTree = filter ? filterTree(pageTree, filter) : pageTree;

  const handleToggleExpand = useCallback((node: PageNode) => {
    const isExpanded = expandedIds.has(node.id);
    toggleExpand(node.id);
    // 펼칠 때 자식이 아직 로드되지 않았으면 lazy 로드
    if (!isExpanded && node.hasChildren && !node.childrenLoaded) {
      loadChildren(node.id);
    }
  }, [expandedIds, toggleExpand, loadChildren]);

  const renderNode = (node: PageNode, depth: number) => {
    const showAsFolder = node.hasChildren || node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const isLoadingChildren = loadingChildIds.has(node.id);

    return (
      <div key={node.id}>
        <TreeRow $depth={depth}>
          {showAsFolder ? (
            <ExpandBtn onClick={() => handleToggleExpand(node)}>
              {isLoadingChildren
                ? <Loader size={12} />
                : isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
              }
            </ExpandBtn>
          ) : (
            <ExpandSpacer />
          )}
          {showAsFolder
            ? <FolderOpen size={15} color={theme.textMuted} />
            : <FileText size={15} color={theme.textMuted} />
          }
          <PageTitle
            onClick={() => {
              if (showAsFolder) handleToggleExpand(node);
              navigateToPage(node.id);
            }}
            title={node.title}
          >
            {node.title}
          </PageTitle>
        </TreeRow>
        {isExpanded && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  const selectedSpaceInfo = configuredSpaces.find((s) => s.key === selectedSpaceKey);

  // 로딩 중
  if (loadingSettings) {
    return (
      <Container>
        <LoadingRow><Loader size={14} /><span>로딩 중...</span></LoadingRow>
      </Container>
    );
  }

  // 스페이스 설정이 없는 경우
  if (configuredSpaceKeys.length === 0) {
    return (
      <Container>
        <EmptySettingsArea>
          <Settings size={20} color={theme.textMuted} />
          <EmptySettingsText>
            스페이스 설정을 진행해야만 조회할 수 있습니다.
          </EmptySettingsText>
          <GoSettingsBtn onClick={() => history.push('/confluence')}>
            스페이스 설정하기
          </GoSettingsBtn>
        </EmptySettingsArea>
      </Container>
    );
  }

  return (
    <Container>
      {/* 스페이스 선택 영역 */}
      {configuredSpaces.length > 1 && (
        <>
          <SidebarTitle>스페이스</SidebarTitle>
          {loadingSpaces ? (
            <LoadingRow><Loader size={14} /><span>로딩 중...</span></LoadingRow>
          ) : (
            <SpaceList>
              {configuredSpaces.map((s) => (
                <SpaceItem
                  key={s.key}
                  $active={selectedSpaceKey === s.key}
                  onClick={() => handleSelectSpace(s.key)}
                >
                  <FolderOpen size={14} />
                  <SpaceName>{s.name}</SpaceName>
                  {!s.key.startsWith('~') && <SpaceKeyLabel>{s.key}</SpaceKeyLabel>}
                </SpaceItem>
              ))}
            </SpaceList>
          )}
          <Divider />
        </>
      )}

      {/* 스페이스 헤더 (단일 또는 선택된 스페이스) */}
      {selectedSpaceInfo && (
        <SpaceHeader>
          <SpaceHeaderName title={selectedSpaceInfo.name}>
            {selectedSpaceInfo.name}
          </SpaceHeaderName>
          {!selectedSpaceInfo.key.startsWith('~') && (
            <SpaceHeaderKey>{selectedSpaceInfo.key}</SpaceHeaderKey>
          )}
        </SpaceHeader>
      )}

      {/* 페이지 검색 */}
      {selectedSpaceKey && pageTree.length > 0 && (
        <SearchBox>
          <SearchIconWrap><Search size={14} /></SearchIconWrap>
          <SearchInput
            placeholder="제목으로 검색"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </SearchBox>
      )}

      {/* 페이지 트리 */}
      {loadingPages ? (
        <LoadingRow><Loader size={14} /><span>페이지 로딩 중...</span></LoadingRow>
      ) : !selectedSpaceKey ? (
        <EmptyMsg>스페이스를 선택해주세요.</EmptyMsg>
      ) : displayTree.length === 0 ? (
        <EmptyMsg>{filter ? '검색 결과가 없습니다.' : '페이지가 없습니다.'}</EmptyMsg>
      ) : (
        <TreeContainer>
          {displayTree.map((node) => renderNode(node, 0))}
        </TreeContainer>
      )}
    </Container>
  );
};

export default ConfluenceSidebar;

// ── Styled Components ──

const Container = styled.div`
  font-size: 0.8125rem;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const SidebarTitle = styled.div`
  padding: 4px 12px;
  font-weight: 600;
  font-size: 0.6875rem;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const SpaceList = styled.div`
  max-height: 160px;
  overflow-y: auto;
`;

const SpaceItem = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
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

const SpaceName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
`;

const SpaceKeyLabel = styled.span`
  font-size: 0.6875rem;
  color: ${theme.textMuted};
  flex-shrink: 0;
`;

const SpaceHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
`;

const SpaceHeaderName = styled.span`
  font-weight: 600;
  font-size: 0.875rem;
  color: ${theme.textPrimary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
`;

const SpaceHeaderKey = styled.span`
  font-size: 0.6875rem;
  color: ${theme.textMuted};
  flex-shrink: 0;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${theme.border};
  margin: 4px 0;
`;

const SearchBox = styled.div`
  position: relative;
  margin: 4px 10px 8px;
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

const TreeContainer = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const TreeRow = styled.div<{ $depth: number }>`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px 5px ${({ $depth }) => 12 + $depth * 16}px;
  min-height: 32px;

  &:hover {
    background: ${theme.bgTertiary};
  }
`;

const ExpandBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  background: none;
  border: none;
  color: ${theme.textMuted};
  cursor: pointer;
  flex-shrink: 0;
  border-radius: 3px;

  &:hover {
    background: ${theme.border};
    color: ${theme.textPrimary};
  }
`;

const ExpandSpacer = styled.span`
  width: 18px;
  flex-shrink: 0;
`;

const PageTitle = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${theme.textSecondary};
  cursor: pointer;
  font-size: 0.875rem;

  &:hover {
    color: ${theme.blue};
  }
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

const EmptySettingsArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 16px;
  text-align: center;
`;

const EmptySettingsText = styled.p`
  margin: 0;
  color: ${theme.textMuted};
  font-size: 0.8125rem;
  line-height: 1.5;
`;

const GoSettingsBtn = styled.button`
  padding: 6px 14px;
  background: ${theme.blue};
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
`;
