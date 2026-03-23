import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Loader, Settings, X } from 'lucide-react';
import { theme } from 'lib/styles/theme';
import { getServiceIcon } from 'lib/icons/services';
import { TASK_TYPE_COLORS, TASK_TYPE_LABELS, resolveTaskType } from 'components/jira/JiraTaskIcon';
import type { StatusCount, StatusIssue, RawJiraIssue, StatusGroup, JiraCtxMenu } from 'components/stats/types';

interface Props {
  rawJiraIssues: RawJiraIssue[];
  isJiraLoading: boolean;
  expandedStatus: string | null;
  statusIssues: StatusIssue[];
  filteredStatusIssues: StatusIssue[];
  isStatusIssuesLoading: boolean;
  showIssueTypeFilter: boolean;
  selectedIssueTypes: Set<string>;
  allIssueTypes: string[];
  ctxMenu: JiraCtxMenu | null;
  selectedYear: number | null;
  jiraStatusGroups: StatusGroup[];
  jiraStatusCounts: StatusCount[];
  jiraTotalCount: number;
  jiraDoneCount: number;
  jiraMaxCount: number;
  onExpandStatus: (statusName: string) => void;
  onToggleIssueType: (type: string) => void;
  onToggleIssueTypeFilter: (show: boolean) => void;
  onSetSelectedIssueTypes: (types: Set<string>) => void;
  onCtxMenu: (e: React.MouseEvent, issueKey: string, label: string) => void;
  onCloseCtxMenu: () => void;
  onOpenInNewTab: () => void;
  onGoToIssue: (issueKey: string) => void;
}

const StatsJiraSection = ({
  isJiraLoading,
  expandedStatus,
  statusIssues,
  filteredStatusIssues,
  isStatusIssuesLoading,
  showIssueTypeFilter,
  selectedIssueTypes,
  allIssueTypes,
  ctxMenu,
  selectedYear,
  jiraStatusGroups,
  jiraStatusCounts,
  jiraTotalCount,
  jiraDoneCount,
  jiraMaxCount,
  onExpandStatus,
  onToggleIssueType,
  onToggleIssueTypeFilter,
  onSetSelectedIssueTypes,
  onCtxMenu,
  onCloseCtxMenu,
  onOpenInNewTab,
  onGoToIssue,
}: Props) => {
  return (
    <>
      <SectionCard>
        <SectionHeader>
          <SectionIconWrap>{getServiceIcon('jira', 20)}</SectionIconWrap>
          <SectionTitle>Jira 이슈 통계</SectionTitle>
          {allIssueTypes.length > 0 && (
            <HeaderFilterButton onClick={() => onToggleIssueTypeFilter(true)} title="이슈 유형 필터">
              <Settings size={16} />
              {selectedIssueTypes.size > 0 && <FilterActiveDot />}
            </HeaderFilterButton>
          )}
        </SectionHeader>

        {isJiraLoading ? (
          <LoadingArea>
            <Spinner><Loader size={20} /></Spinner>
            <LoadingText>Jira 데이터를 불러오는 중...</LoadingText>
          </LoadingArea>
        ) : jiraStatusCounts.length === 0 ? (
          <EmptySection>
            {selectedYear !== null ? `${selectedYear}년에 ` : ''}담당된 이슈가 없습니다.
          </EmptySection>
        ) : (
          <>
            <StatsRow>
              <TotalBadge>
                총 <strong>{jiraTotalCount}</strong>건
              </TotalBadge>
              <CompletionRate>
                <CompletionLabel>완료율</CompletionLabel>
                <CompletionValue>
                  {jiraTotalCount > 0 ? Math.round((jiraDoneCount / jiraTotalCount) * 100) : 0}%
                </CompletionValue>
                <CompletionSub>({jiraDoneCount}/{jiraTotalCount})</CompletionSub>
              </CompletionRate>
            </StatsRow>
            <CompletionBarTrack>
              <CompletionBarFill $width={jiraTotalCount > 0 ? Math.round((jiraDoneCount / jiraTotalCount) * 100) : 0} />
            </CompletionBarTrack>
            <StatusGroupList>
              {jiraStatusGroups.map((group) => (
                <StatusGroup key={group.category}>
                  <StatusGroupHeader>
                    <StatusGroupDot $color={group.color} />
                    <StatusGroupName>{group.category}</StatusGroupName>
                    <StatusGroupCount>{group.total}건</StatusGroupCount>
                  </StatusGroupHeader>
                  <StatusBarList>
                    {group.statuses.map((s) => (
                      <React.Fragment key={s.name}>
                        <StatusBarItem
                          $clickable
                          onClick={() => onExpandStatus(s.name)}
                        >
                          <StatusBarLabel>
                            <StatusExpandIcon>{expandedStatus === s.name ? '▼' : '▶'}</StatusExpandIcon>
                            <StatusName>{s.name}</StatusName>
                            <StatusCountLabel>{s.count}건</StatusCountLabel>
                          </StatusBarLabel>
                          <StatusBarTrack>
                            <StatusBarFill
                              $color={group.color}
                              $width={Math.round((s.count / jiraMaxCount) * 100)}
                            />
                          </StatusBarTrack>
                        </StatusBarItem>
                        {expandedStatus === s.name && (
                          <IssueListWrap>
                            {isStatusIssuesLoading ? (
                              <IssueListLoading>
                                <Spinner><Loader size={14} /></Spinner>
                              </IssueListLoading>
                            ) : statusIssues.length === 0 ? (
                              <IssueListEmpty>이슈가 없습니다.</IssueListEmpty>
                            ) : (
                              <>
                                <IssueListHeader>
                                  <IssueListCount>
                                    {filteredStatusIssues.length === statusIssues.length
                                      ? `${statusIssues.length}건`
                                      : `${filteredStatusIssues.length} / ${statusIssues.length}건`}
                                  </IssueListCount>
                                </IssueListHeader>
                                {filteredStatusIssues.length === 0 ? (
                                  <IssueListEmpty>선택된 유형의 이슈가 없습니다.</IssueListEmpty>
                                ) : (
                                  filteredStatusIssues.map((issue) => {
                                    const taskType = resolveTaskType(issue.issueType);
                                    const typeColor = TASK_TYPE_COLORS[taskType];
                                    return (
                                      <IssueListItem
                                        key={issue.key}
                                        onClick={() => onGoToIssue(issue.key)}
                                        onContextMenu={(e) => onCtxMenu(e, issue.key, `${issue.key} ${issue.summary}`)}
                                      >
                                        <IssueKey $color={typeColor}>{issue.key}</IssueKey>
                                        <IssueTypeLabel $color={typeColor}>{TASK_TYPE_LABELS[taskType]}</IssueTypeLabel>
                                        <IssueSummary>{issue.summary}</IssueSummary>
                                      </IssueListItem>
                                    );
                                  })
                                )}
                              </>
                            )}
                          </IssueListWrap>
                        )}
                      </React.Fragment>
                    ))}
                  </StatusBarList>
                </StatusGroup>
              ))}
            </StatusGroupList>
          </>
        )}
      </SectionCard>

      {ctxMenu && (
        <CtxOverlay onClick={onCloseCtxMenu}>
          <CtxBox style={{ left: ctxMenu.x, top: ctxMenu.y }} onClick={(e) => e.stopPropagation()}>
            <CtxMenuItem onClick={onOpenInNewTab}>새 탭으로 열기</CtxMenuItem>
          </CtxBox>
        </CtxOverlay>
      )}

      {showIssueTypeFilter && (
        <FilterModalOverlay onClick={() => onToggleIssueTypeFilter(false)}>
          <FilterModal onClick={(e) => e.stopPropagation()}>
            <FilterModalHeader>
              <FilterModalTitle>이슈 유형 필터</FilterModalTitle>
              <FilterModalClose onClick={() => onToggleIssueTypeFilter(false)}>
                <X size={16} />
              </FilterModalClose>
            </FilterModalHeader>
            <FilterModalBody>
              {allIssueTypes.length === 0 ? (
                <FilterEmptyText>이슈 유형 정보가 없습니다.</FilterEmptyText>
              ) : (
                <>
                  <FilterSelectAll>
                    <FilterCheckbox
                      type="checkbox"
                      checked={selectedIssueTypes.size === 0}
                      onChange={() => onSetSelectedIssueTypes(new Set())}
                    />
                    <FilterLabel>전체 선택</FilterLabel>
                  </FilterSelectAll>
                  {allIssueTypes.map((type) => (
                    <FilterItem key={type}>
                      <FilterCheckbox
                        type="checkbox"
                        checked={selectedIssueTypes.size === 0 || selectedIssueTypes.has(type)}
                        onChange={() => {
                          if (selectedIssueTypes.size === 0) {
                            const all = new Set(allIssueTypes);
                            all.delete(type);
                            onSetSelectedIssueTypes(all);
                          } else {
                            onToggleIssueType(type);
                          }
                        }}
                      />
                      <FilterLabel>{type}</FilterLabel>
                    </FilterItem>
                  ))}
                </>
              )}
            </FilterModalBody>
          </FilterModal>
        </FilterModalOverlay>
      )}
    </>
  );
};

export default StatsJiraSection;

// ── Styled Components ──

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const SectionCard = styled.div`
  background: ${theme.bgPrimary};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1rem;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 1rem;
`;

const SectionIconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${theme.textPrimary};
  flex: 1;
`;

const HeaderFilterButton = styled.button`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${theme.textMuted};
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;

  &:hover {
    background: ${theme.bgTertiary};
    color: ${theme.textPrimary};
  }
`;

const FilterActiveDot = styled.span`
  position: absolute;
  top: 3px;
  right: 3px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${theme.blue};
`;

const LoadingArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem 0;
`;

const Spinner = styled.span`
  display: inline-flex;
  color: ${theme.blue};
  animation: ${spin} 1s linear infinite;
`;

const LoadingText = styled.span`
  font-size: 0.8125rem;
  color: ${theme.textMuted};
`;

const EmptySection = styled.div`
  padding: 1.5rem 0;
  text-align: center;
  font-size: 0.8125rem;
  color: ${theme.textMuted};
`;

const StatsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

const TotalBadge = styled.div`
  font-size: 0.875rem;
  color: ${theme.textSecondary};

  strong {
    font-weight: 700;
    color: ${theme.textPrimary};
  }
`;

const CompletionRate = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;

const CompletionLabel = styled.span`
  font-size: 0.75rem;
  color: ${theme.textMuted};
`;

const CompletionValue = styled.span`
  font-size: 1.125rem;
  font-weight: 700;
  color: #36B37E;
`;

const CompletionSub = styled.span`
  font-size: 0.75rem;
  color: ${theme.textMuted};
`;

const CompletionBarTrack = styled.div`
  width: 100%;
  height: 8px;
  background: ${theme.bgTertiary};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1.25rem;
`;

const CompletionBarFill = styled.div<{ $width: number }>`
  height: 100%;
  width: ${({ $width }) => $width}%;
  background: linear-gradient(90deg, #36B37E, #57D9A3);
  border-radius: 4px;
  transition: width 0.5s ease;
`;

const StatusGroupList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StatusGroup = styled.div``;

const StatusGroupHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid ${theme.border};
`;

const StatusGroupDot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const StatusGroupName = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${theme.textPrimary};
  flex: 1;
`;

const StatusGroupCount = styled.span`
  font-size: 0.8125rem;
  font-weight: 700;
  color: ${theme.textSecondary};
`;

const StatusBarList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-left: 1.25rem;
`;

const StatusBarItem = styled.div<{ $clickable?: boolean }>`
  cursor: ${({ $clickable }) => $clickable ? 'pointer' : 'default'};
  border-radius: 4px;
  padding: 0.25rem 0.375rem;
  margin: -0.25rem -0.375rem;
  transition: background 0.1s;

  ${({ $clickable }) => $clickable && `
    &:hover { background: ${theme.bgTertiary}; }
  `}
`;

const StatusBarLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
`;

const StatusExpandIcon = styled.span`
  font-size: 0.625rem;
  color: ${theme.textMuted};
  width: 0.75rem;
  flex-shrink: 0;
`;

const StatusName = styled.span`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${theme.textPrimary};
  flex: 1;
`;

const StatusCountLabel = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${theme.textSecondary};
`;

const StatusBarTrack = styled.div`
  width: 100%;
  height: 6px;
  background: ${theme.bgTertiary};
  border-radius: 3px;
  overflow: hidden;
`;

const StatusBarFill = styled.div<{ $color: string; $width: number }>`
  height: 100%;
  width: ${({ $width }) => $width}%;
  background: ${({ $color }) => $color};
  border-radius: 3px;
  transition: width 0.4s ease;
`;

const IssueListWrap = styled.div`
  margin: 0.25rem 0 0.5rem 0.75rem;
  border: 1px solid ${theme.border};
  border-radius: 6px;
  overflow: hidden;
  max-height: 300px;
  overflow-y: auto;
`;

const IssueListLoading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  font-size: 0.8125rem;
  color: ${theme.textMuted};
`;

const IssueListEmpty = styled.div`
  padding: 1rem;
  text-align: center;
  font-size: 0.8125rem;
  color: ${theme.textMuted};
`;

const IssueListHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 0.75rem;
  background: ${theme.bgTertiary};
  border-bottom: 1px solid ${theme.border};
`;

const IssueListCount = styled.span`
  font-size: 0.75rem;
  color: ${theme.textMuted};
  font-weight: 500;
`;

const IssueListItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background 0.1s;
  border-bottom: 1px solid ${theme.border};

  &:last-child { border-bottom: none; }
  &:hover { background: ${theme.bgSecondary}; }
`;

const IssueKey = styled.span<{ $color?: string }>`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ $color }) => $color || theme.blue};
  white-space: nowrap;
  flex-shrink: 0;
`;

const IssueTypeLabel = styled.span<{ $color: string }>`
  font-size: 0.6875rem;
  font-weight: 700;
  color: ${({ $color }) => $color};
  white-space: nowrap;
  flex-shrink: 0;
`;

const IssueSummary = styled.span`
  font-size: 0.8125rem;
  color: ${theme.textPrimary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
`;

const CtxOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 500;
`;

const CtxBox = styled.div`
  position: fixed;
  background: ${theme.bgPrimary};
  border: 1px solid ${theme.border};
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  min-width: 140px;
  padding: 0.25rem;
  z-index: 501;
`;

const CtxMenuItem = styled.div`
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  color: ${theme.textPrimary};
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: ${theme.blueLight};
    color: ${theme.blue};
  }
`;

const FilterModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const FilterModal = styled.div`
  background: ${theme.bgPrimary};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  width: 320px;
  max-height: 400px;
  display: flex;
  flex-direction: column;
`;

const FilterModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid ${theme.border};
`;

const FilterModalTitle = styled.h3`
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${theme.textPrimary};
`;

const FilterModalClose = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${theme.textMuted};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: ${theme.bgTertiary};
    color: ${theme.textPrimary};
  }
`;

const FilterModalBody = styled.div`
  padding: 0.75rem 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const FilterEmptyText = styled.div`
  padding: 1rem 0;
  text-align: center;
  font-size: 0.8125rem;
  color: ${theme.textMuted};
`;

const FilterSelectAll = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.375rem;
  border-bottom: 1px solid ${theme.border};
  margin-bottom: 0.25rem;
  cursor: pointer;
`;

const FilterItem = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.375rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: ${theme.bgSecondary};
  }
`;

const FilterCheckbox = styled.input`
  width: 1rem;
  height: 1rem;
  accent-color: ${theme.blue};
  cursor: pointer;
  flex-shrink: 0;
`;

const FilterLabel = styled.span`
  font-size: 0.8125rem;
  color: ${theme.textPrimary};
`;
