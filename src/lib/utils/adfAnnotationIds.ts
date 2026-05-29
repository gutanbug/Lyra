/**
 * ADF 트리에서 inline comment annotation marker id 를 수집.
 * Confluence 본문 ADF 의 text 노드 marks[] 에 들어가는
 * { type: 'annotation', attrs: { id, annotationType: 'inlineComment' } } 만 대상.
 */
export function collectInlineCommentMarkerIds(adf: unknown): Set<string> {
  const ids = new Set<string>();

  function walk(node: unknown): void {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;

    if (n.type === 'text' && Array.isArray(n.marks)) {
      for (const m of n.marks as Record<string, unknown>[]) {
        if (m.type === 'annotation') {
          const attrs = m.attrs as Record<string, unknown> | undefined;
          if (attrs?.annotationType === 'inlineComment' && typeof attrs.id === 'string' && attrs.id) {
            ids.add(attrs.id);
          }
        }
      }
    }

    const content = n.content as unknown[] | undefined;
    if (Array.isArray(content)) content.forEach(walk);
  }

  walk(adf);
  return ids;
}
