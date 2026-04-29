import { describe, it, expect } from 'vitest';
import {
  extractAtlassianUrlsFromHtml,
  enrichAtlassianLinksInHtml,
} from 'lib/utils/atlassianLinkEnricher';
import type { LinkMeta } from 'components/common/AdfRenderer';

describe('extractAtlassianUrlsFromHtml', () => {
  it('extracts hrefs from anchor tags', () => {
    const html = '<a href="https://acme.atlassian.net/browse/PROJ-1">x</a>';
    expect(extractAtlassianUrlsFromHtml(html)).toEqual([
      'https://acme.atlassian.net/browse/PROJ-1',
    ]);
  });

  it('extracts data-jira-key attributes (legacy macro)', () => {
    const html = '<a href="#" data-jira-key="PROJ-2">PROJ-2</a>';
    expect(extractAtlassianUrlsFromHtml(html)).toContain('PROJ-2');
  });

  it('deduplicates URLs', () => {
    const html = '<a href="https://acme.atlassian.net/browse/XY-1">a</a><a href="https://acme.atlassian.net/browse/XY-1">b</a>';
    expect(extractAtlassianUrlsFromHtml(html)).toEqual(['https://acme.atlassian.net/browse/XY-1']);
  });
});

describe('enrichAtlassianLinksInHtml', () => {
  it('renders Jira issue card with status badge', () => {
    const html = '<a href="https://acme.atlassian.net/browse/PROJ-1">PROJ-1</a>';
    const meta: Record<string, LinkMeta> = {
      'https://acme.atlassian.net/browse/PROJ-1': {
        kind: 'jira-issue',
        title: 'Fix bug',
        issueKey: 'PROJ-1',
        statusName: 'In Progress',
        statusCategory: 'indeterminate',
        iconKind: 'jira-issue-type',
      },
    };
    const out = enrichAtlassianLinksInHtml(html, meta);
    expect(out).toContain('class="atlassian-rich-link"');
    expect(out).toContain('data-link-kind="jira-issue"');
    expect(out).toContain('Fix bug');
    expect(out).toContain('In Progress');
  });

  it('renders Jira board card with viewLabel', () => {
    const html = '<a href="https://acme.atlassian.net/jira/software/c/projects/CMPTEAM/boards/1789/timeline">timeline</a>';
    const meta: Record<string, LinkMeta> = {
      'https://acme.atlassian.net/jira/software/c/projects/CMPTEAM/boards/1789/timeline': {
        kind: 'jira-board',
        title: '탭클라우드잇 | 타임라인',
        iconKind: 'jira-board',
      },
    };
    const out = enrichAtlassianLinksInHtml(html, meta);
    expect(out).toContain('탭클라우드잇 | 타임라인');
    expect(out).toContain('data-link-kind="jira-board"');
  });

  it('renders Confluence page card without status', () => {
    const html = '<a href="https://acme.atlassian.net/wiki/spaces/S/pages/100/Doc">Doc</a>';
    const meta: Record<string, LinkMeta> = {
      'https://acme.atlassian.net/wiki/spaces/S/pages/100/Doc': {
        kind: 'confluence-page',
        title: 'Doc',
        iconKind: 'confluence-page',
      },
    };
    const out = enrichAtlassianLinksInHtml(html, meta);
    expect(out).toContain('class="atlassian-rich-link"');
    expect(out).not.toContain('atlassian-rich-link-status');
  });

  it('leaves unmatched anchors untouched (plaintext fallback)', () => {
    const html = '<a href="https://example.com">x</a>';
    expect(enrichAtlassianLinksInHtml(html, {})).toBe(html);
  });

  it('escapes HTML in title', () => {
    const html = '<a href="https://acme.atlassian.net/browse/XY-1">x</a>';
    const meta: Record<string, LinkMeta> = {
      'https://acme.atlassian.net/browse/XY-1': {
        kind: 'jira-issue',
        title: '<script>alert(1)</script>',
        issueKey: 'XY-1',
      },
    };
    const out = enrichAtlassianLinksInHtml(html, meta);
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;script&gt;');
  });
});
