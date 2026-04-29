import { describe, it, expect } from 'vitest';
import { classifyAtlassianUrl } from 'lib/utils/atlassianUrlPatterns';

describe('classifyAtlassianUrl', () => {
  it('classifies Jira issue browse URL', () => {
    const ref = classifyAtlassianUrl('https://acme.atlassian.net/browse/PROJ-123');
    expect(ref).toEqual({
      kind: 'jira-issue',
      baseUrl: 'https://acme.atlassian.net',
      url: 'https://acme.atlassian.net/browse/PROJ-123',
      ids: { issueKey: 'PROJ-123' },
    });
  });

  it('classifies Jira issue with selectedIssue query', () => {
    const ref = classifyAtlassianUrl('https://acme.atlassian.net/jira/software/c/projects/PROJ/boards/1?selectedIssue=PROJ-9');
    expect(ref?.kind).toBe('jira-issue');
    expect(ref?.ids.issueKey).toBe('PROJ-9');
  });

  it('classifies Jira project URL', () => {
    const ref = classifyAtlassianUrl('https://acme.atlassian.net/jira/software/projects/CMPTEAM');
    expect(ref?.kind).toBe('jira-project');
    expect(ref?.ids.projectKey).toBe('CMPTEAM');
  });

  it('classifies Jira board URL (default view)', () => {
    const ref = classifyAtlassianUrl('https://acme.atlassian.net/jira/software/c/projects/CMPTEAM/boards/1789');
    expect(ref?.kind).toBe('jira-board');
    expect(ref?.ids.boardId).toBe('1789');
    expect(ref?.ids.projectKey).toBe('CMPTEAM');
    expect(ref?.ids.boardView).toBe('board');
  });

  it('classifies Jira board timeline URL', () => {
    const ref = classifyAtlassianUrl('https://acme.atlassian.net/jira/software/c/projects/CMPTEAM/boards/1789/timeline');
    expect(ref?.kind).toBe('jira-board');
    expect(ref?.ids.boardView).toBe('timeline');
  });

  it('classifies Jira board backlog URL', () => {
    const ref = classifyAtlassianUrl('https://acme.atlassian.net/jira/software/c/projects/CMPTEAM/boards/1789/backlog');
    expect(ref?.ids.boardView).toBe('backlog');
  });

  it('classifies Jira dashboard URL', () => {
    const ref = classifyAtlassianUrl('https://acme.atlassian.net/jira/dashboards/10001');
    expect(ref?.kind).toBe('jira-dashboard');
    expect(ref?.ids.dashboardId).toBe('10001');
  });

  it('classifies Jira filter URL', () => {
    const ref = classifyAtlassianUrl('https://acme.atlassian.net/issues/?filter=20002');
    expect(ref?.kind).toBe('jira-filter');
    expect(ref?.ids.filterId).toBe('20002');
  });

  it('classifies Confluence page URL with id', () => {
    const ref = classifyAtlassianUrl('https://acme.atlassian.net/wiki/spaces/SPACE/pages/123456/My+Page');
    expect(ref?.kind).toBe('confluence-page');
    expect(ref?.ids.pageId).toBe('123456');
    expect(ref?.ids.spaceKey).toBe('SPACE');
  });

  it('classifies Confluence display URL (page by title)', () => {
    const ref = classifyAtlassianUrl('https://acme.atlassian.net/wiki/display/SPACE/Some+Title');
    expect(ref?.kind).toBe('confluence-page');
    expect(ref?.ids.spaceKey).toBe('SPACE');
    expect(ref?.ids.pageTitle).toBe('Some Title');
  });

  it('classifies Confluence space URL', () => {
    const ref = classifyAtlassianUrl('https://acme.atlassian.net/wiki/spaces/SPACE');
    expect(ref?.kind).toBe('confluence-space');
    expect(ref?.ids.spaceKey).toBe('SPACE');
  });

  it('classifies Confluence space overview URL', () => {
    const ref = classifyAtlassianUrl('https://acme.atlassian.net/wiki/spaces/SPACE/overview');
    expect(ref?.kind).toBe('confluence-space');
    expect(ref?.ids.spaceKey).toBe('SPACE');
  });

  it('classifies Confluence blog URL', () => {
    const ref = classifyAtlassianUrl('https://acme.atlassian.net/wiki/spaces/SPACE/blog/2026/01/01/12345/Hello');
    expect(ref?.kind).toBe('confluence-blog');
    expect(ref?.ids.spaceKey).toBe('SPACE');
  });

  it('classifies Confluence tiny link', () => {
    const ref = classifyAtlassianUrl('https://acme.atlassian.net/wiki/x/AbCdEf');
    expect(ref?.kind).toBe('confluence-tiny');
    expect(ref?.ids.tinyKey).toBe('AbCdEf');
  });

  it('returns null for non-Atlassian URLs', () => {
    expect(classifyAtlassianUrl('https://example.com/foo')).toBeNull();
    expect(classifyAtlassianUrl('https://github.com/owner/repo')).toBeNull();
  });

  it('returns null for malformed URLs', () => {
    expect(classifyAtlassianUrl('not a url')).toBeNull();
    expect(classifyAtlassianUrl('')).toBeNull();
  });
});
