import { describe, it, expect } from 'vitest';
import { buildInlineThreads } from 'lib/utils/inlineThreadBuilder';
import type { ConfluenceComment } from 'types/confluence';

function mk(c: Partial<ConfluenceComment>): ConfluenceComment {
  return {
    id: c.id ?? 'x',
    author: c.author ?? 'A',
    bodyHtml: '',
    bodyAdf: undefined,
    created: c.created ?? '2026-05-29T00:00:00Z',
    location: c.location ?? 'inline',
    inlineProperties: c.inlineProperties,
    parentId: c.parentId,
  };
}

describe('buildInlineThreads', () => {
  it('empty input — 빈 결과', () => {
    const { threads, byMarkerRef } = buildInlineThreads([]);
    expect(threads).toEqual([]);
    expect(byMarkerRef).toEqual({});
  });

  it('footer 댓글은 제외', () => {
    const { threads } = buildInlineThreads([
      mk({ id: 'f1', location: 'footer' }),
    ]);
    expect(threads).toEqual([]);
  });

  it('inline-root 만 있으면 thread 1개, replies 0개', () => {
    const { threads, byMarkerRef } = buildInlineThreads([
      mk({ id: 'r1', inlineProperties: { markerRef: 'm1', originalSelection: 'sel' } }),
    ]);
    expect(threads).toHaveLength(1);
    expect(threads[0].markerRef).toBe('m1');
    expect(threads[0].replies).toEqual([]);
    expect(byMarkerRef['m1']).toBe(threads[0]);
  });

  it('root + 직속 reply 매칭', () => {
    const { byMarkerRef } = buildInlineThreads([
      mk({ id: 'r1', inlineProperties: { markerRef: 'm1', originalSelection: 's' } }),
      mk({ id: 'reply1', parentId: 'r1', created: '2026-05-29T01:00:00Z' }),
    ]);
    expect(byMarkerRef['m1'].replies.map((c) => c.id)).toEqual(['reply1']);
  });

  it('중첩 reply (reply-of-reply) — ancestor chain 따라가서 root 의 markerRef 회수', () => {
    const { byMarkerRef } = buildInlineThreads([
      mk({ id: 'root1', inlineProperties: { markerRef: 'mX', originalSelection: 's' } }),
      mk({ id: 'reply1', parentId: 'root1', created: '2026-05-29T01:00:00Z' }),
      mk({ id: 'reply2', parentId: 'reply1', created: '2026-05-29T02:00:00Z' }),
    ]);
    expect(byMarkerRef['mX'].replies.map((c) => c.id)).toEqual(['reply1', 'reply2']);
  });

  it('replies 시간순 정렬', () => {
    const { byMarkerRef } = buildInlineThreads([
      mk({ id: 'root', inlineProperties: { markerRef: 'm', originalSelection: 's' } }),
      mk({ id: 'b', parentId: 'root', created: '2026-05-29T03:00:00Z' }),
      mk({ id: 'a', parentId: 'root', created: '2026-05-29T01:00:00Z' }),
    ]);
    expect(byMarkerRef['m'].replies.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('root 없는 고아 reply 는 무시', () => {
    const { threads, byMarkerRef } = buildInlineThreads([
      mk({ id: 'orphan', parentId: 'missing' }),
    ]);
    expect(threads).toEqual([]);
    expect(byMarkerRef).toEqual({});
  });

  it('thread 순서 — root.created 시간순', () => {
    const { threads } = buildInlineThreads([
      mk({ id: 'r2', inlineProperties: { markerRef: 'm2', originalSelection: 's' }, created: '2026-05-29T02:00:00Z' }),
      mk({ id: 'r1', inlineProperties: { markerRef: 'm1', originalSelection: 's' }, created: '2026-05-29T01:00:00Z' }),
    ]);
    expect(threads.map((t) => t.markerRef)).toEqual(['m1', 'm2']);
  });
});
