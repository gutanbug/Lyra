import { describe, it, expect } from 'vitest';
import { parseIssues, groupByEpic } from 'lib/utils/jiraNormalizers';

const makeIssue = (key: string, fields: Record<string, unknown>) => ({
  id: key,
  key,
  fields: {
    summary: `summary ${key}`,
    status: { name: 'To Do', statusCategory: { key: 'new', name: 'To Do' } },
    issuetype: { name: 'Task' },
    priority: { name: 'Medium' },
    created: '2026-06-01T00:00:00.000+0000',
    updated: '2026-06-01T00:00:00.000+0000',
    duedate: '2026-06-20',
    assignee: null,
    ...fields,
  },
});

const makeResult = (issues: unknown[]) => ({ issues });

describe('parseIssues startDate', () => {
  it('startDateByProject 미지정 → startDate 빈 문자열', () => {
    const issues = parseIssues(makeResult([makeIssue('PROJ-1', {})]));
    expect(issues[0].startDate).toBe('');
    expect(issues[0].duedate).toBe('2026-06-20');
  });

  it('rawFields 경유로 customfield 값 추출 (electron 통과 경로)', () => {
    const raw = {
      id: '1',
      key: 'PROJ-1',
      summary: 'sample',
      created: '2026-06-01',
      updated: '2026-06-01',
      duedate: '2026-06-20',
      rawFields: { customfield_10015: '2026-06-05' },
    };
    const issues = parseIssues(
      makeResult([raw]),
      { startDateByProject: { PROJ: 'customfield_10015' } },
    );
    expect(issues[0].startDate).toBe('2026-06-05');
  });

  it('raw fields 객체 직접 접근 (테스트 픽스처용 경로)', () => {
    const issues = parseIssues(
      makeResult([makeIssue('PROJ-2', { customfield_10015: '2026-06-10' })]),
      { startDateByProject: { PROJ: 'customfield_10015' } },
    );
    expect(issues[0].startDate).toBe('2026-06-10');
  });

  it('스프린트형 배열 → 첫 항목의 startDate 추출', () => {
    const issues = parseIssues(
      makeResult([
        makeIssue('PROJ-3', {
          customfield_10020: [{ name: 'Sprint A', startDate: '2026-06-12', state: 'active' }],
        }),
      ]),
      { startDateByProject: { PROJ: 'customfield_10020' } },
    );
    expect(issues[0].startDate).toBe('2026-06-12');
  });

  it('매핑된 필드가 응답에 없으면 빈 문자열', () => {
    const issues = parseIssues(
      makeResult([makeIssue('PROJ-4', {})]),
      { startDateByProject: { PROJ: 'customfield_10015' } },
    );
    expect(issues[0].startDate).toBe('');
  });

  it('다른 프로젝트 키는 매핑 무시', () => {
    const issues = parseIssues(
      makeResult([makeIssue('OTHER-1', { customfield_10015: '2026-06-05' })]),
      { startDateByProject: { PROJ: 'customfield_10015' } },
    );
    expect(issues[0].startDate).toBe('');
  });
});

describe('groupByEpic startDate/duedate propagation', () => {
  it('에픽 본인의 startDate/duedate가 EpicGroup에 그대로 들어감', () => {
    const epic = makeIssue('PROJ-100', { issuetype: { name: 'Epic' }, customfield_10015: '2026-05-01', duedate: '2026-08-31' });
    const child = makeIssue('PROJ-101', { parent: { key: 'PROJ-100' }, customfield_10015: '2026-05-10' });
    const issues = parseIssues(
      makeResult([epic, child]),
      { startDateByProject: { PROJ: 'customfield_10015' } },
    );
    const groups = groupByEpic(issues);
    const g = groups.find((x) => x.key === 'PROJ-100');
    expect(g).toBeDefined();
    expect(g!.startDate).toBe('2026-05-01');
    expect(g!.duedate).toBe('2026-08-31');
    expect(g!.children).toHaveLength(1);
    expect(g!.children[0].startDate).toBe('2026-05-10');
  });
});
