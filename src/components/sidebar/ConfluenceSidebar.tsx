import { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { useHistory, useLocation } from 'react-router-dom';
import { theme } from 'lib/styles/theme';
import { useAccount } from 'modules/contexts/account';
import { integrationController } from 'controllers/account';
import { ChevronRight, ChevronDown, FolderOpen, FileText, Loader, Search, Settings, Globe } from 'lucide-react';

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
  hasChildren: boolean;
  childrenLoaded: boolean;
  /** 'page' | 'folder' — 폴더는 v2 folder API로 자식 조회 */
  nodeType: 'page' | 'folder';
}

/** 스페이스별 페이지 트리 상태 */
interface SpaceTree {
  pages: PageNode[];
  loading: boolean;
  loaded: boolean;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

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
  const location = useLocation();

  // 현재 선택된 페이지 ID 추출
  const activePageId = (() => {
    const match = location.pathname.match(/\/confluence\/page\/(\d+)/);
    return match ? match[1] : null;
  })();

  const [configuredSpaceKeys, setConfiguredSpaceKeys] = useState<string[]>([]);
  const [configuredSpaces, setConfiguredSpaces] = useState<Space[]>([]);
  const [expandedSpaceKeys, setExpandedSpaceKeys] = useState<Set<string>>(new Set());
  const [spaceTrees, setSpaceTrees] = useState<Record<string, SpaceTree>>({});
  const [expandedPageIds, setExpandedPageIds] = useState<Set<string>>(new Set());
  const [loadingChildIds, setLoadingChildIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingSpaces, setLoadingSpaces] = useState(false);

  // 스페이스 로드 취소용
  const cancelledRef = useRef<Set<string>>(new Set());

  const loadSettings = useCallback(async () => {
    if (!activeAccount) return;
    setLoadingSettings(true);
    try {
      const keys = await loadSelectedSpaces(activeAccount.id);
      setConfiguredSpaceKeys(keys);
      if (keys.length === 0) {
        setConfiguredSpaces([]);
        setExpandedSpaceKeys(new Set());
        setSpaceTrees({});
      }
    } catch { /* ignore */ }
    setLoadingSettings(false);
  }, [activeAccount]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  useEffect(() => {
    const handler = () => loadSettings();
    window.addEventListener('lyra:confluence-space-settings-changed', handler);
    return () => window.removeEventListener('lyra:confluence-space-settings-changed', handler);
  }, [loadSettings]);

  // 스페이스 정보 조회
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
    }).catch(() => setConfiguredSpaces([]))
      .finally(() => setLoadingSpaces(false));
  }, [activeAccount, configuredSpaceKeys]);

  const rawToNodes = useCallback((rawPages: Record<string, unknown>[]): PageNode[] => {
    return rawPages.map((p) => {
      const preloaded = p.preloadedChildren as Record<string, unknown>[] | undefined;
      const children = Array.isArray(preloaded) ? rawToNodes(preloaded) : [];
      const nodeType = str(p.type) === 'folder' ? 'folder' : 'page';
      return {
        id: str(p.id),
        title: str(p.title),
        parentId: p.parentId ? str(p.parentId) : null,
        children,
        hasChildren: !!p.hasChildren,
        childrenLoaded: children.length > 0,
        nodeType: nodeType as 'page' | 'folder',
      };
    });
  }, []);

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

  /** 스페이스 루트 페이지 로드 */
  const loadSpacePages = useCallback(async (spaceKey: string) => {
    if (!activeAccount) return;

    setSpaceTrees((prev) => ({
      ...prev,
      [spaceKey]: { pages: [], loading: true, loaded: false },
    }));

    cancelledRef.current.delete(spaceKey);

    try {
      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'confluence',
        action: 'getSpacePages',
        params: { spaceKey },
      });

      if (cancelledRef.current.has(spaceKey)) return;

      const r = result as Record<string, unknown>;
      const rawPages = (r.results ?? []) as Record<string, unknown>[];
      const nodes = rawToNodes(rawPages);

      // preload된 자식이 있는 노드 자동 expand
      const autoExpandIds = new Set<string>();
      for (const node of nodes) {
        if (node.childrenLoaded && node.children.length > 0) {
          autoExpandIds.add(node.id);
        }
      }
      if (autoExpandIds.size > 0) {
        setExpandedPageIds((prev) => {
          const next = new Set(prev);
          autoExpandIds.forEach((id) => next.add(id));
          return next;
        });
      }

      setSpaceTrees((prev) => ({
        ...prev,
        [spaceKey]: { pages: nodes, loading: false, loaded: true },
      }));
    } catch (err) {
      console.error('[ConfluenceSidebar] loadSpacePages error:', err);
      if (!cancelledRef.current.has(spaceKey)) {
        setSpaceTrees((prev) => ({
          ...prev,
          [spaceKey]: { pages: [], loading: false, loaded: true },
        }));
      }
    }
  }, [activeAccount, rawToNodes]);

  /** 스페이스 펼치기/접기 */
  const handleToggleSpace = useCallback((spaceKey: string) => {
    setExpandedSpaceKeys((prev) => {
      const next = new Set(prev);
      if (next.has(spaceKey)) {
        next.delete(spaceKey);
        cancelledRef.current.add(spaceKey);
      } else {
        next.add(spaceKey);
        // 아직 로드하지 않았으면 로드
        const tree = spaceTrees[spaceKey];
        if (!tree || !tree.loaded) {
          loadSpacePages(spaceKey);
        }
      }
      return next;
    });
  }, [spaceTrees, loadSpacePages]);

  /** 자식 노드 lazy 로드 (폴더 → getFolderChildren, 페이지 → getChildPages) */
  const loadChildren = useCallback(async (nodeId: string, spaceKey: string, nodeType: 'page' | 'folder') => {
    if (!activeAccount) return;
    setLoadingChildIds((prev) => new Set(prev).add(nodeId));
    try {
      const isFolder = nodeType === 'folder';
      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'confluence',
        action: isFolder ? 'getFolderChildren' : 'getChildPages',
        params: isFolder ? { folderId: nodeId } : { pageId: nodeId },
      });
      const r = result as Record<string, unknown>;
      const rawPages = (r.results ?? []) as Record<string, unknown>[];
      const children = rawToNodes(rawPages);
      setSpaceTrees((prev) => {
        const tree = prev[spaceKey];
        if (!tree) return prev;
        return {
          ...prev,
          [spaceKey]: { ...tree, pages: updateNodeChildren(tree.pages, nodeId, children) },
        };
      });
    } catch (err) {
      console.error('[ConfluenceSidebar] loadChildren error:', err);
      setSpaceTrees((prev) => {
        const tree = prev[spaceKey];
        if (!tree) return prev;
        return {
          ...prev,
          [spaceKey]: { ...tree, pages: updateNodeChildren(tree.pages, nodeId, []) },
        };
      });
    } finally {
      setLoadingChildIds((prev) => {
        const next = new Set(prev);
        next.delete(nodeId);
        return next;
      });
    }
  }, [activeAccount, rawToNodes, updateNodeChildren]);

  const handleTogglePage = useCallback((node: PageNode, spaceKey: string) => {
    const isExpanded = expandedPageIds.has(node.id);
    setExpandedPageIds((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
    if (!isExpanded && node.hasChildren && !node.childrenLoaded) {
      loadChildren(node.id, spaceKey, node.nodeType);
    }
  }, [expandedPageIds, loadChildren]);

  const navigateToPage = useCallback((pageId: string) => {
    history.push(`/confluence/page/${pageId}`);
  }, [history]);

  // 검색 필터 적용
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

  /** 페이지/폴더 노드 렌더링 */
  const renderPageNode = (node: PageNode, depth: number, spaceKey: string) => {
    const isFolder = node.nodeType === 'folder';
    const showExpandable = isFolder || node.hasChildren || node.children.length > 0;
    const isExpanded = expandedPageIds.has(node.id);
    const isLoadingChildren = loadingChildIds.has(node.id);
    const isActive = !isFolder && activePageId === node.id;

    return (
      <div key={node.id}>
        <TreeRow $depth={depth} $active={isActive}>
          {showExpandable ? (
            <ExpandBtn onClick={() => handleTogglePage(node, spaceKey)}>
              {isLoadingChildren
                ? <Loader size={12} />
                : isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
              }
            </ExpandBtn>
          ) : (
            <ExpandSpacer />
          )}
          {isFolder
            ? <FolderOpen size={15} color={theme.textMuted} />
            : <FileText size={15} color={isActive ? theme.blue : theme.textMuted} />
          }
          <PageTitle
            $active={isActive}
            onClick={() => {
              if (isFolder) {
                handleTogglePage(node, spaceKey);
              } else {
                if (showExpandable) handleTogglePage(node, spaceKey);
                navigateToPage(node.id);
              }
            }}
            title={node.title}
          >
            {node.title}
          </PageTitle>
        </TreeRow>
        {isExpanded && node.children.map((child) => renderPageNode(child, depth + 1, spaceKey))}
      </div>
    );
  };

  /** 스페이스 노드 렌더링 */
  const renderSpaceNode = (space: Space) => {
    const isExpanded = expandedSpaceKeys.has(space.key);
    const tree = spaceTrees[space.key];
    const isLoading = tree?.loading ?? false;
    const pages = tree?.pages ?? [];
    const displayPages = filter ? filterTree(pages, filter) : pages;

    // 검색 중이고 매칭 결과가 없으면 스페이스 자체를 숨김
    if (filter && displayPages.length === 0 && !space.name.toLowerCase().includes(filter.toLowerCase())) {
      return null;
    }

    return (
      <div key={space.key}>
        <SpaceRow
          $active={isExpanded}
          onClick={() => handleToggleSpace(space.key)}
        >
          <ExpandBtn as="span">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </ExpandBtn>
          <Globe size={15} color={isExpanded ? theme.blue : theme.textMuted} />
          <SpaceName title={space.name}>{space.name}</SpaceName>
          {!space.key.startsWith('~') && <SpaceKeyLabel>{space.key}</SpaceKeyLabel>}
        </SpaceRow>
        {isExpanded && (
          <SpaceChildren>
            {isLoading ? (
              <LoadingRow $indent>
                <Loader size={12} /><span>페이지 로딩 중...</span>
              </LoadingRow>
            ) : displayPages.length === 0 ? (
              <EmptyMsg $indent>{filter ? '검색 결과가 없습니다.' : '페이지가 없습니다.'}</EmptyMsg>
            ) : (
              displayPages.map((node) => renderPageNode(node, 1, space.key))
            )}
          </SpaceChildren>
        )}
      </div>
    );
  };

  if (loadingSettings) {
    return (
      <Container>
        <LoadingRow><Loader size={14} /><span>로딩 중...</span></LoadingRow>
      </Container>
    );
  }

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
      <SidebarHeader>
        <SidebarTitle>스페이스</SidebarTitle>
      </SidebarHeader>

      <SearchBox>
        <SearchIconWrap><Search size={14} /></SearchIconWrap>
        <SearchInput
          placeholder="제목으로 검색"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </SearchBox>

      {loadingSpaces ? (
        <LoadingRow><Loader size={14} /><span>스페이스 로딩 중...</span></LoadingRow>
      ) : configuredSpaces.length === 0 ? (
        <EmptyMsg>설정된 스페이스가 없습니다.</EmptyMsg>
      ) : (
        <TreeContainer>
          {configuredSpaces.map((space) => renderSpaceNode(space))}
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

const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 12px 4px;
`;

const SidebarTitle = styled.div`
  font-weight: 600;
  font-size: 0.6875rem;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
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

const SpaceRow = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  cursor: pointer;
  color: ${({ $active }) => ($active ? theme.blue : theme.textPrimary)};
  background: ${({ $active }) => ($active ? theme.blueLight : 'transparent')};
  font-weight: 600;
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
  font-weight: 400;
  flex-shrink: 0;
`;

const SpaceChildren = styled.div``;

const TreeRow = styled.div<{ $depth: number; $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px 5px ${({ $depth }) => 12 + $depth * 16}px;
  min-height: 32px;
  background: ${({ $active }) => ($active ? theme.bgTertiary : 'transparent')};

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

const PageTitle = styled.span<{ $active?: boolean }>`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${({ $active }) => ($active ? theme.blue : theme.textSecondary)};
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  cursor: pointer;
  font-size: 0.875rem;

  &:hover {
    color: ${theme.blue};
  }
`;

const LoadingRow = styled.div<{ $indent?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  ${({ $indent }) => $indent && 'padding-left: 44px;'}
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

const EmptyMsg = styled.div<{ $indent?: boolean }>`
  padding: 12px;
  ${({ $indent }) => $indent && 'padding-left: 44px;'}
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
