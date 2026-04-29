import React from 'react';
import styled from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { transition } from 'lib/styles/styles';
import JiraTaskIcon, { resolveTaskType } from 'components/jira/JiraTaskIcon';

interface BreadcrumbEntry {
  key: string;
  summary?: string;
  issueTypeName?: string;
}

interface Props {
  breadcrumbs: BreadcrumbEntry[];
  currentIssue: BreadcrumbEntry;
  onNavigate: (key: string) => void;
}

const JiraBreadcrumbs = ({ breadcrumbs, currentIssue, onNavigate }: Props) => {
  return (
    <Breadcrumbs>
      {breadcrumbs.map((b) => (
        <React.Fragment key={b.key}>
          <BreadcrumbSep>&gt;</BreadcrumbSep>
          <BreadcrumbItem onClick={() => onNavigate(b.key)} title={b.summary}>
            <JiraTaskIcon type={resolveTaskType(b.issueTypeName ?? '')} size={14} />
            <span>{b.key}</span>
            {b.summary && <BreadcrumbSummary>{b.summary}</BreadcrumbSummary>}
          </BreadcrumbItem>
        </React.Fragment>
      ))}
      <BreadcrumbSep>&gt;</BreadcrumbSep>
      <BreadcrumbCurrent title={currentIssue.summary}>
        <JiraTaskIcon type={resolveTaskType(currentIssue.issueTypeName ?? '')} size={14} />
        <span>{currentIssue.key}</span>
      </BreadcrumbCurrent>
    </Breadcrumbs>
  );
};

export default JiraBreadcrumbs;

const Breadcrumbs = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  overflow: hidden;
  flex-wrap: wrap;
`;

const BreadcrumbSep = styled.span`
  color: ${jiraTheme.text.muted};
  font-size: 0.8125rem;
  flex-shrink: 0;
`;

const BreadcrumbItem = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid ${jiraTheme.border};
  border-radius: 20px;
  color: ${jiraTheme.primary};
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ${transition};
  max-width: 280px;

  &:hover {
    background: ${jiraTheme.primaryLight};
    border-color: ${jiraTheme.primary};
  }
`;

const BreadcrumbSummary = styled.span`
  color: ${jiraTheme.text.secondary};
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const BreadcrumbCurrent = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
  background: ${jiraTheme.bg.subtle};
  border-radius: 3px;
  white-space: nowrap;
  flex-shrink: 0;
`;
