import React from 'react';
import styled, { keyframes } from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { transition } from 'lib/styles/styles';
import { getStatusColor } from 'lib/utils/jiraUtils';
import JiraTaskIcon, { resolveTaskType, TASK_TYPE_LABELS, TASK_TYPE_COLORS } from 'components/jira/JiraTaskIcon';
import JiraPriorityIcon from 'components/jira/JiraPriorityIcon';
import { Loader } from 'lucide-react';
import type { NormalizedIssue, EpicGroup } from 'types/jira';

interface JiraIssueListProps {
  browseProjectKey: string | null;
  browseEpics: NormalizedIssue[];
  browseChildrenMap: Record<string, NormalizedIssue[]>;
  isBrowseLoading: boolean;
  browseExpandedKeys: Set<string>;
  epicGroups: EpicGroup[];
  expandedEpics: Set<string>;
  defaultChildrenMap: Record<string, NormalizedIssue[]>;
  defaultExpandedChildren: Set<string>;
  defaultLoadingChildren: Set<string>;
  isLoading: boolean;
  isSearching: boolean;
  isSearchMode: boolean;
  myDisplayName: string | undefined;
  onToggleEpic: (epicKey: string) => void;
  onToggleBrowseEpic: (epicKey: string) => void;
  onExpandAll: (groups: EpicGroup[]) => void;
  onCollapseAll: () => void;
  onGoToIssue: (key: string) => void;
  onLoadBrowseChildren: (parentKey: string) => void;
  onLoadDefaultChildren: (parentKey: string) => void;
  onSetBrowseExpandedKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  onSetDefaultExpandedChildren: React.Dispatch<React.SetStateAction<Set<string>>>;
  onOpenTransitionDropdown: (issueKey: string, statusName: string, e: React.MouseEvent) => void;
  onOpenAssigneeDropdown: (issueKey: string, e: React.MouseEvent) => void;
  onOpenPriorityDropdown: (issueKey: string, priorityName: string, e: React.MouseEvent) => void;
  onItemContextMenu: (e: React.MouseEvent, path: string, label: string) => void;
}

const JiraIssueList = ({
  browseProjectKey,
  browseEpics,
  browseChildrenMap,
  isBrowseLoading,
  browseExpandedKeys,
  epicGroups,
  expandedEpics,
  defaultChildrenMap,
  defaultExpandedChildren,
  defaultLoadingChildren,
  isLoading,
  isSearching,
  isSearchMode,
  myDisplayName,
  onToggleEpic,
  onToggleBrowseEpic,
  onExpandAll,
  onCollapseAll,
  onGoToIssue,
  onLoadBrowseChildren,
  onLoadDefaultChildren,
  onSetBrowseExpandedKeys,
  onSetDefaultExpandedChildren,
  onOpenTransitionDropdown,
  onOpenAssigneeDropdown,
  onOpenPriorityDropdown,
  onItemContextMenu,
}: JiraIssueListProps) => {

  // 브라우즈 모드 하위 항목 재귀 렌더링
  const renderBrowseChildren = (parentKey: string, depth: number): React.ReactNode[] => {
    const children = browseChildrenMap[parentKey] || [];
    const rows: React.ReactNode[] = [];

    for (const issue of children) {
      const childChildren = browseChildrenMap[issue.key] || [];
      const canExpand = issue.subtaskCount > 0 || childChildren.length > 0;
      const isChildExpanded = browseExpandedKeys.has(issue.key);

      rows.push(
        <IssueRow
          key={issue.key || issue.id}
          onClick={() => {
            if (canExpand) {
              onLoadBrowseChildren(issue.key);
              onSetBrowseExpandedKeys((prev) => {
                const next = new Set(prev);
                if (next.has(issue.key)) next.delete(issue.key);
                else next.add(issue.key);
                return next;
              });
            }
          }}
          onContextMenu={(e) => onItemContextMenu(e, `/jira/issue/${issue.key}`, `${issue.key} ${issue.summary}`)}
        >
          <IssueKeyCell style={{ paddingLeft: `${depth * 24}px` }}>
            {canExpand ? (
              <SubTaskToggle>{isChildExpanded ? '\u25BC' : '\u25B6'}</SubTaskToggle>
            ) : (
              <SubTaskToggleSpacer />
            )}
            <JiraTaskIcon type={resolveTaskType(issue.issueTypeName)} size={18} />
            <IssueTypeLabel $color={TASK_TYPE_COLORS[resolveTaskType(issue.issueTypeName)]}>
              {TASK_TYPE_LABELS[resolveTaskType(issue.issueTypeName)]}
            </IssueTypeLabel>
            <IssueKey onClick={(e) => { e.stopPropagation(); onGoToIssue(issue.key); }}>
              {issue.key}
            </IssueKey>
          </IssueKeyCell>
          <IssueSummary>{issue.summary || '(제목 없음)'}</IssueSummary>
          <PriorityCell title={issue.priorityName || ''} onClick={(e) => { e.stopPropagation(); onOpenPriorityDropdown(issue.key, issue.priorityName, e); }}>
            {issue.priorityName && <JiraPriorityIcon priority={issue.priorityName} size={16} />}
          </PriorityCell>
          <AssigneeText $isMe={issue.assigneeName === myDisplayName} $clickable onClick={(e) => { e.stopPropagation(); onOpenAssigneeDropdown(issue.key, e); }}>
            {issue.assigneeName || '미지정'}
          </AssigneeText>
          <StatusBadgeBtn
            $color={getStatusColor(issue.statusName, issue.statusCategory)}
            onClick={(e) => { e.stopPropagation(); onOpenTransitionDropdown(issue.key, issue.statusName, e); }}
          >
            {issue.statusName || '-'}
            <ChevronIcon>{'\u25BE'}</ChevronIcon>
          </StatusBadgeBtn>
        </IssueRow>,
      );

      if (isChildExpanded) {
        rows.push(...renderBrowseChildren(issue.key, depth + 1));
      }
    }

    return rows;
  };

  // 기본 모드 N-depth 하위 항목 재귀 렌더링
  const renderDefaultChildren = (parentKey: string, depth: number): React.ReactNode[] => {
    const children = defaultChildrenMap[parentKey] || [];
    if (children.length === 0) return [];

    const rows: React.ReactNode[] = [];

    for (const issue of children) {
      const childChildren = defaultChildrenMap[issue.key] || [];
      const canExpand = issue.subtaskCount > 0 || childChildren.length > 0;
      const isChildExpanded = defaultExpandedChildren.has(issue.key);
      const isChildLoading = defaultLoadingChildren.has(issue.key);

      rows.push(
        <IssueRow
          key={issue.key || issue.id}
          onClick={() => {
            if (canExpand) {
              if (isChildExpanded) {
                onSetDefaultExpandedChildren((prev) => {
                  const next = new Set(prev);
                  next.delete(issue.key);
                  return next;
                });
              } else {
                onLoadDefaultChildren(issue.key);
              }
            }
          }}
          onContextMenu={(e) => onItemContextMenu(e, `/jira/issue/${issue.key}`, `${issue.key} ${issue.summary}`)}
        >
          <IssueKeyCell style={{ paddingLeft: `${depth * 24}px` }}>
            {canExpand ? (
              <SubTaskToggle>
                {isChildLoading ? <Loader size={10} /> : isChildExpanded ? '\u25BC' : '\u25B6'}
              </SubTaskToggle>
            ) : (
              <SubTaskToggleSpacer />
            )}
            <JiraTaskIcon type={resolveTaskType(issue.issueTypeName)} size={18} />
            <IssueTypeLabel $color={TASK_TYPE_COLORS[resolveTaskType(issue.issueTypeName)]}>
              {TASK_TYPE_LABELS[resolveTaskType(issue.issueTypeName)]}
            </IssueTypeLabel>
            <IssueKey onClick={(e) => { e.stopPropagation(); onGoToIssue(issue.key); }}>
              {issue.key}
            </IssueKey>
          </IssueKeyCell>
          <IssueSummary>{issue.summary || '(제목 없음)'}</IssueSummary>
          <PriorityCell title={issue.priorityName || ''} onClick={(e) => { e.stopPropagation(); onOpenPriorityDropdown(issue.key, issue.priorityName, e); }}>
            {issue.priorityName && <JiraPriorityIcon priority={issue.priorityName} size={16} />}
          </PriorityCell>
          <AssigneeText $isMe={issue.assigneeName === myDisplayName} $clickable onClick={(e) => { e.stopPropagation(); onOpenAssigneeDropdown(issue.key, e); }}>
            {issue.assigneeName || '미지정'}
          </AssigneeText>
          <StatusBadgeBtn
            $color={getStatusColor(issue.statusName, issue.statusCategory)}
            onClick={(e) => { e.stopPropagation(); onOpenTransitionDropdown(issue.key, issue.statusName, e); }}
          >
            {issue.statusName || '-'}
            <ChevronIcon>{'\u25BE'}</ChevronIcon>
          </StatusBadgeBtn>
        </IssueRow>,
      );

      if (isChildExpanded) {
        rows.push(...renderDefaultChildren(issue.key, depth + 1));
      }
    }

    return rows;
  };

  return (
    <Content>
      {browseProjectKey ? (
        /* ── 사이드바 프로젝트 브라우즈 모드 ── */
        <>
          <SectionHeader>
            <SectionTitle>
              {browseProjectKey} 전체 이슈 ({browseEpics.length}건)
            </SectionTitle>
            {browseEpics.length > 0 && (
              <ToggleAllButtons>
                <SmallBtn onClick={() => {
                  const allKeys = new Set<string>();
                  browseEpics.forEach((e) => allKeys.add(e.key));
                  for (const [key, children] of Object.entries(browseChildrenMap)) {
                    if (children.length > 0) allKeys.add(key);
                  }
                  onSetBrowseExpandedKeys(allKeys);
                  browseEpics.forEach((e) => onLoadBrowseChildren(e.key));
                }}>모두 펼치기</SmallBtn>
                <SmallBtn onClick={() => onSetBrowseExpandedKeys(new Set())}>모두 접기</SmallBtn>
              </ToggleAllButtons>
            )}
          </SectionHeader>

          {isBrowseLoading ? (
            <LoadingArea>
              <Spinner />
              <LoadingText>에픽 조회 중</LoadingText>
            </LoadingArea>
          ) : browseEpics.length === 0 ? (
            <Empty>에픽이 없습니다.</Empty>
          ) : (
            <EpicList>
              {browseEpics.map((epic) => {
                const isExpanded = browseExpandedKeys.has(epic.key);
                const epicChildren = browseChildrenMap[epic.key] || [];
                return (
                  <EpicCard key={epic.key}>
                    <EpicHeader onClick={() => onToggleBrowseEpic(epic.key)}>
                      <EpicHeaderLeft>
                        <EpicToggle>{isExpanded ? '\u25BC' : '\u25B6'}</EpicToggle>
                        <JiraTaskIcon type={resolveTaskType(epic.issueTypeName)} size={18} />
                        <IssueTypeLabel $color={TASK_TYPE_COLORS[resolveTaskType(epic.issueTypeName)]}>
                          {TASK_TYPE_LABELS[resolveTaskType(epic.issueTypeName)]}
                        </IssueTypeLabel>
                        <EpicKey
                          onClick={(e) => { e.stopPropagation(); onGoToIssue(epic.key); }}
                          onContextMenu={(e) => onItemContextMenu(e, `/jira/issue/${epic.key}`, epic.key)}
                        >
                          {epic.key}
                        </EpicKey>
                        <EpicSummary>{epic.summary}</EpicSummary>
                      </EpicHeaderLeft>
                      <EpicPriority onClick={(e) => { e.stopPropagation(); onOpenPriorityDropdown(epic.key, epic.priorityName, e); }} title={epic.priorityName || ''}>
                        {epic.priorityName && <JiraPriorityIcon priority={epic.priorityName} size={16} />}
                      </EpicPriority>
                      <EpicAssignee $clickable onClick={(e) => { e.stopPropagation(); onOpenAssigneeDropdown(epic.key, e); }}>
                        {epic.assigneeName || '미지정'}
                      </EpicAssignee>
                      {epic.statusName ? (
                        <StatusBadgeBtn
                          $color={getStatusColor(epic.statusName, epic.statusCategory)}
                          onClick={(e) => { e.stopPropagation(); onOpenTransitionDropdown(epic.key, epic.statusName, e); }}
                        >
                          {epic.statusName}
                          <ChevronIcon>{'\u25BE'}</ChevronIcon>
                        </StatusBadgeBtn>
                      ) : <span />}
                      <EpicCount>{epicChildren.length}</EpicCount>
                    </EpicHeader>

                    {isExpanded && (
                      <IssueTable>
                        {epicChildren.length > 0 && (
                          <TableHeader>
                            <span>키</span>
                            <span>요약</span>
                            <span>P</span>
                            <span>담당자</span>
                            <span>상태</span>
                          </TableHeader>
                        )}
                        {epicChildren.map((issue) => {
                          const childChildren = browseChildrenMap[issue.key] || [];
                          const canExpand = issue.subtaskCount > 0 || childChildren.length > 0;
                          const isChildExpanded = browseExpandedKeys.has(issue.key);
                          return (
                            <React.Fragment key={issue.key || issue.id}>
                              <IssueRow
                                onClick={() => {
                                  if (canExpand) {
                                    onLoadBrowseChildren(issue.key);
                                    onSetBrowseExpandedKeys((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(issue.key)) next.delete(issue.key);
                                      else next.add(issue.key);
                                      return next;
                                    });
                                  }
                                }}
                                onContextMenu={(e) => onItemContextMenu(e, `/jira/issue/${issue.key}`, `${issue.key} ${issue.summary}`)}
                              >
                                <IssueKeyCell>
                                  {canExpand ? (
                                    <SubTaskToggle>{isChildExpanded ? '\u25BC' : '\u25B6'}</SubTaskToggle>
                                  ) : (
                                    <SubTaskToggleSpacer />
                                  )}
                                  <JiraTaskIcon type={resolveTaskType(issue.issueTypeName)} size={18} />
                                  <IssueTypeLabel $color={TASK_TYPE_COLORS[resolveTaskType(issue.issueTypeName)]}>
                                    {TASK_TYPE_LABELS[resolveTaskType(issue.issueTypeName)]}
                                  </IssueTypeLabel>
                                  <IssueKey onClick={(e) => { e.stopPropagation(); onGoToIssue(issue.key); }}>
                                    {issue.key}
                                  </IssueKey>
                                </IssueKeyCell>
                                <IssueSummary>{issue.summary || '(제목 없음)'}</IssueSummary>
                                <PriorityCell title={issue.priorityName || ''} onClick={(e) => { e.stopPropagation(); onOpenPriorityDropdown(issue.key, issue.priorityName, e); }}>
                                  {issue.priorityName && <JiraPriorityIcon priority={issue.priorityName} size={16} />}
                                </PriorityCell>
                                <AssigneeText $isMe={issue.assigneeName === myDisplayName} $clickable onClick={(e) => { e.stopPropagation(); onOpenAssigneeDropdown(issue.key, e); }}>
                                  {issue.assigneeName || '미지정'}
                                </AssigneeText>
                                <StatusBadgeBtn
                                  $color={getStatusColor(issue.statusName, issue.statusCategory)}
                                  onClick={(e) => { e.stopPropagation(); onOpenTransitionDropdown(issue.key, issue.statusName, e); }}
                                >
                                  {issue.statusName || '-'}
                                  <ChevronIcon>{'\u25BE'}</ChevronIcon>
                                </StatusBadgeBtn>
                              </IssueRow>
                              {isChildExpanded && renderBrowseChildren(issue.key, 1)}
                            </React.Fragment>
                          );
                        })}
                      </IssueTable>
                    )}
                  </EpicCard>
                );
              })}
            </EpicList>
          )}
        </>
      ) : (
        /* ── 기본 모드 (내 담당 / 검색) ── */
        <>
          <SectionHeader>
            <SectionTitle>
              {isSearchMode
                ? `검색 결과 (${epicGroups.reduce((n, g) => n + g.children.length, 0)}건)`
                : `내 담당 이슈 (${epicGroups.reduce((n, g) => n + g.children.length, 0)}건)`}
            </SectionTitle>
            {epicGroups.length > 0 && (
              <ToggleAllButtons>
                <SmallBtn onClick={() => onExpandAll(epicGroups)}>모두 펼치기</SmallBtn>
                <SmallBtn onClick={onCollapseAll}>모두 접기</SmallBtn>
              </ToggleAllButtons>
            )}
          </SectionHeader>

          {isLoading || isSearching ? (
            <LoadingArea>
              <Spinner />
              <LoadingText>{isSearching ? '검색 중' : '로딩 중'}</LoadingText>
            </LoadingArea>
          ) : epicGroups.length === 0 ? (
            <Empty>
              {isSearchMode
                ? '검색 결과가 없습니다.'
                : '담당된 이슈가 없습니다.'}
            </Empty>
          ) : (
            <EpicList>
              {epicGroups.map((group) => {
                const isExpanded = expandedEpics.has(group.key);
                return (
                  <EpicCard key={group.key}>
                    <EpicHeader onClick={() => onToggleEpic(group.key)}>
                      <EpicHeaderLeft>
                        <EpicToggle>{isExpanded ? '\u25BC' : '\u25B6'}</EpicToggle>
                        {group.key !== '__no_epic__' && (
                          <>
                            <JiraTaskIcon type={resolveTaskType(group.issueTypeName)} size={18} />
                            <IssueTypeLabel $color={TASK_TYPE_COLORS[resolveTaskType(group.issueTypeName)]}>
                              {TASK_TYPE_LABELS[resolveTaskType(group.issueTypeName)]}
                            </IssueTypeLabel>
                            <EpicKey
                              onClick={(e) => { e.stopPropagation(); onGoToIssue(group.key); }}
                              onContextMenu={(e) => onItemContextMenu(e, `/jira/issue/${group.key}`, group.key)}
                            >
                              {group.key}
                            </EpicKey>
                          </>
                        )}
                        <EpicSummary>{group.summary}</EpicSummary>
                      </EpicHeaderLeft>
                      {group.key !== '__no_epic__' ? (
                        <EpicPriority onClick={(e) => { e.stopPropagation(); onOpenPriorityDropdown(group.key, group.priorityName, e); }} title={group.priorityName || ''}>
                          {group.priorityName && <JiraPriorityIcon priority={group.priorityName} size={16} />}
                        </EpicPriority>
                      ) : <span />}
                      <EpicAssignee $clickable={group.key !== '__no_epic__'} onClick={(e) => { if (group.key !== '__no_epic__') { e.stopPropagation(); onOpenAssigneeDropdown(group.key, e); } }}>
                        {group.key !== '__no_epic__' ? (group.assigneeName || '미지정') : ''}
                      </EpicAssignee>
                      {group.key !== '__no_epic__' && group.statusName ? (
                        <StatusBadgeBtn
                          $color={getStatusColor(group.statusName, group.statusCategory)}
                          onClick={(e) => { e.stopPropagation(); onOpenTransitionDropdown(group.key, group.statusName, e); }}
                        >
                          {group.statusName}
                          <ChevronIcon>{'\u25BE'}</ChevronIcon>
                        </StatusBadgeBtn>
                      ) : <span />}
                      <EpicCount>{group.children.length}</EpicCount>
                    </EpicHeader>

                    {isExpanded && (
                      <IssueTable>
                        <TableHeader>
                          <span>키</span>
                          <span>요약</span>
                          <span>P</span>
                          <span>담당자</span>
                          <span>상태</span>
                        </TableHeader>
                        {group.children.map((issue) => {
                          const childChildren = defaultChildrenMap[issue.key] || [];
                          const canExpand = issue.subtaskCount > 0 || childChildren.length > 0;
                          const isChildExpanded = defaultExpandedChildren.has(issue.key);
                          const isChildLoading = defaultLoadingChildren.has(issue.key);
                          return (
                            <React.Fragment key={issue.key || issue.id}>
                              <IssueRow
                                onClick={() => {
                                  if (canExpand) {
                                    if (isChildExpanded) {
                                      onSetDefaultExpandedChildren((prev) => {
                                        const next = new Set(prev);
                                        next.delete(issue.key);
                                        return next;
                                      });
                                    } else {
                                      onLoadDefaultChildren(issue.key);
                                    }
                                  }
                                }}
                                onContextMenu={(e) => onItemContextMenu(e, `/jira/issue/${issue.key}`, `${issue.key} ${issue.summary}`)}
                              >
                                <IssueKeyCell>
                                  {canExpand ? (
                                    <SubTaskToggle>
                                      {isChildLoading ? <Loader size={10} /> : isChildExpanded ? '\u25BC' : '\u25B6'}
                                    </SubTaskToggle>
                                  ) : (
                                    <SubTaskToggleSpacer />
                                  )}
                                  <JiraTaskIcon type={resolveTaskType(issue.issueTypeName)} size={18} />
                                  <IssueTypeLabel $color={TASK_TYPE_COLORS[resolveTaskType(issue.issueTypeName)]}>
                                    {TASK_TYPE_LABELS[resolveTaskType(issue.issueTypeName)]}
                                  </IssueTypeLabel>
                                  <IssueKey onClick={(e) => { e.stopPropagation(); onGoToIssue(issue.key); }}>
                                    {issue.key}
                                  </IssueKey>
                                </IssueKeyCell>
                                <IssueSummary>{issue.summary || '(제목 없음)'}</IssueSummary>
                                <PriorityCell title={issue.priorityName || ''} onClick={(e) => { e.stopPropagation(); onOpenPriorityDropdown(issue.key, issue.priorityName, e); }}>
                                  {issue.priorityName && <JiraPriorityIcon priority={issue.priorityName} size={16} />}
                                </PriorityCell>
                                <AssigneeText $isMe={issue.assigneeName === myDisplayName} $clickable onClick={(e) => { e.stopPropagation(); onOpenAssigneeDropdown(issue.key, e); }}>
                                  {issue.assigneeName || '미지정'}
                                </AssigneeText>
                                <StatusBadgeBtn
                                  $color={getStatusColor(issue.statusName, issue.statusCategory)}
                                  onClick={(e) => { e.stopPropagation(); onOpenTransitionDropdown(issue.key, issue.statusName, e); }}
                                >
                                  {issue.statusName || '-'}
                                  <ChevronIcon>{'\u25BE'}</ChevronIcon>
                                </StatusBadgeBtn>
                              </IssueRow>
                              {isChildExpanded && renderDefaultChildren(issue.key, 1)}
                            </React.Fragment>
                          );
                        })}
                      </IssueTable>
                    )}
                  </EpicCard>
                );
              })}
            </EpicList>
          )}
        </>
      )}
    </Content>
  );
};

export default JiraIssueList;

// ── Styled Components ──

const Content = styled.main`
  flex: 1;
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;

  @media (max-width: 900px) {
    padding: 1rem 0.75rem;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
`;

const ToggleAllButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const SmallBtn = styled.button`
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background: transparent;
  border: 1px solid ${jiraTheme.border};
  border-radius: 20px;
  color: ${jiraTheme.text.secondary};
  cursor: pointer;

  &:hover { background: ${jiraTheme.bg.hover}; color: ${jiraTheme.text.primary}; }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const LoadingArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 4rem 2rem;
`;

const Spinner = styled.div`
  width: 1.5rem;
  height: 1.5rem;
  border: 2.5px solid ${jiraTheme.border};
  border-top-color: ${jiraTheme.primary};
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;

const LoadingText = styled.span`
  font-size: 0.8125rem;
  color: ${jiraTheme.text.secondary};
`;

const Empty = styled.div`
  padding: 4rem 2rem;
  text-align: center;
  color: ${jiraTheme.text.secondary};
`;

const EpicList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const EpicCard = styled.div`
  border-radius: 6px;
  border: 1px solid ${jiraTheme.border};
  overflow: hidden;
`;

const EpicHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr 24px 5rem minmax(80px, 140px) auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.625rem 1rem 0.625rem 2.25rem;
  background: #F8F9FB;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ${transition};
  min-width: 0;
  border-left: 3px solid ${jiraTheme.issueType.epic};

  &:hover { background: ${jiraTheme.bg.hover}; }

  @media (max-width: 900px) {
    gap: 0.5rem;
    padding: 0.5rem 0.75rem 0.5rem 1.25rem;
  }
`;

const EpicHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
`;

const EpicToggle = styled.span`
  font-size: 0.625rem;
  color: ${jiraTheme.text.muted};
  width: 0.875rem;
  flex-shrink: 0;
`;

const EpicKey = styled.span`
  font-weight: 600;
  font-size: 0.8125rem;
  color: ${jiraTheme.issueType.epic};
  flex-shrink: 0;
  cursor: pointer;

  &:hover { text-decoration: underline; }
`;

const EpicSummary = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`;

const EpicPriority = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  width: 24px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s, box-shadow 0.15s;

  &:hover {
    background: #fff;
    box-shadow: 0 0 0 1px ${jiraTheme.border};
  }
`;

const EpicAssignee = styled.span<{ $clickable?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  font-size: 0.75rem;
  line-height: 1;
  color: ${jiraTheme.text.secondary};
  white-space: nowrap;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  border-radius: 4px;
  padding: 0 0.375rem;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;

  &:hover {
    ${({ $clickable }) => $clickable && `
      background: #fff;
      color: ${jiraTheme.text.primary};
      box-shadow: 0 0 0 1px ${jiraTheme.border};
    `}
  }
`;

const EpicCount = styled.span`
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${jiraTheme.issueType.epic};
  background: #EDE8F5;
  border-radius: 10px;
  padding: 0.125rem 0.5rem;
  flex-shrink: 0;
`;

const IssueTable = styled.div``;

const GRID_COLS = 'minmax(140px, 220px) 1fr 24px 5rem minmax(80px, 140px)';

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: ${GRID_COLS};
  gap: 0.75rem;
  padding: 0.4rem 1rem 0.4rem 2.25rem;
  background: #ECEEF2;
  border-top: 1px solid ${jiraTheme.border};
  font-size: 0.6875rem;
  font-weight: 700;
  color: ${jiraTheme.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.03em;
  text-align: left;
  white-space: nowrap;

  @media (max-width: 900px) {
    grid-template-columns: minmax(80px, 120px) 1fr 24px minmax(70px, 120px);
    gap: 0.5rem;
    padding-left: 1.25rem;

    span:nth-child(4) { display: none; }
  }

  @media (max-width: 600px) {
    grid-template-columns: minmax(70px, 100px) 1fr;
    gap: 0.375rem;
    padding-left: 1rem;

    span:nth-child(3),
    span:nth-child(4),
    span:nth-child(5) { display: none; }
  }
`;

const IssueRow = styled.div`
  display: grid;
  grid-template-columns: ${GRID_COLS};
  gap: 0.75rem;
  padding: 0.5rem 1rem 0.5rem 2.25rem;
  background: ${jiraTheme.bg.default};
  border-top: 1px solid #F0F1F3;
  cursor: pointer;
  transition: background 0.12s ${transition};
  align-items: center;

  &:first-of-type { border-top: none; }
  &:hover { background: #F5F7FA; }

  @media (max-width: 900px) {
    grid-template-columns: minmax(80px, 120px) 1fr 24px minmax(70px, 120px);
    gap: 0.5rem;
    padding-left: 1.25rem;
  }

  @media (max-width: 600px) {
    grid-template-columns: minmax(70px, 100px) 1fr;
    gap: 0.375rem;
    padding-left: 1rem;
  }
`;

const IssueKeyCell = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
`;

const IssueKey = styled.span`
  font-weight: 600;
  color: ${jiraTheme.primary};
  font-size: 0.8125rem;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

const IssueTypeLabel = styled.span<{ $color: string }>`
  font-weight: 700;
  font-size: 0.6875rem;
  color: ${({ $color }) => $color};
  white-space: nowrap;
  flex-shrink: 0;
`;

const IssueSummary = styled.span`
  font-size: 0.8125rem;
  color: ${jiraTheme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PriorityCell = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 3px;
  padding: 0.125rem;

  &:hover { background: ${jiraTheme.bg.hover}; }
`;

const StatusBadgeBtn = styled.button<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1rem 0.375rem;
  font-size: 0.625rem;
  font-weight: 600;
  border-radius: 20px;
  background: ${({ $color }) => $color || jiraTheme.status.default};
  color: white;
  text-align: center;
  letter-spacing: 0.01em;
  border: none;
  cursor: pointer;
  justify-self: start;
  white-space: nowrap;
  transition: filter 0.15s;

  &:hover { filter: brightness(0.9); }

  @media (max-width: 600px) { display: none; }
`;

const ChevronIcon = styled.span`
  font-size: 0.625rem;
  line-height: 1;
  opacity: 0.8;
`;

const AssigneeText = styled.span<{ $isMe?: boolean; $clickable?: boolean }>`
  font-size: 0.75rem;
  color: ${({ $isMe }) => ($isMe ? jiraTheme.primary : jiraTheme.text.secondary)};
  font-weight: ${({ $isMe }) => ($isMe ? 600 : 400)};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  border-radius: 3px;
  padding: 0.125rem 0.25rem;

  &:hover {
    ${({ $clickable }) => $clickable && `background: ${jiraTheme.bg.hover};`}
  }

  @media (max-width: 900px) { display: none; }
`;

const SubTaskToggle = styled.span`
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.5625rem;
  color: ${jiraTheme.text.secondary};
  cursor: pointer;
  flex-shrink: 0;
  border-radius: 3px;
  margin-right: 2px;

  svg {
    animation: spin 1s linear infinite;
  }

  &:hover {
    background: ${jiraTheme.border};
  }
`;

const SubTaskToggleSpacer = styled.span`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-right: 2px;
`;
