import { useState } from 'react';
import styled from 'styled-components';
import { X, Trash2, Plus } from 'lucide-react';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { isImeComposing } from 'lib/utils/keyboard';
import { DocsOverlay, DocsModal, DocsChip } from 'lib/styles/docsCommon';
import DocsCustomFieldRow from 'components/docs/DocsCustomFieldRow';
import { DOCS_STATUS_OPTS, DOCS_PRIORITY_OPTS } from 'types/docs';

const DocsTemplateEditorModal = () => {
  const {
    state, closeTemplateEditor, updateTemplate, removeTemplate, openMenu,
    addTemplateChecklistItem, toggleTemplateChecklistItem, removeTemplateChecklistItem,
  } = useDocs();
  const d = state.db[state.activeId];
  const tpl = state.templateEditorId ? d?.templates.find((t) => t.id === state.templateEditorId) : undefined;
  const [newItem, setNewItem] = useState('');

  if (!tpl || !d) return null;
  const tags = tpl.tags || [];

  const submitItem = () => {
    if (newItem.trim()) addTemplateChecklistItem(tpl.id, newItem);
    setNewItem('');
  };

  return (
    <DocsOverlay data-docs-menu onClick={closeTemplateEditor}>
      <DocsModal style={{ width: 480, maxWidth: '92vw', maxHeight: '84vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <Head>
          <HeadLabel>템플릿 편집</HeadLabel>
          <HeadActions>
            <IconBtn onClick={() => { removeTemplate(tpl.id); }} title="템플릿 삭제"><Trash2 size={15} /></IconBtn>
            <IconBtn onClick={closeTemplateEditor} title="닫기"><X size={16} /></IconBtn>
          </HeadActions>
        </Head>
        <Body>
          <TitleInput
            value={tpl.name}
            onChange={(e) => updateTemplate(tpl.id, { name: e.target.value })}
            placeholder="템플릿 이름"
          />

          <FieldRow>
            <FieldLabel>상태</FieldLabel>
            <ChipRow>
              {DOCS_STATUS_OPTS.map((v) => (
                <SelectChip key={v} $active={tpl.status === v} onClick={() => updateTemplate(tpl.id, { status: v })}>
                  <DocsChip $bg={docsTheme.status[v]?.bg || ''} $ink={docsTheme.status[v]?.ink || ''}>{v}</DocsChip>
                </SelectChip>
              ))}
            </ChipRow>
          </FieldRow>

          <FieldRow>
            <FieldLabel>체크리스트</FieldLabel>
            {tpl.checklist.map((c) => (
              <ChecklistRow key={c.id} className="checklist-row">
                <Checkbox type="checkbox" checked={c.done} onChange={() => toggleTemplateChecklistItem(tpl.id, c.id)} />
                <ChecklistText $done={c.done}>{c.text}</ChecklistText>
                <ChecklistDelBtn className="checklist-del" onClick={() => removeTemplateChecklistItem(tpl.id, c.id)}>✕</ChecklistDelBtn>
              </ChecklistRow>
            ))}
            <NewItemInput
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (isImeComposing(e)) return;
                if (e.key === 'Enter') { e.preventDefault(); submitItem(); }
              }}
              onBlur={submitItem}
              placeholder="+ 항목 추가"
            />
          </FieldRow>

          <FieldRow>
            <FieldLabel>우선순위</FieldLabel>
            <ChipRow>
              {DOCS_PRIORITY_OPTS.map((v) => (
                <SelectChip key={v} $active={tpl.priority === v} onClick={() => updateTemplate(tpl.id, { priority: v })}>
                  <PrioLabel style={{ color: docsTheme.priority[v]?.color }}>{docsTheme.priority[v]?.glyph} {v}</PrioLabel>
                </SelectChip>
              ))}
            </ChipRow>
          </FieldRow>

          <FieldRow>
            <FieldLabel>태그</FieldLabel>
            <ChipRow>
              {tags.map((tagId) => {
                const opt = d.tagOptions.find((t) => t.id === tagId);
                if (!opt) return null;
                return <DocsChip key={tagId} $bg={`${opt.color}22`} $ink={opt.color}>{opt.label}</DocsChip>;
              })}
              <AddTagBtn
                onClick={(e) => {
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  openMenu('tagMenu', { target: 'template', targetId: tpl.id, x: r.left, y: r.bottom + 6 });
                }}
              >
                <Plus size={12} />태그
              </AddTagBtn>
            </ChipRow>
          </FieldRow>

          <FieldRow>
            <FieldLabel>담당자</FieldLabel>
            <TextInput
              value={tpl.assignee}
              onChange={(e) => updateTemplate(tpl.id, { assignee: e.target.value })}
              placeholder="이름 입력"
            />
          </FieldRow>

          <FieldRow>
            <FieldLabel>마감일</FieldLabel>
            <TextInput
              type="date"
              value={tpl.due}
              onChange={(e) => updateTemplate(tpl.id, { due: e.target.value })}
            />
          </FieldRow>

          {d.customFields.map((f) => (
            <DocsCustomFieldRow key={f.id} field={f} target="template" targetId={tpl.id} value={tpl.customValues?.[f.id]} />
          ))}

          <AddPropertyBtn
            onClick={(e) => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              openMenu('fieldTypeMenu', { x: r.left, y: r.bottom + 6 });
            }}
          >
            <Plus size={13} />새 속성
          </AddPropertyBtn>

          <Divider />

          <NoteArea
            value={tpl.note}
            onChange={(e) => updateTemplate(tpl.id, { note: e.target.value })}
            placeholder="새 항목에 기본으로 채워질 메모를 입력하세요…"
            rows={5}
          />
        </Body>
      </DocsModal>
    </DocsOverlay>
  );
};

export default DocsTemplateEditorModal;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 0;
`;

const HeadLabel = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: .04em;
  color: ${docsTheme.muted};
`;

const HeadActions = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

const IconBtn = styled.button`
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${docsTheme.muted};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  &:hover { background: ${docsTheme.hover}; color: ${docsTheme.text2}; }
`;

const Body = styled.div`
  padding: 6px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const TitleInput = styled.input`
  font-family: 'Sora', sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: ${docsTheme.text};
  background: transparent;
  border: none;
  outline: none;
  padding: 4px 0;
  &::placeholder { color: ${docsTheme.faint}; }
`;

const FieldRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`;

const FieldLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${docsTheme.muted};
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const AddTagBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  appearance: none;
  border: 1px dashed ${docsTheme.borderStrong};
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 11.5px;
  color: ${docsTheme.muted};
  padding: 4px 8px;
  border-radius: 8px;
  &:hover { background: ${docsTheme.hover}; color: ${docsTheme.text2}; }
`;

const AddPropertyBtn = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${docsTheme.muted};
  padding: 6px 4px;
  border-radius: 7px;
  &:hover { background: ${docsTheme.hover}; color: ${docsTheme.text2}; }
`;

const SelectChip = styled.button<{ $active: boolean }>`
  appearance: none;
  cursor: pointer;
  background: transparent;
  border: 1.5px solid ${({ $active }) => ($active ? docsTheme.accent : 'transparent')};
  border-radius: 8px;
  padding: 2px;
  &:hover { background: ${docsTheme.hover}; }
`;

const PrioLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12.5px;
  font-weight: 700;
  padding: 3px 6px;
`;

const TextInput = styled.input`
  font-family: inherit;
  font-size: 13.5px;
  color: ${docsTheme.text};
  background: ${docsTheme.surfaceSoft};
  border: 1.5px solid ${docsTheme.border};
  border-radius: 9px;
  padding: 9px 11px;
  outline: none;
  &:focus { border-color: ${docsTheme.accent}; background: ${docsTheme.surface}; }
`;

const Divider = styled.div`
  height: 1px;
  background: ${docsTheme.border};
`;

const ChecklistRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  &:hover .checklist-del { opacity: 1; }
`;

const Checkbox = styled.input`
  flex: 0 0 auto;
  width: 15px;
  height: 15px;
  cursor: pointer;
  accent-color: ${docsTheme.accent};
`;

const ChecklistText = styled.span<{ $done: boolean }>`
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: ${({ $done }) => ($done ? docsTheme.faint : docsTheme.text)};
  text-decoration: ${({ $done }) => ($done ? 'line-through' : 'none')};
`;

const ChecklistDelBtn = styled.button`
  opacity: 0;
  transition: opacity .12s;
  flex: 0 0 auto;
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${docsTheme.faint};
  font-size: 11px;
  &:hover { color: ${docsTheme.danger}; }
`;

const NewItemInput = styled.input`
  font-family: inherit;
  font-size: 13px;
  color: ${docsTheme.text};
  background: transparent;
  border: none;
  outline: none;
  padding: 4px 0;
  &::placeholder { color: ${docsTheme.faint}; }
`;

const NoteArea = styled.textarea`
  width: 100%;
  resize: vertical;
  font-family: inherit;
  font-size: 13.5px;
  line-height: 1.6;
  color: ${docsTheme.text};
  background: transparent;
  border: none;
  outline: none;
  padding: 4px 0;
  &::placeholder { color: ${docsTheme.faint}; }
`;
