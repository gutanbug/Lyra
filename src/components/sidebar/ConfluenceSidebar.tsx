import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { theme } from 'lib/styles/theme';
import { useAccount } from 'modules/contexts/account';
import { useTabs } from 'modules/contexts/splitView';
import { integrationController } from 'controllers/account';
import { ChevronRight, ChevronDown, FolderOpen, FileText, Loader } from 'lucide-react';

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
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

const ConfluenceSidebar = () => {
  const { activeAccount } = useAccount();
  const { addTab } = useTabs();

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<string | null>(null);
  const [pageTree, setPageTree] = useState<PageNode[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);

  // 스페이스 목록 로드
  useEffect(() => {
    if (!activeAccount) return;
    setLoadingSpaces(true);
    integrationController.invoke({
      accountId: activeAccount.id,
      serviceType: 'confluence',
      action: 'getSpaces',
      params: {},
    }).then((result) => {
      const r = result as Record<string, unknown>;
      const raw = (r.results ?? []) as Record<string, unknown>[];
      const list = raw.map((s) => ({
        id: str(s.id),
        key: str(s.key),
        name: str(s.name),
        type: str(s.type),
      })).filter((s) => s.key)
        .sort((a, b) => a.name.localeCompare(b.name));
      setSpaces(list);
    }).catch(() => setSpaces([]))
      .finally(() => setLoadingSpaces(false));
  }, [activeAccount]);

  // 스페이스 선택 시 페이지 트리 로드
  const loadSpacePages = useCallback(async (spaceKey: string) => {
    if (!activeAccount) return;
    setSelectedSpace(spaceKey);
    setLoadingPages(true);
    setPageTree([]);
    setExpandedIds(new Set());

    try {
      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'confluence',
        action: 'getSpacePages',
        params: { spaceKey, limit: 500 },
      });

      const r = result as Record<string, unknown>;
      const rawPages = (r.results ?? []) as Record<string, unknown>[];

      // 트리 구조로 변환
      const nodeMap = new Map<string, PageNode>();
      for (const p of rawPages) {
        const id = str(p.id);
        const title = str(p.title);
        const parentId = p.parentId ? str(p.parentId) : null;
        nodeMap.set(id, { id, title, parentId, children: [] });
      }

      const roots: PageNode[] = [];
      nodeMap.forEach((node) => {
        if (node.parentId && nodeMap.has(node.parentId)) {
          nodeMap.get(node.parentId)!.children.push(node);
        } else {
          roots.push(node);
        }
      });

      // 자식들을 이름 순으로 정렬
      const sortChildren = (nodes: PageNode[]) => {
        nodes.sort((a, b) => a.title.localeCompare(b.title));
        nodes.forEach((n) => sortChildren(n.children));
      };
      sortChildren(roots);

      setPageTree(roots);
    } catch (err) {
      console.error('[ConfluenceSidebar] load error:', err);
      setPageTree([]);
    } finally {
      setLoadingPages(false);
    }
  }, [activeAccount]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const navigateToPage = useCallback((pageId: string, title: string) => {
    addTab('confluence', `/confluence/page/${pageId}`, title);
  }, [addTab]);

  const renderNode = (node: PageNode, depth: number) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);

    return (
      <div key={node.id}>
        <TreeRow $depth={depth}>
          {hasChildren ? (
            <ExpandBtn onClick={() => toggleExpand(node.id)}>
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </ExpandBtn>
          ) : (
            <ExpandSpacer />
          )}
          {hasChildren
            ? <FolderOpen size={14} color={theme.textMuted} />
            : <FileText size={14} color={theme.textMuted} />
          }
          <PageTitle
            onClick={() => navigateToPage(node.id, node.title)}
            title={node.title}
          >
            {node.title}
          </PageTitle>
        </TreeRow>
        {hasChildren && isExpanded && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  const getSpaceDisplayName = (s: Space) => {
    if (s.key.startsWith('~')) return s.name;
    return s.name;
  };

  return (
    <Container>
      <SidebarTitle>스페이스</SidebarTitle>
      {loadingSpaces ? (
        <LoadingRow><Loader size={14} /><span>로딩 중...</span></LoadingRow>
      ) : (
        <SpaceList>
          {spaces.map((s) => (
            <SpaceItem
              key={s.key}
              $active={selectedSpace === s.key}
              onClick={() => loadSpacePages(s.key)}
            >
              <FolderOpen size={14} />
              <span>{getSpaceDisplayName(s)}</span>
              {!s.key.startsWith('~') && <SpaceKey>{s.key}</SpaceKey>}
            </SpaceItem>
          ))}
        </SpaceList>
      )}

      {selectedSpace && (
        <>
          <Divider />
          <SidebarTitle>
            페이지
          </SidebarTitle>
          {loadingPages ? (
            <LoadingRow><Loader size={14} /><span>페이지 로딩 중...</span></LoadingRow>
          ) : pageTree.length === 0 ? (
            <EmptyMsg>페이지가 없습니다.</EmptyMsg>
          ) : (
            <TreeContainer>
              {pageTree.map((node) => renderNode(node, 0))}
            </TreeContainer>
          )}
        </>
      )}
    </Container>
  );
};

export default ConfluenceSidebar;

// ── Styled Components ──

const Container = styled.div`
  font-size: 0.8125rem;
`;

const SidebarTitle = styled.div`
  padding: 8px 12px;
  font-weight: 600;
  font-size: 0.75rem;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const SpaceList = styled.div`
  max-height: 200px;
  overflow-y: auto;
`;

const SpaceItem = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  cursor: pointer;
  color: ${({ $active }) => ($active ? theme.blue : theme.textSecondary)};
  background: ${({ $active }) => ($active ? theme.blueLight : 'transparent')};
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  transition: background 0.1s ease;

  &:hover {
    background: ${({ $active }) => ($active ? theme.blueLight : theme.bgTertiary)};
  }
`;

const SpaceKey = styled.span`
  margin-left: auto;
  font-size: 0.6875rem;
  color: ${theme.textMuted};
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${theme.border};
  margin: 8px 0;
`;

const TreeContainer = styled.div`
  overflow-y: auto;
`;

const TreeRow = styled.div<{ $depth: number }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px 4px ${({ $depth }) => 12 + $depth * 16}px;
  min-height: 28px;

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
  font-size: 0.8125rem;

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
