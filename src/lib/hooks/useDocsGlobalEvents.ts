import { useEffect } from 'react';
import { useDocs } from 'modules/contexts/docs';
import { isImeComposing } from 'lib/utils/keyboard';

/**
 * 문서 밖 클릭으로 열려있는 메뉴 닫기 / ⌘K 팔레트 토글 / Esc 처리.
 * Source: Lyra Docs.dc.html의 onDocDown / onGlobalKey
 */
export const useDocsGlobalEvents = () => {
  const {
    state, closeMenu, togglePalette, closePalette, closeTrash, cancelDeletePage, closeTemplateEditor,
  } = useDocs();

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-docs-menu]')) return;
      if (state.slash) closeMenu('slash');
      if (state.pasteMenu) closeMenu('pasteMenu');
      if (state.mention) closeMenu('mention');
      if (state.blockMenu) closeMenu('blockMenu');
      if (state.cellEditor) closeMenu('cellEditor');
      if (state.filterMenu) closeMenu('filterMenu');
      if (state.pageMenu) closeMenu('pageMenu');
      if (state.mediaMenu) closeMenu('mediaMenu');
      if (state.dateMenu) closeMenu('dateMenu');
      if (state.bookmarkMenu) closeMenu('bookmarkMenu');
      if (state.fieldTypeMenu) closeMenu('fieldTypeMenu');
      if (state.tagMenu) closeMenu('tagMenu');
    };
    document.addEventListener('mousedown', onDocDown, true);
    return () => document.removeEventListener('mousedown', onDocDown, true);
  }, [
    state.slash, state.pasteMenu, state.mention, state.blockMenu, state.cellEditor, state.filterMenu,
    state.pageMenu, state.mediaMenu, state.dateMenu, state.bookmarkMenu, state.fieldTypeMenu, state.tagMenu, closeMenu,
  ]);

  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      if (isImeComposing(e)) return;
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        togglePalette();
      } else if (e.key === 'Escape') {
        if (state.palette) closePalette();
        else if (state.trashOpen) closeTrash();
        else if (state.deleteConfirm) cancelDeletePage();
        else if (state.templateEditorId) closeTemplateEditor();
        else if (state.slash) closeMenu('slash');
        else if (state.pasteMenu) closeMenu('pasteMenu');
        else if (state.mention) closeMenu('mention');
        else if (state.blockMenu) closeMenu('blockMenu');
        else if (state.cellEditor) closeMenu('cellEditor');
        else if (state.filterMenu) closeMenu('filterMenu');
        else if (state.pageMenu) closeMenu('pageMenu');
        else if (state.mediaMenu) closeMenu('mediaMenu');
        else if (state.dateMenu) closeMenu('dateMenu');
        else if (state.bookmarkMenu) closeMenu('bookmarkMenu');
        else if (state.fieldTypeMenu) closeMenu('fieldTypeMenu');
        else if (state.tagMenu) closeMenu('tagMenu');
      }
    };
    document.addEventListener('keydown', onGlobalKey);
    return () => document.removeEventListener('keydown', onGlobalKey);
  }, [
    state.palette, state.trashOpen, state.deleteConfirm, state.templateEditorId,
    state.slash, state.pasteMenu, state.mention, state.blockMenu, state.cellEditor,
    state.filterMenu, state.pageMenu, state.mediaMenu, state.dateMenu, state.bookmarkMenu, state.fieldTypeMenu, state.tagMenu,
    togglePalette, closePalette, closeTrash, cancelDeletePage, closeTemplateEditor, closeMenu,
  ]);
};
