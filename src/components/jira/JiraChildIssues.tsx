import React from 'react';
import styled from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { transition } from 'lib/styles/styles';
import { getStatusColor } from 'lib/utils/jiraUtils';
import JiraTaskIcon, { resolveTaskType } from 'components/jira/JiraTaskIcon';
import JiraPriorityIcon from 'components/jira/JiraPriorityIcon';
import { StatusBadgeBtn, ChevronIcon } from 'components/jira/jiraIssueStyles';
import type { ChildIssue } from 'types/jira';

interface ChildWithGrandchildren extends ChildIssue {
  grandchildren: ChildIssue[];
}

interface JiraChildIssuesProps {
  childIssues: ChildWithGrandchildren[];
  childIssuesLoading: boolean;
  expandedChildren: Set<string>;
  setExpandedChildren: (fn: (prev: Set<string>) => Set<string>) => void;
  goToChildIssue: (key: string) => void;
  myDisplayName: string | undefined;
  onOpenTransition: (issueKey: string, statusName: string, e: React.MouseEvent) => void;
  onOpenAssignee: (issueKey: string, e: React.MouseEvent) => void;
  onOpenPriority: (issueKey: string, priorityName: string, e: React.MouseEvent) => void;
}

const JiraChildIssues = ({
  childIssues,
  childIssuesLoading,
  expandedChildren,
  setExpandedChildren,
  goToChildIssue,
  myDisplayName,
  onOpenTransition,
  onOpenAssignee,
  onOpenPriority,
}: JiraChildIssuesProps) => {
  if (childIssues.length === 0 && !childIssuesLoading) return null;

  return (
    <Section>
      <SectionTitle>
        하위 업무 항목 {childIssuesLoading ? '(로딩 중...)' : `(${childIssues.length})`}
      </SectionTitle>
      <ChildIssueList>
        {childIssues.map((ci) => (
          <React.Fragment key={ci.key}>
            <ChildIssueRow
              onClick={() => {
                if (ci.grandchildren.length > 0) {
                  setExpandedChildren((prev) => {
                    const next = new Set(prev);
                    if (next.has(ci.key)) next.delete(ci.key);
                    else next.add(ci.key);
                    return next;
                  });
                } else {
                  goToChildIssue(ci.key);
                }
              }}
            >
              <ChildIssueLeft>
                <GrandchildToggle $visible={ci.grandchildren.length > 0}>
                  {ci.grandchildren.length > 0 ? (expandedChildren.has(ci.key) ? '▼' : '▶') : ''}
                </GrandchildToggle>
                <JiraTaskIcon type={resolveTaskType(ci.issueTypeName)} size={18} />
                <ChildIssueKey
                  onClick={(e) => { e.stopPropagation(); goToChildIssue(ci.key); }}
                >
                  {ci.key}
                </ChildIssueKey>
                <ChildIssueSummary>{ci.summary || '(제목 없음)'}</ChildIssueSummary>
              </ChildIssueLeft>
              <ChildIssueRight>
                <PriorityBtn onClick={(e) => { e.stopPropagation(); onOpenPriority(ci.key, ci.priorityName, e); }} title={ci.priorityName}>
                  {ci.priorityName && <JiraPriorityIcon priority={ci.priorityName} size={16} />}
                </PriorityBtn>
                <ChildAssignee $isMe={ci.assigneeName === myDisplayName} onClick={(e) => { e.stopPropagation(); onOpenAssignee(ci.key, e); }}>
                  {ci.assigneeAvatarUrl && <AssigneeAvatar src={ci.assigneeAvatarUrl} alt="" />}
                  {ci.assigneeName || '미지정'}
                </ChildAssignee>
                <StatusBadgeBtn
                  $color={getStatusColor(ci.statusName, ci.statusCategory)}
                  onClick={(e) => { e.stopPropagation(); onOpenTransition(ci.key, ci.statusName, e); }}
                >
                  {ci.statusName || '-'}
                  <ChevronIcon>▾</ChevronIcon>
                </StatusBadgeBtn>
              </ChildIssueRight>
            </ChildIssueRow>
            {expandedChildren.has(ci.key) && ci.grandchildren.length > 0 && (
              <GrandchildList>
                {ci.grandchildren.map((gc) => (
                  <GrandchildRow key={gc.key}>
                    <ChildIssueLeft>
                      <JiraTaskIcon type={resolveTaskType(gc.issueTypeName)} size={16} />
                      <ChildIssueKey
                        onClick={() => goToChildIssue(gc.key)}
                      >
                        {gc.key}
                      </ChildIssueKey>
                      <ChildIssueSummary>{gc.summary || '(제목 없음)'}</ChildIssueSummary>
                    </ChildIssueLeft>
                    <ChildIssueRight>
                      <PriorityBtn onClick={(e) => { e.stopPropagation(); onOpenPriority(gc.key, gc.priorityName, e); }} title={gc.priorityName}>
                        {gc.priorityName && <JiraPriorityIcon priority={gc.priorityName} size={16} />}
                      </PriorityBtn>
                      <ChildAssignee $isMe={gc.assigneeName === myDisplayName} onClick={(e) => { e.stopPropagation(); onOpenAssignee(gc.key, e); }}>
                        {gc.assigneeAvatarUrl && <AssigneeAvatar src={gc.assigneeAvatarUrl} alt="" />}
                        {gc.assigneeName || '미지정'}
                      </ChildAssignee>
                      <StatusBadgeBtn
                        $color={getStatusColor(gc.statusName, gc.statusCategory)}
                        onClick={(e) => { e.stopPropagation(); onOpenTransition(gc.key, gc.statusName, e); }}
                      >
                        {gc.statusName || '-'}
                        <ChevronIcon>▾</ChevronIcon>
                      </StatusBadgeBtn>
                    </ChildIssueRight>
                  </GrandchildRow>
                ))}
              </GrandchildList>
            )}
          </React.Fragment>
        ))}
      </ChildIssueList>
    </Section>
  );
};

export default React.memo(JiraChildIssues);

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

const ChildIssueList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid ${jiraTheme.border};
  border-radius: ${jiraTheme.radius.ctl};
  overflow: hidden;
`;

const ChildIssueRow = styled.div`
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

const ChildIssueLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
`;

const ChildIssueKey = styled.span`
  font-family: ${jiraTheme.font.brand};
  font-weight: 600;
  font-size: 12.5px;
  letter-spacing: 0;
  color: ${jiraTheme.text.muted};
  flex-shrink: 0;
  cursor: pointer;
  transition: color ${jiraTheme.motion.fast};

  &:hover {
    color: ${jiraTheme.primary};
    text-decoration: underline;
  }
`;

const ChildIssueSummary = styled.span`
  font-family: ${jiraTheme.font.body};
  font-size: 14.5px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: ${jiraTheme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ChildIssueRight = styled.div`
  display: grid;
  grid-template-columns: 24px 7rem minmax(80px, 140px);
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
  justify-items: start;
`;

const PriorityBtn = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 6px;
  padding: 2px;
  transition: background ${jiraTheme.motion.fast};

  &:hover { background: ${jiraTheme.hairline}; }
`;

const ChildAssignee = styled.span<{ $isMe?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: ${jiraTheme.font.body};
  font-size: 12.5px;
  color: ${({ $isMe }) => ($isMe ? jiraTheme.primary : jiraTheme.text.secondary)};
  font-weight: ${({ $isMe }) => ($isMe ? 600 : 500)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  justify-content: flex-end;
  cursor: pointer;
  border-radius: 6px;
  padding: 2px 4px;
  transition: background ${jiraTheme.motion.fast};

  &:hover { background: ${jiraTheme.hairline}; }
`;

const AssigneeAvatar = styled.img`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
`;

const GrandchildToggle = styled.span<{ $visible?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  font-size: 0.625rem;
  color: ${({ $visible }) => $visible ? jiraTheme.text.secondary : 'transparent'};
  cursor: ${({ $visible }) => $visible ? 'pointer' : 'default'};
  flex-shrink: 0;

  &:hover {
    color: ${({ $visible }) => $visible ? jiraTheme.text.primary : 'transparent'};
  }
`;

const GrandchildList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-left: 24px;
  margin: 6px 0 10px;
  border-left: 2px solid ${jiraTheme.hairline};
`;

const GrandchildRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 14px;
  border-radius: ${jiraTheme.radius.ctl};
  cursor: pointer;
  transition: background ${jiraTheme.motion.fast};
  background: transparent;
  margin-left: 8px;

  &:hover { background: ${jiraTheme.hairline}; }
`;
