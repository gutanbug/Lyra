import React from 'react';
import styled from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { transition } from 'lib/styles/styles';
import { formatDate } from 'lib/utils/jiraUtils';
import type { ConfluenceLink, ConfluencePageContent } from 'types/jira';

interface JiraConfluenceLinksProps {
  confluenceLinks: ConfluenceLink[];
  expandedPages: Set<string>;
  loadingPages: Set<string>;
  pageContents: Record<string, ConfluencePageContent>;
  toggleConfluencePage: (link: ConfluenceLink) => void;
  handleContentClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const JiraConfluenceLinks = ({
  confluenceLinks,
  expandedPages,
  loadingPages,
  pageContents,
  toggleConfluencePage,
  handleContentClick,
}: JiraConfluenceLinksProps) => {
  if (confluenceLinks.length === 0) return null;

  return (
    <Section>
      <SectionTitle>Confluence 콘텐츠 ({confluenceLinks.length})</SectionTitle>
      {confluenceLinks.map((link) => {
        const isExpanded = expandedPages.has(link.pageId);
        const isPageLoading = loadingPages.has(link.pageId);
        const content = pageContents[link.pageId];
        return (
          <ConfluenceToggle key={link.pageId}>
            <ConfluenceHeader onClick={() => toggleConfluencePage(link)}>
              <ToggleArrow>{isExpanded ? '▼' : '▶'}</ToggleArrow>
              <ConfluenceIcon>
                <svg width="12" height="12" viewBox="0 0 32 32" fill="none">
                  <path d="M3.8 22.6c-.4.7-.9 1.5-1.2 2-.3.5-.1 1.1.4 1.4l5.8 3.5c.5.3 1.1.1 1.4-.3.3-.5.7-1.1 1.2-1.9 2.2-3.5 4.4-3.1 8.4-1.2l5.9 2.8c.5.2 1.1 0 1.4-.5l2.9-6.2c.2-.5 0-1.1-.5-1.3-1.7-.8-5-2.4-8.1-3.8-6.7-3.2-13.4-3.2-17.6 5.5z" fill="white"/>
                  <path d="M28.2 9.4c.4-.7.9-1.5 1.2-2 .3-.5.1-1.1-.4-1.4L23.2 2.5c-.5-.3-1.1-.1-1.4.3-.3.5-.7 1.1-1.2 1.9-2.2 3.5-4.4 3.1-8.4 1.2L6.3 3.1c-.5-.2-1.1 0-1.4.5L2 9.8c-.2.5 0 1.1.5 1.3 1.7.8 5 2.4 8.1 3.8 6.7 3.2 13.4 3.2 17.6-5.5z" fill="rgba(255,255,255,0.7)"/>
                </svg>
              </ConfluenceIcon>
              <ConfluenceTitle>{link.title}</ConfluenceTitle>
              {link.lastUpdated && (
                <ConfluenceDate>{formatDate(link.lastUpdated)}</ConfluenceDate>
              )}
            </ConfluenceHeader>
            {isExpanded && (
              <ConfluenceBody>
                {isPageLoading ? (
                  <ConfluenceLoading>문서 로딩 중...</ConfluenceLoading>
                ) : content ? (
                  <ConfluenceContent onClick={handleContentClick} dangerouslySetInnerHTML={{ __html: content.body }} />
                ) : null}
              </ConfluenceBody>
            )}
          </ConfluenceToggle>
        );
      })}
    </Section>
  );
};

export default JiraConfluenceLinks;

const Section = styled.div`
  padding: 1.5rem;
  background: ${jiraTheme.bg.default};
  border-radius: 3px;
  border: 1px solid ${jiraTheme.border};
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h2`
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
`;

const ConfluenceToggle = styled.div`
  border: 1px solid ${jiraTheme.border};
  border-radius: 3px;
  overflow: hidden;

  & + & {
    margin-top: 0.5rem;
  }
`;

const ConfluenceHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: ${jiraTheme.bg.subtle};
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ${transition};

  &:hover {
    background: ${jiraTheme.bg.hover};
  }
`;

const ToggleArrow = styled.span`
  font-size: 0.65rem;
  color: ${jiraTheme.text.muted};
  width: 0.875rem;
  flex-shrink: 0;
`;

const ConfluenceIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 3px;
  background: #1868DB;
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
`;

const ConfluenceTitle = styled.span`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${jiraTheme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`;

const ConfluenceDate = styled.span`
  font-size: 0.75rem;
  color: ${jiraTheme.text.muted};
  flex-shrink: 0;
`;

const ConfluenceBody = styled.div`
  border-top: 1px solid ${jiraTheme.border};
  padding: 1rem;
  background: ${jiraTheme.bg.default};
`;

const ConfluenceLoading = styled.div`
  font-size: 0.8125rem;
  color: ${jiraTheme.text.muted};
`;

const RichContent = styled.div`
  font-size: 0.875rem;
  color: ${jiraTheme.text.primary};
  line-height: 1.6;

  p { margin: 0 0 0.5rem 0; }
  p:last-child { margin-bottom: 0; }

  h1, h2, h3, h4, h5, h6 {
    margin: 1rem 0 0.5rem 0;
    color: ${jiraTheme.text.primary};
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
    color: ${jiraTheme.primary};
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }

  span[data-renderer-mark="code"],
  code {
    background: ${jiraTheme.bg.subtle} !important;
    border: 1px solid ${jiraTheme.border} !important;
    border-radius: 3px !important;
    padding: 0.125rem 0.375rem !important;
    font-size: 0.8125rem !important;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace !important;
    color: ${jiraTheme.text.primary} !important;
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
      background: none !important;
      border: none !important;
      padding: 0 !important;
      color: inherit !important;
      font-size: inherit !important;
      font-family: inherit;
      white-space: inherit;
    }
  }

  blockquote {
    margin: 0.5rem 0;
    padding: 0.5rem 1rem;
    border-left: 3px solid ${jiraTheme.primary};
    background: ${jiraTheme.primaryLight};
    color: ${jiraTheme.text.secondary};
  }

  hr {
    border: none;
    border-top: 1px solid ${jiraTheme.border};
    margin: 1rem 0;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5rem 0;
  }
  th, td {
    border: 1px solid ${jiraTheme.border};
    padding: 0.5rem 0.625rem;
    font-size: 0.8125rem;
    text-align: left;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  th {
    background: ${jiraTheme.bg.subtle};
    font-weight: 600;
  }

  img.adf-image {
    max-width: 100%;
    border-radius: 3px;
  }

  .adf-panel {
    margin: 0.5rem 0;
    padding: 0.75rem 1rem;
    border-radius: 3px;
    border-left: 3px solid;
  }
  .adf-panel-info { border-color: ${jiraTheme.primary}; background: ${jiraTheme.primaryLight}; }
  .adf-panel-note { border-color: ${jiraTheme.issueType.epic}; background: #EAE6FF; }
  .adf-panel-success { border-color: ${jiraTheme.status.done}; background: #E3FCEF; }
  .adf-panel-warning { border-color: ${jiraTheme.priority.medium}; background: #FFFAE6; }
  .adf-panel-error { border-color: ${jiraTheme.issueType.bug}; background: #FFEBE6; }

  .adf-status {
    display: inline-block;
    padding: 0.125rem 0.375rem;
    font-size: 0.6875rem;
    font-weight: 600;
    border-radius: 3px;
    text-transform: uppercase;
    color: white;
  }
  .adf-status-blue { background: ${jiraTheme.primary}; }
  .adf-status-green { background: ${jiraTheme.status.done}; }
  .adf-status-yellow { background: ${jiraTheme.priority.medium}; }
  .adf-status-red { background: ${jiraTheme.issueType.bug}; }
  .adf-status-neutral { background: ${jiraTheme.status.default}; }
  .adf-status-purple { background: ${jiraTheme.issueType.epic}; }

  .adf-mention {
    color: ${jiraTheme.primary};
    background: ${jiraTheme.primaryLight};
    padding: 0.0625rem 0.25rem;
    border-radius: 3px;
    font-weight: 500;
  }

  .adf-media-placeholder {
    color: ${jiraTheme.text.muted};
    font-style: italic;
  }

  details {
    margin: 0.5rem 0;
    border: 1px solid ${jiraTheme.border};
    border-radius: 3px;

    summary {
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      font-weight: 500;
      background: ${jiraTheme.bg.subtle};
      &:hover { background: ${jiraTheme.bg.hover}; }
    }

    > *:not(summary) {
      padding: 0 0.75rem;
    }
  }

  .confluence-panel {
    margin: 0.5rem 0;
    padding: 0.75rem 1rem;
    border-radius: 3px;
    border-left: 3px solid;
  }
  .confluence-panel-info { border-color: ${jiraTheme.primary}; background: ${jiraTheme.primaryLight}; }
  .confluence-panel-note { border-color: ${jiraTheme.issueType.epic}; background: #EAE6FF; }
  .confluence-panel-tip { border-color: ${jiraTheme.status.done}; background: #E3FCEF; }
  .confluence-panel-warning { border-color: ${jiraTheme.priority.medium}; background: #FFFAE6; }
`;

const ConfluenceContent = styled(RichContent)`
  font-size: 0.8125rem;
  max-height: 400px;
  overflow-y: auto;
`;
