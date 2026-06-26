import { describe, it, expect } from 'vitest';
import { collectInlineCommentMarkerIds } from 'lib/utils/adfAnnotationIds';

describe('collectInlineCommentMarkerIds', () => {
  it('빈/유효성 — 빈 Set 반환', () => {
    expect(collectInlineCommentMarkerIds(null).size).toBe(0);
    expect(collectInlineCommentMarkerIds({}).size).toBe(0);
    expect(collectInlineCommentMarkerIds({ type: 'doc' }).size).toBe(0);
  });

  it('text 노드의 annotation 마크 (annotationType=inlineComment) 만 수집', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'plain' },
            {
              type: 'text',
              text: 'highlighted',
              marks: [
                { type: 'annotation', attrs: { id: 'marker-1', annotationType: 'inlineComment' } },
              ],
            },
          ],
        },
      ],
    };
    const ids = collectInlineCommentMarkerIds(doc);
    expect([...ids]).toEqual(['marker-1']);
  });

  it('inlineComment 가 아닌 annotation 은 제외', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{
          type: 'text',
          text: 'x',
          marks: [{ type: 'annotation', attrs: { id: 'm', annotationType: 'highlight' } }],
        }],
      }],
    };
    expect(collectInlineCommentMarkerIds(doc).size).toBe(0);
  });

  it('중첩 노드 (table > tableRow > tableCell > paragraph > text) 도 회수', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'table',
        content: [{
          type: 'tableRow',
          content: [{
            type: 'tableCell',
            content: [{
              type: 'paragraph',
              content: [{
                type: 'text', text: 'x',
                marks: [{ type: 'annotation', attrs: { id: 'deep-1', annotationType: 'inlineComment' } }],
              }],
            }],
          }],
        }],
      }],
    };
    expect([...collectInlineCommentMarkerIds(doc)]).toEqual(['deep-1']);
  });

  it('동일 id 중복 제거', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [
          { type: 'text', text: 'a', marks: [{ type: 'annotation', attrs: { id: 'dup', annotationType: 'inlineComment' } }] },
        ]},
        { type: 'paragraph', content: [
          { type: 'text', text: 'b', marks: [{ type: 'annotation', attrs: { id: 'dup', annotationType: 'inlineComment' } }] },
        ]},
      ],
    };
    expect(collectInlineCommentMarkerIds(doc).size).toBe(1);
  });
});
