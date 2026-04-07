export interface ConfluenceSpace {
  id: string;
  key: string;
  name: string;
  type?: string;
  status?: string;
}

export interface NormalizedConfluencePage {
  id: string;
  title: string;
  spaceId: string;
  spaceName: string;
  spaceKey: string;
  status: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  parentId: string;
  parentTitle: string;
  version: number;
}

export interface ConfluenceSpaceGroup {
  spaceId: string;
  spaceName: string;
  spaceKey: string;
  pages: NormalizedConfluencePage[];
}

export interface ConfluenceAncestor {
  id: string;
  title: string;
}

export interface ConfluencePageDetail {
  id: string;
  title: string;
  bodyHtml: string;
  /** ADF JSON (body.atlas_doc_format) — 존재 시 @atlaskit/renderer로 렌더링 */
  bodyAdf?: unknown;
  /** Storage format 원본 HTML (view-file 매크로 localId→filename 매핑용) */
  storageRaw?: string;
  spaceKey: string;
  spaceName: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  ancestors: ConfluenceAncestor[];
}

export interface ConfluenceComment {
  id: string;
  author: string;
  bodyHtml: string;
  /** ADF JSON (body.atlas_doc_format) — 존재 시 @atlaskit/renderer로 렌더링 */
  bodyAdf?: unknown;
  created: string;
}
