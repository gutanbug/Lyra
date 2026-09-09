import { describe, it, expect } from 'vitest';
import * as actions from 'modules/actions/docs';
import { reducer, normalizeDb } from 'modules/contexts/docs';
import { DOCS_DEFAULT_PROPERTY_KEYS } from 'types/docs';
import type { DocsState, DocsDbState } from 'types/docs';

describe('docs reducer', () => {
  it('PATCH merges the partial payload into state (shallow)', () => {
    const state = { activeId: 'a', spaces: [], pagesById: {} } as unknown as DocsState;
    const next = reducer(state, actions.patch({ activeId: 'b' }));
    expect(next.activeId).toBe('b');
    // 병합되지 않은 필드는 보존
    expect(next.spaces).toBe(state.spaces);
    // 불변성: 원본 state는 그대로
    expect(state.activeId).toBe('a');
  });

  it('RESET replaces the entire state with the payload', () => {
    const state = { activeId: 'a' } as unknown as DocsState;
    const replacement = { activeId: 'z' } as unknown as DocsState;
    expect(reducer(state, actions.reset(replacement))).toBe(replacement);
  });

  it('unknown action returns the same state reference', () => {
    const state = { activeId: 'a' } as unknown as DocsState;
    expect(reducer(state, { type: 'docs/UNKNOWN' } as unknown as actions.ActionType)).toBe(state);
  });
});

describe('normalizeDb (legacy schema migration)', () => {
  it('returns {} for undefined input', () => {
    expect(normalizeDb(undefined)).toEqual({});
  });

  it('fills defaults for a minimal legacy db entry', () => {
    const raw = { rows: [{ id: '1', title: '항목' }] } as unknown as DocsDbState;
    const out = normalizeDb({ db1: raw });

    expect(out.db1.boardExtraGroups).toEqual([]);
    expect(out.db1.boardGroupOrder).toEqual([]);
    expect(out.db1.boardGroupColors).toEqual({});
    expect(out.db1.customFields).toEqual([]);
    expect(out.db1.tagOptions).toEqual([]);
    // 누락된 rows[].tags 는 빈 배열로 채워진다
    expect(out.db1.rows[0].tags).toEqual([]);
    // propertyOrder 가 없으면 기본 키 세트를 사용
    expect(out.db1.propertyOrder).toEqual([...DOCS_DEFAULT_PROPERTY_KEYS]);
  });

  it('appends custom-field ids after known property order', () => {
    const raw = {
      rows: [],
      customFields: [{ id: 'cf_1', name: '메모', type: 'text' }],
      propertyOrder: ['status', 'priority'],
    } as unknown as DocsDbState;
    const out = normalizeDb({ db1: raw });

    // 기존 순서는 보존되고, 알려지지 않은 커스텀 키는 뒤에 붙는다
    expect(out.db1.propertyOrder).toContain('cf_1');
    expect(out.db1.propertyOrder.indexOf('cf_1')).toBeGreaterThan(
      out.db1.propertyOrder.indexOf('priority'),
    );
  });
});
