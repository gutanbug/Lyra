/**
 * Confluence 데이터 정규화 유틸리티
 * ConfluenceDashboard / ConfluencePageDetail에서 추출
 */
import { str, obj } from 'lib/utils/typeHelpers';
import { confluenceToHtml } from 'lib/utils/confluenceToHtml';
import type {
  ConfluenceSpace,
  NormalizedConfluencePage,
  ConfluenceSpaceGroup,
  ConfluencePageDetail,
  ConfluenceComment,
  ConfluenceAncestor,
} from 'types/confluence';

// ── ConfluenceDashboard 정규화 ──

/** 개인 스페이스 키 여부 (~accountId 또는 긴 숫자/해시) */
export function isPersonalSpaceKey(key: string): boolean {
  return key.startsWith('~') || /^-?\d{10,}/.test(key);
}

export function normalizePage(raw: Record<string, unknown>): NormalizedConfluencePage {
  const id = str(raw.id);
  const title = str(raw.title);
  const status = str(raw.status) || 'current';

  const spaceRaw = obj(raw.space) || obj(raw.spaceInfo);
  const spaceId = str(raw.spaceId) || str(spaceRaw?.id) || '';
  const spaceName = str(spaceRaw?.name) || '';
  const spaceKey = str(spaceRaw?.key) || '';

  const authorRaw = obj(raw.author) || obj(raw.ownedBy) || obj(raw.createdBy);
  const authorId = str(authorRaw?.accountId) || str(authorRaw?.publicName) || '';
  const authorName = str(authorRaw?.displayName) || str(authorRaw?.publicName) || '';

  const createdAt = str(raw.createdAt) || str(raw.created) || '';
  const updatedAt = str(raw.updatedAt) || str(raw.lastModified) || '';

  const parentId = str(raw.parentId) || '';
  const parentTitle = str(raw.parentTitle) || '';

  const versionRaw = obj(raw.version);
  const version = versionRaw ? Number(versionRaw.number) || 1 : (typeof raw.version === 'number' ? raw.version : 1);

  return {
    id, title, spaceId, spaceName, spaceKey, status,
    authorId, authorName, createdAt, updatedAt,
    parentId, parentTitle, version,
  };
}

export function parsePages(result: unknown): NormalizedConfluencePage[] {
  if (!result || typeof result !== 'object') return [];
  const r = result as Record<string, unknown>;
  const list = (r.results ?? r.pages ?? r.values ?? []) as Record<string, unknown>[];
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => item && typeof item === 'object')
    .map(normalizePage)
    .filter((page) => page.id && page.title);
}

export function parseSpaces(result: unknown): ConfluenceSpace[] {
  if (!result || typeof result !== 'object') return [];
  const r = result as Record<string, unknown>;
  const list = (r.results ?? r.spaces ?? r.values ?? []) as Record<string, unknown>[];
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: str(item.id),
      key: str(item.key),
      name: str(item.name),
      type: str(item.type),
      status: str(item.status),
    }))
    .filter((s) => s.id && s.key);
}

export function groupBySpace(pages: NormalizedConfluencePage[], spaces: ConfluenceSpace[]): ConfluenceSpaceGroup[] {
  const spaceMap = new Map<string, ConfluenceSpaceGroup>();
  const NO_SPACE = '__no_space__';

  const spaceNameMap = new Map<string, { name: string; key: string }>();
  for (const s of spaces) {
    spaceNameMap.set(s.id, { name: s.name, key: s.key });
  }

  for (const page of pages) {
    const sid = page.spaceId || NO_SPACE;
    if (!spaceMap.has(sid)) {
      const info = spaceNameMap.get(sid);
      const key = page.spaceKey || info?.key || '';
      let name = page.spaceName || info?.name || (sid === NO_SPACE ? '기타' : sid);
      if (isPersonalSpaceKey(key) && (!name || name === key)) {
        name = page.authorName || name;
      }
      spaceMap.set(sid, {
        spaceId: sid,
        spaceName: name,
        spaceKey: key,
        pages: [],
      });
    }
    spaceMap.get(sid)!.pages.push(page);
  }

  const groups = Array.from(spaceMap.values()).filter((g) => g.pages.length > 0);
  groups.sort((a, b) => {
    if (a.spaceId === NO_SPACE) return 1;
    if (b.spaceId === NO_SPACE) return -1;
    return a.spaceName.localeCompare(b.spaceName);
  });
  return groups;
}

// ── ConfluencePageDetail 정규화 ──

export function normalizePageDetail(raw: Record<string, unknown>): ConfluencePageDetail {
  const id = str(raw.id);
  const title = str(raw.title);

  const body = obj(raw.body);
  const atlasDocFormat = obj(body?.atlas_doc_format);
  let bodyAdf: unknown;
  if (atlasDocFormat?.value) {
    if (typeof atlasDocFormat.value === 'string') {
      try { bodyAdf = JSON.parse(atlasDocFormat.value as string); } catch { /* malformed ADF JSON */ }
    } else {
      bodyAdf = atlasDocFormat.value;
    }
  }
  const storage = obj(body?.storage);
  const storageRaw = str(storage?.value);
  const bodyHtml = confluenceToHtml(storageRaw);

  const space = obj(raw.space);
  const spaceKey = str(space?.key);
  const spaceName = str(space?.name);

  const version = obj(raw.version);
  const versionNumber = typeof version?.number === 'number' ? version.number : 1;
  const updatedAt = str(version?.when);

  const history = obj(raw.history);
  const createdBy = obj(history?.createdBy);
  const authorName = str(createdBy?.displayName) || str(createdBy?.publicName) || '';
  const createdAt = str(history?.createdDate);

  const rawAncestors = Array.isArray(raw.ancestors) ? raw.ancestors : [];
  const ancestors: ConfluenceAncestor[] = rawAncestors.map((a: unknown) => {
    const ao = a as Record<string, unknown>;
    return { id: str(ao.id), title: str(ao.title) };
  }).filter((a: ConfluenceAncestor) => a.id && a.title);

  return {
    id,
    title,
    bodyHtml,
    bodyAdf,
    storageRaw: storageRaw || undefined,
    spaceKey,
    spaceName,
    authorName,
    createdAt,
    updatedAt,
    version: versionNumber as number,
    ancestors,
  };
}

export function normalizeComment(raw: Record<string, unknown>): ConfluenceComment {
  const id = str(raw.id);

  const history = obj(raw.history);
  const createdBy = obj(history?.createdBy);
  const author = str(createdBy?.displayName) || str(createdBy?.publicName) || '';
  const created = str(history?.createdDate) || str(raw.created) || '';

  const body = obj(raw.body);
  const atlasDocFormat = obj(body?.atlas_doc_format);
  let bodyAdf: unknown;
  if (atlasDocFormat?.value) {
    if (typeof atlasDocFormat.value === 'string') {
      try { bodyAdf = JSON.parse(atlasDocFormat.value as string); } catch { /* malformed ADF JSON */ }
    } else {
      bodyAdf = atlasDocFormat.value;
    }
  }
  const storage = obj(body?.storage);
  const bodyHtml = confluenceToHtml(str(storage?.value));

  return { id, author, bodyHtml, bodyAdf, created };
}
