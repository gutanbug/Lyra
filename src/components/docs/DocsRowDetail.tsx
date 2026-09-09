import {
  useEffect, useRef, useState,
} from 'react';
import styled from 'styled-components';
import {
  Check, ChevronDown, X, Trash2, EyeOff, Eye, MessageSquare, Plus,
} from 'lucide-react';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { getDocsStatusGroups } from 'lib/utils/docsBoardGroups';
import { isImeComposing } from 'lib/utils/keyboard';
import {
  DocsOverlay, DocsModal, DocsChip, DocsAvatar,
} from 'lib/styles/docsCommon';
import DocsCustomFieldRow from 'components/docs/DocsCustomFieldRow';
import DocsRowNoteEditor from 'components/docs/DocsRowNoteEditor';
import { DOCS_PRIORITY_OPTS, DOCS_BUILTIN_PROPERTY_LABELS } from 'types/docs';
import type { DocsBuiltinPropertyKey } from 'types/docs';

const DocsRowDetail = () => {
  const {
    state, closeRowDetail, setCell, setCellTitle, removeRow,
    addChecklistItem, toggleChecklistItem, removeChecklistItem, toggleChecklistHideDone,
    addComment, removeComment, openMenu,
  } = useDocs();
  const rowId = state.rowDetail;
  const d = state.db[state.activeId];
  const row = rowId ? d?.rows.find((r) => r.id === rowId) : undefined;
  const [newItem, setNewItem] = useState('');
  const [commentText, setCommentText] = useState('');
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const statusPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!statusPickerOpen) return undefined;
    const closePicker = (event: MouseEvent) => {
      if (!statusPickerRef.current?.contains(event.target as Node)) setStatusPickerOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setStatusPickerOpen(false);
    };
    document.addEventListener('mousedown', closePicker);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closePicker);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [statusPickerOpen]);

  if (!rowId || !row || !d) return null;

  const checklist = row.checklist || [];
  const doneCount = checklist.filter((c) => c.done).length;
  const pct = checklist.length ? Math.round((doneCount / checklist.length) * 100) : 0;
  const visibleChecklist = row.checklistHideDone ? checklist.filter((c) => !c.done) : checklist;
  const comments = state.comments[row.id] || [];
  const tags = row.tags || [];
  const isPropertyHidden = (key: string) => d.hiddenProperties.includes(key);
  const visiblePropertyKeys = d.propertyOrder.filter((key) => !isPropertyHidden(key));

  const statusOptions = getDocsStatusGroups(d);
  const statusColor = (status: string) => {
    const custom = (d.groupBy === 'status' || d.groupBy === null) ? d.boardGroupColors[status] : undefined;
    return custom
      ? { bg: `${custom}22`, ink: custom }
      : (docsTheme.status[status] || { bg: docsTheme.surfaceSoft, ink: docsTheme.text2 });
  };

  const submitItem = () => {
    if (newItem.trim()) addChecklistItem(row.id, newItem);
    setNewItem('');
  };
  const submitComment = () => {
    if (commentText.trim()) addComment(row.id, commentText);
    setCommentText('');
  };

  return (
    <DocsOverlay onClick={closeRowDetail}>
      <DetailModal style={{ width: '76vw', maxWidth: 900, maxHeight: '86vh' }} onClick={(e) => e.stopPropagation()}>
        <Head>
          {row.assignee ? <DocsAvatar $bg={docsTheme.avatar[row.assignee] || docsTheme.muted}>{row.assignee[0]}</DocsAvatar> : <span />}
          <HeadActions>
            <IconBtn title="댓글"><MessageSquare size={15} />{comments.length > 0 && <IconBadge>{comments.length}</IconBadge>}</IconBtn>
            <IconBtn onClick={() => removeRow(row.id)} title="삭제"><Trash2 size={15} /></IconBtn>
            <IconBtn onClick={closeRowDetail} title="닫기"><X size={16} /></IconBtn>
          </HeadActions>
        </Head>
        <Body>
          <TitleInput
            value={row.title}
            onChange={(e) => setCellTitle(row.id, e.target.value)}
            placeholder="제목 없음"
          />

          {visiblePropertyKeys.map((key) => {
            const customField = d.customFields.find((f) => f.id === key);
            if (customField) {
              return (
                <DocsCustomFieldRow
                  key={customField.id}
                  field={customField}
                  target="row"
                  targetId={row.id}
                  value={row.customValues?.[customField.id]}
                />
              );
            }

            switch (key as DocsBuiltinPropertyKey) {
              case 'status': {
                const currentColor = statusColor(row.status);
                return (
                  <FieldRow key={key}>
                    <FieldLabel>{DOCS_BUILTIN_PROPERTY_LABELS.status}</FieldLabel>
                    <StatusPicker ref={statusPickerRef}>
                      <StatusTrigger
                        type="button"
                        aria-haspopup="listbox"
                        aria-expanded={statusPickerOpen}
                        onClick={() => setStatusPickerOpen((open) => !open)}
                      >
                        <DocsChip $bg={currentColor.bg} $ink={currentColor.ink}>{row.status}</DocsChip>
                        <ChevronDown size={14} />
                      </StatusTrigger>
                      {statusPickerOpen && (
                        <StatusMenu role="listbox" aria-label="상태 선택">
                          <StatusMenuLabel>상태 그룹 선택</StatusMenuLabel>
                          {statusOptions.map((v) => {
                            const color = statusColor(v);
                            return (
                              <StatusOption
                                key={v}
                                type="button"
                                role="option"
                                aria-selected={row.status === v}
                                $active={row.status === v}
                                onClick={() => {
                                  setCell(row.id, 'status', v);
                                  setStatusPickerOpen(false);
                                }}
                              >
                                <DocsChip $bg={color.bg} $ink={color.ink}>{v}</DocsChip>
                                {row.status === v && <Check size={15} />}
                              </StatusOption>
                            );
                          })}
                        </StatusMenu>
                      )}
                    </StatusPicker>
                  </FieldRow>
                );
              }
              case 'tags':
                return (
                  <FieldRow key={key}>
                    <FieldLabel>{DOCS_BUILTIN_PROPERTY_LABELS.tags}</FieldLabel>
                    <ChipRow>
                      {tags.map((tagId) => {
                        const opt = d.tagOptions.find((t) => t.id === tagId);
                        if (!opt) return null;
                        return <DocsChip key={tagId} $bg={`${opt.color}22`} $ink={opt.color}>{opt.label}</DocsChip>;
                      })}
                      <AddTagBtn
                        onClick={(e) => {
                          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          openMenu('tagMenu', { target: 'row', targetId: row.id, x: r.left, y: r.bottom + 6 });
                        }}
                      >
                        <Plus size={12} />태그
                      </AddTagBtn>
                    </ChipRow>
                  </FieldRow>
                );
              case 'checklist':
                return (
                  <FieldRow key={key}>
                    <ChecklistHead>
                      <FieldLabel>{DOCS_BUILTIN_PROPERTY_LABELS.checklist}</FieldLabel>
                      <ProgressTrack><ProgressFill style={{ width: `${pct}%` }} /></ProgressTrack>
                      <ProgressPct>{pct}%</ProgressPct>
                      <HideDoneBtn onClick={() => toggleChecklistHideDone(row.id)} title={row.checklistHideDone ? '완료 항목 표시' : '완료 항목 숨기기'}>
                        {row.checklistHideDone ? <EyeOff size={13} /> : <Eye size={13} />}
                      </HideDoneBtn>
                    </ChecklistHead>
                    {visibleChecklist.map((c) => (
                      <ChecklistRow key={c.id} className="checklist-row">
                        <Checkbox type="checkbox" checked={c.done} onChange={() => toggleChecklistItem(row.id, c.id)} />
                        <ChecklistText $done={c.done}>{c.text}</ChecklistText>
                        <ChecklistDelBtn className="checklist-del" onClick={() => removeChecklistItem(row.id, c.id)}>✕</ChecklistDelBtn>
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
                );
              case 'priority':
                return (
                  <FieldRow key={key}>
                    <FieldLabel>{DOCS_BUILTIN_PROPERTY_LABELS.priority}</FieldLabel>
                    <ChipRow>
                      {DOCS_PRIORITY_OPTS.map((v) => (
                        <SelectChip key={v} $active={row.priority === v} onClick={() => setCell(row.id, 'priority', v)}>
                          <PrioLabel style={{ color: docsTheme.priority[v]?.color }}>{docsTheme.priority[v]?.glyph} {v}</PrioLabel>
                        </SelectChip>
                      ))}
                    </ChipRow>
                  </FieldRow>
                );
              case 'assignee':
                return (
                  <FieldRow key={key}>
                    <FieldLabel>{DOCS_BUILTIN_PROPERTY_LABELS.assignee}</FieldLabel>
                    <TextInput
                      value={row.assignee}
                      onChange={(e) => setCell(row.id, 'assignee', e.target.value)}
                      placeholder="이름 입력"
                    />
                  </FieldRow>
                );
              case 'due':
                return (
                  <FieldRow key={key}>
                    <FieldLabel>{DOCS_BUILTIN_PROPERTY_LABELS.due}</FieldLabel>
                    <TextInput
                      type="date"
                      value={row.due}
                      onChange={(e) => setCell(row.id, 'due', e.target.value)}
                    />
                  </FieldRow>
                );
              default:
                return null;
            }
          })}

          <AddPropertyBtn
            onClick={(e) => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              openMenu('fieldTypeMenu', { x: r.left, y: r.bottom + 6 });
            }}
          >
            <Plus size={13} />새 속성
          </AddPropertyBtn>

          <Divider />

          <FieldRow>
            <FieldLabel>댓글</FieldLabel>
            {comments.map((c) => (
              <CommentItem key={c.id}>
                <DocsAvatar $bg={docsTheme.muted} style={{ width: 24, height: 24, fontSize: 11 }}>익</DocsAvatar>
                <CommentBody>
                  <CommentText>{c.text}</CommentText>
                  <CommentTs>{new Date(c.ts).toLocaleString('ko-KR')}</CommentTs>
                </CommentBody>
                <ChecklistDelBtn className="checklist-del" onClick={() => removeComment(row.id, c.id)}>✕</ChecklistDelBtn>
              </CommentItem>
            ))}
            <ReplyInput
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (isImeComposing(e)) return;
                if (e.key === 'Enter') { e.preventDefault(); submitComment(); }
              }}
              placeholder="댓글을 입력하세요…"
            />
          </FieldRow>

          <Divider />

          <DocsRowNoteEditor rowId={row.id} />
        </Body>
      </DetailModal>
    </DocsOverlay>
  );
};

export default DocsRowDetail;

const DetailModal = styled(DocsModal)`
  overflow-y: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 0;
`;

const HeadActions = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

const IconBtn = styled.button`
  position: relative;
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

const IconBadge = styled.span`
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 13px;
  height: 13px;
  padding: 0 2px;
  border-radius: 7px;
  background: ${docsTheme.accent};
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  line-height: 13px;
  text-align: center;
`;

const Body = styled.div`
  padding: 6px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const TitleInput = styled.input`
  font-family: 'Sora', sans-serif;
  font-size: 22px;
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

const StatusPicker = styled.div`
  position: relative;
  align-self: flex-start;
`;

const StatusTrigger = styled.button`
  min-width: 150px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  appearance: none;
  border: 1px solid ${docsTheme.border};
  background: ${docsTheme.surface};
  color: ${docsTheme.muted};
  border-radius: 9px;
  padding: 5px 7px;
  cursor: pointer;
  font-family: inherit;

  &:hover {
    border-color: ${docsTheme.borderStrong};
    background: ${docsTheme.surfaceSoft};
  }

  &:focus-visible {
    outline: 2px solid ${docsTheme.accent};
    outline-offset: 2px;
  }
`;

const StatusMenu = styled.div`
  position: absolute;
  z-index: 10;
  top: calc(100% + 6px);
  left: 0;
  width: 240px;
  max-height: 280px;
  overflow-y: auto;
  padding: 6px;
  background: ${docsTheme.surface};
  border: 1px solid ${docsTheme.border};
  border-radius: 11px;
  box-shadow: ${docsTheme.shadow};
`;

const StatusMenuLabel = styled.div`
  padding: 5px 8px 7px;
  color: ${docsTheme.muted};
  font-size: 11px;
  font-weight: 700;
`;

const StatusOption = styled.button<{ $active: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  appearance: none;
  border: none;
  border-radius: 8px;
  padding: 7px 8px;
  background: ${({ $active }) => ($active ? docsTheme.hover : 'transparent')};
  color: ${docsTheme.accent};
  cursor: pointer;
  font-family: inherit;
  text-align: left;

  & > svg {
    margin-left: auto;
  }

  &:hover {
    background: ${docsTheme.hover};
  }

  &:focus-visible {
    outline: 2px solid ${docsTheme.accent};
    outline-offset: -2px;
  }
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

const ChecklistHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ProgressTrack = styled.div`
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: ${docsTheme.borderSoft};
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: ${docsTheme.accent};
  border-radius: 3px;
  transition: width .15s;
`;

const ProgressPct = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${docsTheme.muted};
`;

const HideDoneBtn = styled.button`
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${docsTheme.faint};
  display: flex;
  align-items: center;
  &:hover { color: ${docsTheme.text2}; }
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

const CommentItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0;
  &:hover .checklist-del { opacity: 1; }
`;

const CommentBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const CommentText = styled.div`
  font-size: 13px;
  color: ${docsTheme.text};
  white-space: pre-wrap;
  word-break: break-word;
`;

const CommentTs = styled.div`
  font-size: 11px;
  color: ${docsTheme.faint};
  margin-top: 2px;
`;

const ReplyInput = styled.input`
  font-family: inherit;
  font-size: 13px;
  color: ${docsTheme.text};
  background: ${docsTheme.surfaceSoft};
  border: 1px solid ${docsTheme.border};
  border-radius: 9px;
  padding: 9px 11px;
  outline: none;
  margin-top: 4px;
  &:focus { border-color: ${docsTheme.accent}; background: ${docsTheme.surface}; }
  &::placeholder { color: ${docsTheme.faint}; }
`;
