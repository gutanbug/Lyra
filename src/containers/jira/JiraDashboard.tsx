import React, { useState, useMemo, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { useAccount } from 'modules/contexts/account';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { transition } from 'lib/styles/styles';
import { useTransitionDropdown } from 'lib/hooks/useTransitionDropdown';
import { useAssigneeDropdown } from 'lib/hooks/useAssigneeDropdown';
import { usePriorityDropdown } from 'lib/hooks/usePriorityDropdown';
import { useJiraSearch } from 'lib/hooks/useJiraSearch';
import { groupByEpic } from 'lib/utils/jiraNormalizers';
import { isEpicType } from 'lib/utils/jiraUtils';
import { saveSelectedProjects } from 'lib/utils/storageHelpers';
import type { NormalizedIssue } from 'types/jira';
import JiraTransitionDropdown from 'components/jira/JiraTransitionDropdown';
import JiraAssigneeDropdown from 'components/jira/JiraAssigneeDropdown';
import JiraPriorityDropdown from 'components/jira/JiraPriorityDropdown';
import JiraSearchToolbar from 'components/jira/JiraSearchToolbar';
import JiraStatusSummary from 'components/jira/JiraStatusSummary';
import JiraIssueList from 'components/jira/JiraIssueList';
import { isAtlassianAccount } from 'types/account';
import { useTabs } from 'modules/contexts/splitView';
import type { JiraProject } from 'types/jira';

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

    // 상태 필터 적용
    let filtered: NormalizedIssue[];
    if (selectedStatuses.size === 0) {
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

      {/* 스페이스 설정 모달 */}
      {showSpaceSettings && (
        <SpaceSettingsOverlay onClick={() => setShowSpaceSettings(false)}>
          <SpaceSettingsPanel onClick={(e) => e.stopPropagation()}>
            <SpaceSettingsHeader>
              <SpaceSettingsTitle>스페이스 필터 설정</SpaceSettingsTitle>
              <SpaceSettingsClose onClick={() => setShowSpaceSettings(false)}>✕</SpaceSettingsClose>
            </SpaceSettingsHeader>
            <SpaceSettingsDesc>
              선택한 스페이스의 이슈만 조회 및 검색됩니다.
              {selectedProjects.length > 0
                ? ` (${selectedProjects.length}개 선택됨)`
                : ' (전체)'}
            </SpaceSettingsDesc>
            <SpaceSearchRow>
              <SpaceSearchInput
                placeholder="스페이스 검색..."
                value={spaceFilter}
                onChange={(e) => setSpaceFilter(e.target.value)}
                autoFocus
              />
              <SmallBtn
                onClick={() => {
                  const keys = filteredProjects.map((p: JiraProject) => p.key);
                  setSelectedProjects((prev: string[]) => Array.from(new Set(prev.concat(keys))));
                }}
              >
                전체 선택
              </SmallBtn>
              <SmallBtn
                onClick={() => {
                  if (spaceFilter) {
                    const keys = new Set(filteredProjects.map((p: JiraProject) => p.key));
                    setSelectedProjects((prev: string[]) => prev.filter((k: string) => !keys.has(k)));
                  } else {
                    setSelectedProjects([]);
                  }
                }}
              >
                전체 해제
              </SmallBtn>
            </SpaceSearchRow>
            <SpaceList>
              {(() => {
                const selectedSet = new Set(selectedProjects);
                const pinned = filteredProjects.filter((p: JiraProject) => selectedSet.has(p.key));
                const unpinned = filteredProjects.filter((p: JiraProject) => !selectedSet.has(p.key));
                return (
                  <>
                    {pinned.length > 0 && (
                      <>
                        <SpaceSectionLabel>선택됨</SpaceSectionLabel>
                        {pinned.map((p: JiraProject) => (
                          <SpaceItem
                            key={p.key}
                            $active
                            onClick={() => {
                              setSelectedProjects((prev: string[]) => prev.filter((k: string) => k !== p.key));
                            }}
                          >
                            <SpaceCheckbox $checked>{'✓'}</SpaceCheckbox>
                            <SpaceItemName>{p.name}</SpaceItemName>
                            <SpaceItemKey>{p.key}</SpaceItemKey>
                          </SpaceItem>
                        ))}
                      </>
                    )}
                    {unpinned.length > 0 && (
                      <>
                        {pinned.length > 0 && <SpaceSectionLabel>전체</SpaceSectionLabel>}
                        {unpinned.map((p: JiraProject) => (
                          <SpaceItem
                            key={p.key}
                            $active={false}
                            onClick={() => {
                              setSelectedProjects((prev: string[]) => [...prev, p.key]);
                            }}
                          >
                            <SpaceCheckbox $checked={false} />
                            <SpaceItemName>{p.name}</SpaceItemName>
                            <SpaceItemKey>{p.key}</SpaceItemKey>
                          </SpaceItem>
                        ))}
                      </>
                    )}
                    {pinned.length === 0 && unpinned.length === 0 && (
                      <SpaceEmptyMsg>일치하는 스페이스가 없습니다.</SpaceEmptyMsg>
                    )}
                  </>
                );
              })()}
            </SpaceList>
            <SpaceSettingsFooter>
              <SaveBtn onClick={saveSpaceSettings}>
                저장
              </SaveBtn>
            </SpaceSettingsFooter>
          </SpaceSettingsPanel>
        </SpaceSettingsOverlay>
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
      {/* 아이템 우클릭 메뉴 */}
      {itemContextMenu && (
        <ItemContextOverlay onClick={() => setItemContextMenu(null)}>
          <ItemContextBox
            style={{ left: itemContextMenu.x, top: itemContextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <ItemContextMenuItem onClick={handleOpenInNewTab}>
              새 탭으로 열기
            </ItemContextMenuItem>
          </ItemContextBox>
        </ItemContextOverlay>
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

// ── Space Settings Modal ──

const SpaceSettingsOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

const SpaceSettingsPanel = styled.div`
  background: ${jiraTheme.bg.default};
  border-radius: 6px;
  border: 1px solid ${jiraTheme.border};
  width: 420px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`;

const SpaceSettingsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid ${jiraTheme.border};
`;

const SpaceSettingsTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
`;

const SpaceSettingsClose = styled.button`
  background: none;
  border: none;
  font-size: 1rem;
  color: ${jiraTheme.text.muted};
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;

  &:hover { color: ${jiraTheme.text.primary}; }
`;

const SpaceSettingsDesc = styled.div`
  padding: 0.75rem 1.25rem;
  font-size: 0.8125rem;
  color: ${jiraTheme.text.secondary};
  border-bottom: 1px solid ${jiraTheme.border};
`;

const SpaceSearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-bottom: 1px solid ${jiraTheme.border};
`;

const SpaceSearchInput = styled.input`
  flex: 1;
  padding: 0.375rem 0.625rem;
  border: 1px solid ${jiraTheme.border};
  border-radius: 20px;
  font-size: 0.8125rem;
  background: ${jiraTheme.bg.subtle};
  color: ${jiraTheme.text.primary};

  &::placeholder { color: ${jiraTheme.text.muted}; }
  &:focus {
    outline: none;
    border-color: ${jiraTheme.primary};
    background: ${jiraTheme.bg.default};
  }
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

const SpaceList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
  max-height: 400px;
`;

const SpaceSectionLabel = styled.div`
  padding: 0.375rem 1.25rem 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${jiraTheme.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid ${jiraTheme.border};
  margin-bottom: 0.125rem;

  &:not(:first-of-type) {
    margin-top: 0.375rem;
    border-top: 1px solid ${jiraTheme.border};
    padding-top: 0.5rem;
  }
`;

const SpaceEmptyMsg = styled.div`
  padding: 1.5rem;
  text-align: center;
  font-size: 0.8125rem;
  color: ${jiraTheme.text.muted};
`;

const SpaceItem = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 1.25rem;
  cursor: pointer;
  transition: background 0.1s;
  background: ${({ $active }) => $active ? jiraTheme.primaryLight : 'transparent'};

  &:hover {
    background: ${({ $active }) => $active ? jiraTheme.primaryLight : jiraTheme.bg.hover};
  }
`;

const SpaceCheckbox = styled.span<{ $checked: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 20px;
  border: 2px solid ${({ $checked }) => $checked ? jiraTheme.primary : jiraTheme.border};
  background: ${({ $checked }) => $checked ? jiraTheme.primary : 'transparent'};
  color: white;
  font-size: 0.6875rem;
  font-weight: 700;
  flex-shrink: 0;
`;

const SpaceItemName = styled.span`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${jiraTheme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`;

const SpaceItemKey = styled.span`
  font-size: 0.75rem;
  color: ${jiraTheme.text.muted};
  flex-shrink: 0;
`;

const SpaceSettingsFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid ${jiraTheme.border};
`;

const SaveBtn = styled.button`
  padding: 0.5rem 1.25rem;
  background: ${jiraTheme.primary};
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ${transition};

  &:hover { background: ${jiraTheme.primaryHover}; }
`;

// ── Item Context Menu ──

const ItemContextOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 500;
`;

const ItemContextBox = styled.div`
  position: fixed;
  background: ${jiraTheme.bg.default};
  border: 1px solid ${jiraTheme.border};
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  padding: 0.25rem 0;
  z-index: 501;
`;

const ItemContextMenuItem = styled.div`
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  color: ${jiraTheme.text.primary};
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: ${jiraTheme.bg.subtle};
  }
`;
