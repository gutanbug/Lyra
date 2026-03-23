/**
 * Jira 이슈 관련 공유 styled-components
 * JiraIssueHeader, JiraChildIssues, JiraLinkedIssues 등에서 공통 사용
 */
import styled from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';

export const StatusBadgeBtn = styled.button<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.4rem;
  font-size: 0.6875rem;
  font-weight: 500;
  border-radius: 20px;
  background: ${({ $color }) => $color || jiraTheme.status.default};
  color: white;
  white-space: nowrap;
  border: none;
  cursor: pointer;
  transition: filter 0.15s;

  &:hover { filter: brightness(0.9); }
`;

export const ChevronIcon = styled.span`
  font-size: 0.625rem;
  line-height: 1;
  opacity: 0.8;
`;
