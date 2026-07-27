import { useRef, useState } from 'react';
import styled from 'styled-components';
import { X, Paperclip } from 'lucide-react';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { DocsChip } from 'lib/styles/docsCommon';
import { useDocsMediaUrl } from 'lib/hooks/useDocsMediaUrl';
import { isImeComposing } from 'lib/utils/keyboard';
import { putMedia } from 'lib/utils/docsMediaStore';
import type { DocsCustomFieldValue, DocsDbChecklistItem, DocsDbFieldDef } from 'types/docs';

interface Props {
  field: DocsDbFieldDef;
  target: 'row' | 'template';
  targetId: string;
  value: DocsCustomFieldValue | undefined;
}

const fmtTs = (ts?: number) => (ts ? new Date(ts).toLocaleString('ko-KR') : '—');

const DocsCustomFieldRow = ({
  field, target, targetId, value,
}: Props) => {
  const {
    state, updateCustomFieldDef, removeCustomField, addFieldOption,
    setRowCustomValue, setTemplateCustomValue, nextId,
  } = useDocs();
  const d = state.db[state.activeId];
  const [nameEdit, setNameEdit] = useState(false);
  const [nameDraft, setNameDraft] = useState(field.name);
  const [newOption, setNewOption] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const setValue = (v: DocsCustomFieldValue) => {
    if (target === 'row') setRowCustomValue(targetId, field.id, v);
    else setTemplateCustomValue(targetId, field.id, v);
  };

  const commitName = () => {
    if (nameDraft.trim()) updateCustomFieldDef(field.id, { name: nameDraft.trim() });
    setNameEdit(false);
  };

  const row = target === 'row' ? d?.rows.find((r) => r.id === targetId) : undefined;
  const mediaVal = (value as { mediaId?: string; url?: string; title?: string } | null) || {};
  const mediaSrc = useDocsMediaUrl(mediaVal.mediaId, mediaVal.url);

  const uploadFile = async (file: File) => {
    const id = nextId('m');
    await putMedia(id, file);
    setValue({ mediaId: id, title: file.name });
  };

  const renderEditor = () => {
    switch (field.type) {
      case 'text':
        return <TextInput value={(value as string) || ''} onChange={(e) => setValue(e.target.value)} placeholder="값 입력" />;
      case 'number':
        return (
          <TextInput
            type="number"
            value={value === null || value === undefined ? '' : (value as number)}
            onChange={(e) => setValue(e.target.value === '' ? null : Number(e.target.value))}
            placeholder="0"
          />
        );
      case 'date':
        return <TextInput type="date" value={(value as string) || ''} onChange={(e) => setValue(e.target.value)} />;
      case 'person':
        return <TextInput value={(value as string) || ''} onChange={(e) => setValue(e.target.value)} placeholder="이름 입력" />;
      case 'url':
        return (
          <>
            <TextInput value={(value as string) || ''} onChange={(e) => setValue(e.target.value)} placeholder="https://…" />
            {!!value && <UrlLink href={value as string} target="_blank" rel="noreferrer">{value as string}</UrlLink>}
          </>
        );
      case 'checkbox':
        return <Checkbox type="checkbox" checked={!!value} onChange={() => setValue(!value)} />;
      case 'select':
      case 'multiSelect': {
        const opts = field.options || [];
        const selected = field.type === 'select'
          ? (value ? [value as string] : [])
          : ((value as string[]) || []);
        const toggle = (optId: string) => {
          if (field.type === 'select') setValue(selected.includes(optId) ? null : optId);
          else setValue(selected.includes(optId) ? selected.filter((x) => x !== optId) : [...selected, optId]);
        };
        return (
          <>
            <ChipRow>
              {opts.map((o) => (
                <SelectChip key={o.id} $active={selected.includes(o.id)} onClick={() => toggle(o.id)}>
                  <DocsChip $bg={`${o.color}22`} $ink={o.color}>{o.label}</DocsChip>
                </SelectChip>
              ))}
            </ChipRow>
            <NewOptionInput
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => {
                if (isImeComposing(e)) return;
                if (e.key === 'Enter' && newOption.trim()) {
                  e.preventDefault();
                  const optId = addFieldOption(field.id, newOption);
                  toggle(optId);
                  setNewOption('');
                }
              }}
              placeholder="+ 옵션 추가 (Enter)"
            />
          </>
        );
      }
      case 'checklist': {
        const list = (value as DocsDbChecklistItem[]) || [];
        return (
          <>
            {list.map((c) => (
              <ChecklistItemRow key={c.id} className="checklist-row">
                <Checkbox
                  type="checkbox"
                  checked={c.done}
                  onChange={() => setValue(list.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)))}
                />
                <ChecklistText $done={c.done}>{c.text}</ChecklistText>
                <ChecklistDelBtn className="checklist-del" onClick={() => setValue(list.filter((x) => x.id !== c.id))}>✕</ChecklistDelBtn>
              </ChecklistItemRow>
            ))}
            <NewOptionInput
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => {
                if (isImeComposing(e)) return;
                if (e.key === 'Enter' && newOption.trim()) {
                  e.preventDefault();
                  setValue([...list, { id: `ck${Date.now()}${Math.random().toString(36).slice(2, 6)}`, text: newOption.trim(), done: false }]);
                  setNewOption('');
                }
              }}
              placeholder="+ 항목 추가 (Enter)"
            />
          </>
        );
      }
      case 'file':
        return (
          <>
            <input ref={fileRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
            <UploadBtn onClick={() => fileRef.current?.click()}><Paperclip size={13} />{mediaSrc ? '파일 변경' : '파일 선택'}</UploadBtn>
            {mediaSrc && <UrlLink href={mediaSrc} target="_blank" rel="noreferrer" download={mediaVal.title}>{mediaVal.title || '첨부파일'}</UrlLink>}
          </>
        );
      case 'createdTime':
        return <ReadonlyText>{target === 'row' ? fmtTs(row?.createdAt) : '카드 생성 시 자동 기록'}</ReadonlyText>;
      case 'lastEditedTime':
        return <ReadonlyText>{target === 'row' ? fmtTs(row?.updatedAt) : '카드 수정 시 자동 기록'}</ReadonlyText>;
      case 'relation': {
        if (!field.relationDbId) {
          const dbPages = Object.values(state.pagesById).filter((p) => p.type === 'db' && p.id !== state.activeId);
          return (
            <SelectNative
              defaultValue=""
              onChange={(e) => { if (e.target.value) updateCustomFieldDef(field.id, { relationDbId: e.target.value }); }}
            >
              <option value="" disabled>연결할 데이터베이스 선택</option>
              {dbPages.map((p) => <option key={p.id} value={p.id}>{p.title || '제목 없음'}</option>)}
            </SelectNative>
          );
        }
        const targetDb = state.db[field.relationDbId];
        const selected = (value as string[]) || [];
        if (!targetDb) return <ReadonlyText>연결된 데이터베이스를 찾을 수 없음</ReadonlyText>;
        return (
          <ChipRow>
            {targetDb.rows.map((r) => (
              <SelectChip
                key={r.id}
                $active={selected.includes(r.id)}
                onClick={() => setValue(selected.includes(r.id) ? selected.filter((x) => x !== r.id) : [...selected, r.id])}
              >
                <DocsChip $bg={docsTheme.surfaceSoft} $ink={docsTheme.text2}>{r.title || '제목 없음'}</DocsChip>
              </SelectChip>
            ))}
            {targetDb.rows.length === 0 && <ReadonlyText>연결 대상에 항목이 없습니다</ReadonlyText>}
          </ChipRow>
        );
      }
      case 'rollup': {
        const relationFields = d?.customFields.filter((f) => f.type === 'relation' && f.relationDbId) || [];
        if (!field.rollupRelationFieldId) {
          return (
            <SelectNative
              defaultValue=""
              onChange={(e) => { if (e.target.value) updateCustomFieldDef(field.id, { rollupRelationFieldId: e.target.value }); }}
            >
              <option value="" disabled>참조할 관계 속성 선택</option>
              {relationFields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </SelectNative>
          );
        }
        const relField = d?.customFields.find((f) => f.id === field.rollupRelationFieldId);
        const relatedIds = (row?.customValues?.[field.rollupRelationFieldId] as string[]) || [];
        const targetDb = relField?.relationDbId ? state.db[relField.relationDbId] : undefined;
        if (!field.rollupAgg) {
          return (
            <ChipRow>
              <AggBtn onClick={() => updateCustomFieldDef(field.id, { rollupAgg: 'count' })}>개수</AggBtn>
              <AggBtn onClick={() => updateCustomFieldDef(field.id, { rollupAgg: 'sum' })}>합계</AggBtn>
            </ChipRow>
          );
        }
        if (field.rollupAgg === 'count') return <ReadonlyText>{relatedIds.length}</ReadonlyText>;
        const numberFields = targetDb ? (state.db[relField?.relationDbId || '']?.customFields || []).filter((f) => f.type === 'number') : [];
        if (!field.rollupTargetFieldId) {
          return (
            <SelectNative
              defaultValue=""
              onChange={(e) => { if (e.target.value) updateCustomFieldDef(field.id, { rollupTargetFieldId: e.target.value }); }}
            >
              <option value="" disabled>합산할 숫자 속성 선택</option>
              {numberFields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </SelectNative>
          );
        }
        const sum = relatedIds.reduce((acc, rid) => {
          const rr = targetDb?.rows.find((x) => x.id === rid);
          const n = Number(rr?.customValues?.[field.rollupTargetFieldId as string]);
          return acc + (Number.isFinite(n) ? n : 0);
        }, 0);
        return <ReadonlyText>{sum}</ReadonlyText>;
      }
      default:
        return null;
    }
  };

  return (
    <FieldWrap>
      <FieldHead>
        {nameEdit ? (
          <FieldNameInput
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (isImeComposing(e)) return;
              if (e.key === 'Enter') { e.preventDefault(); commitName(); }
            }}
          />
        ) : (
          <FieldLabel onClick={() => setNameEdit(true)}>{field.name}</FieldLabel>
        )}
        <FieldDelBtn onClick={() => removeCustomField(field.id)} title="속성 삭제"><X size={12} /></FieldDelBtn>
      </FieldHead>
      {renderEditor()}
    </FieldWrap>
  );
};

export default DocsCustomFieldRow;

const FieldWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FieldHead = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const FieldLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${docsTheme.muted};
  cursor: text;
  &:hover { color: ${docsTheme.text2}; }
`;

const FieldNameInput = styled.input`
  font-size: 12px;
  font-weight: 700;
  color: ${docsTheme.text};
  background: ${docsTheme.surfaceSoft};
  border: 1px solid ${docsTheme.accent};
  border-radius: 5px;
  padding: 2px 5px;
  outline: none;
`;

const FieldDelBtn = styled.button`
  margin-left: auto;
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${docsTheme.faint};
  display: flex;
  align-items: center;
  &:hover { color: ${docsTheme.danger}; }
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

const Checkbox = styled.input`
  width: 15px;
  height: 15px;
  cursor: pointer;
  accent-color: ${docsTheme.accent};
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
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

const NewOptionInput = styled.input`
  font-family: inherit;
  font-size: 12.5px;
  color: ${docsTheme.text};
  background: transparent;
  border: none;
  outline: none;
  padding: 4px 0;
  &::placeholder { color: ${docsTheme.faint}; }
`;

const ChecklistItemRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
  &:hover .checklist-del { opacity: 1; }
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
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${docsTheme.faint};
  font-size: 11px;
  &:hover { color: ${docsTheme.danger}; }
`;

const UploadBtn = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  appearance: none;
  border: 1px solid ${docsTheme.border};
  background: ${docsTheme.surfaceSoft};
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  color: ${docsTheme.text2};
  padding: 6px 10px;
  border-radius: 8px;
  &:hover { background: ${docsTheme.hover}; }
`;

const UrlLink = styled.a`
  font-size: 12.5px;
  color: ${docsTheme.accent};
  word-break: break-all;
`;

const ReadonlyText = styled.span`
  font-size: 13px;
  color: ${docsTheme.text2};
`;

const SelectNative = styled.select`
  font-family: inherit;
  font-size: 12.5px;
  color: ${docsTheme.text};
  background: ${docsTheme.surfaceSoft};
  border: 1px solid ${docsTheme.border};
  border-radius: 8px;
  padding: 7px 8px;
`;

const AggBtn = styled.button`
  appearance: none;
  border: 1px solid ${docsTheme.border};
  background: ${docsTheme.surfaceSoft};
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  color: ${docsTheme.text2};
  padding: 6px 12px;
  border-radius: 8px;
  &:hover { background: ${docsTheme.hover}; }
`;
