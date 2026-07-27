import { getDocsStatusGroups, isDocsRowDraftUnchanged } from 'lib/utils/docsBoardGroups';
import {
  getVisibleDocsBoardPropertyKeys, reorderDocsBoardProperties,
} from 'lib/utils/docsBoardProperties';
import type { DocsDbState, DocsDbRow } from 'types/docs';

const row = (id: string, status: string): DocsDbRow => ({
  id,
  title: id,
  status: status as DocsDbRow['status'],
  assignee: '',
  priority: '보통',
  due: '',
  tags: [],
});

const db = (changes: Partial<DocsDbState> = {}): DocsDbState => ({
  sort: [],
  filter: [],
  groupBy: 'status',
  rows: [],
  seq: 1,
  views: ['board'],
  boardExtraGroups: [],
  boardGroupOrder: [],
  boardGroupColors: {},
  boardHiddenGroups: [],
  templates: [],
  customFields: [],
  tagOptions: [],
  propertyOrder: [],
  hiddenProperties: [],
  boardPropertyOrder: ['status', 'tags', 'checklist', 'priority'],
  boardHiddenProperties: [],
  ...changes,
});

describe('getDocsStatusGroups', () => {
  it('returns only groups that actually exist and follows the board order', () => {
    expect(getDocsStatusGroups(db({
      rows: [row('1', '진행중'), row('2', '해야 할 일')],
      boardExtraGroups: ['완료', '중단'],
      boardGroupOrder: ['해야 할 일', '진행중', '완료', '중단'],
    }))).toEqual(['해야 할 일', '진행중', '완료', '중단']);
  });

  it('keeps hidden groups available as valid status values', () => {
    expect(getDocsStatusGroups(db({
      rows: [row('1', '진행중')],
      boardExtraGroups: ['중단'],
      boardHiddenGroups: ['중단'],
    }))).toEqual(['진행중', '중단']);
  });

  it('does not mix another grouping field settings into status options', () => {
    expect(getDocsStatusGroups(db({
      groupBy: 'priority',
      rows: [row('1', '완료')],
      boardExtraGroups: ['긴급', '낮음'],
      boardGroupOrder: ['긴급', '낮음'],
    }))).toEqual(['완료']);
  });
});

describe('isDocsRowDraftUnchanged', () => {
  it('treats an untouched new card as unchanged', () => {
    const draft = row('1', '할 일');
    expect(isDocsRowDraftUnchanged(
      { row: draft, comments: [] },
      { ...draft },
      [],
    )).toBe(true);
  });

  it('detects input in either a card field or a comment', () => {
    const draft = row('1', '할 일');
    expect(isDocsRowDraftUnchanged(
      { row: draft, comments: [] },
      { ...draft, title: '새 카드' },
      [],
    )).toBe(false);
    expect(isDocsRowDraftUnchanged(
      { row: draft, comments: [] },
      { ...draft },
      [{ id: 'c1', text: '메모', ts: 1 }],
    )).toBe(false);
  });
});

describe('getVisibleDocsBoardPropertyKeys', () => {
  it('keeps the dragged order and removes properties hidden with the eye button', () => {
    expect(getVisibleDocsBoardPropertyKeys(db({
      boardPropertyOrder: ['priority', 'checklist', 'tags', 'status'],
      boardHiddenProperties: ['tags'],
    }))).toEqual(['priority', 'checklist', 'status']);
  });

  it('places the dragged property at the indicated preview position', () => {
    const order = ['status', 'tags', 'checklist', 'priority'];
    expect(reorderDocsBoardProperties(order, 'priority', 'tags', 'before'))
      .toEqual(['status', 'priority', 'tags', 'checklist']);
    expect(reorderDocsBoardProperties(order, 'status', 'checklist', 'after'))
      .toEqual(['tags', 'checklist', 'status', 'priority']);
  });
});
