import React from 'react';
import styled from 'styled-components';
import { confluenceTheme } from 'lib/styles/confluenceTheme';
import { resolveConfluenceAttachments } from 'lib/utils/confluenceToHtml';
import { enrichAtlassianLinksInHtml } from 'lib/utils/atlassianLinkEnricher';
import type { LinkMeta } from 'components/common/AdfRenderer';

interface Props {
  html: string;
  attachmentUrlMap?: Record<string, string>;
  linkMetaMap?: Record<string, LinkMeta>;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
}

const ConfluenceHtmlBody = ({ html, attachmentUrlMap, linkMetaMap, onClick }: Props) => {
  const resolved = resolveConfluenceAttachments(html, attachmentUrlMap ?? {});
  const enriched = enrichAtlassianLinksInHtml(resolved, linkMetaMap ?? {});
  return (
    <RichContent onClick={onClick} dangerouslySetInnerHTML={{ __html: enriched }} />
  );
};

export default ConfluenceHtmlBody;

const RichContent = styled.div`
  font-size: 0.875rem;
  color: ${confluenceTheme.text.primary};
  line-height: 1.6;

  p { margin: 0 0 0.5rem 0; }
  p:last-child { margin-bottom: 0; }

  h1, h2, h3, h4, h5, h6 {
    margin: 1rem 0 0.5rem 0;
    color: ${confluenceTheme.text.primary};
    line-height: 1.3;
  }
  h1 { font-size: 1.25rem; }
  h2 { font-size: 1.125rem; }
  h3 { font-size: 1rem; }
  h4, h5, h6 { font-size: 0.875rem; }
  h1:first-of-type, h2:first-of-type, h3:first-of-type { margin-top: 0; }

  ul, ol {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }
  li { margin-bottom: 0.25rem; }

  a {
    color: ${confluenceTheme.primary};
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }

  code {
    background: ${confluenceTheme.bg.subtle};
    border: 1px solid ${confluenceTheme.border};
    border-radius: 3px;
    padding: 0.125rem 0.375rem;
    font-size: 0.8125rem;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  }

  pre {
    background: #263238;
    color: #EEFFFF;
    border-radius: 6px;
    padding: 0.75rem 1rem;
    margin: 0.5rem 0;
    overflow-x: auto;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 0.8125rem;
    line-height: 1.5;
    white-space: pre;
    word-wrap: normal;
    overflow-wrap: normal;

    code {
      background: none;
      border: none;
      padding: 0;
      color: inherit;
      font-size: inherit;
      font-family: inherit;
      white-space: inherit;
    }
  }

  blockquote {
    margin: 0.5rem 0;
    padding: 0.5rem 1rem;
    border-left: 3px solid ${confluenceTheme.primary};
    background: ${confluenceTheme.primaryLight};
    color: ${confluenceTheme.text.secondary};
  }

  hr {
    border: none;
    border-top: 1px solid ${confluenceTheme.border};
    margin: 1rem 0;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5rem 0;
  }
  th, td {
    border: 1px solid ${confluenceTheme.border};
    padding: 0.5rem 0.625rem;
    font-size: 0.8125rem;
    text-align: left;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  th {
    background: ${confluenceTheme.bg.subtle};
    font-weight: 600;
  }

  img {
    max-width: 100%;
    border-radius: 3px;
    cursor: zoom-in;
    transition: opacity 0.15s;
    &:hover { opacity: 0.85; }
  }

  .confluence-panel {
    margin: 0.5rem 0;
    padding: 0.75rem 1rem;
    border-radius: 3px;
    border-left: 3px solid;
  }
  .confluence-panel-info { border-color: ${confluenceTheme.primary}; background: ${confluenceTheme.primaryLight}; }
  .confluence-panel-note { border-color: #6554C0; background: #EAE6FF; }
  .confluence-panel-tip { border-color: #36B37E; background: #E3FCEF; }
  .confluence-panel-warning { border-color: #FF991F; background: #FFFAE6; }

  .adf-media-placeholder {
    color: ${confluenceTheme.text.muted};
    font-style: italic;
  }

  .confluence-mermaid {
    margin: 1rem 0;
    padding: 1rem;
    background: #fafafa;
    border: 1px solid ${confluenceTheme.border};
    border-radius: 3px;
    overflow-x: auto;
    white-space: pre-wrap;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 0.8125rem;
    color: ${confluenceTheme.text.secondary};
  }
  .confluence-mermaid-rendered {
    white-space: normal;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
    background: ${confluenceTheme.bg.default};
    text-align: center;

    svg {
      max-width: 100%;
      height: auto;
    }
  }

  details {
    margin: 0.5rem 0;
    border: 1px solid ${confluenceTheme.border};
    border-radius: 3px;

    summary {
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      font-weight: 500;
      background: ${confluenceTheme.bg.subtle};
      &:hover { background: ${confluenceTheme.bg.hover}; }
    }

    > *:not(summary) {
      padding: 0 0.75rem;
    }
  }

  /* Atlassian 리치 링크 카드 (Jira 이슈, Confluence 페이지 등) */
  a.atlassian-rich-link {
    display: inline-flex;
    align-items: center;
    text-decoration: none !important;
    color: inherit;
    vertical-align: middle;
  }

  .atlassian-rich-link-inner {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.125rem 0.5rem;
    border: 1px solid ${confluenceTheme.border};
    border-radius: 3px;
    background: ${confluenceTheme.bg.subtle};
    font-size: 0.8125rem;
    line-height: 1.5;
    transition: background 0.15s ease;

    &:hover {
      background: ${confluenceTheme.bg.hover};
    }
  }

  .atlassian-rich-link-icon {
    width: 16px;
    height: 16px;
    object-fit: contain;
    flex-shrink: 0;
  }
  .atlassian-rich-link-icon[class*="--generic"] {
    display: inline-block;
    background: ${confluenceTheme.bg.subtle};
    border-radius: 3px;
  }

  .atlassian-rich-link-key {
    color: ${confluenceTheme.primary};
    font-weight: 600;
    white-space: nowrap;
  }

  .atlassian-rich-link-title {
    color: ${confluenceTheme.text.primary};
    overflow: visible;
    white-space: normal;
  }

  .atlassian-rich-link-status {
    display: inline-flex;
    align-items: center;
    padding: 0.0625rem 0.375rem;
    border-radius: 3px;
    font-size: 0.6875rem;
    font-weight: 600;
    white-space: nowrap;
    text-transform: uppercase;
    color: ${confluenceTheme.text.secondary};
  }
`;
