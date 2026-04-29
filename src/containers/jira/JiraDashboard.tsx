import React, { useState, useMemo, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { useAccount } from 'modules/contexts/account';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { useTransitionDropdown } from 'lib/hooks/useTransitionDropdown';
import { useAssigneeDropdown } from 'lib/hooks/useAssigneeDropdown';
import { usePriorityDropdown } from 'lib/hooks/usePriorityDropdown';
import { useJiraSearch } from 'lib/hooks/useJiraSearch';
import { groupByEpic } from 'lib/utils/jiraNormalizers';
import { isEpicType } from 'lib/utils/jiraUtils';
import type { NormalizedIssue } from 'types/jira';
import JiraTransitionDropdown from 'components/jira/JiraTransitionDropdown';
import JiraAssigneeDropdown from 'components/jira/JiraAssigneeDropdown';
import JiraPriorityDropdown from 'components/jira/JiraPriorityDropdown';
import JiraSearchToolbar from 'components/jira/JiraSearchToolbar';
import JiraStatusSummary from 'components/jira/JiraStatusSummary';
import JiraIssueList from 'components/jira/JiraIssueList';
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
    myIssues, isLoading, projects, selectedProjects, setSelectedProjects,
    showSpaceSettings, setShowSpaceSettings, spaceFilter, setSpaceFilter,
    searchQuery, searchResults, isSearching,
    suggestions, showSuggestions, setShowSuggestions,
    isSuggestLoading, activeSuggestionIdx, setActiveSuggestionIdx,
    expandedEpics, defaultChildrenMap, defaultExpandedChildren, setDefaultExpandedChildren,
    defaultLoadingChildren,
    browseProjectKey, browseEpics, browseChildrenMap, isBrowseLoading,
    browseExpandedKeys, setBrowseExpandedKeys, browseLoadedChildren,
    searchWrapperRef, epicGroupsRef,
    statusCounts, filteredProjects,
    selectedStatuses, doneIssues, toggleStatus,
    fetchMyIssues, fetchDoneCounts, searchIssues, handleSearchChange, clearSearch,
    loadBrowseChildren, loadDefaultChildren,
    goToIssue, toggleEpic, expandAll, collapseAll, toggleBrowseEpic,
    handleTransitioned, handleAssigned, saveSpaceSettings,
  } = search;

  const { target: transitionTarget, transitions, isLoading: isTransitionLoading, dropdownRef: transitionRef, open: openTransitionDropdown, execute: executeTransition, close: closeTransition } = useTransitionDropdown({
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

  // 상태 필터 적용: 선택된 상태가 없으면(초기) 전체 표시, 있으면 필터링
  const displayIssues = useMemo(() => {
    // 완료 이슈를 base에 합산 (중복 제거)
    const keySet = new Set(baseIssues.map((i) => i.key));
    const merged = [...baseIssues];
    for (const d of doneIssues) {
      if (!keySet.has(d.key)) {
        merged.push(d);
        keySet.add(d.key);
      }
    }

    // 상태 필터 적용 (검색 모드에서는 모든 상태 표시)
    let filtered: NormalizedIssue[];
    if (isSearchMode || selectedStatuses.size === 0) {
      filtered = merged;
    } else {
      filtered = merged.filter((issue) =>
        isEpicType(issue.issueTypeName) || selectedStatuses.has(issue.statusName)
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
  }, [baseIssues, doneIssues, selectedStatuses]);

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
        <JiraStatusSummary statusCounts={statusCounts} selectedStatuses={selectedStatuses} onToggleStatus={toggleStatus} />
      )}

      <JiraIssueList
        browseProjectKey={browseProjectKey}
        browseEpics={browseEpics}
        browseChildrenMap={browseChildrenMap}
        isBrowseLoading={isBrowseLoading}
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
      />

      {showSpaceSettings && (
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
          onSave={saveSpaceSettings}
          onClose={() => setShowSpaceSettings(false)}
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
