import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import {
  Search, Clock, Star, Globe, Lock, ChevronRight, ChevronDown, Plus, Trash2, FileText, Database, Folder, FolderOpen,
  Settings,
} from 'lucide-react';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { DocsPopup, DocsIconButton, thinScrollbar } from 'lib/styles/docsCommon';
import { isImeComposing } from 'lib/utils/keyboard';
import type { DocsPage, DocsPageType } from 'types/docs';

interface NavPageRow {
  isSpace: false;
  id: string;
  icon: string;
  type: DocsPageType;
  title: string;
  badge: string | null;
  hasCaret: boolean;
  open: boolean;
  depth: number;
  active: boolean;
}
interface NavSpaceRow {
  isSpace: true;
  id: string;
  name: string;
  kind: 'public' | 'private';
  open: boolean;
}
type NavRow = NavPageRow | NavSpaceRow;

/** 페이지에 지정된 이모지 아이콘이 없으면 타입에 맞는 기본 글리프로 대체한다 (데이터에는 저장하지 않음). */
export const PageGlyph = ({ icon, type }: { icon: string; type: DocsPageType }) => {
  if (icon) return <span style={{ fontSize: 15, flex: '0 0 auto', lineHeight: 1 }}>{icon}</span>;
  const Icon = type === 'db' ? Database : type === 'folder' ? Folder : FileText;
  return <Icon size={14} style={{ flex: '0 0 auto' }} color={docsTheme.faint} />;
};

const WIDTH_STORAGE_KEY = 'lyra:docs-sidebar-width';
const MIN_WIDTH = 200;
const MAX_WIDTH = 440;
const DEFAULT_WIDTH = 264;

function loadSidebarWidth(): number {
  try {
    const v = localStorage.getItem(WIDTH_STORAGE_KEY);
    if (v) {
      const n = Number(v);
      if (n >= MIN_WIDTH && n <= MAX_WIDTH) return n;
    }
  } catch { /* ignore */ }
  return DEFAULT_WIDTH;
}

const DocsSidebar = () => {
  const {
    state, openPage, toggleTree, toggleCollapse, toggleFav, addPage, openPageMenu, openTrash, togglePalette,
    commitRename, cancelRename, isFileStorageAvailable, openStorage,
  } = useDocs();
  const history = useHistory();

  const recentOpen = !state.collapsed.recent;
  const favOpen = !state.collapsed.favorites;

  useEffect(() => {
    const el = document.querySelector(`[data-page-id="${state.activeId}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [state.activeId]);

  const [width, setWidth] = useState<number>(loadSidebarWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      const delta = e.clientX - startX.current;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW.current + delta)));
    };
    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setWidth((w) => {
        try { localStorage.setItem(WIDTH_STORAGE_KEY, String(w)); } catch { /* ignore */ }
        return w;
      });
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  const { renamingId } = state;
  const [renameValue, setRenameValue] = useState('');
  useEffect(() => {
    if (renamingId) setRenameValue(state.pagesById[renamingId]?.title || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renamingId]);

  const [addMenu, setAddMenu] = useState<{ parentId: string; x: number; y: number } | null>(null);
  useEffect(() => {
    if (!addMenu) return undefined;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-docs-menu]')) setAddMenu(null);
    };
    document.addEventListener('mousedown', onDown, true);
    return () => document.removeEventListener('mousedown', onDown, true);
  }, [addMenu]);
  const openAddMenu = (parentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAddMenu({ parentId, x: e.clientX, y: e.clientY });
  };
  const pickAddType = (type: DocsPageType) => {
    if (addMenu) addPage(addMenu.parentId, type);
    setAddMenu(null);
  };

  const navRows = useMemo(() => {
    const rows: NavRow[] = [];
    const pushPage = (id: string, depth: number) => {
      const p = state.pagesById[id];
      if (!p) return;
      const open = !!state.treeOpen[id];
      const kids = p.children && p.children.length > 0;
      rows.push({
        isSpace: false, id, icon: p.icon, type: p.type, title: p.title || '제목 없음',
        badge: p.type === 'db' ? 'DB' : null, hasCaret: p.type === 'folder' || !!kids, open, depth, active: id === state.activeId,
      });
      if (open && kids) p.children.forEach((c) => pushPage(c, depth + 1));
    };
    state.spaces.forEach((sp) => {
      const open = !!state.treeOpen[sp.id];
      rows.push({ isSpace: true, id: sp.id, name: sp.name, kind: sp.kind, open });
      if (open) sp.children.forEach((c) => pushPage(c, 0));
    });
    return rows;
  }, [state.spaces, state.pagesById, state.treeOpen, state.activeId]);

  const favRows = useMemo(() => state.favorites
    .map((id) => state.pagesById[id])
    .filter((p): p is DocsPage => !!p)
    .map((p) => ({ ...p, active: p.id === state.activeId })), [state.favorites, state.pagesById, state.activeId]);

  const recentRows = useMemo(() => state.recentIds
    .map((id) => state.pagesById[id])
    .filter((p): p is DocsPage => !!p && p.id !== state.activeId)
    .slice(0, 5)
    .map((p) => ({ ...p, active: false })), [state.recentIds, state.pagesById, state.activeId]);

  return (
    <Aside $width={width} style={{ display: state.sidebarOpen ? 'flex' : 'none' }}>
      <ResizeHandle onMouseDown={onResizeStart} />
      <Header>
        <img src="assets/lyra-icon.png" alt="" width={26} height={26} style={{ borderRadius: 8, boxShadow: '0 2px 7px rgba(0,0,0,.2)' }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <WorkspaceName>내 워크스페이스</WorkspaceName>
        </div>
        <DocsIconButton title="환경설정" aria-label="환경설정" onClick={() => history.push('/settings')} style={{ width: 26, height: 26 }}>
          <Settings size={15} />
        </DocsIconButton>
      </Header>

      <SearchWrap>
        <SearchBtn onClick={togglePalette}>
          <Search size={15} color={docsTheme.faint} />
          <span style={{ fontSize: 13, color: docsTheme.muted, flex: 1 }}>검색</span>
          <Kbd>⌘K</Kbd>
        </SearchBtn>
      </SearchWrap>

      <TreeScroll>
        {recentRows.length > 0 && (
          <>
            <SectionHeader onClick={() => toggleCollapse('recent')}>
              {recentOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span>최근</span>
            </SectionHeader>
            {recentOpen && recentRows.map((p) => (
              <NavRowFav key={p.id} $active={false} onClick={() => openPage(p.id)} title={p.title}>
                <Clock size={12} style={{ flex: '0 0 auto' }} color={docsTheme.muted} />
                <PageGlyph icon={p.icon} type={p.type} />
                <NavTitle $weight={500} $color={docsTheme.text2}>{p.title}</NavTitle>
                {p.type === 'db' && <Badge>DB</Badge>}
              </NavRowFav>
            ))}
            {recentOpen && <div style={{ height: 10 }} />}
          </>
        )}
        {favRows.length > 0 && (
          <>
            <SectionHeader onClick={() => toggleCollapse('favorites')}>
              {favOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span>즐겨찾기</span>
            </SectionHeader>
            {favOpen && favRows.map((p) => (
              <NavRowFav key={p.id} $active={p.active} onClick={() => openPage(p.id)} title={p.title}>
                <Star size={12} style={{ flex: '0 0 auto' }} color="#f5a623" fill="#f5a623" />
                <PageGlyph icon={p.icon} type={p.type} />
                <NavTitle $weight={p.active ? 600 : 500} $color={p.active ? docsTheme.text : docsTheme.text2}>{p.title}</NavTitle>
                {p.type === 'db' && <Badge>DB</Badge>}
              </NavRowFav>
            ))}
            {favOpen && <div style={{ height: 10 }} />}
          </>
        )}

        {navRows.map((n) => (n.isSpace ? (
          <SpaceRow key={n.id} className="nav-row" onClick={() => toggleTree(n.id)}>
            <CaretBtn onClick={(e) => { e.stopPropagation(); toggleTree(n.id); }}>
              {n.open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </CaretBtn>
            {n.kind === 'public' ? <Globe size={13} style={{ flex: '0 0 auto' }} color={docsTheme.text2} /> : <Lock size={13} style={{ flex: '0 0 auto' }} color={docsTheme.text2} />}
            <SpaceName>{n.name}</SpaceName>
            <AddBtn className="nav-add" title="페이지 추가" onClick={(e) => openAddMenu(n.id, e)}><Plus size={13} /></AddBtn>
          </SpaceRow>
        ) : (
          <PageRow
            key={n.id}
            data-page-id={n.id}
            className="nav-row"
            $active={n.active}
            $depth={n.depth}
            onClick={() => openPage(n.id)}
            onContextMenu={(e) => { e.preventDefault(); openPageMenu(n.id, e.clientX, e.clientY); }}
            title={n.title}
          >
            <CaretSlot>
              {n.hasCaret && (
                <CaretBtn onClick={(e) => { e.stopPropagation(); toggleTree(n.id); }}>
                  {n.open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </CaretBtn>
              )}
            </CaretSlot>
            <PageGlyph icon={n.icon} type={n.type} />
            {renamingId === n.id ? (
              <RenameInput
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.target.select()}
                onBlur={() => commitRename(n.id, renameValue.trim())}
                onKeyDown={(e) => {
                  if (isImeComposing(e)) return;
                  if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
                  if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
                }}
              />
            ) : (
              <NavTitle $weight={n.active ? 600 : 500} $color={n.active ? docsTheme.text : docsTheme.text2}>{n.title}</NavTitle>
            )}
            {n.badge && <Badge>{n.badge}</Badge>}
            <AddBtn className="nav-add" title="하위 페이지 추가" onClick={(e) => openAddMenu(n.id, e)}><Plus size={13} /></AddBtn>
          </PageRow>
        )))}

        <AddRootBtn onClick={(e) => openAddMenu('sp_pub', e)}>
          <Plus size={14} style={{ flex: '0 0 auto' }} />새 페이지
        </AddRootBtn>
      </TreeScroll>

      {addMenu && (
        <DocsPopup data-docs-menu style={{ left: addMenu.x, top: addMenu.y, width: 168 }}>
          <AddTypeBtn onClick={() => pickAddType('doc')}><FileText size={15} style={{ flex: '0 0 auto' }} />페이지</AddTypeBtn>
          <AddTypeBtn onClick={() => pickAddType('db')}><Database size={15} style={{ flex: '0 0 auto' }} />데이터베이스</AddTypeBtn>
          <AddTypeBtn onClick={() => pickAddType('folder')}><Folder size={15} style={{ flex: '0 0 auto' }} />폴더</AddTypeBtn>
        </DocsPopup>
      )}

      <Footer>
        {isFileStorageAvailable && (
          <TrashBtn onClick={openStorage}>
            <FolderOpen size={14} style={{ flex: '0 0 auto' }} />저장 위치
          </TrashBtn>
        )}
        <TrashBtn onClick={openTrash}>
          <Trash2 size={14} style={{ flex: '0 0 auto' }} />휴지통
        </TrashBtn>
      </Footer>
    </Aside>
  );
};

export default DocsSidebar;

const Aside = styled.aside<{ $width: number }>`
  position: relative;
  flex: 0 0 ${({ $width }) => $width}px;
  width: ${({ $width }) => $width}px;
  background: ${docsTheme.sidebar};
  border-right: 1px solid ${docsTheme.border};
  flex-direction: column;
  min-height: 0;
`;

const ResizeHandle = styled.div`
  position: absolute;
  top: 0;
  right: -2px;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  z-index: 1;
  &:hover, &:active { background: ${docsTheme.accent}; }
`;

const Header = styled.div`
  flex: 0 0 auto;
  padding: 14px 12px 10px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const WorkspaceName = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.1;
`;

const SearchWrap = styled.div`
  flex: 0 0 auto;
  padding: 2px 12px 10px;
`;

const SearchBtn = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${docsTheme.surface};
  border: 1px solid ${docsTheme.border};
  border-radius: ${docsTheme.radius.ctl};
  padding: 8px 12px;
  cursor: pointer;
  &:hover { border-color: ${docsTheme.borderStrong}; }
`;

const Kbd = styled.span`
  font-size: 10.5px;
  color: ${docsTheme.faint};
  font-family: 'Sora', sans-serif;
  border: 1px solid ${docsTheme.border};
  border-radius: 5px;
  padding: 1px 5px;
`;

const TreeScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 8px 12px;
  ${thinScrollbar}
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 13.5px;
  font-weight: 500;
  letter-spacing: normal;
  color: ${docsTheme.muted};
  padding: 8px 5px 6px;
  border-radius: ${docsTheme.radius.ctl};
  cursor: pointer;
  user-select: none;
  &:hover { color: ${docsTheme.text2}; }
  svg { flex: 0 0 auto; }
`;

const NavTitle = styled.span<{ $weight: number; $color: string }>`
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  font-weight: ${({ $weight }) => $weight};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${({ $color }) => $color};
`;

const RenameInput = styled.input`
  flex: 1;
  min-width: 0;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  color: ${docsTheme.text};
  background: ${docsTheme.surface};
  border: 1px solid ${docsTheme.accent};
  border-radius: 6px;
  padding: 1px 5px;
  margin: -1px 0;
  outline: none;
`;

const Badge = styled.span`
  flex: 0 0 auto;
  font-size: 10px;
  font-weight: 700;
  color: ${docsTheme.muted};
  background: ${docsTheme.surface};
  border: 1px solid ${docsTheme.border};
  border-radius: 5px;
  padding: 0 5px;
  font-family: 'Sora', sans-serif;
`;

const NavRowFav = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 8px;
  border-radius: ${docsTheme.radius.ctl};
  cursor: pointer;
  margin-bottom: 1px;
  background: ${({ $active }) => ($active ? docsTheme.active : 'transparent')};
  &:hover { background: ${docsTheme.hover}; }
`;

const SpaceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 8px 5px;
  cursor: pointer;
  user-select: none;
  border-radius: ${docsTheme.radius.ctl};
  &:hover { background: ${docsTheme.hover}; }
`;

const CaretSlot = styled.span`
  width: 16px;
  display: flex;
  justify-content: center;
  flex: 0 0 auto;
`;

const CaretBtn = styled.button`
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${docsTheme.faint};
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
`;

const SpaceName = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: ${docsTheme.muted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const AddBtn = styled.button`
  opacity: 0;
  transition: opacity 0.12s;
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${docsTheme.muted};
  width: 20px;
  height: 20px;
  border-radius: 5px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  .nav-row:hover &, .nav-row:hover & { opacity: 1; }
  &:hover { background: ${docsTheme.active}; }
`;

const AddTypeBtn = styled.button`
  width: 100%;
  appearance: none;
  border: none;
  cursor: pointer;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  color: ${docsTheme.text};
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 9px;
  border-radius: ${docsTheme.radius.ctl};
  text-align: left;
  &:hover { background: ${docsTheme.hover}; }
`;

const PageRow = styled.div<{ $active: boolean; $depth: number }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  padding-left: ${({ $depth }) => 8 + $depth * 15}px;
  border-radius: ${docsTheme.radius.ctl};
  cursor: pointer;
  user-select: none;
  margin-bottom: 1px;
  background: ${({ $active }) => ($active ? docsTheme.active : 'transparent')};
  &:hover { background: ${docsTheme.hover}; }
`;

const AddRootBtn = styled.button`
  width: 100%;
  margin-top: 6px;
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${docsTheme.muted};
  font-family: inherit;
  font-size: 13.5px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 9px;
  border-radius: ${docsTheme.radius.ctl};
  &:hover { background: ${docsTheme.hover}; color: ${docsTheme.text2}; }
`;

const Footer = styled.div`
  flex: 0 0 auto;
  padding: 8px 12px 12px;
  border-top: 1px solid ${docsTheme.hairline};
`;

const TrashBtn = styled.button`
  width: 100%;
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${docsTheme.muted};
  font-family: inherit;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: ${docsTheme.radius.ctl};
  &:hover { background: ${docsTheme.hover}; color: ${docsTheme.text2}; }
`;
