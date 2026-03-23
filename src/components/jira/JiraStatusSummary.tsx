import React from 'react';
import styled from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { getStatusColor } from 'lib/utils/jiraUtils';
import type { StatusCount } from 'lib/hooks/useJiraSearch';

interface JiraStatusSummaryProps {
  statusCounts: StatusCount[];
}

const JiraStatusSummary = ({ statusCounts }: JiraStatusSummaryProps) => {
  const total = statusCounts.reduce((s, c) => s + c.count, 0);

  return (
    <StatusSummaryBar>
      {statusCounts.map((sc) => (
        <StatusSummaryItem key={sc.name}>
          <StatusDot $color={getStatusColor(sc.name, sc.category)} />
          <StatusSummaryName>{sc.name}</StatusSummaryName>
          <StatusSummaryCount>{sc.count}</StatusSummaryCount>
          <StatusSummaryPercent>
            {total > 0 ? Math.round((sc.count / total) * 100) : 0}%
          </StatusSummaryPercent>
        </StatusSummaryItem>
      ))}
      <StatusSummaryTotal>
        합계 <strong>{total}</strong>
      </StatusSummaryTotal>
    </StatusSummaryBar>
  );
};

export default JiraStatusSummary;

// ── Styled Components ──

const StatusSummaryBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.5rem;
  background: ${jiraTheme.bg.subtle};
  border-bottom: 1px solid ${jiraTheme.border};
  flex-wrap: wrap;
  flex-shrink: 0;
`;

const StatusSummaryItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  background: ${jiraTheme.bg.default};
  border-radius: 6px;
  font-size: 0.75rem;
`;

const StatusDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const StatusSummaryName = styled.span`
  color: ${jiraTheme.text.primary};
  font-weight: 600;
`;

const StatusSummaryCount = styled.span`
  color: ${jiraTheme.text.primary};
  font-weight: 700;
`;

const StatusSummaryPercent = styled.span`
  color: ${jiraTheme.text.secondary};
  font-size: 0.6875rem;
`;

const StatusSummaryTotal = styled.div`
  margin-left: auto;
  font-size: 0.75rem;
  color: ${jiraTheme.text.secondary};

  strong {
    color: ${jiraTheme.text.primary};
    font-weight: 700;
  }
`;
