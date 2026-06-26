import { describe, it, expect } from 'vitest';
import { normalizeComment } from 'lib/utils/confluenceNormalizers';

describe('normalizeComment', () => {
  const baseRaw = {
    id: '12345',
    history: { createdBy: { displayName: '차현민' }, createdDate: '2026-05-29T12:00:00.000Z' },
    body: { storage: { value: '<p>hello</p>' } },
  };

  it('footer 댓글 — extensions 없으면 location=footer', () => {
    const result = normalizeComment({ ...baseRaw });
    expect(result.location).toBe('footer');
    expect(result.inlineProperties).toBeUndefined();
    expect(result.parentId).toBeUndefined();
  });

  it('inline-root 댓글 — extensions.location=inline + inlineProperties', () => {
    const result = normalizeComment({
      ...baseRaw,
      extensions: {
        location: 'inline',
        inlineProperties: { markerRef: 'marker-abc', originalSelection: '레거시 컬럼 확인' },
      },
    });
    expect(result.location).toBe('inline');
    expect(result.inlineProperties).toEqual({ markerRef: 'marker-abc', originalSelection: '레거시 컬럼 확인' });
    expect(result.parentId).toBeUndefined();
  });

  it('inline-reply 댓글 — ancestors 마지막 comment id 가 parentId', () => {
    const result = normalizeComment({
      ...baseRaw,
      extensions: { location: 'inline' },
      ancestors: [
        { id: 'page-1', type: 'page' },
        { id: 'parent-comment-1', type: 'comment' },
      ],
    });
    expect(result.location).toBe('inline');
    expect(result.parentId).toBe('parent-comment-1');
  });

  it('location 값이 비정상이면 footer 폴백', () => {
    const result = normalizeComment({ ...baseRaw, extensions: { location: 'unknown' } });
    expect(result.location).toBe('footer');
  });
});
