import React from 'react';
import styled from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { getStatusColor } from 'lib/utils/jiraUtils';
import { Check, CheckCheck, EyeOff } from 'lucide-react';
import type { StatusCount } from 'lib/hooks/useJiraSearch';
import type { AssigneeCount } from 'lib/hooks/jira/useJiraAssigneeFilter';
import JiraAssigneeFilterMenu from 'components/jira/JiraAssigneeFilterMenu';

interface JiraStatusSummaryProps {
  statusCounts: StatusCount[];
  selectedStatuses: Set<string>;
  onToggleStatus: (name: string) => void;
  isDoneOnlyActive: boolean;
  onToggleDoneOnly: () => void;
  isHideDoneActive: boolean;
  onToggleHideDone: () => void;
  assigneeCounts: AssigneeCount[];
  isAssigneeSelected: (name: string) => boolean;
  onToggleAssignee: (name: string) => void;
  isAssigneeFilterActive: boolean;
  assigneeSelectedCount: number;
  onClearAssigneeFilter: () => void;
}

const JiraStatusSummary = ({
  statusCounts, selectedStatuses, onToggleStatus, isDoneOnlyActive, onToggleDoneOnly,
  isHideDoneActive, onToggleHideDone,
  assigneeCounts, isAssigneeSelected, onToggleAssignee, isAssigneeFilterActive, assigneeSelectedCount, onClearAssigneeFilter,
}: JiraStatusSummaryProps) => {
  const total = statusCounts.reduce((s, c) => s + c.count, 0);
  const hasFilter = selectedStatuses.size > 0;

  return (
    <StatusSummaryBar>
      <DoneOnlyBtn
        type="button"
        $active={isDoneOnlyActive}
        onClick={onToggleDoneOnly}
        title="완료 상태 이슈만 표시"
      >
        <CheckCheck size={12} strokeWidth={2.5} />
        완료만 보기
      </DoneOnlyBtn>
      <DoneOnlyBtn
        type="button"
        $active={isHideDoneActive}
        onClick={onToggleHideDone}
        title="완료 상태 이슈 제외"
      >
        <EyeOff size={12} strokeWidth={2.5} />
        완료 제외
      </DoneOnlyBtn>
      <JiraAssigneeFilterMenu
        assigneeCounts={assigneeCounts}
        isSelected={isAssigneeSelected}
        onToggle={onToggleAssignee}
        isActive={isAssigneeFilterActive}
        selectedCount={assigneeSelectedCount}
        onClear={onClearAssigneeFilter}
      />
      {statusCounts.map((sc) => {
        const color = getStatusColor(sc.name, sc.category);
        const isSelected = selectedStatuses.has(sc.name);
        const dimmed = hasFilter && !isSelected;

        return (
          <StatusSummaryItem
            key={sc.name}
            $color={color}
            $selected={isSelected}
            $dimmed={dimmed}
            onClick={() => onToggleStatus(sc.name)}
          >
            {isSelected && (
              <CheckBadge $color={color}>
                <Check size={8} strokeWidth={3} />
              </CheckBadge>
            )}
            <StatusDot $color={color} />
            <StatusSummaryName>{sc.name}</StatusSummaryName>
            <StatusSummaryCount>{sc.count}</StatusSummaryCount>
            <StatusSummaryPercent>
              {total > 0 ? Math.round((sc.count / total) * 100) : 0}%
            </StatusSummaryPercent>
          </StatusSummaryItem>
        );
      })}
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

const DoneOnlyBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  background: ${({ $active }) => ($active ? jiraTheme.primary : jiraTheme.bg.default)};
  color: ${({ $active }) => ($active ? '#fff' : jiraTheme.text.primary)};
  border: 1.5px solid ${({ $active }) => ($active ? jiraTheme.primary : jiraTheme.border)};
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;

  &:hover {
    border-color: ${jiraTheme.primary};
  }
`;

const StatusSummaryItem = styled.div<{ $color: string; $selected: boolean; $dimmed: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  background: ${jiraTheme.bg.default};
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
  border: 1.5px solid ${({ $selected, $color }) => ($selected ? $color : 'transparent')};
  opacity: ${({ $dimmed }) => ($dimmed ? 0.45 : 1)};
  transition: all 0.15s ease;
  user-select: none;

  &:hover {
    opacity: ${({ $dimmed }) => ($dimmed ? 0.7 : 1)};
    border-color: ${({ $color }) => $color};
  }
`;

const CheckBadge = styled.span<{ $color: string }>`
  position: absolute;
  top: -5px;
  right: -5px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
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
