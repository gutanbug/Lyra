import type {
  DocsBlock,
  DocsComment,
  DocsDbState,
  DocsDbView,
  DocsJiraIssue,
  DocsPage,
  DocsSpace,
  DocsTrashEntry,
} from 'types/docs';

/** meta.json 셰이프 — DocsState 중 docs/db(페이지별 파일로 분리)를 제외한 나머지 + text/uid */
export interface DocsStorageMeta {
  sidebarOpen: boolean;
  activeId: string;
  dbView: Record<string, DocsDbView>;
  collapsed: Record<string, boolean>;
  treeOpen: Record<string, boolean>;
  favorites: string[];
  recentIds: string[];
  spaces: DocsSpace[];
  pagesById: Record<string, DocsPage>;
  trash: DocsTrashEntry[];
  comments: Record<string, DocsComment[]>;
  jiraIssues: DocsJiraIssue[];
  text: Record<string, string>;
  uid: number;
}

/** pages/{pageId}.json 셰이프 */
export interface DocsPageFile {
  blocks: DocsBlock[];
  db?: DocsDbState;
}

declare const window: Window & {
  workspaceAPI?: {
    docs?: {
      loadAll: () => Promise<{ meta: DocsStorageMeta; pages: Record<string, DocsPageFile> } | null>;
      saveMeta: (meta: DocsStorageMeta) => Promise<void>;
      savePage: (pageId: string, data: DocsPageFile) => Promise<void>;
      deletePage: (pageId: string) => Promise<void>;
      getStoragePath: () => Promise<string>;
      setStoragePath: (path: string) => Promise<void>;
      resetStoragePath: () => Promise<string>;
      selectFolder: () => Promise<string | null>;
      openFolder: () => Promise<void>;
      readMedia: (mediaId: string) => Promise<{ data: ArrayBuffer; mime: string } | null>;
      writeMedia: (mediaId: string, data: ArrayBuffer, mime: string) => Promise<void>;
      deleteMedia: (mediaId: string) => Promise<void>;
    };
  };
};

const api = () => window.workspaceAPI?.docs;

export const isDocsFileStorageAvailable = (): boolean => !!api();

export const docsStorageController = {
  loadAll: () => api()?.loadAll() ?? Promise.resolve(null),
  saveMeta: (meta: DocsStorageMeta) =>
    api()?.saveMeta(meta) ?? Promise.reject(new Error('workspaceAPI not available')),
  savePage: (pageId: string, data: DocsPageFile) =>
    api()?.savePage(pageId, data) ?? Promise.reject(new Error('workspaceAPI not available')),
  deletePage: (pageId: string) => api()?.deletePage(pageId) ?? Promise.resolve(),
  getStoragePath: () => api()?.getStoragePath() ?? Promise.reject(new Error('workspaceAPI not available')),
  setStoragePath: (path: string) =>
    api()?.setStoragePath(path) ?? Promise.reject(new Error('workspaceAPI not available')),
  resetStoragePath: () => api()?.resetStoragePath() ?? Promise.reject(new Error('workspaceAPI not available')),
  selectFolder: () => api()?.selectFolder() ?? Promise.resolve(null),
  openFolder: () => api()?.openFolder() ?? Promise.resolve(),
  readMedia: (mediaId: string) => api()?.readMedia(mediaId) ?? Promise.resolve(null),
  writeMedia: (mediaId: string, data: ArrayBuffer, mime: string) =>
    api()?.writeMedia(mediaId, data, mime) ?? Promise.reject(new Error('workspaceAPI not available')),
  deleteMedia: (mediaId: string) => api()?.deleteMedia(mediaId) ?? Promise.resolve(),
};
