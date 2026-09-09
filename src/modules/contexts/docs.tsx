/**
 * Lyra Docs Context — 사이드바 트리 / 문서 블록 / 데이터베이스 / 클라우드 동기화 상태.
 * Source: design_handoff_lyra_docs/designs/Lyra Docs.dc.html
 *
 * 원본 목업은 리듀서 없이 `this.setState(s => 계산된 부분상태)` 패턴만 사용한다.
 * 이 구조를 최대한 그대로 옮기기 위해:
 *  - 리듀서는 `PATCH`(얕은 병합) 하나만 두고 Immer로 불변성을 보장한다.
 *  - 실제 계산 로직(원본의 각 클래스 메서드)은 이 Provider 안의 핸들러 함수들이 담당하며,
 *    렌더마다 최신 `state`를 클로저로 참조한다 (원본의 `this.state` 접근과 동일한 타이밍).
 *  - 블록 본문 텍스트(및 표 셀 텍스트)는 리듀서 state가 아닌 `textRef`(원본의 `this._text`)에
 *    보관한다 — 키 입력마다 리렌더되면 contentEditable 커서가 유실되기 때문.
 *  - 블록/페이지 id 발급(`this._uid++`)도 `uidRef`로 관리한다.
 */
import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef,
} from 'react';
import { produce } from 'immer';
import { deleteMedia, getMedia, putMedia } from 'lib/utils/docsMediaStore';
import {
  isDocsRowDraftUnchanged, type DocsRowDraftSnapshot,
} from 'lib/utils/docsBoardGroups';
import {
  docsStorageController, isDocsFileStorageAvailable,
  type DocsStorageMeta, type DocsPageFile,
} from 'controllers/docsStorage';
import initialState, { DOCS_INITIAL_TEXT, getInitialUid } from 'modules/states/docs';
import * as actions from 'modules/actions/docs';
import {
  DOCS_BUILTIN_PROPERTY_KEYS, DOCS_DEFAULT_PROPERTY_KEYS,
  type DocsBlock, type DocsBlockType, type DocsCellEditorState, type DocsCustomFieldValue, type DocsDbFieldDef,
  type DocsDbFieldType,
  type DocsDbFilter, type DocsDbRow, type DocsDbSort, type DocsDbState, type DocsDbTagOption, type DocsDbTemplate,
  type DocsDbView,
  type DocsJiraIssue, type DocsPage,
  type DocsPageType, type DocsPaletteResult, type DocsPasteMenuState, type DocsPersistedShape, type DocsSpace,
  type DocsState, type DocsTrashEntry,
} from 'types/docs';

const STORAGE_KEY = 'lyraDocs.v1';
const CLOUD_STORAGE_KEY = 'lyraDocs.cloud';
const PERSIST_DEBOUNCE_MS = 450;
const CLOUD_DEBOUNCE_MS = 1500;

/*
	Reducer
*/
export const reducer = (state: DocsState, action: actions.ActionType): DocsState => {
  switch (action.type) {
    case actions.PATCH:
      return produce(state, (draft) => {
        Object.assign(draft, action.payload);
      });
    case actions.RESET:
      return action.payload;
    default:
      return state;
  }
};

/*
	localStorage 로드 (constructor와 동일 타이밍 — lazy init)
*/
/**
 * 과거 스키마로 저장된 db(로컬스토리지/클라우드)를 로드할 때, 이후 추가된 필드가
 * 누락되어 있어도 런타임 에러 없이 동작하도록 기본값을 채워 넣는다.
 */
export const normalizeDb = (db: Record<string, DocsDbState> | undefined): Record<string, DocsDbState> => {
  const out: Record<string, DocsDbState> = {};
  Object.entries(db || {}).forEach(([id, raw]) => {
    const customFields = raw.customFields || [];
    const knownKeys = [...DOCS_BUILTIN_PROPERTY_KEYS, ...customFields.map((f) => f.id)];
    const existingOrder = (raw.propertyOrder || []).filter((k) => knownKeys.includes(k));
    const legacyDefaultOrder = existingOrder.length >= DOCS_BUILTIN_PROPERTY_KEYS.length
      && DOCS_BUILTIN_PROPERTY_KEYS.every((key, index) => existingOrder[index] === key);
    const detailOrder = legacyDefaultOrder
      ? [
        ...DOCS_DEFAULT_PROPERTY_KEYS,
        ...existingOrder.filter((key) => !DOCS_BUILTIN_PROPERTY_KEYS.includes(key as typeof DOCS_BUILTIN_PROPERTY_KEYS[number])),
      ]
      : (existingOrder.length ? existingOrder : [...DOCS_DEFAULT_PROPERTY_KEYS]);
    const customKeys = customFields.map((f) => f.id);
    const propertyOrder = [...detailOrder, ...customKeys.filter((key) => !detailOrder.includes(key))];
    const savedBoardOrder = (raw.boardPropertyOrder || []).filter((key) => knownKeys.includes(key));
    const initialBoardOrder = savedBoardOrder.length ? savedBoardOrder : [...DOCS_DEFAULT_PROPERTY_KEYS];
    const boardPropertyOrder = [
      ...initialBoardOrder,
      ...customKeys.filter((key) => !initialBoardOrder.includes(key)),
    ];
    out[id] = {
      ...raw,
      boardExtraGroups: raw.boardExtraGroups || [],
      boardGroupOrder: raw.boardGroupOrder || [],
      boardGroupColors: raw.boardGroupColors || {},
      boardHiddenGroups: raw.boardHiddenGroups || [],
      customFields,
      tagOptions: raw.tagOptions || [],
      templates: (raw.templates || []).map((t) => ({ ...t, tags: t.tags || [] })),
      rows: (raw.rows || []).map((r) => ({ ...r, tags: r.tags || [] })),
      propertyOrder,
      hiddenProperties: raw.hiddenProperties || [],
      boardPropertyOrder,
      boardHiddenProperties: raw.boardHiddenProperties || [],
    };
  });
  return out;
};

const loadPersisted = (): { state: DocsState; text: Record<string, string>; uid: number } => {
  let loaded: DocsPersistedShape | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) loaded = JSON.parse(raw);
  } catch (e) { /* noop */ }

  if (loaded && loaded.state) {
    const mergedState = { ...initialState, ...loaded.state };
    return {
      state: { ...mergedState, db: normalizeDb(mergedState.db) },
      text: loaded.text || DOCS_INITIAL_TEXT,
      uid: loaded.uid || getInitialUid(),
    };
  }
  return { state: initialState, text: DOCS_INITIAL_TEXT, uid: getInitialUid() };
};

/*
	Context
*/
type MenuField = 'blockMenu' | 'mention' | 'fmtBar' | 'pageMenu' | 'cellEditor' | 'filterMenu' | 'pasteMenu' | 'slash'
  | 'mediaMenu' | 'fieldTypeMenu' | 'tagMenu';

export interface DocsContextValue {
  state: DocsState;

  // ── text store (uncontrolled block/cell content) ──
  getText: (id: string) => string;
  setText: (id: string, value: string) => void;
  nextId: (prefix: string) => string;

  // ── navigation ──
  openPage: (id: string) => void;
  toggleSidebar: () => void;
  toggleTree: (id: string) => void;
  toggleCollapse: (id: string) => void;
  toggleFav: (id: string) => void;

  // ── pages ──
  activePage: () => DocsPage | undefined;
  addPage: (parentId: string, type?: DocsPageType) => void;
  createSubpage: (parentId: string) => { id: string; blockId: string };
  duplicatePage: (id: string) => void;
  deletePage: (id: string) => void;
  requestDeletePage: (id: string) => void;
  cancelDeletePage: () => void;
  confirmDeletePage: () => void;
  renamePage: (id: string) => void;
  commitRename: (id: string, title: string) => void;
  cancelRename: () => void;
  setPageIcon: (id: string, icon: string) => void;
  onTitleInput: (title: string) => void;
  addCover: () => void;
  removeCover: () => void;
  exportMarkdown: (id?: string) => void;
  docToMarkdown: (id: string) => string;

  // ── trash ──
  openTrash: () => void;
  closeTrash: () => void;
  restoreTrash: (id: string) => void;
  purgeTrash: (id: string) => void;

  // ── menus ──
  openMenu: (key: MenuField, value: unknown) => void;
  closeMenu: (key: MenuField) => void;
  openPageMenu: (id: string, x: number, y: number) => void;
  openBlockMenu: (id: string, x: number, y: number) => void;
  openFilterMenu: (x: number, y: number) => void;
  openCellEditor: (rowId: string, field: DocsCellEditorState['field'], x: number, y: number) => void;
  openPasteMenu: (menu: DocsPasteMenuState) => void;

  // ── palette ──
  togglePalette: () => void;
  closePalette: () => void;
  setPaletteQuery: (q: string) => void;
  setPaletteActive: (a: number) => void;

  // ── blocks ──
  getBlocks: (pageId?: string) => DocsBlock[];
  openRowNote: (rowId: string) => string;
  closeRowNote: () => void;
  setBlocks: (updater: (blocks: DocsBlock[]) => DocsBlock[]) => void;
  addBelow: (id: string) => string;
  duplicateBlock: (id: string) => void;
  removeBlock: (id: string) => void;
  turnInto: (id: string, type: DocsBlockType) => void;
  setBlockMedia: (blockId: string, fields: { url?: string; mediaId?: string; title?: string }) => void;
  moveBlock: (src: string, target: string, after: boolean) => void;
  toggleCheck: (id: string) => void;
  ensureTrailing: (sid: string) => string;
  insertBlockAfter: (afterId: string, block: DocsBlock, text?: string) => void;
  replaceBlock: (id: string, block: DocsBlock) => void;

  // ── jira ──
  jiraType: (t: string) => { color: string; letter: string };
  hostOf: (u: string) => string;
  resolveIssueByKey: (k: string) => DocsJiraIssue | undefined;
  registerIssue: (issue: DocsJiraIssue) => DocsJiraIssue;
  setEmbedMode: (id: string, mode: 'card' | 'link') => void;

  // ── DOM refs (paste/mention chip 삽입용) ──
  setEl: (id: string, el: HTMLElement | null) => void;
  getEl: (id: string) => HTMLElement | undefined;
  insertChip: (blockId: string, html: string, range: Range | null) => void;
  insertTextAt: (range: Range | null, text: string) => void;
  insertEmbedAfter: (blockId: string, mode: 'card' | 'link', issue: DocsJiraIssue) => void;
  onBlockPaste: (blockId: string, e: React.ClipboardEvent) => void;
  choosePaste: (mode: 'inline' | 'card' | 'link' | 'text') => void;
  focusBlock: (id: string, atEnd: boolean) => void;
  applyCmd: (cmdId: string) => void;
  applyFmt: (kind: 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'mark' | 'clear') => void;
  applyColor: (kind: 'text' | 'bg', color: string | null) => void;
  applySize: (size: 'sm' | 'base' | 'lg') => void;
  applyLink: (url: string) => void;
  getActiveBlockId: () => string | null;
  setBlockAlign: (id: string, align: 'left' | 'center' | 'right') => void;
  addComment: (blockId: string, text: string) => void;
  removeComment: (blockId: string, commentId: string) => void;
  openMention: (id: string, query: string, el: HTMLElement) => void;
  chooseMention: (pageId: string) => void;

  // ── mention ──
  filteredPages: (q: string) => DocsPage[];
  paletteResults: (q: string) => DocsPaletteResult[];

  // ── db ──
  setDbView: (v: DocsState['dbView'][string]) => void;
  setSort: (field: DocsDbSort['field']) => void;
  clearSort: () => void;
  addFilter: (field: DocsDbFilter['field']) => void;
  updateFilter: (id: string, changes: Partial<Omit<DocsDbFilter, 'id'>>) => void;
  removeFilter: (id: string) => void;
  setGroupBy: (groupBy: DocsDbFilter['field'] | null) => void;
  addDbView: (type: DocsDbView) => void;
  removeDbView: (type: DocsDbView) => void;
  addBoardGroup: (name: string) => void;
  removeBoardGroup: (name: string) => void;
  setBoardGroupOrder: (order: string[]) => void;
  setBoardGroupColor: (key: string, color: string | null) => void;
  renameBoardGroup: (oldKey: string, newKey: string) => void;
  deleteBoardGroup: (key: string) => void;
  toggleBoardGroupHidden: (key: string) => void;
  openRowDetail: (rowId: string) => void;
  closeRowDetail: () => void;
  setCell: (rowId: string, field: 'status' | 'assignee' | 'priority' | 'due', val: string) => void;
  setCellTitle: (rowId: string, title: string) => void;
  setRowNote: (rowId: string, note: string) => void;
  addChecklistItem: (rowId: string, text: string) => void;
  toggleChecklistItem: (rowId: string, itemId: string) => void;
  removeChecklistItem: (rowId: string, itemId: string) => void;
  toggleChecklistHideDone: (rowId: string) => void;
  addRow: (title?: string, templateId?: string) => string;
  addTemplate: () => void;
  updateTemplate: (id: string, fields: Partial<Omit<DocsDbTemplate, 'id' | 'checklist'>>) => void;
  addTemplateChecklistItem: (id: string, text: string) => void;
  toggleTemplateChecklistItem: (id: string, itemId: string) => void;
  removeTemplateChecklistItem: (id: string, itemId: string) => void;
  removeTemplate: (id: string) => void;
  reorderTemplates: (order: string[]) => void;
  openTemplateEditor: (id: string) => void;
  closeTemplateEditor: () => void;
  ensureTagOption: (label: string) => string;
  updateTagOption: (id: string, fields: Partial<Pick<DocsDbTagOption, 'label' | 'color'>>) => void;
  removeTagOption: (id: string) => void;
  reorderTagOptions: (order: string[]) => void;
  toggleRowTag: (rowId: string, tagId: string) => void;
  clearRowTags: (rowId: string) => void;
  toggleTemplateTag: (templateId: string, tagId: string) => void;
  addCustomField: (type: DocsDbFieldType, name: string) => string;
  updateCustomFieldDef: (id: string, fields: Partial<Omit<DocsDbFieldDef, 'id'>>) => void;
  removeCustomField: (id: string) => void;
  reorderProperties: (order: string[]) => void;
  togglePropertyVisibility: (key: string) => void;
  addFieldOption: (fieldId: string, label: string) => string;
  setRowCustomValue: (rowId: string, fieldId: string, value: DocsCustomFieldValue) => void;
  setTemplateCustomValue: (templateId: string, fieldId: string, value: DocsCustomFieldValue) => void;
  removeRow: (rowId: string) => void;

  // ── cloud ──
  openCloud: () => void;
  closeCloud: () => void;
  setCloudField: (k: 'url' | 'key' | 'table' | 'wsId', v: string) => void;
  toggleAuto: () => void;
  cloudTest: () => Promise<void>;
  cloudSave: (silent?: boolean) => Promise<void>;
  cloudLoad: () => Promise<void>;

  // ── local file storage ──
  isFileStorageAvailable: boolean;
  openStorage: () => void;
  closeStorage: () => void;
  chooseStorageFolder: () => Promise<void>;
  resetStorageFolder: () => Promise<void>;
  openStorageFolder: () => void;

  // ── persistence ──
  schedulePersist: () => void;
}

const noop = () => {};
const noopAsync = async () => {};

export const docsContext = createContext<DocsContextValue>({
  state: initialState,
  getText: () => '', setText: noop, nextId: () => '',
  openPage: noop, toggleSidebar: noop, toggleTree: noop, toggleCollapse: noop, toggleFav: noop,
  activePage: () => undefined, addPage: noop, createSubpage: () => ({ id: '', blockId: '' }),
  duplicatePage: noop, deletePage: noop, requestDeletePage: noop, cancelDeletePage: noop, confirmDeletePage: noop,
  renamePage: noop, commitRename: noop, cancelRename: noop,
  setPageIcon: noop, onTitleInput: noop, addCover: noop, removeCover: noop,
  exportMarkdown: noop, docToMarkdown: () => '',
  openTrash: noop, closeTrash: noop, restoreTrash: noop, purgeTrash: noop,
  openMenu: noop, closeMenu: noop, openPageMenu: noop, openBlockMenu: noop, openFilterMenu: noop,
  openCellEditor: noop, openPasteMenu: noop,
  togglePalette: noop, closePalette: noop, setPaletteQuery: noop, setPaletteActive: noop,
  getBlocks: () => [], openRowNote: () => '', closeRowNote: noop,
  setBlocks: noop, addBelow: () => '', duplicateBlock: noop, removeBlock: noop,
  turnInto: noop, setBlockMedia: noop, moveBlock: noop, toggleCheck: noop, ensureTrailing: () => '', insertBlockAfter: noop,
  replaceBlock: noop,
  jiraType: () => ({ color: '#8c8582', letter: '•' }), hostOf: () => '', resolveIssueByKey: () => undefined,
  registerIssue: (i) => i, setEmbedMode: noop,
  setEl: noop, getEl: () => undefined, insertChip: noop, insertTextAt: noop, insertEmbedAfter: noop,
  onBlockPaste: noop, choosePaste: noop,
  focusBlock: noop, applyCmd: noop, applyFmt: noop, applyColor: noop, applySize: noop, applyLink: noop,
  getActiveBlockId: () => null, setBlockAlign: noop, addComment: noop, removeComment: noop,
  openMention: noop, chooseMention: noop,
  filteredPages: () => [], paletteResults: () => [],
  setDbView: noop, setSort: noop, clearSort: noop, addFilter: noop, updateFilter: noop, removeFilter: noop,
  setGroupBy: noop, addDbView: noop, removeDbView: noop, addBoardGroup: noop, removeBoardGroup: noop,
  setBoardGroupOrder: noop, setBoardGroupColor: noop,
  renameBoardGroup: noop, deleteBoardGroup: noop, toggleBoardGroupHidden: noop,
  openRowDetail: noop, closeRowDetail: noop, setCell: noop, setCellTitle: noop, addRow: () => '', removeRow: noop,
  addTemplate: noop, updateTemplate: noop, addTemplateChecklistItem: noop, toggleTemplateChecklistItem: noop,
  removeTemplateChecklistItem: noop, removeTemplate: noop, reorderTemplates: noop,
  openTemplateEditor: noop, closeTemplateEditor: noop,
  ensureTagOption: () => '', updateTagOption: noop, removeTagOption: noop, reorderTagOptions: noop,
  toggleRowTag: noop, clearRowTags: noop, toggleTemplateTag: noop,
  addCustomField: () => '', updateCustomFieldDef: noop, removeCustomField: noop, addFieldOption: () => '',
  reorderProperties: noop, togglePropertyVisibility: noop,
  setRowCustomValue: noop, setTemplateCustomValue: noop,
  setRowNote: noop, addChecklistItem: noop, toggleChecklistItem: noop, removeChecklistItem: noop,
  toggleChecklistHideDone: noop,
  openCloud: noop, closeCloud: noop, setCloudField: noop, toggleAuto: noop,
  cloudTest: noopAsync, cloudSave: noopAsync, cloudLoad: noopAsync,
  isFileStorageAvailable: false,
  openStorage: noop, closeStorage: noop,
  chooseStorageFolder: noopAsync, resetStorageFolder: noopAsync, openStorageFolder: noop,
  schedulePersist: noop,
});

export const useDocs = () => useContext(docsContext);

const insertAfter = (arr: string[], id: string, nid: string) => {
  const i = arr.indexOf(id);
  if (i < 0) return [...arr, nid];
  return [...arr.slice(0, i + 1), nid, ...arr.slice(i + 1)];
};

const DocsProvider = ({ children }: { children: React.ReactNode }) => {
  const loadedRef = useRef(loadPersisted());
  const [state, dispatch] = useReducer(reducer, loadedRef.current.state);

  const textRef = useRef<Record<string, string>>(loadedRef.current.text);
  const uidRef = useRef<number>(loadedRef.current.uid);
  const extIssuesRef = useRef<Record<string, DocsJiraIssue>>({});
  const persistTimer = useRef<ReturnType<typeof setTimeout>>();
  const cloudTimer = useRef<ReturnType<typeof setTimeout>>();
  /** 일반 문서 대신 카드 메모 블록을 편집할 때 사용하는 가상 문서 scope */
  const blockScopeRef = useRef<string | null>(null);
  /** 새 카드 상세를 입력 없이 닫았을 때 임시 행을 제거하기 위한 생성 직후 스냅샷 */
  const pendingNewRowsRef = useRef<Set<string>>(new Set());
  const rowDraftSnapshotsRef = useRef<Map<string, DocsRowDraftSnapshot>>(new Map());
  /** 마지막으로 파일에 기록된 페이지 id 목록 — 삭제된 페이지 파일 정리에 사용 (null = 아직 파일 저장소에서 읽지 않음) */
  const filePersistedIdsRef = useRef<Set<string> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // stateRef를 dispatch와 별개로 즉시 동기화한다.
  // React의 useReducer는 다음 렌더까지 stateRef를 갱신하지 않으므로,
  // 같은 이벤트 핸들러 안에서 patch()를 연속 호출하면(예: addBelow 뒤 타입 변경)
  // 두 번째 호출이 stale stateRef를 기준으로 계산되어 첫 번째 변경을 덮어써버린다.
  // 원본 목업의 동기적 this.setState(patch) 타이밍을 그대로 재현하기 위해 즉시 반영한다.
  const patch = useCallback((p: Partial<DocsState>) => {
    stateRef.current = produce(stateRef.current, (draft) => { Object.assign(draft, p); });
    dispatch(actions.patch(p));
  }, []);

  const nextId = useCallback((prefix: string) => `${prefix}${uidRef.current++}`, []);
  const getText = useCallback((id: string) => textRef.current[id] || '', []);
  const setText = useCallback((id: string, value: string) => { textRef.current[id] = value; }, []);

  // ── 영속화 ──
  const serialize = useCallback((): DocsPersistedShape => {
    const s = stateRef.current;
    return {
      state: {
        sidebarOpen: s.sidebarOpen, activeId: s.activeId, dbView: s.dbView, collapsed: s.collapsed,
        treeOpen: s.treeOpen, favorites: s.favorites, recentIds: s.recentIds, spaces: s.spaces, pagesById: s.pagesById,
        docs: s.docs, db: s.db, trash: s.trash, comments: s.comments,
      },
      text: textRef.current,
      uid: uidRef.current,
    };
  }, []);

  /** 현재 상태 전체를 파일 저장소(meta.json + 페이지별 파일)에 기록하고, 더 이상 존재하지 않는 페이지 파일을 정리한다. */
  const persistToFile = useCallback(async () => {
    const s = stateRef.current;
    const meta: DocsStorageMeta = {
      sidebarOpen: s.sidebarOpen, activeId: s.activeId, dbView: s.dbView, collapsed: s.collapsed,
      treeOpen: s.treeOpen, favorites: s.favorites, recentIds: s.recentIds, spaces: s.spaces,
      pagesById: s.pagesById, trash: s.trash, comments: s.comments, text: textRef.current, uid: uidRef.current,
    };
    const pageIds = new Set([...Object.keys(s.docs), ...Object.keys(s.db)]);
    await docsStorageController.saveMeta(meta);
    await Promise.all([...pageIds].map((id) => {
      const page: DocsPageFile = { blocks: s.docs[id] || [], db: s.db[id] };
      return docsStorageController.savePage(id, page);
    }));
    const prevIds = filePersistedIdsRef.current;
    if (prevIds) {
      const removed = [...prevIds].filter((id) => !pageIds.has(id));
      await Promise.all(removed.map((id) => docsStorageController.deletePage(id)));
    }
    filePersistedIdsRef.current = pageIds;
  }, []);

  /** 파일 저장소에서 meta.json + 페이지 파일을 읽어 상태를 교체한다. 저장된 데이터가 없으면 false를 반환. */
  const hydrateFromFile = useCallback(async (): Promise<boolean> => {
    const loaded = await docsStorageController.loadAll();
    if (!loaded) { filePersistedIdsRef.current = new Set(); return false; }
    const { meta, pages } = loaded;
    const docs: Record<string, DocsBlock[]> = {};
    const db: Record<string, DocsDbState> = {};
    Object.entries(pages).forEach(([id, pf]) => {
      docs[id] = pf.blocks;
      if (pf.db) db[id] = pf.db;
    });
    textRef.current = meta.text || {};
    uidRef.current = meta.uid || getInitialUid();
    filePersistedIdsRef.current = new Set(Object.keys(pages));
    const nextState: DocsState = {
      ...stateRef.current,
      sidebarOpen: meta.sidebarOpen, activeId: meta.activeId, dbView: meta.dbView, collapsed: meta.collapsed,
      treeOpen: meta.treeOpen, favorites: meta.favorites, recentIds: meta.recentIds, spaces: meta.spaces,
      pagesById: meta.pagesById, docs, db: normalizeDb(db), trash: meta.trash, comments: meta.comments,
    };
    stateRef.current = nextState;
    dispatch(actions.reset(nextState));
    return true;
  }, []);

  const persist = useCallback(() => {
    if (isDocsFileStorageAvailable()) { persistToFile().catch(() => {}); return; }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize())); } catch (e) { /* noop */ }
  }, [serialize, persistToFile]);

  // 최초 마운트 시 파일 저장소에서 데이터를 읽어온다. 파일 저장소가 비어 있으면(최초 실행)
  // localStorage에서 lazy-init된 기존 데이터를 파일 저장소로 1회 마이그레이션한다.
  useEffect(() => {
    if (!isDocsFileStorageAvailable()) return;
    let cancelled = false;
    (async () => {
      const ok = await hydrateFromFile();
      if (cancelled) return;
      if (!ok && Object.keys(stateRef.current.pagesById).length > 0) {
        await persistToFile();
      }
    })();
    return () => { cancelled = true; };
  }, [hydrateFromFile, persistToFile]);

  const cloudSaveRef = useRef<(silent?: boolean) => Promise<void>>();

  const schedulePersist = useCallback(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(persist, PERSIST_DEBOUNCE_MS);
    const c = stateRef.current.cloud;
    if (c.auto && c.connected) {
      if (cloudTimer.current) clearTimeout(cloudTimer.current);
      cloudTimer.current = setTimeout(() => cloudSaveRef.current?.(true), CLOUD_DEBOUNCE_MS);
    }
  }, [persist]);

  useEffect(() => () => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    if (cloudTimer.current) clearTimeout(cloudTimer.current);
  }, []);

  // 구조적 상태(state)가 바뀔 때마다 저장 예약 (원본 componentDidUpdate)
  useEffect(() => { schedulePersist(); }, [state, schedulePersist]);

  // ── navigation ──
  const openPage = useCallback((id: string) => {
    const s = stateRef.current;
    if (s.pagesById[id]?.type === 'folder') {
      patch({ treeOpen: { ...s.treeOpen, [id]: !s.treeOpen[id] } });
      return;
    }
    const recentIds = [id, ...s.recentIds.filter((x) => x !== id)].slice(0, 10);
    // 사이드바 트리에서 조상 폴더/스페이스를 모두 펼쳐 현재 위치가 항상 보이도록 한다
    const treeOpen = { ...s.treeOpen };
    let cur: string | null | undefined = s.pagesById[id]?.parentId;
    const seen: Record<string, boolean> = {};
    while (cur && !seen[cur]) {
      seen[cur] = true;
      treeOpen[cur] = true;
      cur = s.pagesById[cur]?.parentId;
    }
    patch({ activeId: id, slash: null, recentIds, treeOpen });
  }, [patch]);

  const toggleSidebar = useCallback(() => patch({ sidebarOpen: !stateRef.current.sidebarOpen }), [patch]);
  const toggleTree = useCallback((id: string) => {
    const s = stateRef.current;
    patch({ treeOpen: { ...s.treeOpen, [id]: !s.treeOpen[id] } });
  }, [patch]);
  const toggleCollapse = useCallback((id: string) => {
    const s = stateRef.current;
    patch({ collapsed: { ...s.collapsed, [id]: !s.collapsed[id] } });
  }, [patch]);
  const toggleFav = useCallback((id: string) => {
    const s = stateRef.current;
    patch({ favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id] });
  }, [patch]);

  // ── pages ──
  const activePage = useCallback(() => stateRef.current.pagesById[stateRef.current.activeId], []);

  const newPage = useCallback((parentId: string, type: DocsPageType = 'doc'): { id: string; blockId: string; page: DocsPage } => {
    const id = nextId('p');
    const blockId = nextId('b');
    textRef.current[blockId] = '';
    const page: DocsPage = { id, icon: '', title: '', type, parentId, children: [] };
    return { id, blockId, page };
  }, [nextId]);

  const addPage = useCallback((parentId: string, type: DocsPageType = 'doc') => {
    const np = newPage(parentId, type);
    const s = stateRef.current;
    const pagesById = { ...s.pagesById, [np.id]: np.page };
    let spaces = s.spaces;
    if (parentId.indexOf('sp_') === 0) {
      spaces = s.spaces.map((sp) => (sp.id === parentId ? { ...sp, children: [...sp.children, np.id] } : sp));
    } else if (pagesById[parentId]) {
      pagesById[parentId] = { ...pagesById[parentId], children: [...pagesById[parentId].children, np.id] };
    }
    patch({
      pagesById,
      spaces,
      treeOpen: { ...s.treeOpen, [parentId]: true, ...(type === 'folder' ? { [np.id]: true } : null) },
      docs: type === 'doc' ? { ...s.docs, [np.id]: [{ id: np.blockId, type: 'text' }] } : s.docs,
      db: type === 'db' ? {
        ...s.db,
        [np.id]: {
          sort: [], filter: [], groupBy: 'status', rows: [], seq: 1, views: ['board'], boardExtraGroups: [],
          boardGroupOrder: [], boardGroupColors: {}, boardHiddenGroups: [], templates: [], customFields: [], tagOptions: [],
          propertyOrder: [...DOCS_DEFAULT_PROPERTY_KEYS], hiddenProperties: [],
          boardPropertyOrder: [...DOCS_DEFAULT_PROPERTY_KEYS], boardHiddenProperties: [],
        },
      } : s.db,
      dbView: type === 'db' ? { ...s.dbView, [np.id]: 'board' } : s.dbView,
      activeId: type === 'folder' ? s.activeId : np.id,
    });
  }, [newPage, patch]);

  const createSubpage = useCallback((parentId: string) => {
    const np = newPage(parentId);
    const s = stateRef.current;
    const pagesById = { ...s.pagesById, [np.id]: { ...np.page, title: '새 하위 페이지' } };
    pagesById[parentId] = { ...pagesById[parentId], children: [...pagesById[parentId].children, np.id] };
    patch({
      pagesById,
      treeOpen: { ...s.treeOpen, [parentId]: true },
      docs: { ...s.docs, [np.id]: [{ id: np.blockId, type: 'text' }] },
    });
    return { id: np.id, blockId: np.blockId };
  }, [newPage, patch]);

  const duplicatePage = useCallback((id: string) => {
    const s = stateRef.current;
    const src = s.pagesById[id];
    if (!src) return;
    const nid = nextId('p');
    const page: DocsPage = { ...src, id: nid, title: `${src.title || '제목 없음'} 복사`, children: [] };
    const pagesById = { ...s.pagesById, [nid]: page };
    const parent = src.parentId;
    let spaces = s.spaces;
    if (parent && parent.indexOf('sp_') === 0) {
      spaces = s.spaces.map((sp) => (sp.id === parent ? { ...sp, children: insertAfter(sp.children, id, nid) } : sp));
    } else if (parent && pagesById[parent]) {
      pagesById[parent] = { ...pagesById[parent], children: insertAfter(pagesById[parent].children, id, nid) };
    }
    const docs = { ...s.docs };
    const db = { ...s.db };
    if (src.type === 'db' && s.db[id]) {
      db[nid] = JSON.parse(JSON.stringify(s.db[id]));
    } else if (src.type === 'doc') {
      docs[nid] = (s.docs[id] || []).map((b) => {
        const b2 = { ...b, id: nextId(b.type === 'jira' ? 'j' : 'b') };
        // IndexedDB blob을 공유 참조하면 원본 삭제 시 사본이 깨지므로, 복제본은 첨부를 새로 올리도록 비워둔다
        delete b2.mediaId;
        textRef.current[b2.id] = textRef.current[b.id] || '';
        return b2;
      });
    }
    patch({ pagesById, spaces, docs, db, activeId: src.type === 'folder' ? s.activeId : nid });
  }, [nextId, patch]);

  const deletePage = useCallback((id: string) => {
    const s = stateRef.current;
    if (!s.pagesById[id]) return;
    const ids: string[] = [];
    const collect = (x: string) => {
      if (!s.pagesById[x]) return;
      ids.push(x);
      (s.pagesById[x].children || []).forEach(collect);
    };
    collect(id);
    const tp: Record<string, DocsPage> = {};
    const td: DocsTrashEntry['docs'] = {};
    const tdb: DocsTrashEntry['db'] = {};
    ids.forEach((x) => {
      tp[x] = s.pagesById[x];
      if (s.docs[x]) td[x] = s.docs[x];
      if (s.db[x]) tdb[x] = s.db[x];
    });
    const pagesById = { ...s.pagesById };
    const docs = { ...s.docs };
    const db = { ...s.db };
    ids.forEach((x) => { delete pagesById[x]; delete docs[x]; delete db[x]; });
    const parent = s.pagesById[id].parentId;
    let spaces = s.spaces;
    if (parent && parent.indexOf('sp_') === 0) {
      spaces = s.spaces.map((sp) => (sp.id === parent ? { ...sp, children: sp.children.filter((c) => c !== id) } : sp));
    }
    if (parent && pagesById[parent]) {
      pagesById[parent] = { ...pagesById[parent], children: pagesById[parent].children.filter((c) => c !== id) };
    }
    const favorites = s.favorites.filter((f) => !ids.includes(f));
    let activeId = s.activeId;
    if (ids.includes(activeId)) activeId = Object.keys(pagesById)[0] || '';
    const trash: DocsTrashEntry[] = [{
      id, title: s.pagesById[id].title || '제목 없음', icon: s.pagesById[id].icon,
      ts: Date.now(), pages: tp, docs: td, db: tdb, parentId: parent,
    }, ...s.trash];
    patch({
      pagesById, docs, db, spaces, favorites, activeId, trash, pageMenu: null,
    });
  }, [patch]);

  const requestDeletePage = useCallback((id: string) => {
    const s = stateRef.current;
    const p = s.pagesById[id];
    if (!p) return;
    let childCount = 0;
    const count = (x: string) => {
      const kids = s.pagesById[x]?.children || [];
      childCount += kids.length;
      kids.forEach(count);
    };
    count(id);
    patch({ pageMenu: null, deleteConfirm: { id, title: p.title || '제목 없음', icon: p.icon, childCount } });
  }, [patch]);

  const cancelDeletePage = useCallback(() => patch({ deleteConfirm: null }), [patch]);

  const confirmDeletePage = useCallback(() => {
    const target = stateRef.current.deleteConfirm;
    if (target) deletePage(target.id);
    patch({ deleteConfirm: null });
  }, [deletePage, patch]);

  const renamePage = useCallback((id: string) => {
    patch({ pageMenu: null, renamingId: id });
  }, [patch]);

  const commitRename = useCallback((id: string, title: string) => {
    const s = stateRef.current;
    if (!s.pagesById[id]) { patch({ renamingId: null }); return; }
    patch({ pagesById: { ...s.pagesById, [id]: { ...s.pagesById[id], title } }, renamingId: null });
  }, [patch]);

  const cancelRename = useCallback(() => {
    patch({ renamingId: null });
  }, [patch]);

  const onTitleInput = useCallback((title: string) => {
    const s = stateRef.current;
    patch({ pagesById: { ...s.pagesById, [s.activeId]: { ...s.pagesById[s.activeId], title } } });
  }, [patch]);

  const setPageIcon = useCallback((id: string, icon: string) => {
    const s = stateRef.current;
    if (!s.pagesById[id]) return;
    patch({ pagesById: { ...s.pagesById, [id]: { ...s.pagesById[id], icon } } });
  }, [patch]);

  const COVER_PALETTE = [
    'linear-gradient(120deg,#a78bfa,#60a5fa)', 'linear-gradient(120deg,#34d399,#38bdf8)',
    'linear-gradient(120deg,#fb923c,#f472b6)', 'linear-gradient(120deg,#22d3ee,#818cf8)',
  ];
  const addCover = useCallback(() => {
    const s = stateRef.current;
    const id = s.activeId;
    const current = s.pagesById[id]?.cover;
    const pool = COVER_PALETTE.filter((c) => c !== current);
    const cover = pool[Math.floor(Math.random() * pool.length)] || COVER_PALETTE[0];
    patch({ pagesById: { ...s.pagesById, [id]: { ...s.pagesById[id], cover } } });
  }, [patch]);

  const removeCover = useCallback(() => {
    const s = stateRef.current;
    const id = s.activeId;
    patch({ pagesById: { ...s.pagesById, [id]: { ...s.pagesById[id], cover: undefined } } });
  }, [patch]);

  const docToMarkdown = useCallback((pid: string): string => {
    const s = stateRef.current;
    const bs = s.docs[pid] || [];
    const title = s.pagesById[pid]?.title || '제목 없음';
    let out = `# ${title}\n\n`;
    bs.forEach((b) => {
      const tx = textRef.current[b.id] || '';
      switch (b.type) {
        case 'h1': out += `# ${tx}\n\n`; break;
        case 'h2': out += `## ${tx}\n\n`; break;
        case 'h3': out += `### ${tx}\n\n`; break;
        case 'bullet': out += `- ${tx}\n`; break;
        case 'number': out += `1. ${tx}\n`; break;
        case 'todo': out += `- [${b.checked ? 'x' : ' '}] ${tx}\n`; break;
        case 'quote': out += `> ${tx}\n\n`; break;
        case 'callout': out += `> ${b.icon || '💡'} ${tx}\n\n`; break;
        case 'code': out += `\`\`\`\n${tx}\n\`\`\`\n\n`; break;
        case 'math': out += `$$${tx}$$\n\n`; break;
        case 'divider': out += '---\n\n'; break;
        case 'subpage': {
          const c = s.pagesById[b.pageId || ''];
          out += `- 📄 ${c ? c.title : ''}\n`;
          break;
        }
        case 'jira': {
          const iss = s.jiraIssues.find((i) => i.key === b.issueKey) || extIssuesRef.current[b.issueKey || ''];
          out += `- [${iss ? `${iss.key} · ${iss.summary}` : b.issueKey}](${iss ? iss.url : ''})\n`;
          break;
        }
        case 'bookmark': out += `- [${b.title || ''}](${b.url || ''})\n`; break;
        default: if (tx) out += `${tx}\n\n`;
      }
    });
    return out;
  }, []);

  const exportMarkdown = useCallback((id?: string) => {
    const pid = id || stateRef.current.activeId;
    const p = stateRef.current.pagesById[pid];
    if (!p) return;
    try {
      const blob = new Blob([docToMarkdown(pid)], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${p.title || '문서'}.md`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { /* noop */ }
    patch({ pageMenu: null });
  }, [docToMarkdown, patch]);

  // ── trash ──
  const openTrash = useCallback(() => patch({ trashOpen: true }), [patch]);
  const closeTrash = useCallback(() => patch({ trashOpen: false }), [patch]);
  const restoreTrash = useCallback((eid: string) => {
    const s = stateRef.current;
    const e = s.trash.find((t) => t.id === eid);
    if (!e) return;
    const pagesById = { ...s.pagesById, ...e.pages };
    const docs = { ...s.docs, ...e.docs };
    const db = { ...s.db, ...e.db };
    let spaces = s.spaces;
    const parent = e.parentId;
    if (parent && parent.indexOf('sp_') === 0) {
      spaces = s.spaces.map((sp) => (sp.id === parent ? { ...sp, children: [...sp.children, e.id] } : sp));
    }
    if (parent && pagesById[parent]) {
      pagesById[parent] = { ...pagesById[parent], children: [...pagesById[parent].children, e.id] };
    } else if (!parent) {
      spaces = s.spaces.map((sp, i) => (i === 0 ? { ...sp, children: [...sp.children, e.id] } : sp));
    }
    patch({
      pagesById, docs, db, spaces, trash: s.trash.filter((t) => t.id !== eid),
      activeId: pagesById[e.id]?.type === 'folder' ? s.activeId : e.id,
    });
  }, [patch]);
  const purgeTrash = useCallback((eid: string) => {
    const s = stateRef.current;
    const entry = s.trash.find((t) => t.id === eid);
    if (entry) {
      Object.values(entry.docs).forEach((blocks) => {
        blocks.forEach((b) => { if (b.mediaId) deleteMedia(b.mediaId).catch(() => {}); });
      });
    }
    patch({ trash: s.trash.filter((t) => t.id !== eid) });
  }, [patch]);

  // ── menus ──
  const openMenu = useCallback((key: MenuField, value: unknown) => patch({ [key]: value } as Partial<DocsState>), [patch]);
  const closeMenu = useCallback((key: MenuField) => patch({ [key]: null } as Partial<DocsState>), [patch]);
  const openPageMenu = useCallback((id: string, x: number, y: number) => {
    patch({ pageMenu: { id, x: Math.min(x, window.innerWidth - 200), y: Math.min(y, window.innerHeight - 240) } });
  }, [patch]);
  const openBlockMenu = useCallback((id: string, x: number, y: number) => {
    let py = y;
    if (py + 300 > window.innerHeight) py = Math.max(10, py - 300 - 24);
    patch({ blockMenu: { id, x: Math.min(x, window.innerWidth - 210), y: py } });
  }, [patch]);
  const openFilterMenu = useCallback((x: number, y: number) => {
    patch({ filterMenu: { x: Math.min(x, window.innerWidth - 210), y } });
  }, [patch]);
  const openCellEditor = useCallback((rowId: string, field: DocsCellEditorState['field'], x: number, y: number) => {
    let py = y;
    if (py + 240 > window.innerHeight) py = Math.max(10, py - 240);
    patch({ cellEditor: { rowId, field, x: Math.min(x, window.innerWidth - 200), y: py } });
  }, [patch]);
  const openPasteMenu = useCallback((menu: DocsPasteMenuState) => patch({ pasteMenu: menu }), [patch]);

  // ── palette ──
  const togglePalette = useCallback(() => {
    patch({ palette: stateRef.current.palette ? null : { query: '', active: 0 } });
  }, [patch]);
  const closePalette = useCallback(() => patch({ palette: null }), [patch]);
  const setPaletteQuery = useCallback((query: string) => patch({ palette: { query, active: 0 } }), [patch]);
  const setPaletteActive = useCallback((active: number) => {
    const p = stateRef.current.palette;
    if (p) patch({ palette: { ...p, active } });
  }, [patch]);

  // ── blocks ──
  const rowNoteDocId = (dbId: string, rowId: string) => `card-note:${dbId}:${rowId}`;
  const currentBlockScope = () => blockScopeRef.current || stateRef.current.activeId;
  const getBlocks = useCallback((pageId?: string) => stateRef.current.docs[pageId || currentBlockScope()] || [], []);
  const openRowNote = useCallback((rowId: string): string => {
    const s = stateRef.current;
    const scopeId = rowNoteDocId(s.activeId, rowId);
    blockScopeRef.current = scopeId;
    if (!s.docs[scopeId]) {
      const blockId = nextId('b');
      const row = s.db[s.activeId]?.rows.find((candidate) => candidate.id === rowId);
      textRef.current[blockId] = row?.note || '';
      patch({ docs: { ...s.docs, [scopeId]: [{ id: blockId, type: 'text' }] } });
    }
    return scopeId;
  }, [nextId, patch]);
  const closeRowNote = useCallback(() => {
    blockScopeRef.current = null;
    patch({ slash: null, mention: null, blockMenu: null, mediaMenu: null });
  }, [patch]);
  const setBlocks = useCallback((updater: (blocks: DocsBlock[]) => DocsBlock[]) => {
    const s = stateRef.current;
    const scopeId = currentBlockScope();
    patch({ docs: { ...s.docs, [scopeId]: updater(s.docs[scopeId] || []) } });
  }, [patch]);

  const addBelow = useCallback((id: string) => {
    const nid = nextId('b');
    textRef.current[nid] = '';
    setBlocks((bs) => {
      const i = bs.findIndex((b) => b.id === id);
      return [...bs.slice(0, i + 1), { id: nid, type: 'text' }, ...bs.slice(i + 1)];
    });
    return nid;
  }, [nextId, setBlocks]);

  const duplicateBlock = useCallback((id: string) => {
    const bs = getBlocks();
    const src = bs.find((b) => b.id === id);
    if (!src) return;
    const nid = nextId(src.type === 'jira' ? 'j' : 'b');
    textRef.current[nid] = textRef.current[id] || '';
    const insert = (mediaId?: string) => {
      setBlocks((x) => {
        const i = x.findIndex((b) => b.id === id);
        return [...x.slice(0, i + 1), { ...src, id: nid, mediaId }, ...x.slice(i + 1)];
      });
      patch({ blockMenu: null });
    };
    if (src.mediaId) {
      // 원본과 같은 IndexedDB blob을 공유하면 한쪽 삭제 시 다른 쪽이 깨지므로 별도 사본을 만든다
      const newMediaId = nextId('m');
      getMedia(src.mediaId).then((blob) => (blob ? putMedia(newMediaId, blob).then(() => insert(newMediaId)) : insert(undefined)))
        .catch(() => insert(undefined));
    } else {
      insert(undefined);
    }
  }, [getBlocks, nextId, setBlocks, patch]);

  const removeBlock = useCallback((id: string) => {
    const s = stateRef.current;
    const target = (s.docs[currentBlockScope()] || []).find((b) => b.id === id);
    if (target?.mediaId) deleteMedia(target.mediaId).catch(() => {});
    setBlocks((bs) => {
      const n = bs.filter((b) => b.id !== id);
      return n.length ? n : [{ id: nextId('b'), type: 'text' }];
    });
  }, [setBlocks, nextId]);

  const turnInto = useCallback((id: string, type: DocsBlockType) => {
    setBlocks((bs) => bs.map((b) => (b.id === id ? {
      id: b.id, type, indent: b.indent || 0,
      checked: type === 'todo' ? false : undefined,
      icon: type === 'callout' ? '💡' : undefined,
    } : b)));
    patch({ blockMenu: null });
  }, [setBlocks, patch]);

  const setBlockMedia = useCallback((blockId: string, fields: { url?: string; mediaId?: string; title?: string }) => {
    const s = stateRef.current;
    const prev = (s.docs[currentBlockScope()] || []).find((b) => b.id === blockId);
    if (prev?.mediaId && prev.mediaId !== fields.mediaId) deleteMedia(prev.mediaId).catch(() => {});
    setBlocks((bs) => bs.map((b) => (b.id === blockId ? {
      ...b, url: fields.url, mediaId: fields.mediaId, title: fields.title,
    } : b)));
    patch({ mediaMenu: null });
  }, [setBlocks, patch]);

  const moveBlock = useCallback((src: string, target: string, after: boolean) => {
    setBlocks((bs) => {
      const srcBlk = bs.find((b) => b.id === src);
      if (!srcBlk) return bs;
      const arr = bs.filter((b) => b.id !== src);
      let i = arr.findIndex((b) => b.id === target);
      if (i < 0) return bs;
      if (after) i++;
      return [...arr.slice(0, i), srcBlk, ...arr.slice(i)];
    });
  }, [setBlocks]);

  const toggleCheck = useCallback((id: string) => {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, checked: !b.checked } : b)));
  }, [setBlocks]);

  const ensureTrailing = useCallback((sid: string) => {
    const bs = getBlocks();
    const idx = bs.findIndex((b) => b.id === sid);
    if (!bs[idx + 1]) {
      const nid = nextId('b');
      textRef.current[nid] = '';
      setBlocks((x) => [...x, { id: nid, type: 'text' }]);
      return nid;
    }
    return bs[idx + 1].id;
  }, [getBlocks, nextId, setBlocks]);

  const insertBlockAfter = useCallback((afterId: string, block: DocsBlock, text?: string) => {
    if (text !== undefined) textRef.current[block.id] = text;
    setBlocks((bs) => {
      const i = bs.findIndex((b) => b.id === afterId);
      return [...bs.slice(0, i + 1), block, ...bs.slice(i + 1)];
    });
  }, [setBlocks]);

  const replaceBlock = useCallback((id: string, block: DocsBlock) => {
    setBlocks((bs) => bs.map((b) => (b.id === id ? block : b)));
  }, [setBlocks]);

  // ── jira ──
  const JIRA_TYPE_META: Record<string, [string, string]> = {
    버그: ['#dc3545', 'B'], 스토리: ['#12b886', 'S'], 태스크: ['#007bff', 'T'], 에픽: ['#7a5af0', 'E'], link: ['#8c8582', '🔗'],
  };
  const jiraType = useCallback((t: string) => {
    const m = JIRA_TYPE_META[t] || ['#8c8582', '•'];
    return { color: m[0], letter: m[1] };
  }, []);
  const hostOf = useCallback((u: string) => {
    const m = u.match(/^https?:\/\/([^/]+)/);
    return m ? m[1] : 'link';
  }, []);
  const resolveIssueByKey = useCallback((k: string) => (
    stateRef.current.jiraIssues.find((i) => i.key === k) || extIssuesRef.current[k]
  ), []);
  const registerIssue = useCallback((issue: DocsJiraIssue) => {
    extIssuesRef.current[issue.key] = issue;
    return issue;
  }, []);
  const setEmbedMode = useCallback((id: string, mode: 'card' | 'link') => {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, mode } : b)));
  }, [setBlocks]);

  // ── DOM refs + paste/chip 삽입 ──
  const elsRef = useRef<Record<string, HTMLElement>>({});
  const setEl = useCallback((id: string, el: HTMLElement | null) => {
    if (el) elsRef.current[id] = el; else delete elsRef.current[id];
  }, []);
  const getEl = useCallback((id: string) => elsRef.current[id], []);

  const insertChip = useCallback((blockId: string, html: string, range: Range | null) => {
    const el = elsRef.current[blockId];
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel) return;
    let r = range;
    if (r) { sel.removeAllRanges(); sel.addRange(r); } else {
      r = sel.rangeCount ? sel.getRangeAt(0) : document.createRange();
      if (!sel.rangeCount) { r.selectNodeContents(el); r.collapse(false); }
    }
    const tmp = document.createElement('div');
    tmp.innerHTML = `${html} `;
    const frag = document.createDocumentFragment();
    let node = tmp.firstChild;
    while (node) { frag.appendChild(node); node = tmp.firstChild; }
    const last = frag.lastChild;
    r.deleteContents(); r.insertNode(frag);
    if (last) {
      const nr = document.createRange();
      nr.setStartAfter(last); nr.collapse(true);
      sel.removeAllRanges(); sel.addRange(nr);
    }
    textRef.current[blockId] = el.textContent || '';
    schedulePersist();
  }, [schedulePersist]);

  const insertTextAt = useCallback((range: Range | null, text: string) => {
    if (!range) return;
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges(); sel.addRange(range);
    range.deleteContents();
    const tn = document.createTextNode(text);
    range.insertNode(tn);
    const nr = document.createRange();
    nr.setStartAfter(tn); nr.collapse(true);
    sel.removeAllRanges(); sel.addRange(nr);
  }, []);

  const insertEmbedAfter = useCallback((blockId: string, mode: 'card' | 'link', issue: DocsJiraIssue) => {
    const nid = nextId('j');
    setBlocks((bs) => {
      const i = bs.findIndex((b) => b.id === blockId);
      return [...bs.slice(0, i + 1), { id: nid, type: 'jira', issueKey: issue.key, mode }, ...bs.slice(i + 1)];
    });
  }, [nextId, setBlocks]);

  const makeChipHTMLInternal = useCallback((issue: DocsJiraIssue) => {
    const tc = JIRA_TYPE_META[issue.type] || ['#8c8582', '•'];
    return `<span contenteditable="false" data-jira="${issue.key}" style="display:inline-flex;align-items:center;gap:4px;vertical-align:baseline;background:#e6f2ff;color:#007bff;font-weight:600;font-size:.9em;padding:1px 4px;border-radius:6px;margin:0 1px;cursor:pointer;user-select:none;white-space:nowrap"><span style="width:13px;height:13px;border-radius:4px;background:${tc[0]};color:#fff;font-size:8px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;font-family:Sora">${tc[1]}</span>${issue.key}</span>`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pasteCtxRef = useRef<{ range: Range | null; issue: DocsJiraIssue; blockId: string } | null>(null);
  const extSeqRef = useRef(0);

  const onBlockPaste = useCallback((blockId: string, e: React.ClipboardEvent) => {
    const text = e.clipboardData?.getData('text') || '';
    const urlM = text.match(/https?:\/\/\S+/);
    if (!urlM) return;
    e.preventDefault();
    const url = urlM[0];
    const keyM = url.match(/([A-Z]{2,}-\d+)/);
    const sel = window.getSelection();
    const range = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    let issue: DocsJiraIssue;
    if (keyM) {
      issue = resolveIssueByKey(keyM[1]) || registerIssue({
        key: keyM[1], summary: '가져온 Jira 이슈', type: '태스크', status: '진행 중', priority: '보통', assignee: '', url, host: hostOf(url),
      });
    } else {
      const k = `LINK${(extSeqRef.current += 1)}`;
      issue = registerIssue({
        key: k, ext: true, summary: hostOf(url) + url.replace(/^https?:\/\/[^/]+/, ''), type: 'link', status: '', priority: '' as DocsJiraIssue['priority'], assignee: '', url, host: hostOf(url),
      });
    }
    pasteCtxRef.current = { range, issue, blockId };
    const el = elsRef.current[blockId];
    const rect = (range && range.getClientRects()[0]) || el?.getBoundingClientRect();
    let y = (rect?.bottom || 0) + 6;
    if (y + 230 > window.innerHeight) y = Math.max(10, (rect?.top || 0) - 236);
    patch({
      pasteMenu: {
        blockId,
        x: Math.min(rect?.left || 0, window.innerWidth - 312),
        y,
        title: issue.ext ? url.replace(/^https?:\/\//, '') : `${issue.key} · ${issue.summary}`,
        isJira: !issue.ext,
      },
    });
  }, [resolveIssueByKey, registerIssue, hostOf, patch]);

  const jiraRotRef = useRef(0);
  const mentionRangeRef = useRef<Range | null>(null);

  const focusBlock = useCallback((id: string, atEnd: boolean) => {
    requestAnimationFrame(() => {
      const el = elsRef.current[id];
      if (!el) return;
      el.focus();
      const sel = window.getSelection();
      if (!sel) return;
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(!atEnd);
      sel.removeAllRanges(); sel.addRange(r);
    });
  }, []);

  const makeDateChipHTMLInternal = useCallback(() => {
    const d = new Date(2026, 6, 14);
    return `<span contenteditable="false" style="display:inline-flex;align-items:center;gap:3px;vertical-align:baseline;background:#faf9f7;border:1px solid #e6e3df;color:#5d5957;font-size:.88em;padding:0 7px;border-radius:6px;margin:0 1px;user-select:none;white-space:nowrap">📅 2026년 ${d.getMonth() + 1}월 ${d.getDate()}일</span>`;
  }, []);

  const applyCmd = useCallback((cmdId: string) => {
    const sid = stateRef.current.slash?.id;
    if (!sid) return;
    const clearText = () => {
      textRef.current[sid] = '';
      const el = elsRef.current[sid];
      if (el) el.textContent = '';
    };

    if (cmdId.indexOf('jira') === 0) {
      const issues = stateRef.current.jiraIssues;
      const issue = issues[jiraRotRef.current++ % issues.length];
      clearText();
      if (cmdId === 'jira-inline') {
        patch({ slash: null });
        insertChip(sid, makeChipHTMLInternal(issue), null);
        return;
      }
      const mode = cmdId === 'jira-link' ? 'link' : 'card';
      replaceBlock(sid, { id: sid, type: 'jira', issueKey: issue.key, mode });
      patch({ slash: null });
      const nid = ensureTrailing(sid);
      focusBlock(nid, false);
      return;
    }

    clearText();
    if (cmdId === 'date') {
      patch({ slash: null });
      insertChip(sid, makeDateChipHTMLInternal(), null);
      return;
    }
    if (cmdId === 'pagemention') {
      patch({ slash: null });
      const el = elsRef.current[sid];
      if (!el) return;
      el.focus();
      const sel = window.getSelection();
      if (!sel) return;
      const r = document.createRange();
      r.selectNodeContents(el); r.collapse(false);
      sel.removeAllRanges(); sel.addRange(r);
      const rect = el.getBoundingClientRect();
      let y = rect.bottom + 6;
      if (y + 300 > window.innerHeight) y = Math.max(10, rect.top - 306);
      patch({ mention: { id: sid, query: '', x: Math.min(rect.left, window.innerWidth - 296), y, active: 0 } });
      mentionRangeRef.current = r.cloneRange();
      return;
    }
    if (cmdId === 'subpage') {
      const parentId = stateRef.current.activeId;
      const noteScopeActive = !!blockScopeRef.current?.startsWith('card-note:');
      const np = createSubpage(parentId);
      if (noteScopeActive) patch({ activeId: parentId });
      replaceBlock(sid, { id: sid, type: 'subpage', pageId: np.id });
      patch({ slash: null });
      ensureTrailing(sid);
      return;
    }

    const editableTypes = ['text', 'h1', 'h2', 'h3', 'bullet', 'number', 'todo', 'toggle', 'quote', 'callout', 'code', 'math'];
    const isEditable = editableTypes.includes(cmdId);
    let block: DocsBlock = { id: sid, type: cmdId as DocsBlockType, indent: 0 };
    if (cmdId === 'todo') block = { ...block, checked: false };
    if (cmdId === 'callout') block = { ...block, icon: '💡' };
    if (cmdId === 'bookmark') block = { ...block, url: 'https://appflowy.io', title: 'AppFlowy', host: 'appflowy.io' };
    if (cmdId === 'table') block = { ...block, cells: [['제목', '상태', '메모'], ['', '', ''], ['', '', '']] };
    replaceBlock(sid, block);
    patch({ slash: null });
    if (isEditable) focusBlock(sid, false);
    else ensureTrailing(sid);
  }, [patch, insertChip, makeChipHTMLInternal, makeDateChipHTMLInternal, replaceBlock, ensureTrailing, createSubpage, focusBlock]);

  // ── 선택 서식 툴바 ──
  const wrapInline = useCallback((css: string) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const r = sel.getRangeAt(0);
    if (r.collapsed) return;
    const span = document.createElement('span');
    span.style.cssText = css;
    try {
      span.appendChild(r.extractContents());
      r.insertNode(span);
      sel.removeAllRanges();
      const nr = document.createRange();
      nr.selectNodeContents(span);
      sel.addRange(nr);
    } catch (e) { /* noop */ }
  }, []);

  const applyFmt = useCallback((kind: 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'mark' | 'clear') => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const anchor = sel.anchorNode;
    const anchorEl = anchor && (anchor.nodeType === 1 ? anchor as HTMLElement : anchor.parentElement);
    const host = anchorEl?.closest<HTMLElement>('.lyra-ed');
    if (kind === 'bold') document.execCommand('bold');
    else if (kind === 'italic') document.execCommand('italic');
    else if (kind === 'underline') document.execCommand('underline');
    else if (kind === 'strike') document.execCommand('strikeThrough');
    else if (kind === 'code') wrapInline("font-family:'JetBrains Mono',monospace;font-size:.9em;background:#f7f6f3;border:1px solid #e6e3df;border-radius:4px;padding:1px 5px;color:#007bff;");
    else if (kind === 'mark') wrapInline('background:#fde68a;color:#3a2e00;border-radius:3px;padding:0 2px;');
    else if (kind === 'clear') document.execCommand('removeFormat');
    if (host) {
      const id = Object.keys(elsRef.current).find((k) => elsRef.current[k] === host);
      if (id) { textRef.current[id] = host.textContent || ''; schedulePersist(); }
    }
  }, [wrapInline, schedulePersist]);

  const applyColor = useCallback((kind: 'text' | 'bg', color: string | null) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const anchor = sel.anchorNode;
    const anchorEl = anchor && (anchor.nodeType === 1 ? anchor as HTMLElement : anchor.parentElement);
    const host = anchorEl?.closest<HTMLElement>('.lyra-ed');
    const css = kind === 'text'
      ? `color:${color || 'inherit'};`
      : `background:${color || 'transparent'};border-radius:3px;padding:0 2px;`;
    wrapInline(css);
    if (host) {
      const id = Object.keys(elsRef.current).find((k) => elsRef.current[k] === host);
      if (id) { textRef.current[id] = host.textContent || ''; schedulePersist(); }
    }
  }, [wrapInline, schedulePersist]);

  const applySize = useCallback((size: 'sm' | 'base' | 'lg') => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const anchor = sel.anchorNode;
    const anchorEl = anchor && (anchor.nodeType === 1 ? anchor as HTMLElement : anchor.parentElement);
    const host = anchorEl?.closest<HTMLElement>('.lyra-ed');
    const px = size === 'sm' ? '.85em' : size === 'lg' ? '1.3em' : '1em';
    wrapInline(`font-size:${px};`);
    if (host) {
      const id = Object.keys(elsRef.current).find((k) => elsRef.current[k] === host);
      if (id) { textRef.current[id] = host.textContent || ''; schedulePersist(); }
    }
  }, [wrapInline, schedulePersist]);

  const applyLink = useCallback((url: string) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed || !url.trim()) return;
    const anchor = sel.anchorNode;
    const anchorEl = anchor && (anchor.nodeType === 1 ? anchor as HTMLElement : anchor.parentElement);
    const host = anchorEl?.closest<HTMLElement>('.lyra-ed');
    document.execCommand('createLink', false, url.trim());
    if (host) {
      const id = Object.keys(elsRef.current).find((k) => elsRef.current[k] === host);
      if (id) { textRef.current[id] = host.textContent || ''; schedulePersist(); }
    }
  }, [schedulePersist]);

  const getActiveBlockId = useCallback((): string | null => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const anchor = sel.anchorNode;
    const anchorEl = anchor && (anchor.nodeType === 1 ? anchor as HTMLElement : anchor.parentElement);
    const host = anchorEl?.closest<HTMLElement>('.lyra-ed');
    if (!host) return null;
    return Object.keys(elsRef.current).find((k) => elsRef.current[k] === host) || null;
  }, []);

  const setBlockAlign = useCallback((id: string, align: 'left' | 'center' | 'right') => {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, align } : b)));
  }, [setBlocks]);

  const addComment = useCallback((blockId: string, text: string) => {
    if (!text.trim()) return;
    const s = stateRef.current;
    const list = s.comments[blockId] || [];
    patch({
      comments: {
        ...s.comments,
        [blockId]: [...list, { id: nextId('cm'), text: text.trim(), ts: Date.now() }],
      },
    });
  }, [patch, nextId]);

  const removeComment = useCallback((blockId: string, commentId: string) => {
    const s = stateRef.current;
    const list = (s.comments[blockId] || []).filter((c) => c.id !== commentId);
    patch({ comments: { ...s.comments, [blockId]: list } });
  }, [patch]);

  const choosePaste = useCallback((mode: 'inline' | 'card' | 'link' | 'text') => {
    const ctx = pasteCtxRef.current;
    patch({ pasteMenu: null });
    if (!ctx) return;
    if (mode === 'inline') insertChip(ctx.blockId, makeChipHTMLInternal(ctx.issue), ctx.range);
    else if (mode === 'text') insertTextAt(ctx.range, ctx.issue.url);
    else insertEmbedAfter(ctx.blockId, mode, ctx.issue);
  }, [patch, insertChip, makeChipHTMLInternal, insertTextAt, insertEmbedAfter]);

  // ── @ 페이지 멘션 ──
  const makePageChipHTMLInternal = useCallback((page: DocsPage) => (
    `<span contenteditable="false" data-page="${page.id}" style="display:inline-flex;align-items:center;gap:3px;vertical-align:baseline;font-weight:500;color:#007bff;border-bottom:1px solid #bfdeff;padding:0 1px;margin:0 1px;cursor:pointer;user-select:none;white-space:nowrap"><span style="font-size:.95em">${page.icon || '📄'}</span>${page.title || '제목 없음'}</span>`
  ), []);

  const openMention = useCallback((id: string, query: string, el: HTMLElement) => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const cur = sel.getRangeAt(0);
      try {
        const r = document.createRange();
        r.setStart(cur.endContainer, Math.max(0, cur.endOffset - query.length - 1));
        r.setEnd(cur.endContainer, cur.endOffset);
        mentionRangeRef.current = r.cloneRange();
      } catch (e) { mentionRangeRef.current = null; }
    }
    const rect = el.getBoundingClientRect();
    let y = rect.bottom + 6;
    if (y + 300 > window.innerHeight) y = Math.max(10, rect.top - 306);
    patch({ mention: { id, query, x: Math.min(rect.left, window.innerWidth - 296), y, active: 0 } });
  }, [patch]);

  const chooseMention = useCallback((pageId: string) => {
    const s = stateRef.current;
    const id = s.mention?.id;
    const page = s.pagesById[pageId];
    patch({ mention: null });
    if (id && page) insertChip(id, makePageChipHTMLInternal(page), mentionRangeRef.current);
  }, [patch, insertChip, makePageChipHTMLInternal]);

  // ── mention ──
  const filteredPages = useCallback((q: string) => {
    const s = stateRef.current;
    const query = (q || '').toLowerCase().trim();
    return Object.keys(s.pagesById).map((k) => s.pagesById[k])
      .filter((p) => p.id !== s.activeId && (!query || (p.title || '').toLowerCase().includes(query)));
  }, []);

  const paletteResults = useCallback((q: string): DocsPaletteResult[] => {
    const s = stateRef.current;
    const query = (q || '').toLowerCase().trim();
    const pages = Object.keys(s.pagesById).map((k) => s.pagesById[k]);
    if (!query) return pages.map((p) => ({ id: p.id, icon: p.icon, title: p.title, type: p.type, snippet: null }));

    const titleHits: DocsPaletteResult[] = [];
    const contentHits: DocsPaletteResult[] = [];
    pages.forEach((p) => {
      if ((p.title || '').toLowerCase().includes(query)) {
        titleHits.push({ id: p.id, icon: p.icon, title: p.title, type: p.type, snippet: null });
        return;
      }
      const blocks = s.docs[p.id] || [];
      for (let i = 0; i < blocks.length; i += 1) {
        const tx = textRef.current[blocks[i].id] || '';
        const idx = tx.toLowerCase().indexOf(query);
        if (idx >= 0) {
          const from = Math.max(0, idx - 24);
          const to = Math.min(tx.length, idx + query.length + 40);
          contentHits.push({
            id: p.id,
            icon: p.icon,
            title: p.title,
            type: p.type,
            snippet: `${from > 0 ? '…' : ''}${tx.slice(from, to)}${to < tx.length ? '…' : ''}`,
          });
          break;
        }
      }
    });
    return [...titleHits, ...contentHits];
  }, []);

  // ── db ──
  const setDbView = useCallback((v: DocsState['dbView'][string]) => {
    const s = stateRef.current;
    patch({ dbView: { ...s.dbView, [s.activeId]: v } });
  }, [patch]);
  // 정렬 컬럼 헤더를 클릭할 때마다 asc → desc → 해제 순으로 순환한다.
  // 이미 정렬 중인 다른 필드는 그대로 유지되므로 여러 컬럼을 순서대로 클릭하면 다중 컬럼 정렬이 누적된다.
  const setSort = useCallback((field: DocsDbSort['field']) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    const cur = d.sort.find((x) => x.field === field);
    let sort: DocsDbSort[];
    if (!cur) sort = [...d.sort, { field, dir: 'asc' as const }];
    else if (cur.dir === 'asc') sort = d.sort.map((x) => (x.field === field ? { ...x, dir: 'desc' as const } : x));
    else sort = d.sort.filter((x) => x.field !== field);
    patch({ db: { ...s.db, [s.activeId]: { ...d, sort } } });
  }, [patch]);
  const clearSort = useCallback(() => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    patch({ db: { ...s.db, [s.activeId]: { ...d, sort: [] } } });
  }, [patch]);
  const addFilter = useCallback((field: DocsDbFilter['field']) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    const f: DocsDbFilter = { id: nextId('f'), field, op: 'is', values: [] };
    patch({ db: { ...s.db, [s.activeId]: { ...d, filter: [...d.filter, f] } } });
  }, [patch, nextId]);
  const updateFilter = useCallback((id: string, changes: Partial<Omit<DocsDbFilter, 'id'>>) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    patch({ db: { ...s.db, [s.activeId]: { ...d, filter: d.filter.map((f) => (f.id === id ? { ...f, ...changes } : f)) } } });
  }, [patch]);
  const removeFilter = useCallback((id: string) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    patch({ db: { ...s.db, [s.activeId]: { ...d, filter: d.filter.filter((f) => f.id !== id) } } });
  }, [patch]);
  const setGroupBy = useCallback((groupBy: DocsDbFilter['field'] | null) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    patch({ db: { ...s.db, [s.activeId]: { ...d, groupBy: groupBy as 'status' | 'priority' | 'tag' | null } } });
  }, [patch]);
  const addDbView = useCallback((type: DocsDbView) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    if (d.views.includes(type)) { patch({ dbView: { ...s.dbView, [s.activeId]: type } }); return; }
    patch({
      db: { ...s.db, [s.activeId]: { ...d, views: [...d.views, type] } },
      dbView: { ...s.dbView, [s.activeId]: type },
    });
  }, [patch]);
  const removeDbView = useCallback((type: DocsDbView) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    if (d.views.length <= 1) return;
    const views = d.views.filter((v) => v !== type);
    const nextActive = s.dbView[s.activeId] === type ? views[0] : s.dbView[s.activeId];
    patch({ db: { ...s.db, [s.activeId]: { ...d, views } }, dbView: { ...s.dbView, [s.activeId]: nextActive } });
  }, [patch]);
  const addBoardGroup = useCallback((name: string) => {
    const v = name.trim();
    if (!v) return;
    const s = stateRef.current;
    const d = s.db[s.activeId];
    // groupBy는 동적 키('status'|'priority'|'tag')라 DocsDbRow 정적 인덱싱이 불가 → Record로 캐스팅(런타임 동작 불변).
    if (d.boardExtraGroups.includes(v) || d.rows.some((r) => (r as unknown as Record<string, unknown>)[d.groupBy || 'status'] === v)) return;
    patch({ db: { ...s.db, [s.activeId]: { ...d, boardExtraGroups: [...d.boardExtraGroups, v] } } });
  }, [patch]);
  const removeBoardGroup = useCallback((name: string) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    patch({ db: { ...s.db, [s.activeId]: { ...d, boardExtraGroups: d.boardExtraGroups.filter((g) => g !== name) } } });
  }, [patch]);
  const setBoardGroupOrder = useCallback((order: string[]) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    patch({ db: { ...s.db, [s.activeId]: { ...d, boardGroupOrder: order } } });
  }, [patch]);
  const setBoardGroupColor = useCallback((key: string, color: string | null) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    const boardGroupColors = { ...d.boardGroupColors };
    if (color) boardGroupColors[key] = color; else delete boardGroupColors[key];
    patch({ db: { ...s.db, [s.activeId]: { ...d, boardGroupColors } } });
  }, [patch]);
  const renameBoardGroup = useCallback((oldKey: string, newKey: string) => {
    const v = newKey.trim();
    if (!v || v === oldKey) return;
    const s = stateRef.current;
    const d = s.db[s.activeId];
    const field = d.groupBy || 'status';
    if (field === 'tag') return;
    const rows = d.rows.map((r) => (String(r[field] ?? '') === oldKey ? { ...r, [field]: v } : r));
    const boardExtraGroups = d.boardExtraGroups.map((g) => (g === oldKey ? v : g));
    const boardGroupOrder = d.boardGroupOrder.map((g) => (g === oldKey ? v : g));
    const boardGroupColors = { ...d.boardGroupColors };
    if (boardGroupColors[oldKey]) { boardGroupColors[v] = boardGroupColors[oldKey]; delete boardGroupColors[oldKey]; }
    const boardHiddenGroups = (d.boardHiddenGroups || []).map((g) => (g === oldKey ? v : g));
    patch({
      db: {
        ...s.db,
        [s.activeId]: {
          ...d, rows, boardExtraGroups, boardGroupOrder, boardGroupColors, boardHiddenGroups,
        },
      },
    });
  }, [patch]);
  const deleteBoardGroup = useCallback((key: string) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    const field = d.groupBy || 'status';
    if (field === 'tag') return;
    const rows = d.rows.map((r) => (String(r[field] ?? '') === key ? { ...r, [field]: '' } : r));
    const boardExtraGroups = d.boardExtraGroups.filter((g) => g !== key);
    const boardGroupOrder = d.boardGroupOrder.filter((g) => g !== key);
    const boardGroupColors = { ...d.boardGroupColors };
    delete boardGroupColors[key];
    const boardHiddenGroups = (d.boardHiddenGroups || []).filter((g) => g !== key);
    patch({
      db: {
        ...s.db,
        [s.activeId]: {
          ...d, rows, boardExtraGroups, boardGroupOrder, boardGroupColors, boardHiddenGroups,
        },
      },
    });
  }, [patch]);
  const toggleBoardGroupHidden = useCallback((key: string) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    const current = d.boardHiddenGroups || [];
    const boardHiddenGroups = current.includes(key)
      ? current.filter((g) => g !== key)
      : [...current, key];
    patch({ db: { ...s.db, [s.activeId]: { ...d, boardHiddenGroups } } });
  }, [patch]);
  const openRowDetail = useCallback((rowId: string) => {
    const s = stateRef.current;
    if (pendingNewRowsRef.current.delete(rowId)) {
      const row = s.db[s.activeId]?.rows.find((candidate) => candidate.id === rowId);
      if (row) {
        rowDraftSnapshotsRef.current.set(rowId, {
          row,
          comments: s.comments[rowId] || [],
        });
      }
    }
    patch({ rowDetail: rowId, cellEditor: null });
  }, [patch]);
  // 로우 디테일 모달 안에서 연 팝업(새 속성/새 태그)은 모달과 함께 닫혀야 한다.
  // 모달 오버레이가 [data-docs-menu]를 갖고 있어 팝업의 outside-click 핸들러가
  // 오버레이 클릭을 "메뉴 내부 클릭"으로 오인해 닫지 못하므로 여기서 함께 정리한다.
  const closeRowDetail = useCallback(() => {
    const s = stateRef.current;
    const rowId = s.rowDetail;
    const snapshot = rowId ? rowDraftSnapshotsRef.current.get(rowId) : undefined;
    if (rowId) rowDraftSnapshotsRef.current.delete(rowId);

    if (rowId && snapshot) {
      const d = s.db[s.activeId];
      const row = d?.rows.find((candidate) => candidate.id === rowId);
      const noteId = rowNoteDocId(s.activeId, rowId);
      const noteBlocks = s.docs[noteId] || [];
      const noteChanged = noteBlocks.length > 0 && (
        noteBlocks.length !== 1
        || noteBlocks[0]?.type !== 'text'
        || (textRef.current[noteBlocks[0]?.id] || '') !== (row?.note || '')
      );
      if (d && isDocsRowDraftUnchanged(snapshot, row, s.comments[rowId] || []) && !noteChanged) {
        const comments = { ...s.comments };
        delete comments[rowId];
        const docs = { ...s.docs };
        noteBlocks.forEach((block) => {
          delete textRef.current[block.id];
          if (block.mediaId) deleteMedia(block.mediaId).catch(() => {});
        });
        delete docs[noteId];
        patch({
          db: { ...s.db, [s.activeId]: { ...d, rows: d.rows.filter((candidate) => candidate.id !== rowId) } },
          docs,
          comments,
          rowDetail: null,
          fieldTypeMenu: null,
          tagMenu: null,
          cellEditor: null,
        });
        return;
      }
    }

    patch({
      rowDetail: null, fieldTypeMenu: null, tagMenu: null, cellEditor: null,
    });
  }, [patch]);
  const setCell = useCallback((rowId: string, field: 'status' | 'assignee' | 'priority' | 'due', val: string) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    patch({
      db: { ...s.db, [s.activeId]: { ...d, rows: d.rows.map((r) => (r.id === rowId ? { ...r, [field]: val } : r)) } },
      cellEditor: null,
    });
  }, [patch]);
  const setCellTitle = useCallback((rowId: string, title: string) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    patch({ db: { ...s.db, [s.activeId]: { ...d, rows: d.rows.map((r) => (r.id === rowId ? { ...r, title } : r)) } } });
  }, [patch]);

  const updateRow = useCallback((rowId: string, updater: (r: DocsDbRow) => DocsDbRow) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    patch({ db: { ...s.db, [s.activeId]: { ...d, rows: d.rows.map((r) => (r.id === rowId ? updater(r) : r)) } } });
  }, [patch]);

  const setRowNote = useCallback((rowId: string, note: string) => {
    updateRow(rowId, (r) => ({ ...r, note }));
  }, [updateRow]);

  const addChecklistItem = useCallback((rowId: string, text: string) => {
    if (!text.trim()) return;
    updateRow(rowId, (r) => ({
      ...r,
      checklist: [...(r.checklist || []), { id: nextId('ck'), text: text.trim(), done: false }],
    }));
  }, [updateRow, nextId]);

  const toggleChecklistItem = useCallback((rowId: string, itemId: string) => {
    updateRow(rowId, (r) => ({
      ...r,
      checklist: (r.checklist || []).map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)),
    }));
  }, [updateRow]);

  const removeChecklistItem = useCallback((rowId: string, itemId: string) => {
    updateRow(rowId, (r) => ({ ...r, checklist: (r.checklist || []).filter((c) => c.id !== itemId) }));
  }, [updateRow]);

  const toggleChecklistHideDone = useCallback((rowId: string) => {
    updateRow(rowId, (r) => ({ ...r, checklistHideDone: !r.checklistHideDone }));
  }, [updateRow]);
  const addRow = useCallback((title?: string, templateId?: string): string => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    const n = d.seq;
    const id = `r${n}`;
    const tpl = templateId ? d.templates.find((t) => t.id === templateId) : undefined;
    const now = Date.now();
    const row: DocsDbRow = {
      id,
      title: title || '',
      status: tpl?.status || '할 일',
      assignee: tpl?.assignee || '',
      priority: tpl?.priority || '보통',
      due: tpl?.due || '',
      tags: tpl?.tags ? [...tpl.tags] : [],
      note: tpl?.note || undefined,
      checklist: tpl && tpl.checklist.length
        ? tpl.checklist.map((c) => ({ id: nextId('ck'), text: c.text, done: false }))
        : undefined,
      customValues: tpl?.customValues ? { ...tpl.customValues } : undefined,
      createdAt: now,
      updatedAt: now,
    };
    patch({ db: { ...s.db, [s.activeId]: { ...d, rows: [...d.rows, row], seq: n + 1 } } });
    if (!title?.trim()) pendingNewRowsRef.current.add(id);
    return id;
  }, [patch, nextId]);
  const removeRow = useCallback((rowId: string) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    pendingNewRowsRef.current.delete(rowId);
    rowDraftSnapshotsRef.current.delete(rowId);
    const comments = { ...s.comments };
    delete comments[rowId];
    const docs = { ...s.docs };
    const noteId = rowNoteDocId(s.activeId, rowId);
    (docs[noteId] || []).forEach((block) => {
      delete textRef.current[block.id];
      if (block.mediaId) deleteMedia(block.mediaId).catch(() => {});
    });
    delete docs[noteId];
    patch({
      db: { ...s.db, [s.activeId]: { ...d, rows: d.rows.filter((r) => r.id !== rowId) } },
      docs,
      comments,
      rowDetail: null,
    });
  }, [patch]);

  // ── db templates ──
  const addTemplate = useCallback(() => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    const id = nextId('tpl');
    const tpl: DocsDbTemplate = {
      id, name: '새 템플릿', status: '할 일', priority: '보통', assignee: '', due: '', tags: [], note: '', checklist: [],
    };
    patch({
      db: { ...s.db, [s.activeId]: { ...d, templates: [...d.templates, tpl] } },
      templateEditorId: id,
    });
  }, [patch, nextId]);

  const updateTemplateWith = useCallback((id: string, updater: (t: DocsDbTemplate) => DocsDbTemplate) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    patch({ db: { ...s.db, [s.activeId]: { ...d, templates: d.templates.map((t) => (t.id === id ? updater(t) : t)) } } });
  }, [patch]);

  const updateTemplate = useCallback((id: string, fields: Partial<Omit<DocsDbTemplate, 'id' | 'checklist'>>) => {
    updateTemplateWith(id, (t) => ({ ...t, ...fields }));
  }, [updateTemplateWith]);

  const addTemplateChecklistItem = useCallback((id: string, text: string) => {
    if (!text.trim()) return;
    updateTemplateWith(id, (t) => ({ ...t, checklist: [...t.checklist, { id: nextId('ck'), text: text.trim(), done: false }] }));
  }, [updateTemplateWith, nextId]);

  const toggleTemplateChecklistItem = useCallback((id: string, itemId: string) => {
    updateTemplateWith(id, (t) => ({ ...t, checklist: t.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) }));
  }, [updateTemplateWith]);

  const removeTemplateChecklistItem = useCallback((id: string, itemId: string) => {
    updateTemplateWith(id, (t) => ({ ...t, checklist: t.checklist.filter((c) => c.id !== itemId) }));
  }, [updateTemplateWith]);

  const removeTemplate = useCallback((id: string) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    patch({
      db: { ...s.db, [s.activeId]: { ...d, templates: d.templates.filter((t) => t.id !== id) } },
      templateEditorId: s.templateEditorId === id ? null : s.templateEditorId,
    });
  }, [patch]);

  const reorderTemplates = useCallback((order: string[]) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    const map = new Map(d.templates.map((t) => [t.id, t]));
    const templates = order.map((id) => map.get(id)).filter((t): t is DocsDbTemplate => !!t);
    patch({ db: { ...s.db, [s.activeId]: { ...d, templates } } });
  }, [patch]);

  const openTemplateEditor = useCallback((id: string) => patch({ templateEditorId: id }), [patch]);
  const closeTemplateEditor = useCallback(() => patch({ templateEditorId: null }), [patch]);

  // ── db 태그 레지스트리 ──
  const TAG_COLOR_PRESETS = ['#7a5af0', '#e8590c', '#c92a2a', '#0ca678', '#1971c2', '#d6336c', '#e67700', '#087f5b'];

  const ensureTagOption = useCallback((label: string): string => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    const trimmed = label.trim();
    const existing = d.tagOptions.find((t) => t.label === trimmed);
    if (existing) return existing.id;
    const id = nextId('tag');
    const color = TAG_COLOR_PRESETS[d.tagOptions.length % TAG_COLOR_PRESETS.length];
    patch({ db: { ...s.db, [s.activeId]: { ...d, tagOptions: [...d.tagOptions, { id, label: trimmed, color }] } } });
    return id;
  }, [patch, nextId]);

  const updateTagOption = useCallback((id: string, fields: Partial<Pick<DocsDbTagOption, 'label' | 'color'>>) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    patch({ db: { ...s.db, [s.activeId]: { ...d, tagOptions: d.tagOptions.map((t) => (t.id === id ? { ...t, ...fields } : t)) } } });
  }, [patch]);

  const removeTagOption = useCallback((id: string) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    patch({
      db: {
        ...s.db,
        [s.activeId]: {
          ...d,
          tagOptions: d.tagOptions.filter((t) => t.id !== id),
          rows: d.rows.map((r) => (r.tags.includes(id) ? { ...r, tags: r.tags.filter((x) => x !== id) } : r)),
          templates: d.templates.map((t) => (t.tags.includes(id) ? { ...t, tags: t.tags.filter((x) => x !== id) } : t)),
        },
      },
    });
  }, [patch]);

  const reorderTagOptions = useCallback((order: string[]) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    const map = new Map(d.tagOptions.map((t) => [t.id, t]));
    const tagOptions = order.map((id) => map.get(id)).filter((t): t is DocsDbTagOption => !!t);
    patch({ db: { ...s.db, [s.activeId]: { ...d, tagOptions } } });
  }, [patch]);

  const toggleRowTag = useCallback((rowId: string, tagId: string) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    patch({
      db: {
        ...s.db,
        [s.activeId]: {
          ...d,
          rows: d.rows.map((r) => (r.id === rowId
            ? { ...r, tags: r.tags.includes(tagId) ? r.tags.filter((x) => x !== tagId) : [...r.tags, tagId] }
            : r)),
        },
      },
    });
  }, [patch]);

  const clearRowTags = useCallback((rowId: string) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    patch({ db: { ...s.db, [s.activeId]: { ...d, rows: d.rows.map((r) => (r.id === rowId ? { ...r, tags: [] } : r)) } } });
  }, [patch]);

  const toggleTemplateTag = useCallback((templateId: string, tagId: string) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    patch({
      db: {
        ...s.db,
        [s.activeId]: {
          ...d,
          templates: d.templates.map((t) => (t.id === templateId
            ? { ...t, tags: t.tags.includes(tagId) ? t.tags.filter((x) => x !== tagId) : [...t.tags, tagId] }
            : t)),
        },
      },
    });
  }, [patch]);

  // ── db 사용자 정의 속성 ──
  const addCustomField = useCallback((type: DocsDbFieldType, name: string): string => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    const id = nextId('fld');
    const def: DocsDbFieldDef = {
      id, name, type, options: (type === 'select' || type === 'multiSelect') ? [] : undefined,
    };
    patch({
      db: {
        ...s.db,
        [s.activeId]: {
          ...d,
          customFields: [...d.customFields, def],
          propertyOrder: [...d.propertyOrder, id],
          boardPropertyOrder: [...d.boardPropertyOrder, id],
        },
      },
      fieldTypeMenu: null,
    });
    return id;
  }, [patch, nextId]);

  const updateCustomFieldDef = useCallback((id: string, fields: Partial<Omit<DocsDbFieldDef, 'id'>>) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    patch({ db: { ...s.db, [s.activeId]: { ...d, customFields: d.customFields.map((f) => (f.id === id ? { ...f, ...fields } : f)) } } });
  }, [patch]);

  const removeCustomField = useCallback((id: string) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    patch({
      db: {
        ...s.db,
        [s.activeId]: {
          ...d,
          customFields: d.customFields.filter((f) => f.id !== id),
          propertyOrder: d.propertyOrder.filter((k) => k !== id),
          hiddenProperties: d.hiddenProperties.filter((k) => k !== id),
          boardPropertyOrder: d.boardPropertyOrder.filter((k) => k !== id),
          boardHiddenProperties: d.boardHiddenProperties.filter((k) => k !== id),
        },
      },
    });
  }, [patch]);

  const reorderProperties = useCallback((order: string[]) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    patch({ db: { ...s.db, [s.activeId]: { ...d, boardPropertyOrder: order } } });
  }, [patch]);

  const togglePropertyVisibility = useCallback((key: string) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    const boardHiddenProperties = d.boardHiddenProperties.includes(key)
      ? d.boardHiddenProperties.filter((k) => k !== key)
      : [...d.boardHiddenProperties, key];
    patch({ db: { ...s.db, [s.activeId]: { ...d, boardHiddenProperties } } });
  }, [patch]);

  const addFieldOption = useCallback((fieldId: string, label: string): string => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    const optId = nextId('opt');
    patch({
      db: {
        ...s.db,
        [s.activeId]: {
          ...d,
          customFields: d.customFields.map((f) => (f.id === fieldId
            ? {
              ...f,
              options: [...(f.options || []), {
                id: optId, label: label.trim(), color: TAG_COLOR_PRESETS[(f.options?.length || 0) % TAG_COLOR_PRESETS.length],
              }],
            }
            : f)),
        },
      },
    });
    return optId;
  }, [patch, nextId]);

  const setRowCustomValue = useCallback((rowId: string, fieldId: string, value: DocsCustomFieldValue) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    patch({
      db: {
        ...s.db,
        [s.activeId]: {
          ...d,
          rows: d.rows.map((r) => (r.id === rowId
            ? { ...r, customValues: { ...(r.customValues || {}), [fieldId]: value }, updatedAt: Date.now() }
            : r)),
        },
      },
    });
  }, [patch]);

  const setTemplateCustomValue = useCallback((templateId: string, fieldId: string, value: DocsCustomFieldValue) => {
    const s = stateRef.current;
    const d = s.db[s.activeId];
    patch({
      db: {
        ...s.db,
        [s.activeId]: {
          ...d,
          templates: d.templates.map((t) => (t.id === templateId
            ? { ...t, customValues: { ...(t.customValues || {}), [fieldId]: value } }
            : t)),
        },
      },
    });
  }, [patch]);

  // ── cloud ──
  const persistCloudCfg = useCallback(() => {
    try {
      const c = stateRef.current.cloud;
      localStorage.setItem(CLOUD_STORAGE_KEY, JSON.stringify({
        url: c.url, key: c.key, table: c.table, wsId: c.wsId, auto: c.auto,
      }));
    } catch (e) { /* noop */ }
  }, []);
  const openCloud = useCallback(() => patch({ cloudOpen: true }), [patch]);
  const closeCloud = useCallback(() => patch({ cloudOpen: false }), [patch]);
  const setCloudField = useCallback((k: 'url' | 'key' | 'table' | 'wsId', v: string) => {
    const s = stateRef.current;
    patch({ cloud: { ...s.cloud, [k]: v } });
    persistCloudCfg();
  }, [patch, persistCloudCfg]);
  const toggleAuto = useCallback(() => {
    const s = stateRef.current;
    patch({ cloud: { ...s.cloud, auto: !s.cloud.auto } });
    persistCloudCfg();
  }, [patch, persistCloudCfg]);

  const cloudBase = () => (stateRef.current.cloud.url || '').replace(/\/$/, '');
  const cloudHeaders = () => {
    const c = stateRef.current.cloud;
    return { apikey: c.key, Authorization: `Bearer ${c.key}`, 'Content-Type': 'application/json' };
  };
  const setCloud = useCallback((p: Partial<DocsState['cloud']>) => {
    patch({ cloud: { ...stateRef.current.cloud, ...p } });
  }, [patch]);

  const cloudTest = useCallback(async () => {
    const c = stateRef.current.cloud;
    if (!c.url || !c.key) { setCloud({ status: 'URL과 anon key를 입력하세요', statusKind: 'err' }); return; }
    setCloud({ syncing: true, status: '연결 확인 중…', statusKind: '' });
    try {
      const r = await fetch(`${cloudBase()}/rest/v1/${c.table}?select=id&limit=1`, { headers: cloudHeaders() });
      if (!r.ok && r.status !== 404) throw new Error(`HTTP ${r.status}`);
      if (r.ok) await r.json();
      setCloud({ connected: true, syncing: false, status: '연결됨 ✓', statusKind: 'ok' });
    } catch (e) {
      setCloud({ connected: false, syncing: false, status: `연결 실패: ${(e as Error).message}`, statusKind: 'err' });
    }
  }, [setCloud]);

  const cloudSave = useCallback(async (silent?: boolean) => {
    const c = stateRef.current.cloud;
    if (!c.url || !c.key) { if (!silent) setCloud({ status: 'URL과 anon key를 입력하세요', statusKind: 'err' }); return; }
    if (!silent) setCloud({ syncing: true, status: '업로드 중…', statusKind: '' });
    try {
      const body = [{ id: c.wsId, data: serialize(), updated_at: new Date().toISOString() }];
      const r = await fetch(`${cloudBase()}/rest/v1/${c.table}`, {
        method: 'POST',
        headers: { ...cloudHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setCloud({
        connected: true, syncing: false, status: `저장됨 ✓ ${new Date().toLocaleTimeString()}`, statusKind: 'ok', lastSync: Date.now(),
      });
    } catch (e) {
      setCloud({ syncing: false, status: `저장 실패: ${(e as Error).message}`, statusKind: 'err' });
    }
  }, [setCloud, serialize]);
  cloudSaveRef.current = cloudSave;

  const cloudLoad = useCallback(async () => {
    const c = stateRef.current.cloud;
    if (!c.url || !c.key) { setCloud({ status: 'URL과 anon key를 입력하세요', statusKind: 'err' }); return; }
    setCloud({ syncing: true, status: '불러오는 중…', statusKind: '' });
    try {
      const r = await fetch(`${cloudBase()}/rest/v1/${c.table}?id=eq.${encodeURIComponent(c.wsId)}&select=data`, { headers: cloudHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const rows = await r.json();
      if (!rows.length || !rows[0].data) { setCloud({ syncing: false, status: '저장된 데이터 없음', statusKind: 'err' }); return; }
      const obj: DocsPersistedShape = rows[0].data;
      if (obj.text) textRef.current = obj.text;
      if (obj.uid) uidRef.current = obj.uid;
      dispatch(actions.reset({
        ...stateRef.current,
        ...obj.state,
        db: normalizeDb(obj.state.db),
        cloud: {
          ...stateRef.current.cloud, syncing: false, status: '불러옴 ✓', statusKind: 'ok', lastSync: Date.now(),
        },
      }));
    } catch (e) {
      setCloud({ syncing: false, status: `불러오기 실패: ${(e as Error).message}`, statusKind: 'err' });
    }
  }, [setCloud]);

  // ── local file storage ──
  const openStorage = useCallback(() => {
    patch({ storageOpen: true });
    docsStorageController.getStoragePath().then((p) => patch({ storagePath: p })).catch(() => {});
  }, [patch]);
  const closeStorage = useCallback(() => patch({ storageOpen: false }), [patch]);

  const chooseStorageFolder = useCallback(async () => {
    const dir = await docsStorageController.selectFolder();
    if (!dir) return;
    patch({ storageStatus: '적용 중…', storageStatusKind: '' });
    try {
      await docsStorageController.setStoragePath(dir);
      const ok = await hydrateFromFile();
      if (!ok) await persistToFile();
      patch({ storagePath: dir, storageStatus: '저장 위치가 변경되었습니다', storageStatusKind: 'ok' });
    } catch (e) {
      patch({ storageStatus: `변경 실패: ${(e as Error).message}`, storageStatusKind: 'err' });
    }
  }, [patch, hydrateFromFile, persistToFile]);

  const resetStorageFolder = useCallback(async () => {
    try {
      const p = await docsStorageController.resetStoragePath();
      const ok = await hydrateFromFile();
      if (!ok) await persistToFile();
      patch({ storagePath: p, storageStatus: '기본 경로로 재설정되었습니다', storageStatusKind: 'ok' });
    } catch (e) {
      patch({ storageStatus: `재설정 실패: ${(e as Error).message}`, storageStatusKind: 'err' });
    }
  }, [patch, hydrateFromFile, persistToFile]);

  const openStorageFolder = useCallback(() => {
    docsStorageController.openFolder().catch(() => {});
  }, []);

  const value = useMemo<DocsContextValue>(() => ({
    state,
    getText, setText, nextId,
    openPage, toggleSidebar, toggleTree, toggleCollapse, toggleFav,
    activePage, addPage, createSubpage, duplicatePage, deletePage, requestDeletePage, cancelDeletePage, confirmDeletePage,
    renamePage, commitRename, cancelRename,
    setPageIcon, onTitleInput, addCover, removeCover,
    exportMarkdown, docToMarkdown,
    openTrash, closeTrash, restoreTrash, purgeTrash,
    openMenu, closeMenu, openPageMenu, openBlockMenu, openFilterMenu, openCellEditor, openPasteMenu,
    togglePalette, closePalette, setPaletteQuery, setPaletteActive,
    getBlocks, openRowNote, closeRowNote,
    setBlocks, addBelow, duplicateBlock, removeBlock, turnInto, setBlockMedia, moveBlock, toggleCheck,
    ensureTrailing, insertBlockAfter, replaceBlock,
    jiraType, hostOf, resolveIssueByKey, registerIssue, setEmbedMode,
    setEl, getEl, insertChip, insertTextAt, insertEmbedAfter, onBlockPaste, choosePaste,
    focusBlock, applyCmd, applyFmt, applyColor, applySize, applyLink,
    getActiveBlockId, setBlockAlign, addComment, removeComment,
    openMention, chooseMention,
    filteredPages, paletteResults,
    setDbView, setSort, clearSort, addFilter, updateFilter, removeFilter, setGroupBy,
    addDbView, removeDbView, addBoardGroup, removeBoardGroup, setBoardGroupOrder, setBoardGroupColor,
    renameBoardGroup, deleteBoardGroup, toggleBoardGroupHidden,
    openRowDetail, closeRowDetail,
    setCell, setCellTitle, addRow, removeRow,
    addTemplate, updateTemplate, addTemplateChecklistItem, toggleTemplateChecklistItem, removeTemplateChecklistItem,
    removeTemplate, reorderTemplates, openTemplateEditor, closeTemplateEditor,
    ensureTagOption, updateTagOption, removeTagOption, reorderTagOptions, toggleRowTag, clearRowTags, toggleTemplateTag,
    addCustomField, updateCustomFieldDef, removeCustomField, addFieldOption, setRowCustomValue, setTemplateCustomValue,
    reorderProperties, togglePropertyVisibility,
    setRowNote, addChecklistItem, toggleChecklistItem, removeChecklistItem, toggleChecklistHideDone,
    openCloud, closeCloud, setCloudField, toggleAuto, cloudTest, cloudSave, cloudLoad,
    isFileStorageAvailable: isDocsFileStorageAvailable(),
    openStorage, closeStorage, chooseStorageFolder, resetStorageFolder, openStorageFolder,
    schedulePersist,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [state]);

  return <docsContext.Provider value={value}>{children}</docsContext.Provider>;
};

export default DocsProvider;
