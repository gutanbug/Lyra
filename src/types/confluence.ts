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

export type ConfluenceCommentLocation = 'footer' | 'inline';

export interface ConfluenceInlineProperties {
  /** 본문 ADF annotation 마크의 id 와 매칭 */
  markerRef: string;
  /** 인라인 댓글 작성 당시 선택 텍스트 */
  originalSelection: string;
}

export interface ConfluenceComment {
  id: string;
  author: string;
  bodyHtml: string;
  /** ADF JSON (body.atlas_doc_format) — 존재 시 @atlaskit/renderer로 렌더링 */
  bodyAdf?: unknown;
  created: string;
  /** 'inline' 이면 본문 annotation 마크에 anchor, 'footer' 면 페이지 하단 일반 댓글 */
  location: ConfluenceCommentLocation;
  /** location === 'inline' 일 때만 존재 */
  inlineProperties?: ConfluenceInlineProperties;
  /** 같은 스레드 부모 댓글 id — 답글이면 설정 */
  parentId?: string;
}
