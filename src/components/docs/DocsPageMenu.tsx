import type { CSSProperties } from 'react';
import {
  Pencil, Plus, Star, Copy, Download, Trash2,
} from 'lucide-react';
import { DocsPopup, DocsMenuButton, DocsMenuDivider } from 'lib/styles/docsCommon';
import { useDocs } from 'modules/contexts/docs';

const ICON_SLOT: CSSProperties = {
  width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
};

const DocsPageMenu = () => {
  const {
    state, closeMenu, renamePage, addPage, toggleFav, duplicatePage, exportMarkdown, requestDeletePage,
  } = useDocs();
  const { pageMenu } = state;
  if (!pageMenu) return null;
  const { id } = pageMenu;
  const isFav = state.favorites.includes(id);

  return (
    <DocsPopup data-docs-menu style={{ left: pageMenu.x, top: pageMenu.y, width: 190 }}>
      <DocsMenuButton onClick={() => renamePage(id)}><span style={ICON_SLOT}><Pencil size={14} /></span>이름 변경</DocsMenuButton>
      <DocsMenuButton onClick={() => { closeMenu('pageMenu'); addPage(id); }}><span style={ICON_SLOT}><Plus size={14} /></span>하위 페이지 추가</DocsMenuButton>
      <DocsMenuButton onClick={() => { toggleFav(id); closeMenu('pageMenu'); }}>
        <span style={ICON_SLOT}><Star size={14} fill={isFav ? 'currentColor' : 'none'} /></span>{isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      </DocsMenuButton>
      <DocsMenuButton onClick={() => duplicatePage(id)}><span style={ICON_SLOT}><Copy size={14} /></span>복제</DocsMenuButton>
      <DocsMenuButton onClick={() => exportMarkdown(id)}><span style={ICON_SLOT}><Download size={14} /></span>마크다운으로 내보내기</DocsMenuButton>
      <DocsMenuDivider />
      <DocsMenuButton onClick={() => requestDeletePage(id)} style={{ color: '#e5484d' }}><span style={ICON_SLOT}><Trash2 size={14} /></span>삭제</DocsMenuButton>
    </DocsPopup>
  );
};

export default DocsPageMenu;
