import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { DocsPopup, DocsMenuButton, DocsMenuDivider } from 'lib/styles/docsCommon';
import { isImeComposing } from 'lib/utils/keyboard';

const TAG_DND_MIME = 'application/x-docs-tag-id';
const TAG_COLORS = [
  '#e0dffb', '#ead9f7', '#fbdce6', '#fbe0d3', '#fcefcb',
  '#f4f3c0', '#dcefd2', '#d3f1e4', '#d6e6fb', '#dfe3ee',
  '#3b49df', '#7c3aed', '#7a1f2b', '#d2492a', '#a9781b',
  '#5c6b1f', '#1f5c2e', '#1e8e5a', '#1d5fc2', '#445168',
];

const getContrastText = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1f2430' : '#ffffff';
};

const DocsTagPickerMenu = () => {
  const {
    state, ensureTagOption, updateTagOption, removeTagOption, reorderTagOptions,
    toggleRowTag, toggleTemplateTag,
  } = useDocs();
  const [query, setQuery] = useState('');
  const [colorMenuId, setColorMenuId] = useState<string | null>(null);
  const [colorMenuPos, setColorMenuPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [renameDraft, setRenameDraft] = useState('');
  const { tagMenu } = state;
  const d = state.db[state.activeId];
  const menuKey = tagMenu ? `${tagMenu.target}:${tagMenu.targetId}:${tagMenu.x}:${tagMenu.y}` : '';

  useEffect(() => {
    setQuery('');
    setColorMenuId(null);
  }, [menuKey]);

  const colorMenuWidth = 216;

  const openColorMenu = (id: string, label: string, anchorEl: HTMLElement) => {
    if (colorMenuId === id) { setColorMenuId(null); return; }
    const rect = anchorEl.getBoundingClientRect();
    const fitsRight = rect.right + 8 + colorMenuWidth <= window.innerWidth - 8;
    const left = fitsRight ? rect.right + 8 : Math.max(8, rect.left - 8 - colorMenuWidth);
    const top = Math.max(8, Math.min(rect.top - 6, window.innerHeight - 340));
    setColorMenuPos({ left, top });
    setColorMenuId(id);
    setRenameDraft(label);
  };

  const commitRename = (id: string) => {
    const trimmed = renameDraft.trim();
    if (trimmed) updateTagOption(id, { label: trimmed });
  };

  if (!tagMenu || !d) return null;
  const { target, targetId, x, y } = tagMenu;

  const item = target === 'row' ? d.rows.find((r) => r.id === targetId) : d.templates.find((t) => t.id === targetId);
  const selected = item?.tags || [];
  const toggle = (id: string) => (target === 'row' ? toggleRowTag(targetId, id) : toggleTemplateTag(targetId, id));

  const trimmedQuery = query.trim();
  const filtered = d.tagOptions.filter((t) => t.label.toLowerCase().includes(trimmedQuery.toLowerCase()));
  const exactExists = d.tagOptions.some((t) => t.label === trimmedQuery);

  const createFromQuery = () => {
    if (!trimmedQuery || exactExists) return;
    const id = ensureTagOption(trimmedQuery);
    toggle(id);
    setQuery('');
  };

  const onDrop = (targetTagId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const srcId = e.dataTransfer.getData(TAG_DND_MIME);
    if (!srcId || srcId === targetTagId) return;
    const ids = d.tagOptions.map((t) => t.id);
    const from = ids.indexOf(srcId);
    if (from === -1) return;
    ids.splice(from, 1);
    const to = ids.indexOf(targetTagId);
    ids.splice(to === -1 ? ids.length : to, 0, srcId);
    reorderTagOptions(ids);
  };

  const popupWidth = 240;
  const popupLeft = Math.max(8, Math.min(x, window.innerWidth - popupWidth - 8));
  const popupTop = Math.max(8, Math.min(y, window.innerHeight - 96));
  const popup = (
    <TagPopup data-docs-menu style={{ left: popupLeft, top: popupTop, width: popupWidth }}>
      <TagSearchInput
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (isImeComposing(e)) return;
          if (e.key === 'Enter') { e.preventDefault(); createFromQuery(); }
        }}
        placeholder="태그 검색 또는 생성"
      />
      {trimmedQuery && !exactExists && (
        <DocsMenuButton onClick={createFromQuery}>+ &apos;{trimmedQuery}&apos; 생성</DocsMenuButton>
      )}
      {d.tagOptions.length > 0 && <DocsMenuDivider />}
      {filtered.map((t) => (
        <TagRow
          key={t.id}
          draggable
          onDragStart={(e) => e.dataTransfer.setData(TAG_DND_MIME, t.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop(t.id)}
        >
          <DragDots>⠿</DragDots>
          <Checkbox type="checkbox" checked={selected.includes(t.id)} onChange={() => toggle(t.id)} />
          <TagBadge style={{ background: t.color, color: getContrastText(t.color) }} onClick={() => toggle(t.id)}>{t.label}</TagBadge>
          <TagMoreBtn
            className="tag-more"
            onClick={(e) => { e.stopPropagation(); openColorMenu(t.id, t.label, e.currentTarget); }}
            title="태그 편집"
          >
            <MoreHorizontal size={14} />
          </TagMoreBtn>
        </TagRow>
      ))}
    </TagPopup>
  );

  const colorMenuTag = colorMenuId ? d.tagOptions.find((t) => t.id === colorMenuId) : null;
  const colorMenu = colorMenuTag && (
    <TagColorMenu data-docs-menu style={{ left: colorMenuPos.left, top: colorMenuPos.top }} onClick={(e) => e.stopPropagation()}>
      <TagRenameInput
        autoFocus
        value={renameDraft}
        onChange={(e) => setRenameDraft(e.target.value)}
        onBlur={() => commitRename(colorMenuTag.id)}
        onKeyDown={(e) => {
          if (isImeComposing(e)) return;
          if (e.key === 'Enter') { e.preventDefault(); commitRename(colorMenuTag.id); setColorMenuId(null); }
        }}
      />
      <TagColorMenuTitle>색상</TagColorMenuTitle>
      <TagColorGrid>
        {TAG_COLORS.map((color) => {
          const active = colorMenuTag.color === color;
          return (
            <TagColorSwatch
              key={color}
              type="button"
              $active={active}
              style={{ background: color }}
              onClick={() => updateTagOption(colorMenuTag.id, { color })}
            />
          );
        })}
      </TagColorGrid>
      <TagColorMenuDivider />
      <TagDeleteRow
        type="button"
        onClick={() => { removeTagOption(colorMenuTag.id); setColorMenuId(null); }}
      >
        <Trash2 size={13} />
        태그 삭제
      </TagDeleteRow>
    </TagColorMenu>
  );

  return (
    <>
      {createPortal(popup, document.body)}
      {colorMenu && createPortal(colorMenu, document.body)}
    </>
  );
};

export default DocsTagPickerMenu;

const TagPopup = styled(DocsPopup)`
  z-index: 120;
  box-sizing: border-box;
  max-height: min(360px, calc(100vh - 16px));
  overflow-y: auto;
`;

const TagSearchInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  font-family: inherit;
  font-size: 12.5px;
  color: ${docsTheme.text};
  background: ${docsTheme.surfaceSoft};
  border: 1px solid ${docsTheme.border};
  border-radius: 7px;
  padding: 6px 8px;
  outline: none;
  margin-bottom: 4px;
  &:focus { border-color: ${docsTheme.accent}; }
`;

const TagRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 7px;
  cursor: grab;
  &:hover { background: ${docsTheme.hover}; }
  &:hover .tag-more { opacity: 1; }
`;

const DragDots = styled.span`
  flex: 0 0 auto;
  color: ${docsTheme.faint};
  font-size: 12px;
`;

const Checkbox = styled.input`
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: ${docsTheme.accent};
`;

const TagBadge = styled.span`
  flex: 1;
  min-width: 0;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 500;
  color: ${docsTheme.text};
  padding: 3px 9px;
  border-radius: 999px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TagMoreBtn = styled.button`
  opacity: 0;
  transition: opacity .12s;
  flex: 0 0 auto;
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${docsTheme.faint};
  display: flex;
  align-items: center;
  padding: 2px;
  border-radius: 4px;
  &:hover { color: ${docsTheme.text}; background: ${docsTheme.border}; }
`;

const TagColorMenu = styled.div`
  position: fixed;
  z-index: 130;
  display: flex;
  flex-direction: column;
  width: 216px;
  background: ${docsTheme.surface};
  border: 1px solid ${docsTheme.border};
  border-radius: ${docsTheme.radius.ctl};
  box-shadow: ${docsTheme.shadow};
  padding: 10px;
  cursor: default;
`;

const TagRenameInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  font-family: inherit;
  font-size: 13px;
  color: ${docsTheme.text};
  background: ${docsTheme.surface};
  border: 1px solid ${docsTheme.border};
  border-radius: 6px;
  padding: 6px 8px;
  outline: none;
  margin-bottom: 10px;
  &:focus { border-color: ${docsTheme.accent}; box-shadow: 0 0 0 2px ${docsTheme.accentSoft}; }
`;

const TagColorMenuTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${docsTheme.faint};
  margin-bottom: 6px;
`;

const TagColorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
`;

const TagColorSwatch = styled.button<{ $active: boolean }>`
  appearance: none;
  border: none;
  cursor: pointer;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  box-shadow: ${({ $active }) => ($active ? `0 0 0 2px ${docsTheme.surface}, 0 0 0 4px ${docsTheme.accent}` : 'none')};
  &:hover { opacity: .85; }
`;

const TagColorMenuDivider = styled.div`
  height: 1px;
  background: ${docsTheme.border};
  margin: 10px -10px;
`;

const TagDeleteRow = styled.button`
  appearance: none;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 2px;
  font-size: 12.5px;
  color: ${docsTheme.faint};
  cursor: pointer;
  &:hover { color: ${docsTheme.danger}; }
`;
