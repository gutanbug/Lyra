import {
  Fragment, useCallback, useEffect, useMemo, useState,
} from 'react';
import styled, { css, keyframes } from 'styled-components';
import {
  Table, Kanban, GalleryVerticalEnd, Calendar, Plus, X, ChevronDown, ChevronRight, ChevronLeft,
  MoreHorizontal, Pencil, EyeOff, Eye, Trash2, Settings, GripVertical, SlidersHorizontal, LayoutGrid, Layers,
} from 'lucide-react';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import {
  getVisibleDocsBoardPropertyKeys, reorderDocsBoardProperties,
} from 'lib/utils/docsBoardProperties';
import { DocsChip, DocsAvatar, thinScrollbar } from 'lib/styles/docsCommon';
import { useEditableRef } from 'lib/hooks/useEditableRef';
import { moveDocsCaretByArrow } from 'lib/utils/docsCaretNavigation';
import { isImeComposing } from 'lib/utils/keyboard';
import DocsTemplateMenu from 'components/docs/DocsTemplateMenu';
import DocsTemplateEditorModal from 'components/docs/DocsTemplateEditorModal';
import DocsFieldTypeMenu from 'components/docs/DocsFieldTypeMenu';
import DocsTagPickerMenu from 'components/docs/DocsTagPickerMenu';
import type {
  DocsCustomFieldValue, DocsDbChecklistItem, DocsDbFilter, DocsDbRow, DocsDbState,
  DocsDbTagOption, DocsDbView as DbViewId,
} from 'types/docs';
import { DOCS_BUILTIN_PROPERTY_LABELS } from 'types/docs';

const matchesFilter = (row: DocsDbRow, f: DocsDbFilter): boolean => {
  if (f.field === 'tag') {
    const tags = row.tags || [];
    if (f.op === 'isEmpty') return tags.length === 0;
    if (f.op === 'isNotEmpty') return tags.length > 0;
    if (f.values.length === 0) return true;
    const hit = tags.some((t) => f.values.includes(t));
    return f.op === 'is' ? hit : !hit;
  }
  const v = String(row[f.field] ?? '');
  if (f.op === 'isEmpty') return v.trim().length === 0;
  if (f.op === 'isNotEmpty') return v.trim().length > 0;
  if (f.values.length === 0) return true; // 값 미선택 상태는 필터 없음과 동일하게 취급
  const hit = f.values.includes(v);
  return f.op === 'is' ? hit : !hit;
};

const ROW_DND_MIME = 'application/x-docs-row-id';
const COL_DND_MIME = 'application/x-docs-col-key';
const PROP_DND_MIME = 'application/x-docs-prop-key';

const GROUP_COLOR_PRESETS: { name: string; value: string }[] = [
  { name: 'Mauve', value: '#b8a1c9' },
  { name: 'Lilac', value: '#c9b3ea' },
  { name: 'Camellia', value: '#eeaec2' },
  { name: 'Papaya', value: '#f3b988' },
  { name: 'Mango', value: '#f0cd6e' },
  { name: 'Olive', value: '#b7c17c' },
  { name: 'Grass', value: '#95cf95' },
  { name: 'Jade', value: '#7fc7ab' },
  { name: 'Azure', value: '#8fc3ee' },
  { name: 'Iron', value: '#9aa3ab' },
];

const VIEW_DEFS: { id: DbViewId; Icon: typeof Table; label: string }[] = [
  { id: 'grid', Icon: Table, label: '그리드' },
  { id: 'board', Icon: Kanban, label: '보드' },
  { id: 'gallery', Icon: GalleryVerticalEnd, label: '갤러리' },
  { id: 'calendar', Icon: Calendar, label: '캘린더' },
];

const sortOrd = (field: string): string[] | null => (
  field === 'priority' ? ['긴급', '높음', '보통', '낮음'] : field === 'status' ? ['할 일', '진행 중', '완료'] : null
);

const useSortedFilteredRows = (): DocsDbRow[] => {
  const { state } = useDocs();
  const d = state.db[state.activeId];
  return useMemo(() => {
    if (!d) return [];
    let list = d.rows.slice();
    if (d.filter.length) list = list.filter((r) => d.filter.every((f) => matchesFilter(r, f)));
    if (d.sort.length) {
      list.sort((a, b) => {
        for (let i = 0; i < d.sort.length; i += 1) {
          const { field, dir } = d.sort[i];
          const ord = sortOrd(field);
          let av: string | number = a[field];
          let bv: string | number = b[field];
          if (ord) { av = ord.indexOf(a[field]); bv = ord.indexOf(b[field]); }
          const cmp = (av < bv ? -1 : av > bv ? 1 : 0) * (dir === 'desc' ? -1 : 1);
          if (cmp !== 0) return cmp;
        }
        return 0;
      });
    }
    return list;
  }, [d]);
};

const GROUP_OPTS: { field: 'status' | 'priority' | 'tag' | null; label: string }[] = [
  { field: null, label: '없음' },
  { field: 'status', label: '상태' },
  { field: 'priority', label: '우선순위' },
  { field: 'tag', label: '태그' },
];

type SettingsPanel = 'root' | 'properties' | 'layout' | 'group';

const DocsDbView = () => {
  const {
    state, setDbView, openFilterMenu, closeMenu, addRow, setGroupBy, addDbView, removeDbView, toggleBoardGroupHidden,
    reorderProperties, togglePropertyVisibility, openRowDetail,
  } = useDocs();
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [addViewOpen, setAddViewOpen] = useState(false);
  const [templateMenuPos, setTemplateMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [hiddenMenuOpen, setHiddenMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsPanel, setSettingsPanel] = useState<SettingsPanel>('root');
  const [draggedPropKey, setDraggedPropKey] = useState<string | null>(null);
  const [propDropTarget, setPropDropTarget] = useState<{ key: string; position: 'before' | 'after' } | null>(null);
  const page = state.pagesById[state.activeId];
  const d = state.db[state.activeId];
  const view = state.dbView[state.activeId] || 'board';
  const rows = useSortedFilteredRows();

  useEffect(() => {
    if (!groupMenuOpen && !addViewOpen && !templateMenuPos && !hiddenMenuOpen && !settingsOpen) return undefined;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-docs-menu]')) {
        setGroupMenuOpen(false); setAddViewOpen(false); setTemplateMenuPos(null); setHiddenMenuOpen(false);
        setSettingsOpen(false); setSettingsPanel('root');
      }
    };
    document.addEventListener('mousedown', onDown, true);
    return () => document.removeEventListener('mousedown', onDown, true);
  }, [groupMenuOpen, addViewOpen, templateMenuPos, hiddenMenuOpen, settingsOpen]);

  if (!page || !d) return null;

  // 그룹/필터/설정(숨김 포함) 드롭다운은 동시에 하나만 열려 있어야 한다.
  const closeToolbarMenus = () => {
    setGroupMenuOpen(false);
    setHiddenMenuOpen(false);
    setSettingsOpen(false);
    setSettingsPanel('root');
    if (state.filterMenu) closeMenu('filterMenu');
  };

  const filterActive = d.filter.length;
  const addableViews = VIEW_DEFS.filter((v) => !d.views.includes(v.id));
  const visiblePropertyCount = getVisibleDocsBoardPropertyKeys(d).length;
  const currentViewLabel = VIEW_DEFS.find((v) => v.id === view)?.label || view;
  const currentGroupLabel = GROUP_OPTS.find((g) => g.field === d.groupBy)?.label || '없음';

  const propertyLabel = (key: string): string => {
    const custom = d.customFields.find((f) => f.id === key);
    if (custom) return custom.name;
    return (DOCS_BUILTIN_PROPERTY_LABELS as Record<string, string>)[key] || key;
  };

  const clearPropDrag = () => {
    setDraggedPropKey(null);
    setPropDropTarget(null);
  };

  const onPropDragOver = (targetKey: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedPropKey || draggedPropKey === targetKey) {
      setPropDropTarget(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    setPropDropTarget((current) => (
      current?.key === targetKey && current.position === position ? current : { key: targetKey, position }
    ));
  };

  const onPropDrop = (targetKey: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const srcKey = e.dataTransfer.getData(PROP_DND_MIME);
    const position = propDropTarget?.key === targetKey ? propDropTarget.position : 'before';
    if (srcKey && srcKey !== targetKey) {
      reorderProperties(reorderDocsBoardProperties(d.boardPropertyOrder, srcKey, targetKey, position));
    }
    clearPropDrag();
  };

  return (
    <Wrap data-docs-editor-scope>
      <Icon>{page.icon}</Icon>
      <TitleText>{page.title}</TitleText>

      <Tabs>
        {VIEW_DEFS.filter((v) => d.views.includes(v.id)).map((v) => (
          <Tab key={v.id} $active={view === v.id} onClick={() => setDbView(v.id)}>
            <v.Icon size={14} />{v.label}
            {d.views.length > 1 && (
              <TabClose onClick={(e) => { e.stopPropagation(); removeDbView(v.id); }} title="뷰 삭제"><X size={11} /></TabClose>
            )}
          </Tab>
        ))}
        <AddViewWrap data-docs-menu>
          <AddViewBtn onClick={() => setAddViewOpen((v) => !v)} title="뷰 추가"><Plus size={14} /></AddViewBtn>
          {addViewOpen && (
            <AddViewMenu data-docs-menu>
              {addableViews.length === 0 && <AddViewEmpty>모든 뷰가 추가됨</AddViewEmpty>}
              {addableViews.map((v) => (
                <AddViewMenuItem key={v.id} onClick={() => { addDbView(v.id); setAddViewOpen(false); }}>
                  <v.Icon size={14} />{v.label}
                </AddViewMenuItem>
              ))}
            </AddViewMenu>
          )}
        </AddViewWrap>
        <Spacer />
        {(view === 'grid' || view === 'board') && (
          <GroupWrap data-docs-menu>
            <FilterBtn
              onClick={() => {
                const next = !groupMenuOpen;
                closeToolbarMenus();
                setGroupMenuOpen(next);
              }}
              $active={!!d.groupBy}
              title={d.groupBy ? `그룹 · ${GROUP_OPTS.find((g) => g.field === d.groupBy)?.label}` : '그룹'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="3" y="4" width="7" height="7" /><rect x="14" y="4" width="7" height="7" /><rect x="3" y="15" width="7" height="7" /></svg>
            </FilterBtn>
            {groupMenuOpen && (
              <GroupMenu data-docs-menu>
                {GROUP_OPTS.filter((g) => view === 'grid' || g.field).map((g) => (
                  <GroupMenuItem key={g.label} $active={d.groupBy === g.field} onClick={() => { setGroupBy(g.field); setGroupMenuOpen(false); }}>
                    {g.label}
                  </GroupMenuItem>
                ))}
              </GroupMenu>
            )}
          </GroupWrap>
        )}
        {view === 'board' && d.groupBy && (d.boardHiddenGroups || []).length > 0 && (
          <HiddenGroupsWrap data-docs-menu>
            <FilterBtn
              onClick={() => {
                const next = !hiddenMenuOpen;
                closeToolbarMenus();
                setHiddenMenuOpen(next);
              }}
              title={`숨김 ${(d.boardHiddenGroups || []).length}`}
            >
              <EyeOff size={14} />
              <FilterCountBadge>{(d.boardHiddenGroups || []).length}</FilterCountBadge>
            </FilterBtn>
            {hiddenMenuOpen && (
              <GroupMenu data-docs-menu style={{ minWidth: 160 }}>
                {(d.boardHiddenGroups || []).map((key) => {
                  const label = d.groupBy === 'tag' ? (d.tagOptions.find((t) => t.id === key)?.label || key) : key;
                  return (
                    <HiddenGroupItem key={key}>
                      <span>{label}</span>
                      <HiddenGroupShowBtn onClick={() => toggleBoardGroupHidden(key)} title="표시하기">
                        <Eye size={13} />
                      </HiddenGroupShowBtn>
                    </HiddenGroupItem>
                  );
                })}
              </GroupMenu>
            )}
          </HiddenGroupsWrap>
        )}
        <FilterBtn
          data-docs-menu
          onClick={(e) => {
            if (state.filterMenu) {
              closeMenu('filterMenu');
            } else {
              const { clientX, clientY } = e;
              closeToolbarMenus();
              openFilterMenu(clientX, clientY);
            }
          }}
          $active={!!filterActive}
          title={filterActive ? `필터 ${filterActive}` : '필터'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M3 6h18M6 12h12M10 18h4" /></svg>
          {filterActive > 0 && <FilterCountBadge>{filterActive}</FilterCountBadge>}
        </FilterBtn>
        <SettingsWrap data-docs-menu>
          <FilterBtn
            onClick={() => {
              const next = !settingsOpen;
              closeToolbarMenus();
              if (next) setSettingsOpen(true);
            }}
            $active={settingsOpen}
            title="보드 설정"
          >
            <Settings size={14} />
          </FilterBtn>
          {settingsOpen && (
            <GroupMenu data-docs-menu style={{ width: 264 }}>
              {settingsPanel === 'root' && (
                <>
                  <SettingsRow onClick={() => setSettingsPanel('properties')}>
                    <SlidersHorizontal size={13} />
                    <SettingsRowLabel>속성</SettingsRowLabel>
                    <SettingsRowValue>{visiblePropertyCount}</SettingsRowValue>
                    <ChevronRight size={13} />
                  </SettingsRow>
                  <SettingsRow onClick={() => setSettingsPanel('layout')}>
                    <LayoutGrid size={13} />
                    <SettingsRowLabel>레이아웃</SettingsRowLabel>
                    <SettingsRowValue>{currentViewLabel}</SettingsRowValue>
                    <ChevronRight size={13} />
                  </SettingsRow>
                  <SettingsRow onClick={() => setSettingsPanel('group')}>
                    <Layers size={13} />
                    <SettingsRowLabel>그룹</SettingsRowLabel>
                    <SettingsRowValue>{currentGroupLabel}</SettingsRowValue>
                    <ChevronRight size={13} />
                  </SettingsRow>
                </>
              )}
              {settingsPanel === 'properties' && (
                <>
                  <SettingsPanelHead>
                    <SettingsBackBtn onClick={() => setSettingsPanel('root')}><ChevronLeft size={14} /></SettingsBackBtn>
                    <SettingsPanelTitle>속성</SettingsPanelTitle>
                  </SettingsPanelHead>
                  <PropList>
                    {d.boardPropertyOrder.map((key) => {
                      const hidden = d.boardHiddenProperties.includes(key);
                      const showBefore = propDropTarget?.key === key && propDropTarget.position === 'before';
                      const showAfter = propDropTarget?.key === key && propDropTarget.position === 'after';
                      return (
                        <Fragment key={key}>
                          {showBefore && (
                            <PropDropPlaceholder
                              aria-hidden="true"
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={onPropDrop(key)}
                            >
                              <span />
                            </PropDropPlaceholder>
                          )}
                          <PropRow
                            draggable
                            $dragging={draggedPropKey === key}
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData(PROP_DND_MIME, key);
                              setDraggedPropKey(key);
                              setPropDropTarget(null);
                            }}
                            onDragOver={onPropDragOver(key)}
                            onDrop={onPropDrop(key)}
                            onDragEnd={clearPropDrag}
                          >
                            <GripVertical size={13} color={docsTheme.faint} />
                            <PropLabel $dim={hidden}>{propertyLabel(key)}</PropLabel>
                            <PropEyeBtn onClick={() => togglePropertyVisibility(key)} title={hidden ? '표시' : '숨기기'}>
                              {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                            </PropEyeBtn>
                          </PropRow>
                          {showAfter && (
                            <PropDropPlaceholder
                              aria-hidden="true"
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={onPropDrop(key)}
                            >
                              <span />
                            </PropDropPlaceholder>
                          )}
                        </Fragment>
                      );
                    })}
                  </PropList>
                </>
              )}
              {settingsPanel === 'layout' && (
                <>
                  <SettingsPanelHead>
                    <SettingsBackBtn onClick={() => setSettingsPanel('root')}><ChevronLeft size={14} /></SettingsBackBtn>
                    <SettingsPanelTitle>레이아웃</SettingsPanelTitle>
                  </SettingsPanelHead>
                  {VIEW_DEFS.map((v) => (
                    <GroupMenuItem
                      key={v.id}
                      $active={view === v.id}
                      onClick={() => {
                        if (!d.views.includes(v.id)) addDbView(v.id);
                        setDbView(v.id);
                        setSettingsOpen(false);
                      }}
                    >
                      <SettingsRowIconLabel><v.Icon size={14} />{v.label}</SettingsRowIconLabel>
                    </GroupMenuItem>
                  ))}
                </>
              )}
              {settingsPanel === 'group' && (
                <>
                  <SettingsPanelHead>
                    <SettingsBackBtn onClick={() => setSettingsPanel('root')}><ChevronLeft size={14} /></SettingsBackBtn>
                    <SettingsPanelTitle>그룹</SettingsPanelTitle>
                  </SettingsPanelHead>
                  {GROUP_OPTS.filter((g) => view === 'grid' || g.field).map((g) => (
                    <GroupMenuItem
                      key={g.label}
                      $active={d.groupBy === g.field}
                      onClick={() => { setGroupBy(g.field); setSettingsOpen(false); }}
                    >
                      {g.label}
                    </GroupMenuItem>
                  ))}
                </>
              )}
            </GroupMenu>
          )}
        </SettingsWrap>
        <NewBtnGroup data-docs-menu>
          <NewBtn onClick={() => openRowDetail(addRow(undefined, d.templates[0]?.id))}>＋ 새로 만들기</NewBtn>
          <NewBtnCaret
            onClick={(e) => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setTemplateMenuPos(templateMenuPos ? null : { x: r.right - 232, y: r.bottom + 6 });
            }}
            title="템플릿 선택"
          >
            <ChevronDown size={13} />
          </NewBtnCaret>
        </NewBtnGroup>
      </Tabs>

      {templateMenuPos && (
        <DocsTemplateMenu
          x={templateMenuPos.x}
          y={templateMenuPos.y}
          onPick={(templateId) => { openRowDetail(addRow(undefined, templateId)); setTemplateMenuPos(null); }}
        />
      )}
      <DocsTemplateEditorModal />
      <DocsFieldTypeMenu />
      <DocsTagPickerMenu />

      {view === 'grid' && <DocsDbGrid rows={rows} />}
      {view === 'board' && <DocsDbBoard rows={rows} />}
      {view === 'gallery' && <DocsDbGallery rows={rows} />}
      {view === 'calendar' && <DocsDbCalendar rows={rows} />}
    </Wrap>
  );
};

export default DocsDbView;

// ── GRID ──
const GRID_COLS: { field: 'title' | 'status' | 'assignee' | 'priority' | 'due' | null; label: string; width?: number }[] = [
  { field: 'title', label: '제목' },
  { field: 'status', label: '상태', width: 118 },
  { field: 'assignee', label: '담당자', width: 120 },
  { field: 'priority', label: '우선순위', width: 108 },
  { field: 'due', label: '마감일', width: 112 },
  { field: null, label: '태그', width: 120 },
];

const GridTitleCell = ({ row }: { row: DocsDbRow }) => {
  const { getText, setCellTitle, schedulePersist } = useDocs();
  const key = `ct:${row.id}`;
  const getValue = useCallback(() => {
    const t = getText(key);
    return t !== '' ? t : row.title;
  }, [getText, key, row.title]);
  const onChange = useCallback((v: string) => { setCellTitle(row.id, v); schedulePersist(); }, [setCellTitle, row.id, schedulePersist]);
  const { setRef, onInput } = useEditableRef(getValue, onChange);
  return (
    <TitleCellDiv
      className="lyra-ed"
      data-docs-text-editor="true"
      contentEditable
      suppressContentEditableWarning
      ref={setRef as unknown as React.Ref<HTMLSpanElement>}
      onInput={onInput}
      onKeyDown={(event) => moveDocsCaretByArrow(event, event.currentTarget)}
    />
  );
};

const MAX_INLINE_TAGS = 2;

const TagChips = ({ tagIds, tagOptions }: { tagIds: string[]; tagOptions: DocsDbTagOption[] }) => {
  const resolved = (tagIds || []).map((id) => tagOptions.find((t) => t.id === id)).filter((t): t is DocsDbTagOption => !!t);
  if (!resolved.length) return null;
  const visible = resolved.slice(0, MAX_INLINE_TAGS);
  const overflow = resolved.length - visible.length;
  return (
    <>
      {visible.map((t) => <DocsChip key={t.id} $bg={`${t.color}22`} $ink={t.color}>{t.label}</DocsChip>)}
      {overflow > 0 && <OverflowTag>외 {overflow}개</OverflowTag>}
    </>
  );
};

const BoardCardProperties = ({
  row, db, groupField,
}: {
  row: DocsDbRow;
  db: DocsDbState;
  groupField: 'status' | 'priority' | 'tag';
}) => {
  const keys = getVisibleDocsBoardPropertyKeys(db);

  const renderChecklist = (key: string, list: DocsDbChecklistItem[]) => {
    if (!list.length) return null;
    const done = list.filter((item) => item.done).length;
    const pct = Math.round((done / list.length) * 100);
    return (
      <CardProgress key={key}>
        <CardProgressTrack><CardProgressFill style={{ width: `${pct}%` }} /></CardProgressTrack>
        <CardProgressPct>{pct}%</CardProgressPct>
      </CardProgress>
    );
  };

  const renderCustomValue = (key: string, value: DocsCustomFieldValue | undefined) => {
    const field = db.customFields.find((candidate) => candidate.id === key);
    if (!field || value === null || value === undefined || value === '') return null;
    if (Array.isArray(value) && value.length === 0) return null;

    if (field.type === 'select' || field.type === 'multiSelect') {
      const selected = Array.isArray(value) ? value : [value as string];
      const options = selected
        .map((id) => field.options?.find((option) => option.id === id))
        .filter((option): option is NonNullable<typeof option> => !!option);
      if (!options.length) return null;
      return (
        <CardProperty key={key}>
          {options.map((option) => (
            <DocsChip key={option.id} $bg={`${option.color}22`} $ink={option.color}>{option.label}</DocsChip>
          ))}
        </CardProperty>
      );
    }

    if (field.type === 'checklist') return renderChecklist(key, value as DocsDbChecklistItem[]);

    let display: React.ReactNode;
    if (field.type === 'checkbox') display = value ? '✓' : '☐';
    else if (field.type === 'file') display = (value as { title?: string }).title || '첨부파일';
    else if (field.type === 'relation') display = `${(value as string[]).length}개 연결`;
    else if (Array.isArray(value)) display = value.join(', ');
    else display = String(value);

    return (
      <CardProperty key={key}>
        <CardPropertyLabel>{field.name}</CardPropertyLabel>
        <CardPropertyValue>{display}</CardPropertyValue>
      </CardProperty>
    );
  };

  return (
    <CardProperties>
      {keys.map((key) => {
        if (key === 'status') {
          if (groupField === 'status' || !row.status) return null;
          const custom = db.boardGroupColors[row.status];
          const color = custom
            ? { bg: `${custom}22`, ink: custom }
            : (docsTheme.status[row.status] || { bg: docsTheme.surfaceSoft, ink: docsTheme.text2 });
          return (
            <CardProperty key={key}>
              <DocsChip $bg={color.bg} $ink={color.ink}>{row.status}</DocsChip>
            </CardProperty>
          );
        }
        if (key === 'tags') {
          if (groupField === 'tag' || !row.tags.length) return null;
          return (
            <CardProperty key={key}>
              <TagChips tagIds={row.tags} tagOptions={db.tagOptions} />
            </CardProperty>
          );
        }
        if (key === 'checklist') return renderChecklist(key, row.checklist || []);
        if (key === 'priority') {
          if (groupField === 'priority' || !row.priority) return null;
          return (
            <CardProperty key={key}>
              <CardPriority style={{ color: docsTheme.priority[row.priority]?.color }}>
                {docsTheme.priority[row.priority]?.glyph} {row.priority}
              </CardPriority>
            </CardProperty>
          );
        }
        if (key === 'assignee') {
          if (!row.assignee) return null;
          return (
            <CardProperty key={key}>
              <DocsAvatar $bg={docsTheme.avatar[row.assignee] || docsTheme.muted}>{row.assignee[0]}</DocsAvatar>
              <CardPropertyValue>{row.assignee}</CardPropertyValue>
            </CardProperty>
          );
        }
        if (key === 'due') {
          if (!row.due) return null;
          return <CardProperty key={key}><CardPropertyValue>{row.due}</CardPropertyValue></CardProperty>;
        }
        return renderCustomValue(key, row.customValues?.[key]);
      })}
    </CardProperties>
  );
};

const GridRowView = ({ r }: { r: DocsDbRow }) => {
  const { state, openCellEditor, openMenu } = useDocs();
  const d = state.db[state.activeId];
  return (
    <GridRow>
      <Cell style={{ flex: 1, minWidth: 200, gap: 9 }}>
        <span style={{ color: docsTheme.faint, flex: '0 0 auto' }}>▤</span>
        <GridTitleCell row={r} />
      </Cell>
      <Cell style={{ width: 118, flex: '0 0 auto' }} onClick={(e) => openCellEditor(r.id, 'status', e.clientX, e.clientY)}>
        <DocsChip $bg={docsTheme.status[r.status]?.bg || ''} $ink={docsTheme.status[r.status]?.ink || ''}>{r.status}</DocsChip>
      </Cell>
      <Cell style={{ width: 120, flex: '0 0 auto', gap: 7 }} onClick={(e) => openCellEditor(r.id, 'assignee', e.clientX, e.clientY)}>
        <DocsAvatar $bg={docsTheme.avatar[r.assignee] || docsTheme.muted}>{r.assignee[0]}</DocsAvatar>
        <span style={{ color: docsTheme.text2, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.assignee}</span>
      </Cell>
      <Cell style={{ width: 108, flex: '0 0 auto', gap: 5, fontSize: 12.5, color: docsTheme.text2 }} onClick={(e) => openCellEditor(r.id, 'priority', e.clientX, e.clientY)}>
        <span style={{ fontWeight: 800, fontSize: 14, color: docsTheme.priority[r.priority]?.color }}>{docsTheme.priority[r.priority]?.glyph}</span>{r.priority}
      </Cell>
      <Cell style={{ width: 112, flex: '0 0 auto', fontSize: 12.5, color: docsTheme.text2 }}>{r.due}</Cell>
      <Cell
        style={{ width: 160, flex: '0 0 auto', gap: 4 }}
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          openMenu('tagMenu', { target: 'row', targetId: r.id, x: rect.left, y: rect.bottom + 6 });
        }}
      >
        <TagChips tagIds={r.tags} tagOptions={d.tagOptions} />
      </Cell>
    </GridRow>
  );
};

const GROUP_ORDER: Record<string, string[]> = {
  status: ['할 일', '진행 중', '완료'],
  priority: ['긴급', '높음', '보통', '낮음'],
};

const DocsDbGrid = ({ rows }: { rows: DocsDbRow[] }) => {
  const {
    state, setSort, addRow, openRowDetail,
  } = useDocs();
  const d = state.db[state.activeId];
  const total = d.rows.length;
  const cnt = (st: string) => d.rows.filter((r) => r.status === st).length;

  const groups = useMemo(() => {
    if (!d.groupBy) return null;
    const field = d.groupBy;
    if (field === 'tag') {
      const cols = d.tagOptions.map((t) => ({ key: t.id, field, rows: rows.filter((r) => (r.tags || []).includes(t.id)) }));
      cols.push({ key: '(없음)', field, rows: rows.filter((r) => !(r.tags || []).length) });
      return cols;
    }
    const map = new Map<string, DocsDbRow[]>();
    rows.forEach((r) => {
      const key = String(r[field] ?? '').trim() || '(없음)';
      if (!map.has(key)) map.set(key, []);
      (map.get(key) as DocsDbRow[]).push(r);
    });
    const order = GROUP_ORDER[field];
    const keys = Array.from(map.keys());
    if (order) keys.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return keys.map((key) => ({ key, field, rows: map.get(key) as DocsDbRow[] }));
  }, [rows, d.groupBy, d.tagOptions]);

  const head = (
    <GridHead>
      {GRID_COLS.map((c) => {
        const sortIdx = c.field ? d.sort.findIndex((x) => x.field === c.field) : -1;
        const active = sortIdx >= 0 ? d.sort[sortIdx] : null;
        return (
          <HeadCell key={c.label} style={{ width: c.width, flex: c.width ? '0 0 auto' : 1 }} onClick={() => c.field && setSort(c.field)}>
            {c.label}
            {active && (active.dir === 'asc' ? ' ▲' : ' ▼')}
            {active && d.sort.length > 1 && <SortOrder>{sortIdx + 1}</SortOrder>}
          </HeadCell>
        );
      })}
    </GridHead>
  );

  return (
    <GridBox>
      {head}
      {groups ? groups.map((g) => (
        <GroupSection key={g.key}>
          <GroupHeader>
            {g.field === 'status' ? <DocsChip $bg={docsTheme.status[g.key]?.bg || ''} $ink={docsTheme.status[g.key]?.ink || ''}>{g.key}</DocsChip>
              : g.field === 'priority' ? <span style={{ fontWeight: 700, color: docsTheme.priority[g.key]?.color }}>{docsTheme.priority[g.key]?.glyph} {g.key}</span>
                : (() => {
                  const opt = d.tagOptions.find((t) => t.id === g.key);
                  return opt
                    ? <DocsChip $bg={`${opt.color}22`} $ink={opt.color}>{opt.label}</DocsChip>
                    : <span style={{ fontSize: 12.5, color: docsTheme.muted, fontWeight: 600 }}>{g.key}</span>;
                })()}
            <GroupCount>{g.rows.length}</GroupCount>
          </GroupHeader>
          {g.rows.map((r) => <GridRowView key={r.id} r={r} />)}
        </GroupSection>
      )) : rows.map((r) => <GridRowView key={r.id} r={r} />)}
      <AddRowBtn onClick={() => openRowDetail(addRow(undefined, d.templates[0]?.id))}>＋ 새 행</AddRowBtn>
      <Footer>
        <span>전체 <b>{total}</b></span>
        <span>할 일 <b>{cnt('할 일')}</b></span>
        <span>진행 중 <b>{cnt('진행 중')}</b></span>
        <span>완료 <b>{cnt('완료')}</b></span>
      </Footer>
    </GridBox>
  );
};

// ── BOARD ──
const NONE_GROUP = '__none__';

const DocsDbBoard = ({ rows }: { rows: DocsDbRow[] }) => {
  const {
    state, addRow, setCell, addBoardGroup, openRowDetail,
    setBoardGroupOrder, setBoardGroupColor, toggleRowTag, clearRowTags, reorderTagOptions,
    renameBoardGroup, deleteBoardGroup, toggleBoardGroupHidden, ensureTagOption, updateTagOption, removeTagOption,
  } = useDocs();
  const d = state.db[state.activeId];
  const groupField = d.groupBy || 'status';
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newCardKey, setNewCardKey] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [settingsMenu, setSettingsMenu] = useState<{ key: string; x: number; y: number } | null>(null);
  const [renameKey, setRenameKey] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [cardDropTarget, setCardDropTarget] = useState<{ colKey: string; index: number } | null>(null);
  useEffect(() => {
    if (!settingsMenu) return undefined;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-docs-menu]')) setSettingsMenu(null);
    };
    document.addEventListener('mousedown', onDown, true);
    return () => document.removeEventListener('mousedown', onDown, true);
  }, [settingsMenu]);

  const isCustomGroup = (key: string) => groupField === 'tag' || d.boardExtraGroups.includes(key);

  const startRename = (key: string) => {
    setSettingsMenu(null);
    setRenameValue(groupField === 'tag' ? (d.tagOptions.find((t) => t.id === key)?.label || '') : key);
    setRenameKey(key);
  };
  const commitRename = (key: string) => {
    const v = renameValue.trim();
    if (v) {
      if (groupField === 'tag') updateTagOption(key, { label: v });
      else renameBoardGroup(key, v);
    }
    setRenameKey(null);
  };
  const handleDeleteGroup = (key: string) => {
    if (groupField === 'tag') removeTagOption(key);
    else deleteBoardGroup(key);
    setSettingsMenu(null);
  };
  const handleHideGroup = (key: string) => {
    toggleBoardGroupHidden(key);
    setSettingsMenu(null);
  };

  const submitNewCard = (key: string) => {
    const title = newCardTitle.trim();
    if (title) {
      const id = addRow(title, d.templates[0]?.id);
      if (key !== NONE_GROUP) {
        if (groupField === 'tag') toggleRowTag(id, key);
        else setCell(id, groupField as 'status' | 'assignee' | 'priority' | 'due', key);
      }
      openRowDetail(id);
    }
    setNewCardTitle('');
    setNewCardKey(null);
  };

  const columns = useMemo(() => {
    if (groupField === 'tag') {
      const cols = d.tagOptions.map((t) => ({ key: t.id, rows: rows.filter((r) => (r.tags || []).includes(t.id)) }));
      cols.push({ key: NONE_GROUP, rows: rows.filter((r) => !(r.tags || []).length) });
      return cols;
    }
    const map = new Map<string, DocsDbRow[]>();
    rows.forEach((r) => {
      const key = String(r[groupField] ?? '').trim() || NONE_GROUP;
      if (!map.has(key)) map.set(key, []);
      (map.get(key) as DocsDbRow[]).push(r);
    });
    d.boardExtraGroups.forEach((g) => { if (!map.has(g)) map.set(g, []); });
    const customOrder = d.boardGroupOrder;
    const defaultOrder = GROUP_ORDER[groupField];
    const keys = Array.from(map.keys()).filter((k) => k !== NONE_GROUP);
    if (customOrder.length) {
      keys.sort((a, b) => {
        const ia = customOrder.indexOf(a);
        const ib = customOrder.indexOf(b);
        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });
    } else if (defaultOrder) {
      keys.sort((a, b) => defaultOrder.indexOf(a) - defaultOrder.indexOf(b));
    }
    if (map.has(NONE_GROUP)) keys.push(NONE_GROUP);
    return keys.map((key) => ({ key, rows: map.get(key) as DocsDbRow[] }));
  }, [rows, groupField, d.boardExtraGroups, d.boardGroupOrder, d.tagOptions]);

  const visibleColumns = useMemo(
    () => columns.filter((c) => c.key === NONE_GROUP || !(d.boardHiddenGroups || []).includes(c.key)),
    [columns, d.boardHiddenGroups],
  );

  const onDrop = (groupValue: string) => (e: React.DragEvent) => {
    const id = e.dataTransfer.getData(ROW_DND_MIME);
    setDraggedRowId(null);
    setCardDropTarget(null);
    if (!id) return;
    if (groupField === 'tag') {
      if (groupValue === NONE_GROUP) clearRowTags(id);
      else toggleRowTag(id, groupValue);
      return;
    }
    setCell(id, groupField as 'status' | 'assignee' | 'priority' | 'due', groupValue === NONE_GROUP ? '' : groupValue);
  };

  const onCardDragOver = (colKey: string, index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedRowId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const idx = e.clientY < rect.top + rect.height / 2 ? index : index + 1;
    setCardDropTarget((cur) => (cur?.colKey === colKey && cur.index === idx ? cur : { colKey, index: idx }));
  };

  const onColBodyDragOver = (colKey: string, count: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedRowId) return;
    setCardDropTarget((cur) => (cur?.colKey === colKey && cur.index === count ? cur : { colKey, index: count }));
  };

  const onColDrop = (targetKey: string) => (e: React.DragEvent) => {
    const srcKey = e.dataTransfer.getData(COL_DND_MIME);
    if (!srcKey || srcKey === targetKey) return;
    const keys = columns.map((c) => c.key).filter((k) => k !== NONE_GROUP);
    const from = keys.indexOf(srcKey);
    if (from === -1) return;
    keys.splice(from, 1);
    const to = keys.indexOf(targetKey);
    keys.splice(to === -1 ? keys.length : to, 0, srcKey);
    if (groupField === 'tag') reorderTagOptions(keys);
    else setBoardGroupOrder(keys);
  };

  const renderColHeadLabel = (key: string) => {
    if (key === NONE_GROUP) return <span style={{ fontSize: 12.5, color: docsTheme.muted, fontWeight: 600 }}>없음</span>;
    if (groupField === 'tag') {
      const opt = d.tagOptions.find((t) => t.id === key);
      return opt ? <DocsChip $bg={`${opt.color}22`} $ink={opt.color}>{opt.label}</DocsChip> : null;
    }
    const custom = d.boardGroupColors[key];
    if (custom) return <DocsChip $bg={`${custom}22`} $ink={custom}>{key}</DocsChip>;
    if (groupField === 'status') return <DocsChip $bg={docsTheme.status[key]?.bg || ''} $ink={docsTheme.status[key]?.ink || ''}>{key}</DocsChip>;
    if (groupField === 'priority') return <span style={{ fontWeight: 700, fontSize: 13, color: docsTheme.priority[key]?.color }}>{docsTheme.priority[key]?.glyph} {key}</span>;
    return <span>{key}</span>;
  };

  return (
    <BoardWrap>
      {visibleColumns.map(({ key, rows: cards }) => {
        const colColor = groupField === 'tag' ? d.tagOptions.find((t) => t.id === key)?.color : d.boardGroupColors[key];
        return (
        <Column key={key} onDragOver={(e) => e.preventDefault()} onDrop={onColDrop(key)}>
          <ColHead
            draggable={key !== NONE_GROUP && renameKey !== key}
            onDragStart={(e) => { e.dataTransfer.setData(COL_DND_MIME, key); }}
            style={{ cursor: key !== NONE_GROUP ? 'grab' : undefined, position: 'relative' }}
          >
            {renameKey === key ? (
              <ColRenameInput
                autoFocus
                value={renameValue}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => commitRename(key)}
                onKeyDown={(e) => {
                  if (isImeComposing(e)) return;
                  if (e.key === 'Enter') { e.preventDefault(); commitRename(key); }
                  if (e.key === 'Escape') { e.preventDefault(); setRenameKey(null); }
                }}
              />
            ) : renderColHeadLabel(key)}
            <span style={{ fontSize: 12, color: docsTheme.muted, fontFamily: 'Sora,sans-serif' }}>{cards.length}</span>
            {key !== NONE_GROUP && (
              <ColMoreBtn
                onClick={(e) => {
                  e.stopPropagation();
                  if (settingsMenu?.key === key) { setSettingsMenu(null); return; }
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = Math.min(rect.left, window.innerWidth - 190);
                  const spaceBelow = window.innerHeight - rect.bottom;
                  const y = spaceBelow < 340 ? Math.max(10, rect.top - 340) : rect.bottom + 4;
                  setSettingsMenu({ key, x, y });
                }}
                title="그룹 설정"
              >
                <MoreHorizontal size={14} />
              </ColMoreBtn>
            )}
            {settingsMenu?.key === key && (
              <ColSettingsMenu data-docs-menu style={{ left: settingsMenu.x, top: settingsMenu.y }} onClick={(e) => e.stopPropagation()}>
                {isCustomGroup(key) && (
                  <ColSettingsBtn onClick={() => startRename(key)}><Pencil size={13} />이름 변경</ColSettingsBtn>
                )}
                <ColSettingsBtn onClick={() => handleHideGroup(key)}><EyeOff size={13} />숨기기</ColSettingsBtn>
                {isCustomGroup(key) && (
                  <ColSettingsBtn $danger onClick={() => handleDeleteGroup(key)}><Trash2 size={13} />삭제</ColSettingsBtn>
                )}
                <ColSettingsDivider />
                <ColSettingsLabel>색상</ColSettingsLabel>
                <ColColorScroll>
                  {GROUP_COLOR_PRESETS.map((c) => (
                    <ColColorRow
                      key={c.value}
                      onClick={() => {
                        if (groupField === 'tag') updateTagOption(key, { color: c.value });
                        else setBoardGroupColor(key, c.value);
                        setSettingsMenu(null);
                      }}
                    >
                      <ColColorSwatch as="span" style={{ background: c.value }} />
                      <span>{c.name}</span>
                      {colColor === c.value && <ColColorCheck>✓</ColColorCheck>}
                    </ColColorRow>
                  ))}
                </ColColorScroll>
              </ColSettingsMenu>
            )}
            <ColAddBtn
              onClick={() => {
                const id = addRow(undefined, d.templates[0]?.id);
                if (key !== NONE_GROUP) {
                  if (groupField === 'tag') toggleRowTag(id, key);
                  else setCell(id, groupField as 'status' | 'assignee' | 'priority' | 'due', key);
                }
                openRowDetail(id);
              }}
            >＋
            </ColAddBtn>
          </ColHead>
          <ColBody
            onDragOver={onColBodyDragOver(key, cards.length)}
            onDrop={onDrop(key)}
            style={colColor ? { background: `${colColor}14`, borderRadius: 12, padding: '8px 6px 4px' } : undefined}
          >
            {cards.map((r, idx) => (
              <Fragment key={r.id}>
                {cardDropTarget?.colKey === key && cardDropTarget.index === idx && <CardDropPlaceholder />}
                <BoardCard
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(ROW_DND_MIME, r.id);
                    setDraggedRowId(r.id);
                  }}
                  onDragOver={onCardDragOver(key, idx)}
                  onDragEnd={() => { setDraggedRowId(null); setCardDropTarget(null); }}
                  onClick={() => openRowDetail(r.id)}
                >
                  <CardTitle>{r.title || '제목 없음'}</CardTitle>
                  <BoardCardProperties row={r} db={d} groupField={groupField} />
                </BoardCard>
              </Fragment>
            ))}
            {cardDropTarget?.colKey === key && cardDropTarget.index === cards.length && <CardDropPlaceholder />}
            {newCardKey === key ? (
              <NewCardInput
                autoFocus
                value={newCardTitle}
                placeholder="카드 제목을 입력하세요…"
                onChange={(e) => setNewCardTitle(e.target.value)}
                onBlur={() => submitNewCard(key)}
                onKeyDown={(e) => {
                  if (isImeComposing(e)) return;
                  if (e.key === 'Enter') { e.preventDefault(); submitNewCard(key); }
                  if (e.key === 'Escape') { e.preventDefault(); setNewCardTitle(''); setNewCardKey(null); }
                }}
              />
            ) : (
              <AddCardBtn onClick={() => { setNewCardKey(key); setNewCardTitle(''); }}>＋ 새로 만들기</AddCardBtn>
            )}
          </ColBody>
        </Column>
        );
      })}
      <NewColumn>
        {newGroupOpen ? (
          <NewGroupForm
            onSubmit={(e) => {
              e.preventDefault();
              const v = newGroupName.trim();
              if (v) {
                if (groupField === 'tag') ensureTagOption(v);
                else addBoardGroup(v);
              }
              setNewGroupName('');
              setNewGroupOpen(false);
            }}
          >
            <NewGroupInput
              autoFocus
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onBlur={() => { if (!newGroupName.trim()) setNewGroupOpen(false); }}
              placeholder="그룹 이름"
            />
          </NewGroupForm>
        ) : (
          <NewColumnBtn onClick={() => setNewGroupOpen(true)}><Plus size={14} />새 그룹</NewColumnBtn>
        )}
      </NewColumn>
    </BoardWrap>
  );
};

// ── GALLERY ──
const DocsDbGallery = ({ rows }: { rows: DocsDbRow[] }) => (
  <GalleryGrid>
    {rows.map((r) => {
      const cover = docsTheme.cover[r.status] || docsTheme.cover['할 일'];
      return (
        <GalleryCard key={r.id}>
          <GalleryCover style={{ background: cover[0] }}>{cover[1]}</GalleryCover>
          <GalleryBody>
            <CardTitle>{r.title}</CardTitle>
            <CardProperty>
              <DocsChip $bg={docsTheme.status[r.status]?.bg || ''} $ink={docsTheme.status[r.status]?.ink || ''}>{r.status}</DocsChip>
              {r.assignee && <DocsAvatar $bg={docsTheme.avatar[r.assignee] || docsTheme.muted} style={{ marginLeft: 'auto' }}>{r.assignee[0]}</DocsAvatar>}
            </CardProperty>
          </GalleryBody>
        </GalleryCard>
      );
    })}
  </GalleryGrid>
);

// ── CALENDAR ── (2026년 7월 고정 — Source 시드 데이터 기준)
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const DocsDbCalendar = ({ rows }: { rows: DocsDbRow[] }) => {
  const { state, setCell } = useDocs();
  const d = state.db[state.activeId];
  const year = 2026;
  const month = 6; // 0-indexed July
  const today = new Date(2026, 6, 14);
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());

  const cells: { key: string; day: number; inMonth: boolean; isToday: boolean; dstr: string; items: DocsDbRow[] }[] = [];
  for (let i = 0; i < 42; i++) {
    const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const inMonth = dt.getMonth() === month;
    const isToday = dt.getFullYear() === today.getFullYear() && dt.getMonth() === today.getMonth() && dt.getDate() === today.getDate();
    const dstr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const items = rows.filter((r) => r.due === dstr);
    cells.push({
      key: dstr + i, day: dt.getDate(), inMonth, isToday, dstr, items,
    });
  }

  return (
    <CalBox>
      <CalHead>
        <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 16, fontWeight: 700 }}>2026년 7월</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: docsTheme.muted }}>마감일 기준</span>
      </CalHead>
      <CalWeekdays>
        {WEEKDAYS.map((w) => <CalWeekday key={w}>{w}</CalWeekday>)}
      </CalWeekdays>
      <CalGrid>
        {cells.map((c) => (
          <CalCell
            key={c.key}
            $inMonth={c.inMonth}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { const id = e.dataTransfer.getData(ROW_DND_MIME); if (id) setCell(id, 'due', c.dstr); }}
          >
            <CalNum $today={c.isToday} $inMonth={c.inMonth}>{c.day}</CalNum>
            <CalItems>
              {c.items.map((it) => (
                <CalPill
                  key={it.id}
                  draggable
                  title={it.title}
                  onDragStart={(e) => e.dataTransfer.setData(ROW_DND_MIME, it.id)}
                  style={{ background: d.tagOptions.find((t) => t.id === it.tags[0])?.color || docsTheme.muted }}
                >
                  {it.title}
                </CalPill>
              ))}
            </CalItems>
          </CalCell>
        ))}
      </CalGrid>
    </CalBox>
  );
};

// ── styles ──
const Wrap = styled.div`
  padding: 40px 44px 20px;
  max-width: 1180px;
  margin: 0 auto;
`;

const Icon = styled.div`
  font-size: 46px;
  line-height: 1;
  margin-bottom: 10px;
`;

const TitleText = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 18px;
`;

const Tabs = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  border-bottom: 1px solid ${docsTheme.border};
  margin-bottom: 14px;
`;

const Tab = styled.button<{ $active: boolean }>`
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: 36px;
  color: ${({ $active }) => ($active ? docsTheme.text : docsTheme.muted)};
  border-bottom: 2px solid ${({ $active }) => ($active ? docsTheme.accent : 'transparent')};
  margin-bottom: -1px;
`;

const TabClose = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  border-radius: 4px;
  color: ${docsTheme.faint};
  &:hover { background: ${docsTheme.hover}; color: ${docsTheme.text2}; }
`;

const AddViewWrap = styled.div`
  position: relative;
`;

const AddViewBtn = styled.button`
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${docsTheme.faint};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  height: 36px;
  &:hover { color: ${docsTheme.text2}; }
`;

const AddViewMenu = styled.div`
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  z-index: 40;
  min-width: 140px;
  background: ${docsTheme.surface};
  border: 1px solid ${docsTheme.border};
  border-radius: 10px;
  box-shadow: ${docsTheme.shadow};
  padding: 5px;
`;

const AddViewMenuItem = styled.button`
  width: 100%;
  appearance: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  color: ${docsTheme.text};
  background: transparent;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 7px;
  text-align: left;
  &:hover { background: ${docsTheme.hover}; }
`;

const AddViewEmpty = styled.div`
  padding: 8px;
  font-size: 12px;
  color: ${docsTheme.muted};
  text-align: center;
`;

const Spacer = styled.div`
  margin-left: auto;
`;

const FilterBtn = styled.button<{ $active?: boolean }>`
  position: relative;
  appearance: none;
  border: none;
  cursor: pointer;
  color: ${({ $active }) => ($active ? docsTheme.accent : docsTheme.muted)};
  background: ${({ $active }) => ($active ? `${docsTheme.accent}14` : 'transparent')};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border-radius: 8px;
  margin-bottom: 6px;
  &:hover { background: ${docsTheme.hover}; color: ${docsTheme.text2}; }
`;

const FilterCountBadge = styled.span`
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

const GroupWrap = styled.div`
  position: relative;
`;

const SettingsWrap = styled.div`
  position: relative;
`;

const SettingsRow = styled.button`
  width: 100%;
  appearance: none;
  border: none;
  cursor: pointer;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  line-height: 1.4;
  color: ${docsTheme.text};
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 7px 8px;
  border-radius: 7px;
  text-align: left;
  & > svg { flex-shrink: 0; color: ${docsTheme.muted}; }
  &:hover { background: ${docsTheme.hover}; }
`;

const SettingsRowLabel = styled.span`
  flex: 1;
  font-weight: 400;
`;

const SettingsRowValue = styled.span`
  font-size: 11.5px;
  color: ${docsTheme.muted};
`;

const SettingsRowIconLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const SettingsPanelHead = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 4px 6px;
`;

const SettingsBackBtn = styled.button`
  appearance: none;
  border: none;
  cursor: pointer;
  background: transparent;
  color: ${docsTheme.muted};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  &:hover { background: ${docsTheme.hover}; color: ${docsTheme.text2}; }
`;

const SettingsPanelTitle = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: ${docsTheme.muted};
`;

const PropList = styled.div`
  max-height: 260px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const propSkeleton = keyframes`
  0% { transform: translateX(-120%); }
  100% { transform: translateX(220%); }
`;

const propPlaceholderIn = keyframes`
  from { height: 0; opacity: 0; transform: scale(.96); }
  to { height: 32px; opacity: 1; transform: scale(1); }
`;

const PropDropPlaceholder = styled.div`
  position: relative;
  height: 32px;
  margin: 2px 4px;
  overflow: hidden;
  border: 1px dashed ${docsTheme.accent};
  border-radius: 7px;
  background: ${docsTheme.accentSoft};
  animation: ${propPlaceholderIn} 120ms ease-out both;

  &::before {
    content: '';
    position: absolute;
    inset: 7px 28px 7px 10px;
    border-radius: 5px;
    background: ${docsTheme.borderSoft};
  }

  & > span {
    position: absolute;
    top: 7px;
    bottom: 7px;
    width: 45%;
    border-radius: 5px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .72), transparent);
    animation: ${propSkeleton} 1.05s ease-in-out infinite;
  }
`;

const PropRow = styled.div<{ $dragging: boolean }>`
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 8px;
  border-radius: 7px;
  cursor: grab;
  opacity: ${({ $dragging }) => ($dragging ? 0.48 : 1)};
  filter: ${({ $dragging }) => ($dragging ? 'blur(1.5px)' : 'none')};
  transform: ${({ $dragging }) => ($dragging ? 'scale(.97)' : 'scale(1)')};
  background: ${({ $dragging }) => ($dragging ? docsTheme.surfaceSoft : 'transparent')};
  transition: opacity 120ms ease, filter 120ms ease, background 120ms ease, transform 120ms ease;

  ${({ $dragging }) => $dragging && css`
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      width: 45%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .7), transparent);
      animation: ${propSkeleton} 1.05s ease-in-out infinite;
      pointer-events: none;
    }
  `}

  &:active { cursor: grabbing; }
  &:hover { background: ${docsTheme.hover}; }
`;

const PropLabel = styled.span<{ $dim?: boolean }>`
  flex: 1;
  font-size: 12.5px;
  color: ${({ $dim }) => ($dim ? docsTheme.faint : docsTheme.text)};
`;

const PropEyeBtn = styled.button`
  appearance: none;
  border: none;
  cursor: pointer;
  background: transparent;
  color: ${docsTheme.muted};
  display: flex;
  align-items: center;
  &:hover { color: ${docsTheme.accent}; }
`;

const HiddenGroupsWrap = styled.div`
  position: relative;
`;

const HiddenGroupItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 7px;
  font-size: 12.5px;
  color: ${docsTheme.text};
  &:hover { background: ${docsTheme.hover}; }
`;

const HiddenGroupShowBtn = styled.button`
  flex: 0 0 auto;
  appearance: none;
  border: none;
  cursor: pointer;
  background: transparent;
  color: ${docsTheme.muted};
  display: flex;
  align-items: center;
  &:hover { color: ${docsTheme.accent}; }
`;

const GroupMenu = styled.div`
  position: absolute;
  top: calc(100% + 2px);
  right: 0;
  z-index: 40;
  min-width: 120px;
  background: ${docsTheme.surface};
  border: 1px solid ${docsTheme.border};
  border-radius: 12px;
  box-shadow: ${docsTheme.shadow};
  padding: 6px;
`;

const GroupMenuItem = styled.button<{ $active: boolean }>`
  width: 100%;
  appearance: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  text-align: left;
  padding: 6px 8px;
  border-radius: 7px;
  color: ${({ $active }) => ($active ? docsTheme.accent : docsTheme.text)};
  font-weight: ${({ $active }) => ($active ? 700 : 400)};
  background: transparent;
  &:hover { background: ${docsTheme.hover}; }
`;

const NewBtnGroup = styled.div`
  position: relative;
  display: inline-flex;
  align-items: stretch;
  margin-bottom: 6px;
  margin-left: 8px;
`;

const NewBtn = styled.button`
  appearance: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: ${docsTheme.accent};
  border-radius: 8px 0 0 8px;
  padding: 8px 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const NewBtnCaret = styled.button`
  appearance: none;
  border: none;
  border-left: 1px solid rgba(255, 255, 255, .3);
  cursor: pointer;
  color: #fff;
  background: ${docsTheme.accent};
  border-radius: 0 8px 8px 0;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  &:hover { opacity: .92; }
`;

const OverflowTag = styled.span`
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 600;
  color: ${docsTheme.muted};
  white-space: nowrap;
`;

const GridBox = styled.div`
  border: 1px solid ${docsTheme.border};
  border-radius: 12px;
  overflow: hidden;
  background: ${docsTheme.surface};
`;

const GridHead = styled.div`
  display: flex;
  background: ${docsTheme.surfaceSoft};
  border-bottom: 1px solid ${docsTheme.border};
  font-size: 12px;
  font-weight: 600;
  color: ${docsTheme.muted};
  white-space: nowrap;
`;

const HeadCell = styled.div`
  padding: 11px 14px;
  border-left: 1px solid ${docsTheme.hairline};
  cursor: pointer;
  display: flex;
  align-items: center;
  &:first-child { border-left: none; }
  &:hover { color: ${docsTheme.text2}; }
`;

const SortOrder = styled.span`
  margin-left: 3px;
  font-size: 9px;
  font-weight: 800;
  color: ${docsTheme.accent};
`;

const GridRow = styled.div`
  display: flex;
  border-bottom: 1px solid ${docsTheme.hairline};
  font-size: 13.5px;
  &:hover { background: ${docsTheme.surfaceSoft}; }
`;

const GroupSection = styled.div`
  & + & { border-top: 1px solid ${docsTheme.border}; }
`;

const GroupHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  background: ${docsTheme.surfaceSoft};
  border-bottom: 1px solid ${docsTheme.hairline};
`;

const GroupCount = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${docsTheme.muted};
`;

const Cell = styled.div`
  padding: 8px 14px;
  border-left: 1px solid ${docsTheme.hairline};
  display: flex;
  align-items: center;
  cursor: pointer;
  &:first-child { border-left: none; cursor: default; }
  &:hover { background: ${docsTheme.hover}; }
`;

const TitleCellDiv = styled.span`
  flex: 1;
  min-width: 0;
  outline: none;
  font-weight: 500;
  color: ${docsTheme.text};
`;

const AddRowBtn = styled.button`
  width: 100%;
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  font-size: 13.5px;
  color: ${docsTheme.muted};
  padding: 12px 16px;
  &:hover { background: ${docsTheme.surfaceSoft}; }
`;

const Footer = styled.div`
  display: flex;
  gap: 18px;
  padding: 9px 16px;
  border-top: 1px solid ${docsTheme.border};
  background: ${docsTheme.surfaceSoft};
  font-size: 12px;
  color: ${docsTheme.muted};
  b { font-family: 'Sora', sans-serif; font-weight: 700; color: ${docsTheme.text2}; }
`;

const BoardWrap = styled.div`
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 12px;
  align-items: flex-start;
  ${thinScrollbar}
`;

const Column = styled.div`
  flex: 0 0 288px;
  width: 288px;
`;

const ColHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 11px;
  padding: 0 4px;
`;

const ColAddBtn = styled.button`
  margin-left: auto;
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${docsTheme.muted};
  font-size: 15px;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  &:hover { background: ${docsTheme.hover}; }
`;

const ColMoreBtn = styled.button`
  appearance: none;
  border: none;
  cursor: pointer;
  background: transparent;
  color: ${docsTheme.faint};
  width: 22px;
  height: 22px;
  border-radius: 6px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { background: ${docsTheme.hover}; color: ${docsTheme.text2}; }
`;

const ColSettingsMenu = styled.div`
  position: fixed;
  z-index: 63;
  width: 176px;
  background: ${docsTheme.surface};
  border: 1px solid ${docsTheme.border};
  border-radius: ${docsTheme.radius.ctl};
  box-shadow: ${docsTheme.shadow};
  padding: 6px;
  cursor: default;
`;

const ColSettingsBtn = styled.button<{ $danger?: boolean }>`
  width: 100%;
  appearance: none;
  border: none;
  cursor: pointer;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  color: ${({ $danger }) => ($danger ? docsTheme.danger : docsTheme.text)};
  border-radius: 7px;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  &:hover { background: ${docsTheme.hover}; }
`;

const ColSettingsDivider = styled.div`
  height: 1px;
  background: ${docsTheme.hairline};
  margin: 5px 2px;
`;

const ColSettingsLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${docsTheme.faint};
  padding: 3px 8px;
`;

const ColColorScroll = styled.div`
  max-height: 220px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const ColColorRow = styled.button`
  width: 100%;
  appearance: none;
  border: none;
  cursor: pointer;
  background: transparent;
  border-radius: 7px;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12.5px;
  color: ${docsTheme.text};
  text-align: left;
  &:hover { background: ${docsTheme.hover}; }
`;

const ColColorSwatch = styled.span`
  flex: 0 0 auto;
  width: 15px;
  height: 15px;
  border-radius: 5px;
`;

const ColColorCheck = styled.span`
  margin-left: auto;
  color: ${docsTheme.accent};
  font-size: 12px;
`;

const ColRenameInput = styled.input`
  box-sizing: border-box;
  flex: 1;
  min-width: 0;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: ${docsTheme.text};
  background: ${docsTheme.surfaceSoft};
  border: 1px solid ${docsTheme.border};
  border-radius: 7px;
  padding: 3px 7px;
  outline: none;
  &:focus { border-color: ${docsTheme.accent}; }
`;

const NewCardInput = styled.input`
  box-sizing: border-box;
  width: 100%;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: ${docsTheme.text};
  background: ${docsTheme.surface};
  border: 1.5px solid ${docsTheme.accent};
  border-radius: 10px;
  padding: 9px;
  outline: none;
`;

const ColBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 9px;
  min-height: 40px;
`;

const BoardCard = styled.div`
  position: relative;
  background: ${docsTheme.surface};
  border: 1px solid ${docsTheme.border};
  border-radius: 11px;
  padding: 13px 14px;
  cursor: grab;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .04);
  &:hover { border-color: ${docsTheme.borderStrong}; box-shadow: ${docsTheme.shadow}; }
`;

const cardPlaceholderIn = keyframes`
  from { height: 0; opacity: 0; transform: scaleY(.9); }
  to { height: 64px; opacity: 1; transform: scaleY(1); }
`;

const cardPlaceholderShimmer = keyframes`
  0% { transform: translateX(-120%); }
  100% { transform: translateX(220%); }
`;

const CardDropPlaceholder = styled.div`
  position: relative;
  height: 64px;
  overflow: hidden;
  border: 1.5px dashed ${docsTheme.accent};
  border-radius: 11px;
  background: ${docsTheme.accentSoft};
  animation: ${cardPlaceholderIn} 140ms ease-out both;
  transform-origin: top;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    width: 45%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .7), transparent);
    animation: ${cardPlaceholderShimmer} 1.05s ease-in-out infinite;
    pointer-events: none;
  }
`;

const CardTitle = styled.div`
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 9px;
`;

const CardProperties = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CardProperty = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
`;

const CardPropertyLabel = styled.span`
  flex: 0 0 auto;
  font-size: 10.5px;
  font-weight: 700;
  color: ${docsTheme.faint};
`;

const CardPropertyValue = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${docsTheme.text2};
  font-size: 11.5px;
  white-space: nowrap;
`;

const CardPriority = styled.span`
  font-size: 11.5px;
  font-weight: 700;
`;

const CardProgress = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
`;

const CardProgressTrack = styled.div`
  flex: 1;
  height: 4px;
  overflow: hidden;
  border-radius: 4px;
  background: ${docsTheme.borderSoft};
`;

const CardProgressFill = styled.div`
  height: 100%;
  border-radius: inherit;
  background: ${docsTheme.accent};
`;

const CardProgressPct = styled.span`
  flex: 0 0 auto;
  min-width: 30px;
  color: ${docsTheme.muted};
  font-size: 10.5px;
  text-align: right;
`;

const AddCardBtn = styled.button`
  appearance: none;
  border: 1px dashed ${docsTheme.border};
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  color: ${docsTheme.muted};
  padding: 9px;
  border-radius: 10px;
  &:hover { background: ${docsTheme.surfaceSoft}; color: ${docsTheme.text2}; }
`;

const NewColumn = styled.div`
  flex: 0 0 240px;
  width: 240px;
`;

const NewColumnBtn = styled.button`
  width: 100%;
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: ${docsTheme.muted};
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 4px;
  border-radius: 8px;
  &:hover { background: ${docsTheme.hover}; color: ${docsTheme.text2}; }
`;

const NewGroupForm = styled.form`
  padding: 0 4px;
`;

const NewGroupInput = styled.input`
  box-sizing: border-box;
  width: 100%;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: ${docsTheme.text};
  background: ${docsTheme.surfaceSoft};
  border: 1.5px solid ${docsTheme.accent};
  border-radius: 8px;
  padding: 7px 9px;
  outline: none;
`;

const GalleryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(232px, 1fr));
  gap: 16px;
`;

const GalleryCard = styled.div`
  background: ${docsTheme.surface};
  border: 1px solid ${docsTheme.border};
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.14s, box-shadow 0.14s;
  &:hover { transform: translateY(-3px); box-shadow: ${docsTheme.shadow}; }
`;

const GalleryCover = styled.div`
  height: 112px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
`;

const GalleryBody = styled.div`
  padding: 14px 15px 16px;
`;

const CalBox = styled.div`
  border: 1px solid ${docsTheme.border};
  border-radius: 12px;
  overflow: hidden;
  background: ${docsTheme.surface};
`;

const CalHead = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid ${docsTheme.border};
`;

const CalWeekdays = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: ${docsTheme.surfaceSoft};
  border-bottom: 1px solid ${docsTheme.border};
`;

const CalWeekday = styled.div`
  padding: 8px 10px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${docsTheme.muted};
  text-align: center;
`;

const CalGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
`;

const CalCell = styled.div<{ $inMonth: boolean }>`
  min-height: 96px;
  padding: 7px 8px;
  border-right: 1px solid ${docsTheme.hairline};
  border-bottom: 1px solid ${docsTheme.hairline};
  background: ${({ $inMonth }) => ($inMonth ? 'transparent' : docsTheme.surfaceSoft)};
`;

const CalNum = styled.div<{ $today: boolean; $inMonth: boolean }>`
  font-size: 12px;
  font-weight: 600;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${({ $today }) => ($today ? docsTheme.accent : 'transparent')};
  color: ${({ $today, $inMonth }) => ($today ? '#fff' : $inMonth ? docsTheme.text2 : docsTheme.faint)};
`;

const CalItems = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
`;

const CalPill = styled.div`
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 5px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: grab;
`;
