import React from 'react';
import styled from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { transition } from 'lib/styles/styles';
import { getStatusColor, formatDate } from 'lib/utils/jiraUtils';
import JiraTaskIcon, { resolveTaskType } from 'components/jira/JiraTaskIcon';
import JiraPriorityIcon from 'components/jira/JiraPriorityIcon';
import { StatusBadgeBtn, ChevronIcon } from 'components/jira/jiraIssueStyles';
import { ExternalLink } from 'lucide-react';
import type { NormalizedDetail } from 'types/jira';
import type { JiraCredentials } from 'types/account';

interface JiraIssueHeaderProps {
  issue: NormalizedDetail;
  myDisplayName: string | undefined;
  activeAccount: { credentials: unknown };
  onOpenTransition: (issueKey: string, statusName: string, e: React.MouseEvent) => void;
  onOpenAssignee: (issueKey: string, e: React.MouseEvent) => void;
  onOpenPriority?: (issueKey: string, priorityName: string, e: React.MouseEvent) => void;
}

const JiraIssueHeader = ({
  issue,
  myDisplayName,
  activeAccount,
  onOpenTransition,
  onOpenAssignee,
  onOpenPriority,
}: JiraIssueHeaderProps) => {
  return (
    <HeaderCard>
      <HeaderTopRow>
        <IssueKeyRow>
          <JiraTaskIcon type={resolveTaskType(issue.issueTypeName)} size={24} />
          <IssueKeyLink>{issue.key}</IssueKeyLink>
        </IssueKeyRow>
        <OpenInBrowserBtn
          title="Jira에서 열기"
          onClick={() => {
            const creds = activeAccount.credentials as JiraCredentials;
            const baseUrl = creds.baseUrl?.replace(/\/$/, '') || '';
            if (baseUrl) {
              const url = `${baseUrl}/browse/${issue.key}`;
              const api = (window as any).electronAPI;
              if (api?.openExternal) {
                api.openExternal(url);
              } else {
                window.open(url, '_blank');
              }
            }
          }}
        >
          <ExternalLink size={16} />
        </OpenInBrowserBtn>
      </HeaderTopRow>
      <Badges>
        {issue.statusName && (
          <StatusBadgeBtn
            $color={getStatusColor(issue.statusName, issue.statusCategory)}
            onClick={(e) => onOpenTransition(issue.key, issue.statusName, e)}
          >
            {issue.statusName}
            <ChevronIcon>▾</ChevronIcon>
          </StatusBadgeBtn>
        )}
        {issue.priorityName && (
          <PriorityBadgeBtn onClick={(e) => onOpenPriority?.(issue.key, issue.priorityName, e)} title={issue.priorityName}>
            <JiraPriorityIcon priority={issue.priorityName} size={18} />
          </PriorityBadgeBtn>
        )}
      </Badges>
      <Title>{issue.summary || '(제목 없음)'}</Title>

      <MetaGrid>
        <MetaItem>
          <MetaLabel>담당자</MetaLabel>
          <MetaValue $isMe={issue.assigneeName === myDisplayName} $clickable onClick={(e) => onOpenAssignee(issue.key, e)}>{issue.assigneeName || '미지정'}</MetaValue>
        </MetaItem>
        <MetaItem>
          <MetaLabel>보고자</MetaLabel>
          <MetaValue>{issue.reporterName || '-'}</MetaValue>
        </MetaItem>
        <MetaItem>
          <MetaLabel>생성일</MetaLabel>
          <MetaValue>{formatDate(issue.created)}</MetaValue>
        </MetaItem>
        <MetaItem>
          <MetaLabel>수정일</MetaLabel>
          <MetaValue>{formatDate(issue.updated)}</MetaValue>
        </MetaItem>
        {issue.duedate && (
          <MetaItem>
            <MetaLabel>마감일</MetaLabel>
            <MetaValue>{issue.duedate.slice(0, 10)}</MetaValue>
          </MetaItem>
        )}
      </MetaGrid>
    </HeaderCard>
  );
};

export default JiraIssueHeader;

const HeaderCard = styled.div`
  padding: 1.5rem;
  background: ${jiraTheme.bg.default};
  border-radius: 3px;
  border: 1px solid ${jiraTheme.border};
  margin-bottom: 1rem;
`;

const HeaderTopRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
`;

const IssueKeyRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  min-width: 0;
`;

const IssueKeyLink = styled.span`
  font-weight: 700;
  font-size: 1.125rem;
  color: ${jiraTheme.primary};
`;

const OpenInBrowserBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: 1px solid ${jiraTheme.border};
  border-radius: 50%;
  color: ${jiraTheme.text.muted};
  cursor: pointer;
  transition: all 0.15s ${transition};

  &:hover {
    background: ${jiraTheme.primaryLight};
    border-color: ${jiraTheme.primary};
    color: ${jiraTheme.primary};
  }
`;

const Title = styled.h1`
  margin: 0.5rem 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
  line-height: 1.4;
`;

const Badges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const PriorityBadgeBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: 3px;
  border: 1px solid ${jiraTheme.border};
  background: ${jiraTheme.bg.subtle};
  color: ${jiraTheme.text.primary};
  cursor: pointer;
  transition: all 0.15s ${transition};

  &:hover {
    background: ${jiraTheme.bg.hover};
    border-color: ${jiraTheme.text.muted};
  }
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${jiraTheme.border};
`;

const MetaItem = styled.div`
  font-size: 0.8125rem;
`;

const MetaLabel = styled.span`
  display: block;
  color: ${jiraTheme.text.muted};
  margin-bottom: 0.25rem;
`;

const MetaValue = styled.span<{ $isMe?: boolean; $clickable?: boolean }>`
  color: ${({ $isMe }) => ($isMe ? jiraTheme.primary : jiraTheme.text.primary)};
  font-weight: ${({ $isMe }) => ($isMe ? 600 : 400)};
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  border-radius: 3px;
  padding: 0.125rem 0.25rem;

  &:hover {
    ${({ $clickable }) => $clickable && `background: ${jiraTheme.bg.hover};`}
  }
`;
