import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { RingSpinner as Spinner } from 'lib/styles/primitives';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { transition } from 'lib/styles/styles';
import { getStatusColor } from 'lib/utils/jiraUtils';
import JiraTaskIcon, { resolveTaskType, TASK_TYPE_LABELS, TASK_TYPE_COLORS } from 'components/jira/JiraTaskIcon';
import JiraPriorityIcon from 'components/jira/JiraPriorityIcon';
import { Loader } from 'lucide-react';
import type { NormalizedIssue, EpicGroup } from 'types/jira';

interface JiraIssueListProps {
  browseProjectKey: string | null;
  /** 보드 모드일 때만 채워짐 — 헤더 라벨에 함께 노출 */
  browseBoardName?: string | null;
  browseEpics: NormalizedIssue[];
  browseChildrenMap: Record<string, NormalizedIssue[]>;
  isBrowseLoading: boolean;
  isBrowseLoadingMore?: boolean;
  hasMoreBrowseEpics?: boolean;
  onLoadMoreBrowseEpics?: () => void;
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
  /** 상태 필터 — 기본 모드에서 펼친 N-depth 하위 항목에도 동일하게 적용한다. */
  selectedStatuses: Set<string>;
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
  /** SectionHeader 우측 액션 영역에 "모두 펼치기" 왼쪽으로 삽입되는 추가 슬롯. */
  headerActionSlot?: React.ReactNode;
}

const JiraIssueList = ({
  browseProjectKey,
  browseBoardName,
  browseEpics,
  browseChildrenMap,
  isBrowseLoading,
  isBrowseLoadingMore = false,
  hasMoreBrowseEpics = false,
  onLoadMoreBrowseEpics,
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
  selectedStatuses,
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
  headerActionSlot,
}: JiraIssueListProps) => {
  // 브라우즈 모드 무한 스크롤: sentinel이 viewport에 들어오면 다음 페이지 로드
  const browseSentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!browseProjectKey) return;
    if (!hasMoreBrowseEpics || !onLoadMoreBrowseEpics) return;
    const node = browseSentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry?.isIntersecting) onLoadMoreBrowseEpics();
    }, { rootMargin: '200px' });
    observer.observe(node);
    return () => observer.disconnect();
    // 토큰이 새로 채워질 때마다 재구독 (이전 sentinel이 dispose되어 추가 트리거되지 않음)
  }, [browseProjectKey, hasMoreBrowseEpics, onLoadMoreBrowseEpics, browseEpics.length]);

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

  // 상태 필터: 자기 statusName이 선택 집합에 있거나, 로드된 자손 중 매칭이 있으면 통과.
  // (조상 백필) — N-depth 트리에서 '중간 노드'가 자기 상태로는 매칭되지 않아도
  // 매칭되는 후손이 있으면 표시해 트리 모양을 유지한다.
  const issueOrLoadedDescendantMatches = (issue: NormalizedIssue): boolean => {
    if (selectedStatuses.has(issue.statusName)) return true;
    const grand = defaultChildrenMap[issue.key];
    if (!grand || grand.length === 0) return false;
    return grand.some(issueOrLoadedDescendantMatches);
  };

  // 기본 모드 N-depth 하위 항목 재귀 렌더링
  const renderDefaultChildren = (parentKey: string, depth: number): React.ReactNode[] => {
    const allChildren = defaultChildrenMap[parentKey] || [];
    if (allChildren.length === 0) return [];

    // 검색 모드: 상태 필터 무시. 선택된 상태가 없으면(사용자가 모두 해제): 빈 결과.
    // 그 외: 상태 필터 + 자손 백필 적용.
    let children: NormalizedIssue[];
    if (isSearchMode) {
      children = allChildren;
    } else if (selectedStatuses.size === 0) {
      children = [];
    } else {
      children = allChildren.filter(issueOrLoadedDescendantMatches);
    }
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
              {browseBoardName
                ? `${browseProjectKey} · ${browseBoardName} 보드`
                : `${browseProjectKey} 전체 이슈`}{' '}
              ({browseEpics.length}건)
            </SectionTitle>
            {browseEpics.length > 0 && (
              <ToggleAllButtons>
                {headerActionSlot}
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
              {/* 무한 스크롤 sentinel + 로딩 인디케이터 */}
              {hasMoreBrowseEpics && (
                <BrowseLoadMore ref={browseSentinelRef}>
                  {isBrowseLoadingMore ? (
                    <>
                      <Spinner />
                      <LoadingText>다음 에픽 불러오는 중...</LoadingText>
                    </>
                  ) : (
                    <LoadingText>스크롤하면 추가 에픽이 로드됩니다.</LoadingText>
                  )}
                </BrowseLoadMore>
              )}
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
            {(epicGroups.length > 0 || headerActionSlot) && (
              <ToggleAllButtons>
                {headerActionSlot}
                {epicGroups.length > 0 && (
                  <>
                    <SmallBtn onClick={() => onExpandAll(epicGroups)}>모두 펼치기</SmallBtn>
                    <SmallBtn onClick={onCollapseAll}>모두 접기</SmallBtn>
                  </>
                )}
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
  font-family: ${jiraTheme.font.body};
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${jiraTheme.text.primary};
`;

const ToggleAllButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const SmallBtn = styled.button`
  padding: 6px 12px;
  font-family: ${jiraTheme.font.body};
  font-size: 12.5px;
  font-weight: 600;
  background: ${jiraTheme.bg.default};
  border: 1px solid ${jiraTheme.borderStrong};
  border-radius: 99px;
  color: ${jiraTheme.text.secondary};
  cursor: pointer;
  transition: background ${jiraTheme.motion.fast}, color ${jiraTheme.motion.fast};

  &:hover { background: ${jiraTheme.hairline}; color: ${jiraTheme.text.primary}; }
`;

const LoadingArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 4rem 2rem;
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

const BrowseLoadMore = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  color: ${jiraTheme.text.muted};
  font-size: 0.8125rem;
`;

const EpicCard = styled.div`
  border-radius: ${jiraTheme.radius.card};
  border: 1px solid ${jiraTheme.border};
  background: ${jiraTheme.bg.default};
  box-shadow: ${jiraTheme.shadow.card};
  overflow: hidden;
`;

const EpicHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr 24px 5rem minmax(80px, 140px) auto;
  gap: 14px;
  align-items: center;
  padding: 16px 22px 16px 32px;
  background: ${jiraTheme.bg.default};
  cursor: pointer;
  user-select: none;
  transition: background ${jiraTheme.motion.fast};
  min-width: 0;
  border-left: 3px solid ${jiraTheme.issueType.epic};

  &:hover { background: ${jiraTheme.hairline}; }

  @media (max-width: 900px) {
    gap: 10px;
    padding: 14px 18px 14px 22px;
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
  font-family: ${jiraTheme.font.brand};
  font-weight: 700;
  font-size: 12.5px;
  color: ${jiraTheme.issueType.epic};
  letter-spacing: 0;
  flex-shrink: 0;
  cursor: pointer;

  &:hover { text-decoration: underline; }
`;

const EpicSummary = styled.span`
  font-family: ${jiraTheme.font.body};
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
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
  height: 28px;
  width: 28px;
  cursor: pointer;
  border-radius: ${jiraTheme.radius.chip};
  transition: background ${jiraTheme.motion.fast};

  &:hover { background: ${jiraTheme.hairline}; }
`;

const EpicAssignee = styled.span<{ $clickable?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  font-family: ${jiraTheme.font.body};
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1;
  color: ${jiraTheme.text.secondary};
  white-space: nowrap;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  border-radius: 8px;
  padding: 0 8px;
  transition: background ${jiraTheme.motion.fast}, color ${jiraTheme.motion.fast};

  &:hover {
    ${({ $clickable }) => $clickable && `
      background: ${jiraTheme.hairline};
      color: ${jiraTheme.text.primary};
    `}
  }
`;

const EpicCount = styled.span`
  font-family: ${jiraTheme.font.body};
  font-size: 12px;
  font-weight: 700;
  color: ${jiraTheme.issueType.epic};
  background: rgba(122, 90, 240, 0.1);
  border-radius: 99px;
  padding: 4px 10px;
  flex-shrink: 0;
  line-height: 1;
`;

const IssueTable = styled.div``;

const GRID_COLS = 'minmax(140px, 220px) 1fr 24px 5rem minmax(80px, 140px)';

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: ${GRID_COLS};
  gap: 14px;
  padding: 12px 22px 12px 32px;
  background: ${jiraTheme.hairline};
  border-top: 1px solid ${jiraTheme.border};
  font-family: ${jiraTheme.font.body};
  font-size: 11px;
  font-weight: 700;
  color: ${jiraTheme.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-align: left;
  white-space: nowrap;

  @media (max-width: 900px) {
    grid-template-columns: minmax(80px, 120px) 1fr 24px minmax(70px, 120px);
    gap: 10px;
    padding-left: 22px;

    span:nth-child(4) { display: none; }
  }

  @media (max-width: 600px) {
    grid-template-columns: minmax(70px, 100px) 1fr;
    gap: 8px;
    padding-left: 18px;

    span:nth-child(3),
    span:nth-child(4),
    span:nth-child(5) { display: none; }
  }
`;

const IssueRow = styled.div`
  display: grid;
  grid-template-columns: ${GRID_COLS};
  gap: 14px;
  padding: 16px 22px 16px 32px;
  background: ${jiraTheme.bg.default};
  border-top: 1px solid ${jiraTheme.hairline};
  cursor: pointer;
  transition: background ${jiraTheme.motion.fast};
  align-items: center;

  &:first-of-type { border-top: none; }
  &:hover { background: ${jiraTheme.bg.hover}; }

  @media (max-width: 900px) {
    grid-template-columns: minmax(80px, 120px) 1fr 24px minmax(70px, 120px);
    gap: 10px;
    padding-left: 22px;
  }

  @media (max-width: 600px) {
    grid-template-columns: minmax(70px, 100px) 1fr;
    gap: 8px;
    padding-left: 18px;
  }
`;

const IssueKeyCell = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

const IssueKey = styled.span`
  font-family: ${jiraTheme.font.brand};
  font-weight: 600;
  color: ${jiraTheme.text.muted};
  font-size: 12.5px;
  letter-spacing: 0;
  cursor: pointer;
  transition: color ${jiraTheme.motion.fast};
  flex-shrink: 0;

  &:hover {
    color: ${jiraTheme.primary};
    text-decoration: underline;
  }
`;

const IssueTypeLabel = styled.span<{ $color: string }>`
  font-family: ${jiraTheme.font.body};
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ $color }) => $color};
  white-space: nowrap;
  flex-shrink: 0;
`;

const IssueSummary = styled.span`
  font-family: ${jiraTheme.font.body};
  font-size: 14.5px;
  font-weight: 500;
  letter-spacing: -0.01em;
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
  border-radius: 6px;
  padding: 2px;
  transition: background ${jiraTheme.motion.fast};

  &:hover { background: ${jiraTheme.hairline}; }
`;

const StatusBadgeBtn = styled.button<{ $color?: string }>`
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
  text-align: center;
  border: none;
  cursor: pointer;
  justify-self: start;
  white-space: nowrap;
  line-height: 1.2;
  transition: filter ${jiraTheme.motion.fast};

  &:hover { filter: brightness(0.96); }

  @media (max-width: 600px) { display: none; }
`;

const ChevronIcon = styled.span`
  font-size: 9px;
  line-height: 1;
  opacity: 0.7;
  margin-left: 2px;
`;

const AssigneeText = styled.span<{ $isMe?: boolean; $clickable?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: ${jiraTheme.font.body};
  font-size: 12.5px;
  font-weight: ${({ $isMe }) => ($isMe ? 600 : 500)};
  letter-spacing: -0.01em;
  color: ${({ $isMe }) => ($isMe ? jiraTheme.primary : jiraTheme.text.secondary)};
  text-align: center;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  border-radius: 6px;
  padding: 2px 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: background ${jiraTheme.motion.fast}, color ${jiraTheme.motion.fast};

  &:hover {
    ${({ $clickable }) => $clickable && `
      background: ${jiraTheme.hairline};
      color: ${jiraTheme.text.primary};
    `}
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
