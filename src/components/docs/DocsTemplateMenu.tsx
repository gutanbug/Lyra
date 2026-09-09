import { FileText, Plus, Pencil, Trash2 } from 'lucide-react';
import styled from 'styled-components';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import {
  DocsPopup, DocsPopupLabel, DocsMenuButton, DocsMenuDivider,
} from 'lib/styles/docsCommon';

const TPL_DND_MIME = 'application/x-docs-template-id';

interface Props {
  x: number;
  y: number;
  onPick: (templateId?: string) => void;
}

const DocsTemplateMenu = ({ x, y, onPick }: Props) => {
  const {
    state, addTemplate, removeTemplate, openTemplateEditor, reorderTemplates,
  } = useDocs();
  const d = state.db[state.activeId];
  const templates = d?.templates || [];

  const onDrop = (targetId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const srcId = e.dataTransfer.getData(TPL_DND_MIME);
    if (!srcId || srcId === targetId) return;
    const ids = templates.map((t) => t.id);
    const from = ids.indexOf(srcId);
    if (from === -1) return;
    ids.splice(from, 1);
    const to = ids.indexOf(targetId);
    ids.splice(to === -1 ? ids.length : to, 0, srcId);
    reorderTemplates(ids);
  };

  return (
    <DocsPopup data-docs-menu style={{ left: x, top: y, width: 232 }}>
      <DocsPopupLabel>페이지 템플릿</DocsPopupLabel>
      <DocsMenuButton onClick={() => onPick(undefined)}>
        <span style={{ width: 18, display: 'inline-flex', justifyContent: 'center' }}><FileText size={14} /></span>빈 페이지
      </DocsMenuButton>

      {templates.length > 0 && <DocsMenuDivider />}

      {templates.map((t) => (
        <TplRow
          key={t.id}
          draggable
          onDragStart={(e) => e.dataTransfer.setData(TPL_DND_MIME, t.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop(t.id)}
        >
          <DragDots title="드래그하여 순서 변경">⠿</DragDots>
          <TplName onClick={() => onPick(t.id)}>{t.name || '템플릿'}</TplName>
          <TplIconBtn className="tpl-icon-btn" onClick={(e) => { e.stopPropagation(); openTemplateEditor(t.id); }} title="템플릿 편집"><Pencil size={12} /></TplIconBtn>
          <TplIconBtn className="tpl-icon-btn" onClick={(e) => { e.stopPropagation(); removeTemplate(t.id); }} title="템플릿 삭제"><Trash2 size={12} /></TplIconBtn>
        </TplRow>
      ))}

      <DocsMenuDivider />
      <DocsMenuButton onClick={addTemplate}>
        <span style={{ width: 18, display: 'inline-flex', justifyContent: 'center' }}><Plus size={14} /></span>템플릿 생성
      </DocsMenuButton>
    </DocsPopup>
  );
};

export default DocsTemplateMenu;

const TplRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px;
  border-radius: 7px;
  cursor: grab;
  &:hover { background: ${docsTheme.hover}; }
  &:hover .tpl-icon-btn { opacity: 1; }
`;

const DragDots = styled.span`
  flex: 0 0 auto;
  color: ${docsTheme.faint};
  font-size: 12px;
`;

const TplName = styled.button`
  flex: 1;
  min-width: 0;
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  padding: 5px 0;
  font-family: inherit;
  font-size: 13px;
  color: ${docsTheme.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TplIconBtn = styled.button`
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
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  &:hover { background: ${docsTheme.active}; color: ${docsTheme.text2}; }
`;
