import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { X } from 'lucide-react';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { DocsPopup, DocsMenuButton, DocsMenuDivider } from 'lib/styles/docsCommon';
import { isImeComposing } from 'lib/utils/keyboard';

const TAG_DND_MIME = 'application/x-docs-tag-id';
const TAG_COLORS = ['#7a5af0', '#e8590c', '#c92a2a', '#0ca678', '#1971c2', '#d6336c', '#e67700', '#087f5b', '#495057'];

const DocsTagPickerMenu = () => {
  const {
    state, ensureTagOption, updateTagOption, removeTagOption, reorderTagOptions,
    toggleRowTag, toggleTemplateTag,
  } = useDocs();
  const [query, setQuery] = useState('');
  const [colorMenuId, setColorMenuId] = useState<string | null>(null);
  const { tagMenu } = state;
  const d = state.db[state.activeId];
  const menuKey = tagMenu ? `${tagMenu.target}:${tagMenu.targetId}:${tagMenu.x}:${tagMenu.y}` : '';

  useEffect(() => {
    setQuery('');
    setColorMenuId(null);
  }, [menuKey]);

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
          <TagColorDot
            style={{ background: t.color }}
            onClick={(e) => { e.stopPropagation(); setColorMenuId((v) => (v === t.id ? null : t.id)); }}
          />
          <TagLabel onClick={() => toggle(t.id)}>{t.label}</TagLabel>
          <TagDelBtn className="tag-del" onClick={(e) => { e.stopPropagation(); removeTagOption(t.id); }} title="태그 삭제">
            <X size={11} />
          </TagDelBtn>
          {colorMenuId === t.id && (
            <TagColorMenu data-docs-menu onClick={(e) => e.stopPropagation()}>
              {TAG_COLORS.map((c) => (
                <TagColorSwatch key={c} style={{ background: c }} onClick={() => { updateTagOption(t.id, { color: c }); setColorMenuId(null); }} />
              ))}
            </TagColorMenu>
          )}
        </TagRow>
      ))}
    </TagPopup>
  );

  return createPortal(popup, document.body);
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
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 7px;
  cursor: grab;
  &:hover { background: ${docsTheme.hover}; }
  &:hover .tag-del { opacity: 1; }
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

const TagColorDot = styled.span`
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  cursor: pointer;
`;

const TagLabel = styled.span`
  flex: 1;
  min-width: 0;
  cursor: pointer;
  font-size: 13px;
  color: ${docsTheme.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TagDelBtn = styled.button`
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
  &:hover { color: ${docsTheme.danger}; }
`;

const TagColorMenu = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 26px;
  z-index: 20;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  width: 120px;
  background: ${docsTheme.surface};
  border: 1px solid ${docsTheme.border};
  border-radius: ${docsTheme.radius.ctl};
  box-shadow: ${docsTheme.shadow};
  padding: 8px;
  cursor: default;
`;

const TagColorSwatch = styled.button`
  appearance: none;
  border: none;
  padding: 0;
  cursor: pointer;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  &:hover { opacity: .85; }
`;
