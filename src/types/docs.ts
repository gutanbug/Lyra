// Lyra Docs 도메인 타입
// Source: design_handoff_lyra_docs/designs/Lyra Docs.dc.html

export type DocsBlockType =
  | 'text' | 'h1' | 'h2' | 'h3' | 'quote' | 'callout' | 'code' | 'math'
  | 'bullet' | 'number' | 'todo' | 'toggle' | 'divider'
  | 'image' | 'video' | 'file' | 'subpage' | 'bookmark' | 'table' | 'outline' | 'jira';

export interface DocsBlock {
  id: string;
  type: DocsBlockType;
  indent?: number;
  checked?: boolean;
  icon?: string;
  // subpage
  pageId?: string;
  // bookmark
  url?: string;
  title?: string;
  host?: string;
  // table (셀 텍스트는 각 셀 id로 textStore에 저장, cells는 셀 id 그리드만 보관)
  cells?: string[][];
  // jira
  issueKey?: string;
  mode?: 'card' | 'link';
  // 텍스트 정렬
  align?: 'left' | 'center' | 'right';
  // image/video/file 첨부 — 업로드는 IndexedDB 참조(mediaId), 임베드 링크는 url을 사용한다
  mediaId?: string;
}

export interface DocsComment {
  id: string;
  text: string;
  ts: number;
}

export type DocsPageType = 'doc' | 'db' | 'folder';

export interface DocsPage {
  id: string;
  icon: string;
  title: string;
  type: DocsPageType;
  parentId: string | null;
  children: string[];
  cover?: string;
}

export type DocsSpaceKind = 'public' | 'private';

export interface DocsSpace {
  id: string;
  name: string;
  kind: DocsSpaceKind;
  children: string[];
}

export const DOCS_STATUS_OPTS = ['할 일', '진행 중', '완료'] as const;
export type DocsDbStatus = typeof DOCS_STATUS_OPTS[number] | '리뷰 중';

export const DOCS_PRIORITY_OPTS = ['긴급', '높음', '보통', '낮음'] as const;
export type DocsDbPriority = typeof DOCS_PRIORITY_OPTS[number];

export interface DocsDbChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface DocsDbRow {
  id: string;
  title: string;
  status: DocsDbStatus;
  assignee: string;
  priority: DocsDbPriority;
  due: string;
  tags: string[];
  note?: string;
  checklist?: DocsDbChecklistItem[];
  checklistHideDone?: boolean;
  customValues?: Record<string, DocsCustomFieldValue>;
  createdAt?: number;
  updatedAt?: number;
}

export interface DocsDbTemplate {
  id: string;
  name: string;
  status: DocsDbStatus;
  priority: DocsDbPriority;
  assignee: string;
  due: string;
  tags: string[];
  note: string;
  checklist: DocsDbChecklistItem[];
  customValues?: Record<string, DocsCustomFieldValue>;
}

/** 태그 레지스트리 항목 — 한 번 만든 태그는 색상/이름과 함께 재사용된다. 순서는 DND로 조절 가능. */
export interface DocsDbTagOption {
  id: string;
  label: string;
  color: string;
}

export type DocsDbFieldType =
  | 'text' | 'number' | 'select' | 'multiSelect' | 'date' | 'person' | 'file' | 'url'
  | 'checkbox' | 'checklist' | 'lastEditedTime' | 'createdTime' | 'relation' | 'rollup';

export interface DocsDbFieldOption {
  id: string;
  label: string;
  color: string;
}

export interface DocsDbFieldDef {
  id: string;
  name: string;
  type: DocsDbFieldType;
  /** select / multiSelect 전용 선택지 */
  options?: DocsDbFieldOption[];
  /** relation 전용 — 연결 대상 데이터베이스 페이지 id */
  relationDbId?: string;
  /** rollup 전용 — 이 DB에 정의된 relation 필드 id */
  rollupRelationFieldId?: string;
  rollupAgg?: 'count' | 'sum';
  /** rollup(sum) 전용 — 연결된 대상 DB의 number 필드 id */
  rollupTargetFieldId?: string;
}

export type DocsCustomFieldValue =
  | string
  | number
  | boolean
  | string[]
  | DocsDbChecklistItem[]
  | { mediaId?: string; url?: string; title?: string }
  | null;

export interface DocsDbSort {
  field: 'title' | 'status' | 'assignee' | 'priority' | 'due';
  dir: 'asc' | 'desc';
}

export type DocsDbFilterField = 'status' | 'assignee' | 'priority' | 'tag' | 'due';
export type DocsDbFilterOp = 'is' | 'isNot' | 'isEmpty' | 'isNotEmpty';

export interface DocsDbFilter {
  id: string;
  field: DocsDbFilterField;
  op: DocsDbFilterOp;
  values: string[];
}

export interface DocsDbState {
  sort: DocsDbSort[];
  filter: DocsDbFilter[];
  groupBy: 'status' | 'priority' | 'tag' | null;
  rows: DocsDbRow[];
  seq: number;
  /** 이 DB 페이지에 추가된 뷰 목록. 새 DB는 보드만 가지고 시작하며 사용자가 나머지를 추가한다. */
  views: DocsDbView[];
  /** 보드에서 수동으로 추가한, 아직 카드가 없는 빈 그룹(태그 등 개방형 필드 전용) */
  boardExtraGroups: string[];
  /** 보드 그룹(컬럼)의 사용자 지정 순서. 비어있으면 필드별 기본 순서를 사용한다. */
  boardGroupOrder: string[];
  /** 보드 그룹(컬럼)의 사용자 지정 색상 (그룹 키 → hex) */
  boardGroupColors: Record<string, string>;
  /** 숨김 처리된 보드 그룹(컬럼) 키 목록 */
  boardHiddenGroups: string[];
  /** '새로 만들기' 드롭다운에 노출되는 템플릿 목록. 첫 번째 템플릿은 기본 새 항목 생성 시 자동 적용된다. */
  templates: DocsDbTemplate[];
  /** 사용자 정의 속성 스키마 (텍스트/숫자/선택/관계/롤업 등) */
  customFields: DocsDbFieldDef[];
  /** 태그 레지스트리 — 새 태그를 만들면 여기 저장되어 이후에도 재사용된다 */
  tagOptions: DocsDbTagOption[];
  /** 카드 상세 모달에 노출되는 속성(내장 필드 키 + customFields id)의 순서. DND로 조절 가능 */
  propertyOrder: string[];
  /** 카드 상세 모달에서 숨김 처리된 속성 키 목록 */
  hiddenProperties: string[];
  /** 보드 카드 안에 표시되는 속성 순서 */
  boardPropertyOrder: string[];
  /** 보드 카드에서 숨김 처리된 속성 키 목록 */
  boardHiddenProperties: string[];
}

/** 카드 상세 모달에 표시되는 내장(built-in) 속성 키. customFields는 각자의 id를 키로 사용한다. */
export const DOCS_BUILTIN_PROPERTY_KEYS = ['status', 'tags', 'checklist', 'priority', 'assignee', 'due'] as const;
export type DocsBuiltinPropertyKey = typeof DOCS_BUILTIN_PROPERTY_KEYS[number];
/** 새 카드와 보드에 기본으로 노출하는 핵심 속성 */
export const DOCS_DEFAULT_PROPERTY_KEYS: DocsBuiltinPropertyKey[] = ['status', 'tags', 'checklist', 'priority'];

export const DOCS_BUILTIN_PROPERTY_LABELS: Record<DocsBuiltinPropertyKey, string> = {
  status: '상태',
  tags: '태그',
  checklist: '체크리스트',
  priority: '우선순위',
  assignee: '담당자',
  due: '마감일',
};

export type DocsDbView = 'grid' | 'board' | 'gallery' | 'calendar';

export interface DocsJiraIssue {
  key: string;
  summary: string;
  type: string;
  status: string;
  priority: string;
  assignee: string;
  url: string;
  host: string;
  ext?: boolean;
}

export interface DocsTrashEntry {
  id: string;
  title: string;
  icon: string;
  ts: number;
  parentId: string | null;
  pages: Record<string, DocsPage>;
  docs: Record<string, DocsBlock[]>;
  db: Record<string, DocsDbState>;
}

export interface DocsCloudConfig {
  url: string;
  key: string;
  table: string;
  wsId: string;
  auto: boolean;
}

export interface DocsCloudState extends DocsCloudConfig {
  connected: boolean;
  status: string;
  statusKind: '' | 'ok' | 'err';
  syncing: boolean;
  lastSync: number | null;
}

export interface DocsSlashMenuState { id: string; query: string; x: number; y: number; active: number }
export interface DocsMentionMenuState { id: string; query: string; x: number; y: number; active: number }
export interface DocsFmtBarState { x: number; y: number; blockId: string | null }
export interface DocsPageMenuState { id: string; x: number; y: number }
export interface DocsBlockMenuState { id: string; x: number; y: number }
export interface DocsCellEditorState { rowId: string; field: 'status' | 'assignee' | 'priority'; x: number; y: number }
export interface DocsFilterMenuState { x: number; y: number }
export interface DocsPaletteState { query: string; active: number }
export interface DocsPaletteResult {
  id: string;
  icon: string;
  title: string;
  type: DocsPageType;
  /** 제목이 아닌 본문 텍스트에서 매치된 경우의 발췌문 (제목 매치는 null) */
  snippet: string | null;
}
export interface DocsPasteMenuState { blockId: string; x: number; y: number; title: string; isJira: boolean }
export interface DocsMediaMenuState { blockId: string; x: number; y: number }

export interface DocsState {
  activeId: string;
  sidebarOpen: boolean;
  dbView: Record<string, DocsDbView>;
  collapsed: Record<string, boolean>;
  treeOpen: Record<string, boolean>;
  blockMenu: DocsBlockMenuState | null;
  mention: DocsMentionMenuState | null;
  fmtBar: DocsFmtBarState | null;
  pageMenu: DocsPageMenuState | null;
  renamingId: string | null;
  favorites: string[];
  recentIds: string[];
  spaces: DocsSpace[];
  pagesById: Record<string, DocsPage>;
  docs: Record<string, DocsBlock[]>;
  cellEditor: DocsCellEditorState | null;
  filterMenu: DocsFilterMenuState | null;
  rowDetail: string | null;
  templateEditorId: string | null;
  fieldTypeMenu: { x: number; y: number; target: 'row' | 'template'; targetId: string } | null;
  tagMenu: { x: number; y: number; target: 'row' | 'template'; targetId: string } | null;
  db: Record<string, DocsDbState>;
  comments: Record<string, DocsComment[]>;
  jiraIssues: DocsJiraIssue[];
  pasteMenu: DocsPasteMenuState | null;
  mediaMenu: DocsMediaMenuState | null;
  slash: DocsSlashMenuState | null;
  palette: DocsPaletteState | null;
  trashOpen: boolean;
  trash: DocsTrashEntry[];
  deleteConfirm: { id: string; title: string; icon: string; childCount: number } | null;
  cloudOpen: boolean;
  cloud: DocsCloudState;
  storageOpen: boolean;
  storagePath: string;
  storageStatus: string;
  storageStatusKind: '' | 'ok' | 'err';
}

/** localStorage(`lyraDocs.v1`) 직렬화 셰이프 */
export interface DocsPersistedShape {
  state: Pick<DocsState,
    | 'sidebarOpen' | 'activeId' | 'dbView' | 'collapsed' | 'treeOpen' | 'favorites' | 'recentIds'
    | 'spaces' | 'pagesById' | 'docs' | 'db' | 'trash' | 'comments'
  >;
  text: Record<string, string>;
  uid: number;
}
