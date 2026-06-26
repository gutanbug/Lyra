/**
 * Jira 이슈 관련 공유 styled-components
 * JiraIssueHeader, JiraChildIssues, JiraLinkedIssues 등에서 공통 사용
 *
 * 새 디자인 시스템 — soft 배경(원래 색 12%) + 짙은 텍스트(원래 색).
 * 호출자는 기존 getStatusColor()/getPriorityColor()를 그대로 넘기면 됨.
 */
import styled from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';

export const StatusBadgeBtn = styled.button<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 11px;
  font-family: ${jiraTheme.font.body};
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.01em;
  border-radius: ${jiraTheme.radius.chipSmall};
  background: ${({ $color }) =>
    $color ? `color-mix(in srgb, ${$color} 16%, var(--lyra-c-surface, white))` : jiraTheme.status.todoSoft};
  color: ${({ $color }) => $color || jiraTheme.status.todo};
  white-space: nowrap;
  line-height: 1.2;
  border: none;
  cursor: pointer;
  transition: filter ${jiraTheme.motion.fast};

  &:hover { filter: brightness(0.96); }
`;

export const ChevronIcon = styled.span`
  font-size: 9px;
  line-height: 1;
  opacity: 0.7;
  margin-left: 2px;
`;
