import React, { useState, useMemo, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { useAccount } from 'modules/contexts/account';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { useTransitionDropdown } from 'lib/hooks/useTransitionDropdown';
import { useAssigneeDropdown } from 'lib/hooks/useAssigneeDropdown';
import { usePriorityDropdown } from 'lib/hooks/usePriorityDropdown';
import { useJiraSearch } from 'lib/hooks/useJiraSearch';
import { useJiraAssigneeFilter } from 'lib/hooks/jira/useJiraAssigneeFilter';
import { groupByEpic } from 'lib/utils/jiraNormalizers';
import { isEpicType } from 'lib/utils/jiraUtils';
import type { NormalizedIssue } from 'types/jira';
import JiraTransitionDropdown from 'components/jira/JiraTransitionDropdown';
import JiraTransitionFieldsModal from 'containers/jira/JiraTransitionFieldsModal';
import JiraProjectFieldSettingsModal from 'containers/jira/JiraProjectFieldSettingsModal';
import { Settings as SettingsIcon } from 'lucide-react';
import JiraAssigneeDropdown from 'components/jira/JiraAssigneeDropdown';
import JiraPriorityDropdown from 'components/jira/JiraPriorityDropdown';
import JiraSearchToolbar from 'components/jira/JiraSearchToolbar';
import JiraStatusSummary from 'components/jira/JiraStatusSummary';
import JiraIssueList from 'components/jira/JiraIssueList';
import JiraIssueTimeline from 'components/jira/JiraIssueTimeline';
import JiraTimelineToggle, { type JiraViewMode } from 'components/jira/JiraTimelineToggle';
import JiraTimelineScaleToggle from 'components/jira/JiraTimelineScaleToggle';
import type { TimelineScale } from 'lib/utils/jiraTimelineRange';
import { Network as NetworkIcon } from 'lucide-react';
import { integrationController } from 'controllers/account';
import SpaceFilterModal from 'components/common/SpaceFilterModal';
import ItemContextMenu from 'components/common/ItemContextMenu';
import { isAtlassianAccount } from 'types/account';
import { useTabs } from 'modules/contexts/tab';

const JiraDashboard = () => {
  const { activeAccount } = useAccount();
  const accountMeta = activeAccount?.metadata as Record<string, unknown> | undefined;
  const myDisplayName = accountMeta?.userDisplayName as string | undefined;
  const myAccountId = accountMeta?.userAccountId as string | undefined;
  const myAvatarUrl = accountMeta?.userAvatarUrl as string | undefined;
  const history = useHistory();
  const { addTab } = useTabs();

  // 우클릭 컨텍스트 메뉴
  const [itemContextMenu, setItemContextMenu] = useState<{ x: number; y: number; path: string; label: string } | null>(null);

  // 프로젝트 필드 설정 모달 (스페이스 필터에서 톱니 클릭 시 진입)
  const [editingFieldsProjectKey, setEditingFieldsProjectKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<JiraViewMode>('list');
  const [timelineScale, setTimelineScale] = useState<TimelineScale>('month');
  const [showDependencies, setShowDependencies] = useState<boolean>(false);

  const handleItemContextMenu = useCallback((e: React.MouseEvent, path: string, label: string) => {
    e.preventDefault();
    e.stopPropagation();
    const zoom = 1.2;
    setItemContextMenu({ x: e.clientX / zoom, y: e.clientY / zoom, path, label });
  }, []);

  const handleOpenInNewTab = useCallback(() => {
    if (!itemContextMenu) return;
    addTab('jira', itemContextMenu.path, itemContextMenu.label);
    setItemContextMenu(null);
  }, [itemContextMenu, addTab]);

  const search = useJiraSearch({ activeAccount, history });

  const {
    myIssues, myIssueKeys, isLoading, projects, selectedProjects, setSelectedProjects,
    showSpaceSettings, setShowSpaceSettings, spaceFilter, setSpaceFilter,
    searchQuery, searchResults, isSearching,
    suggestions, showSuggestions, setShowSuggestions,
    isSuggestLoading, activeSuggestionIdx, setActiveSuggestionIdx,
    expandedEpics, defaultChildrenMap, defaultExpandedChildren, setDefaultExpandedChildren,
    defaultLoadingChildren,
    browseProjectKey, browseBoardName,
    browseEpics, browseChildrenMap, isBrowseLoading,
    isBrowseLoadingMore, hasMoreBrowseEpics,
    browseExpandedKeys, setBrowseExpandedKeys, browseLoadedChildren,
    searchWrapperRef, epicGroupsRef,
    statusCounts, filteredProjects,
    selectedStatuses, doneIssues, doneOwnKeys, toggleStatus, isDoneOnlyActive, toggleDoneOnly,
    isHideDoneActive, toggleHideDone,
    fetchMyIssues, fetchDoneCounts, searchIssues, handleSearchChange, clearSearch,
    loadBrowseChildren, loadMoreBrowseEpics, loadDefaultChildren,
    goToIssue, toggleEpic, expandAll, collapseAll, toggleBrowseEpic,
    handleTransitioned, handleAssigned, handleDateChanged, saveSpaceSettings,
    startDateByProject,
  } = search;

  const { target: transitionTarget, transitions, isLoading: isTransitionLoading, dropdownRef: transitionRef, open: openTransitionDropdown, execute: executeTransition, close: closeTransition, pending: pendingTransition, submitPending: submitPendingTransition, cancelPending: cancelPendingTransition } = useTransitionDropdown({
    accountId: activeAccount?.id,
    serviceType: 'jira',
    onTransitioned: handleTransitioned,
  });

  const { target: assigneeTarget, users: assigneeUsers, isLoading: isAssigneeLoading, dropdownRef: assigneeRef, open: openAssigneeDropdown, search: searchAssignee, assign: executeAssign, close: closeAssignee } = useAssigneeDropdown({
    accountId: activeAccount?.id,
    serviceType: 'jira',
    onAssigned: handleAssigned,
  });

  // 우선순위 드롭다운 (공통 훅)
  const { priorityTarget, openPriorityDropdown, handlePriorityChange, closePriorityDropdown } = usePriorityDropdown({
    accountId: activeAccount?.id,
    serviceType: 'jira',
    onPriorityChanged: () => search.fetchMyIssues(),
  });

  const isSearchMode = searchResults !== null;
  const baseIssues = isSearchMode ? searchResults : myIssues;

  // 완료 이슈를 base에 합산 (중복 제거). 상태/담당자 필터 및 카운트 계산에서 공통으로 사용.
  const merged = useMemo(() => {
    const keySet = new Set(baseIssues.map((i) => i.key));
    const out = [...baseIssues];
    for (const d of doneIssues) {
      if (!keySet.has(d.key)) {
        out.push(d);
        keySet.add(d.key);
      }
    }
    return out;
  }, [baseIssues, doneIssues]);

  // 담당자 필터: 상태 카운트와 동일한 모집단("내 담당" 이슈만)을 기준으로 선택지를 만든다
  const ownIssuesForFilters = useMemo(
    () => merged.filter((i) => myIssueKeys.has(i.key) || doneOwnKeys.has(i.key)),
    [merged, myIssueKeys, doneOwnKeys],
  );
  const assigneeFilter = useJiraAssigneeFilter(ownIssuesForFilters);

  // 상태 필터 적용:
  // - 검색 모드: 필터 무시(전체 표시)
  // - 선택된 상태가 없음: 아무 이슈도 표시하지 않음 (사용자가 명시적으로 모두 해제한 상태)
  // - 그 외: Epic 포함 모든 이슈를 자신의 statusName 기준으로 엄격히 필터링
  const displayIssues = useMemo(() => {
    // 기본 모드의 1차 매칭은 "내 담당 이슈(myIssueKeys)"로만 한정.
    // myIssues 배열에는 부모/조부모 보강분이 포함되어 있어, 그것들이 상태만 같다고 단독으로 노출되면
    // "다른 사람 담당의 에픽"이 끼어 들어온다. 조상은 자식이 매칭됐을 때만 아래 부모-체인 백필을 통해 합류해야 한다.
    let filtered: NormalizedIssue[];
    if (isSearchMode) {
      filtered = merged;
    } else if (selectedStatuses.size === 0) {
      filtered = [];
    } else {
      filtered = merged.filter((issue) =>
        (myIssueKeys.has(issue.key) || doneOwnKeys.has(issue.key))
        && selectedStatuses.has(issue.statusName)
        && assigneeFilter.isAssigneeSelected(issue.assigneeName || '미지정')
      );
    }

    // 부모 체인 보강: 필터된 이슈의 조상(스토리, 에픽)이 누락되면 추가하여
    // 원래 계층 구조(에픽 > 스토리 > 하위항목)를 유지
    const filteredKeys = new Set(filtered.map((i) => i.key));
    const issueByKey = new Map(merged.map((i) => [i.key, i]));
    const extras: NormalizedIssue[] = [];

    for (const issue of filtered) {
      if (isEpicType(issue.issueTypeName)) continue;
      // 부모 체인을 따라가며 누락된 조상을 모두 추가
      let pk = issue.parentKey;
      const visited = new Set<string>();
      while (pk && !visited.has(pk) && !filteredKeys.has(pk)) {
        visited.add(pk);
        const p = issueByKey.get(pk);
        if (!p) break;
        extras.push(p);
        filteredKeys.add(p.key);
        pk = p.parentKey;
      }
    }

    return extras.length > 0 ? [...filtered, ...extras] : filtered;
  }, [merged, selectedStatuses, myIssueKeys, doneOwnKeys, isSearchMode, assigneeFilter.isAssigneeSelected]);

  const epicGroups = useMemo(() => groupByEpic(displayIssues), [displayIssues]);
  epicGroupsRef.current = epicGroups;

  if (!activeAccount || !isAtlassianAccount(activeAccount.serviceType)) {
    return (
      <Layout>
        <CenterContent>
          <EmptyCenter>
            Atlassian 계정을 추가하고 활성화해주세요. 계정 설정에서 Atlassian을 연결할 수 있습니다.
          </EmptyCenter>
        </CenterContent>
      </Layout>
    );
  }

  return (
    <Layout>
      <JiraSearchToolbar
        searchQuery={searchQuery}
        searchResults={searchResults}
        isSearching={isSearching}
        isLoading={isLoading}
        suggestions={suggestions}
        showSuggestions={showSuggestions}
        isSuggestLoading={isSuggestLoading}
        activeSuggestionIdx={activeSuggestionIdx}
        selectedProjectsCount={selectedProjects.length}
        searchWrapperRef={searchWrapperRef}
        onSearchChange={handleSearchChange}
        onSearchSubmit={searchIssues}
        onClearSearch={clearSearch}
        onRefresh={() => { fetchMyIssues(); fetchDoneCounts(); }}
        onOpenSpaceSettings={() => { setSpaceFilter(''); setShowSpaceSettings(true); }}
        onGoToIssue={goToIssue}
        onSetShowSuggestions={setShowSuggestions}
        onSetActiveSuggestionIdx={setActiveSuggestionIdx}
      />

      {!browseProjectKey && !isSearchMode && statusCounts.length > 0 && (
        <JiraStatusSummary
          statusCounts={statusCounts}
          selectedStatuses={selectedStatuses}
          onToggleStatus={toggleStatus}
          isDoneOnlyActive={isDoneOnlyActive}
          onToggleDoneOnly={toggleDoneOnly}
          isHideDoneActive={isHideDoneActive}
          onToggleHideDone={toggleHideDone}
          assigneeCounts={assigneeFilter.assigneeCounts}
          isAssigneeSelected={assigneeFilter.isAssigneeSelected}
          onToggleAssignee={assigneeFilter.toggleAssignee}
          isAssigneeFilterActive={assigneeFilter.isAssigneeFilterActive}
          assigneeSelectedCount={assigneeFilter.selectedCount}
          onClearAssigneeFilter={assigneeFilter.clearAssigneeFilter}
        />
      )}

      {(() => {
        const viewToggle =
          !isSearchMode && !browseProjectKey ? (
            <JiraTimelineToggle value={viewMode} onChange={setViewMode} />
          ) : null;
        if (viewMode === 'list' || isSearchMode || browseProjectKey) {
          return (
            <JiraIssueList
              browseProjectKey={browseProjectKey}
              browseBoardName={browseBoardName}
              browseEpics={browseEpics}
              browseChildrenMap={browseChildrenMap}
              isBrowseLoading={isBrowseLoading}
              isBrowseLoadingMore={isBrowseLoadingMore}
              hasMoreBrowseEpics={hasMoreBrowseEpics}
              onLoadMoreBrowseEpics={loadMoreBrowseEpics}
              browseExpandedKeys={browseExpandedKeys}
              epicGroups={epicGroups}
              expandedEpics={expandedEpics}
              defaultChildrenMap={defaultChildrenMap}
              defaultExpandedChildren={defaultExpandedChildren}
              defaultLoadingChildren={defaultLoadingChildren}
              isLoading={isLoading}
              isSearching={isSearching}
              isSearchMode={isSearchMode}
              myDisplayName={myDisplayName}
              selectedStatuses={selectedStatuses}
              onToggleEpic={toggleEpic}
              onToggleBrowseEpic={toggleBrowseEpic}
              onExpandAll={expandAll}
              onCollapseAll={collapseAll}
              onGoToIssue={goToIssue}
              onLoadBrowseChildren={loadBrowseChildren}
              onLoadDefaultChildren={loadDefaultChildren}
              onSetBrowseExpandedKeys={setBrowseExpandedKeys}
              onSetDefaultExpandedChildren={setDefaultExpandedChildren}
              onOpenTransitionDropdown={openTransitionDropdown}
              onOpenAssigneeDropdown={openAssigneeDropdown}
              onOpenPriorityDropdown={openPriorityDropdown}
              onItemContextMenu={handleItemContextMenu}
              headerActionSlot={viewToggle}
            />
          );
        }
        const handleIssueDateChange = (issueKey: string, next: { startDate: string; endDate: string }) => {
          if (!activeAccount) return;
          // 낙관적 로컬 캐시 패치 (먼저 적용 → API 실패 시 fetchMyIssues로 복구).
          handleDateChanged(issueKey, { startDate: next.startDate, duedate: next.endDate });
          const projectKey = issueKey.includes('-') ? issueKey.slice(0, issueKey.indexOf('-')) : '';
          const startDateFieldId = projectKey ? startDateByProject[projectKey] : undefined;
          const calls: Promise<unknown>[] = [];
          calls.push(integrationController.invoke({
            accountId: activeAccount.id,
            serviceType: 'jira',
            action: 'updateIssueField',
            params: { issueKey, fieldId: 'duedate', fieldValue: next.endDate },
          }));
          if (startDateFieldId) {
            calls.push(integrationController.invoke({
              accountId: activeAccount.id,
              serviceType: 'jira',
              action: 'updateIssueField',
              params: { issueKey, fieldId: startDateFieldId, fieldValue: next.startDate },
            }));
          }
          Promise.all(calls).catch(() => {
            // 실패 → 서버 진실로 복구.
            fetchMyIssues();
          });
        };
        const timelineToolbarSlot = (
          <>
            <JiraTimelineScaleToggle value={timelineScale} onChange={setTimelineScale} />
            <DependencyToggle
              type="button"
              aria-pressed={showDependencies}
              $active={showDependencies}
              onClick={() => setShowDependencies((v) => !v)}
              title="의존성 화살표 표시"
            >
              <NetworkIcon size={14} />
              <span>의존성</span>
            </DependencyToggle>
          </>
        );
        return (
          <JiraIssueTimeline
            epicGroups={epicGroups}
            expandedEpics={expandedEpics}
            defaultChildrenMap={defaultChildrenMap}
            onToggleEpic={toggleEpic}
            onGoToIssue={goToIssue}
            isLoading={isLoading}
            headerActionSlot={viewToggle}
            toolbarSlot={timelineToolbarSlot}
            scale={timelineScale}
            showDependencies={showDependencies}
            onIssueDateChange={handleIssueDateChange}
          />
        );
      })()}

      {showSpaceSettings && !editingFieldsProjectKey && (
        <SpaceFilterModal
          theme={jiraTheme}
          description={`선택한 스페이스의 이슈만 조회 및 검색됩니다.${
            selectedProjects.length > 0 ? ` (${selectedProjects.length}개 선택됨)` : ' (전체)'
          }`}
          items={filteredProjects.map((p) => ({ key: p.key, name: p.name }))}
          selectedKeys={selectedProjects}
          spaceFilter={spaceFilter}
          onSpaceFilterChange={setSpaceFilter}
          onToggleKey={(key, next) =>
            next
              ? setSelectedProjects((prev: string[]) => [...prev, key])
              : setSelectedProjects((prev: string[]) => prev.filter((k: string) => k !== key))
          }
          onSelectAll={() => {
            const keys = filteredProjects.map((p) => p.key);
            setSelectedProjects((prev: string[]) => Array.from(new Set(prev.concat(keys))));
          }}
          onDeselectAll={() => {
            if (spaceFilter) {
              const keys = new Set(filteredProjects.map((p) => p.key));
              setSelectedProjects((prev: string[]) => prev.filter((k: string) => !keys.has(k)));
            } else {
              setSelectedProjects([]);
            }
          }}
          renderItemAction={(key) => (
            <SpaceSettingsBtn
              type="button"
              title="필드 설정"
              onClick={() => setEditingFieldsProjectKey(key)}
            >
              <SettingsIcon size={14} />
            </SpaceSettingsBtn>
          )}
          onSave={saveSpaceSettings}
          onClose={() => setShowSpaceSettings(false)}
        />
      )}

      {editingFieldsProjectKey && activeAccount?.id && (
        <JiraProjectFieldSettingsModal
          accountId={activeAccount.id}
          projectKey={editingFieldsProjectKey}
          projectName={projects.find((p) => p.key === editingFieldsProjectKey)?.name}
          onBack={() => setEditingFieldsProjectKey(null)}
          onClose={() => {
            setEditingFieldsProjectKey(null);
            setShowSpaceSettings(false);
          }}
        />
      )}

      {transitionTarget && (
        <JiraTransitionDropdown
          target={transitionTarget}
          transitions={transitions}
          isLoading={isTransitionLoading}
          dropdownRef={transitionRef}
          onSelect={executeTransition}
          onClose={closeTransition}
        />
      )}
      {pendingTransition && (
        <JiraTransitionFieldsModal
          accountId={activeAccount?.id}
          issueKey={pendingTransition.issueKey}
          transition={pendingTransition.transition}
          baseUrl={(activeAccount?.credentials as { baseUrl?: string } | undefined)?.baseUrl}
          onSubmit={submitPendingTransition}
          onClose={cancelPendingTransition}
        />
      )}
      {assigneeTarget && (
        <JiraAssigneeDropdown
          target={assigneeTarget}
          users={assigneeUsers}
          isLoading={isAssigneeLoading}
          dropdownRef={assigneeRef}
          myAccountId={myAccountId}
          myDisplayName={myDisplayName}
          myAvatarUrl={myAvatarUrl}
          onSearch={searchAssignee}
          onSelect={executeAssign}
          onClose={closeAssignee}
        />
      )}
      {priorityTarget && (
        <JiraPriorityDropdown
          target={priorityTarget}
          currentPriority={priorityTarget.currentPriority}
          onSelect={handlePriorityChange}
          onClose={closePriorityDropdown}
        />
      )}
      {itemContextMenu && (
        <ItemContextMenu
          theme={jiraTheme}
          position={{ x: itemContextMenu.x, y: itemContextMenu.y }}
          items={[{ label: '새 탭으로 열기', onClick: handleOpenInNewTab }]}
          onClose={() => setItemContextMenu(null)}
        />
      )}
    </Layout>
  );
};

export default JiraDashboard;

// ── Styled Components ──

const Layout = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  min-height: 0;
  background: ${jiraTheme.bg.subtle};
  overflow: hidden;
  zoom: 1.2;
`;

const CenterContent = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 20vh;
`;

const EmptyCenter = styled.div`
  text-align: center;
  color: ${jiraTheme.text.muted};
  font-size: 0.95rem;
`;

const DependencyToggle = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 11px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
  background: ${({ $active }) => ($active ? jiraTheme.primaryLight : jiraTheme.bg.default)};
  color: ${({ $active }) => ($active ? jiraTheme.primary : jiraTheme.text.secondary)};
  border: 1px solid ${({ $active }) => ($active ? 'transparent' : jiraTheme.border)};
  &:hover { color: ${jiraTheme.text.primary}; }
`;

const SpaceSettingsBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: ${jiraTheme.text.muted};
  cursor: pointer;
  &:hover { background: ${jiraTheme.bg.hover}; color: ${jiraTheme.text.primary}; }
`;
