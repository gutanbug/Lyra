import type {
  DocsBlock, DocsDbState, DocsJiraIssue, DocsPage, DocsSpace, DocsState,
} from 'types/docs';

/*
	InitialState — Lyra Docs 초기 상태
	Source: design_handoff_lyra_docs/designs/Lyra Docs.dc.html (constructor) UI 구조만 이식.
	실제 계정에서 시작하는 기능이므로 목업의 예시 페이지/블록/DB 행/Jira 이슈 시드 데이터는 포함하지 않는다.

	블록 본문 텍스트는 reducer state가 아닌 별도 textStore(ref)에 보관한다.
	(키 입력마다 리렌더되면 contentEditable 커서가 유실되는 문제를 원본 설계와 동일하게 회피)
*/

const uid = 100;

export const DOCS_INITIAL_TEXT: Record<string, string> = {};

const spaces: DocsSpace[] = [
  { id: 'sp_pub', name: '공유 스페이스', kind: 'public', children: [] },
  { id: 'sp_priv', name: '개인 스페이스', kind: 'private', children: [] },
];

const pagesById: Record<string, DocsPage> = {};
const docs: Record<string, DocsBlock[]> = {};
const db: Record<string, DocsDbState> = {};
const jiraIssues: DocsJiraIssue[] = [];

const initialState: DocsState = {
  activeId: '',
  sidebarOpen: true,
  dbView: {},
  collapsed: {},
  treeOpen: { sp_pub: true, sp_priv: true },
  blockMenu: null,
  mention: null,
  fmtBar: null,
  pageMenu: null,
  renamingId: null,
  favorites: [],
  recentIds: [],
  spaces,
  pagesById,
  docs,
  cellEditor: null,
  rowDetail: null,
  templateEditorId: null,
  fieldTypeMenu: null,
  tagMenu: null,
  filterMenu: null,
  db,
  comments: {},
  jiraIssues,
  pasteMenu: null,
  mediaMenu: null,
  dateMenu: null,
  bookmarkMenu: null,
  jiraMenu: null,
  slash: null,
  palette: null,
  trashOpen: false,
  trash: [],
  deleteConfirm: null,
  moveModal: null,
  cloudOpen: false,
  cloud: {
    url: '', key: '', table: 'lyra_docs', wsId: 'my-workspace', auto: false,
    connected: false, status: '', statusKind: '', syncing: false, lastSync: null,
  },
  storageOpen: false,
  storagePath: '',
  storageStatus: '',
  storageStatusKind: '',
  outlineTick: 0,
};

export const getInitialUid = () => uid;

export default initialState;
