import type { ConfluenceComment } from 'types/confluence';

export interface InlineThread {
  markerRef: string;
  originalSelection: string;
  root: ConfluenceComment;
  replies: ConfluenceComment[];
}

export interface BuildInlineThreadsResult {
  threads: InlineThread[];
  byMarkerRef: Record<string, InlineThread>;
}

export function buildInlineThreads(flatComments: ConfluenceComment[]): BuildInlineThreadsResult {
  const inlineFlat = flatComments.filter((c) => c.location === 'inline');
  const inlineById = new Map<string, ConfluenceComment>(inlineFlat.map((c) => [c.id, c]));
  const byMarkerRef: Record<string, InlineThread> = {};

  // 1) root 등록 (inlineProperties + parentId 없음)
  for (const c of inlineFlat) {
    if (c.inlineProperties && !c.parentId) {
      byMarkerRef[c.inlineProperties.markerRef] = {
        markerRef: c.inlineProperties.markerRef,
        originalSelection: c.inlineProperties.originalSelection,
        root: c,
        replies: [],
      };
    }
  }

  // 2) reply 매칭 — ancestor chain 을 따라가서 root 의 markerRef 회수
  for (const c of inlineFlat) {
    if (!c.parentId) continue;
    let cursor: ConfluenceComment | undefined = c;
    const visited = new Set<string>();
    while (cursor?.parentId) {
      if (visited.has(cursor.id)) break;
      visited.add(cursor.id);
      cursor = inlineById.get(cursor.parentId);
    }
    const markerRef = cursor?.inlineProperties?.markerRef;
    if (markerRef && byMarkerRef[markerRef]) {
      byMarkerRef[markerRef].replies.push(c);
    }
  }

  // 3) 정렬
  for (const t of Object.values(byMarkerRef)) {
    t.replies.sort((a, b) => a.created.localeCompare(b.created));
  }
  const threads = Object.values(byMarkerRef).sort((a, b) =>
    a.root.created.localeCompare(b.root.created)
  );

  return { threads, byMarkerRef };
}
