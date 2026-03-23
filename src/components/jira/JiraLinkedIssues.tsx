import React from 'react';
import styled from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { transition } from 'lib/styles/styles';
import { getStatusColor } from 'lib/utils/jiraUtils';
import JiraTaskIcon, { resolveTaskType } from 'components/jira/JiraTaskIcon';
import { StatusBadgeBtn, ChevronIcon } from 'components/jira/jiraIssueStyles';
import type { LinkedIssue } from 'types/jira';

interface JiraLinkedIssuesProps {
  linkedIssues: LinkedIssue[];
  goToChildIssue: (key: string) => void;
  onOpenTransition: (issueKey: string, statusName: string, e: React.MouseEvent) => void;
}

const JiraLinkedIssues = ({
  linkedIssues,
  goToChildIssue,
  onOpenTransition,
}: JiraLinkedIssuesProps) => {
  if (linkedIssues.length === 0) return null;

  return (
    <Section>
      <SectionTitle>연결된 업무 항목 ({linkedIssues.length})</SectionTitle>
      <LinkedIssueList>
        {linkedIssues.map((li) => (
          <LinkedIssueRow
            key={li.key}
            onClick={() => goToChildIssue(li.key)}
          >
            <LinkedIssueLeft>
              <JiraTaskIcon type={resolveTaskType(li.issueTypeName)} size={18} />
              <LinkedIssueKey>{li.key}</LinkedIssueKey>
              <LinkedIssueSummary>{li.summary || '(제목 없음)'}</LinkedIssueSummary>
            </LinkedIssueLeft>
            <LinkedIssueRight>
              <LinkTypeBadge>{li.linkType}</LinkTypeBadge>
              <StatusBadgeBtn
                $color={getStatusColor(li.statusName, li.statusCategory)}
                onClick={(e) => { e.stopPropagation(); onOpenTransition(li.key, li.statusName, e); }}
              >
                {li.statusName || '-'}
                <ChevronIcon>▾</ChevronIcon>
              </StatusBadgeBtn>
            </LinkedIssueRight>
          </LinkedIssueRow>
        ))}
      </LinkedIssueList>
    </Section>
  );
};

export default JiraLinkedIssues;

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

const LinkedIssueList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const LinkedIssueRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  background: ${jiraTheme.bg.subtle};
  border: 1px solid ${jiraTheme.border};
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.15s ${transition};

  &:hover {
    background: ${jiraTheme.bg.hover};
  }
`;

const LinkedIssueLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
`;

const LinkedIssueKey = styled.span`
  font-weight: 600;
  font-size: 0.8125rem;
  color: ${jiraTheme.primary};
  flex-shrink: 0;
`;

const LinkedIssueSummary = styled.span`
  font-size: 0.8125rem;
  color: ${jiraTheme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const LinkedIssueRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
`;

const LinkTypeBadge = styled.span`
  font-size: 0.6875rem;
  color: ${jiraTheme.text.muted};
  border: 1px solid ${jiraTheme.border};
  border-radius: 3px;
  padding: 0.125rem 0.375rem;
  white-space: nowrap;
`;
