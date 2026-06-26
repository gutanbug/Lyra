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
  padding: 26px 28px;
  background: ${jiraTheme.bg.default};
  border-radius: ${jiraTheme.radius.card};
  border: 1px solid ${jiraTheme.border};
  box-shadow: ${jiraTheme.shadow.card};
  margin-bottom: 18px;
`;

const SectionTitle = styled.h2`
  margin: 0 0 16px 0;
  font-family: ${jiraTheme.font.body};
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${jiraTheme.text.primary};
`;

const LinkedIssueList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid ${jiraTheme.border};
  border-radius: ${jiraTheme.radius.ctl};
  overflow: hidden;
`;

const LinkedIssueRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  background: ${jiraTheme.bg.default};
  border-bottom: 1px solid ${jiraTheme.hairline};
  cursor: pointer;
  transition: background ${jiraTheme.motion.fast};

  &:last-child { border-bottom: none; }
  &:hover { background: ${jiraTheme.bg.hover}; }
`;

const LinkedIssueLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
`;

const LinkedIssueKey = styled.span`
  font-family: ${jiraTheme.font.brand};
  font-weight: 600;
  font-size: 12.5px;
  letter-spacing: 0;
  color: ${jiraTheme.text.muted};
  flex-shrink: 0;
  transition: color ${jiraTheme.motion.fast};

  &:hover { color: ${jiraTheme.primary}; }
`;

const LinkedIssueSummary = styled.span`
  font-family: ${jiraTheme.font.body};
  font-size: 14.5px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: ${jiraTheme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const LinkedIssueRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

const LinkTypeBadge = styled.span`
  font-family: ${jiraTheme.font.body};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${jiraTheme.text.muted};
  background: ${jiraTheme.hairline};
  border-radius: ${jiraTheme.radius.chipSmall};
  padding: 4px 8px;
  white-space: nowrap;
`;
