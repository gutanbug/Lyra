import { useCallback } from 'react';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { JIRA_KEY_RE, PAGE_MENTION_RE, DATE_MENTION_RE } from 'lib/utils/docsUtils';
import type { DocsJiraIssue, DocsPage } from 'types/docs';

const formatDateLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
};

const escapeHtml = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));

/** 인라인 칩(Jira/페이지/날짜) HTML 생성 + [[..]] 패턴 하이드레이션 — Source: makeChipHTML 등 */
export const useDocsInlineChips = () => {
  const { jiraType } = useDocs();

  const makeChipHTML = useCallback((issue: DocsJiraIssue) => {
    const tc = jiraType(issue.type);
    const label = issue.summary && issue.summary.length > 16 ? `${issue.summary.slice(0, 15)}…` : issue.summary;
    return `<span contenteditable="false" data-jira="${issue.key}" style="display:inline-flex;align-items:center;gap:4px;vertical-align:baseline;background:${docsTheme.accentSoft};color:${docsTheme.accent};font-weight:600;font-size:.9em;padding:1px 4px;border-radius:6px;margin:0 1px;cursor:pointer;user-select:none;white-space:nowrap"><span style="width:13px;height:13px;border-radius:4px;background:${tc.color};color:#fff;font-size:8px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;font-family:Sora">${tc.letter}</span>${issue.key}${label ? ` · ${escapeHtml(label)}` : ''}</span>`;
  }, [jiraType]);

  const makePageChipHTML = useCallback((page: DocsPage) => (
    `<span contenteditable="false" data-page="${page.id}" style="display:inline-flex;align-items:center;gap:3px;vertical-align:baseline;font-weight:500;color:${docsTheme.accent};border-bottom:1px solid color-mix(in srgb,${docsTheme.accent} 45%,transparent);padding:0 1px;margin:0 1px;cursor:pointer;user-select:none;white-space:nowrap"><span style="font-size:.95em">${page.icon || '📄'}</span>${escapeHtml(page.title || '제목 없음')}</span>`
  ), []);

  const makeDateChipHTML = useCallback((iso: string) => (
    `<span contenteditable="false" data-docs-date="${iso}" style="display:inline-flex;align-items:center;gap:3px;vertical-align:baseline;background:${docsTheme.surfaceSoft};border:1px solid ${docsTheme.border};color:${docsTheme.text2};font-size:.88em;padding:0 7px;border-radius:6px;margin:0 1px;cursor:pointer;user-select:none;white-space:nowrap">📅 ${formatDateLabel(iso)}</span>`
  ), []);

  return { makeChipHTML, makePageChipHTML, makeDateChipHTML };
};

/** el 내부 텍스트에서 [[KEY]] / [[page:id]] 패턴을 칩으로 치환 (포커스 중이 아닐 때만) */
export const buildHydratedHtml = (
  raw: string,
  resolveIssue: (key: string) => DocsJiraIssue | undefined,
  resolvePage: (id: string) => DocsPage | undefined,
  makeChipHTML: (issue: DocsJiraIssue) => string,
  makePageChipHTML: (page: DocsPage) => string,
  makeDateChipHTML: (iso: string) => string,
): string => {
  if (raw.indexOf('[[') === -1) return escapeHtml(raw);
  let out = escapeHtml(raw);
  out = out.replace(JIRA_KEY_RE, (m, key) => {
    const issue = resolveIssue(key);
    return issue ? makeChipHTML(issue) : m;
  });
  out = out.replace(PAGE_MENTION_RE, (m, id) => {
    const page = resolvePage(id);
    return page ? makePageChipHTML(page) : m;
  });
  out = out.replace(DATE_MENTION_RE, (m, iso) => makeDateChipHTML(iso));
  return out;
};
