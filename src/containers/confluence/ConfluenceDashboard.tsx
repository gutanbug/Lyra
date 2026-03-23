import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { confluenceTheme } from 'lib/styles/confluenceTheme';
import { transition } from 'lib/styles/styles';
import { isAtlassianAccount } from 'types/account';
import { useTabs } from 'modules/contexts/splitView';
import { isPersonalSpaceKey } from 'lib/utils/confluenceNormalizers';
import { useConfluenceSearch } from 'lib/hooks/useConfluenceSearch';
import ConfluenceSearchToolbar from 'components/confluence/ConfluenceSearchToolbar';
import ConfluencePageList from 'components/confluence/ConfluencePageList';

// ── 컴포넌트 ──

const ConfluenceDashboard = () => {
  const history = useHistory();
  const { addTab } = useTabs();

  const search = useConfluenceSearch();
  const {
    activeAccount,
    currentAccountId,
    displayPages,
    isSearchMode,
    isLoading,
    isSearching,
    spaces,
    selectedSpaces,
    setSelectedSpaces,
    showSpaceSettings,
    setShowSpaceSettings,
    spaceFilter,
    setSpaceFilter,
    filteredSpaces,
    handleSaveSpaceSettings,
    searchQuery,
    searchResults,
    searchField,
    setSearchField,
    showFieldDropdown,
    setShowFieldDropdown,
    fieldDropdownRef,
    handleSearchChange,
    searchPages,
    clearSearch,
    suggestions,
    showSuggestions,
    setShowSuggestions,
    isSuggestLoading,
    activeSuggestionIdx,
    setActiveSuggestionIdx,
    searchWrapperRef,
    expandedSpaces,
    toggleSpace,
    expandAll,
    collapseAll,
    fetchMyPages,
    computeSpaceGroups,
  } = search;

  const myDisplayName = (activeAccount?.metadata as Record<string, unknown>)?.userDisplayName as string | undefined;

  // 우클릭 컨텍스트 메뉴
  const [itemContextMenu, setItemContextMenu] = useState<{ x: number; y: number; path: string; label: string } | null>(null);

  const handleItemContextMenu = (e: React.MouseEvent, path: string, label: string) => {
    e.preventDefault();
    e.stopPropagation();
    const zoom = 1.2;
    setItemContextMenu({ x: e.clientX / zoom, y: e.clientY / zoom, path, label });
  };

  const handleOpenInNewTab = () => {
    if (!itemContextMenu) return;
    addTab('confluence', itemContextMenu.path, itemContextMenu.label);
    setItemContextMenu(null);
  };

  const goToPage = (pageId: string) => {
    if (pageId) history.push(`/confluence/page/${pageId}`);
  };

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

  const spaceGroups = computeSpaceGroups(displayPages, spaces);

  return (
    <Layout>
      <ConfluenceSearchToolbar
        searchQuery={searchQuery}
        searchResults={searchResults}
        isSearching={isSearching}
        searchField={searchField}
        showFieldDropdown={showFieldDropdown}
        fieldDropdownRef={fieldDropdownRef}
        searchWrapperRef={searchWrapperRef}
        onSearchChange={handleSearchChange}
        onSearchField={(field) => { setSearchField(field); setShowFieldDropdown(false); }}
        onToggleFieldDropdown={() => setShowFieldDropdown((v) => !v)}
        onSearch={searchPages}
        onClearSearch={clearSearch}
        suggestions={suggestions}
        showSuggestions={showSuggestions}
        isSuggestLoading={isSuggestLoading}
        activeSuggestionIdx={activeSuggestionIdx}
        onSetActiveSuggestionIdx={setActiveSuggestionIdx}
        onHideSuggestions={() => setShowSuggestions(false)}
        onShowSuggestions={() => setShowSuggestions(true)}
        onGoToPage={goToPage}
        selectedSpacesCount={selectedSpaces.length}
        onOpenSpaceSettings={() => { setSpaceFilter(''); setShowSpaceSettings(true); }}
        isLoading={isLoading}
        onRefresh={fetchMyPages}
      />

      <ConfluencePageList
        spaceGroups={spaceGroups}
        expandedSpaces={expandedSpaces}
        isSearchMode={isSearchMode}
        isLoading={isLoading}
        isSearching={isSearching}
        myDisplayName={myDisplayName}
        onToggleSpace={toggleSpace}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        onGoToPage={goToPage}
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
              선택한 스페이스의 문서만 조회 및 검색됩니다.
              {selectedSpaces.length > 0
                ? ` (${selectedSpaces.length}개 선택됨)`
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
                  const keys = filteredSpaces.map((s) => s.key);
                  setSelectedSpaces((prev) => Array.from(new Set(prev.concat(keys))));
                }}
              >
                전체 선택
              </SmallBtn>
              <SmallBtn
                onClick={() => {
                  if (spaceFilter) {
                    const keys = new Set(filteredSpaces.map((s) => s.key));
                    setSelectedSpaces((prev) => prev.filter((k) => !keys.has(k)));
                  } else {
                    setSelectedSpaces([]);
                  }
                }}
              >
                전체 해제
              </SmallBtn>
            </SpaceSearchRow>
            <SpaceFilterList>
              {(() => {
                const selectedSet = new Set(selectedSpaces);
                const pinned = filteredSpaces.filter((s) => selectedSet.has(s.key));
                const unpinned = filteredSpaces.filter((s) => !selectedSet.has(s.key));
                return (
                  <>
                    {pinned.length > 0 && (
                      <>
                        <SpaceSectionLabel>선택됨</SpaceSectionLabel>
                        {pinned.map((s) => (
                          <SpaceFilterItem
                            key={s.id}
                            $active
                            onClick={() => {
                              setSelectedSpaces((prev) => prev.filter((k) => k !== s.key));
                            }}
                          >
                            <SpaceCheckbox $checked>{'✓'}</SpaceCheckbox>
                            <SpaceItemName>{s.name}</SpaceItemName>
                            {!isPersonalSpaceKey(s.key) && <SpaceItemKey>{s.key}</SpaceItemKey>}
                          </SpaceFilterItem>
                        ))}
                      </>
                    )}
                    {unpinned.length > 0 && (
                      <>
                        {pinned.length > 0 && <SpaceSectionLabel>전체</SpaceSectionLabel>}
                        {unpinned.map((s) => (
                          <SpaceFilterItem
                            key={s.id}
                            $active={false}
                            onClick={() => {
                              setSelectedSpaces((prev) => [...prev, s.key]);
                            }}
                          >
                            <SpaceCheckbox $checked={false} />
                            <SpaceItemName>{s.name}</SpaceItemName>
                            {!isPersonalSpaceKey(s.key) && <SpaceItemKey>{s.key}</SpaceItemKey>}
                          </SpaceFilterItem>
                        ))}
                      </>
                    )}
                    {pinned.length === 0 && unpinned.length === 0 && (
                      <SpaceEmptyMsg>일치하는 스페이스가 없습니다.</SpaceEmptyMsg>
                    )}
                  </>
                );
              })()}
            </SpaceFilterList>
            <SpaceSettingsFooter>
              <SaveBtn onClick={handleSaveSpaceSettings}>
                저장
              </SaveBtn>
            </SpaceSettingsFooter>
          </SpaceSettingsPanel>
        </SpaceSettingsOverlay>
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

export default ConfluenceDashboard;

// ── Styled Components ──

const Layout = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  min-height: 0;
  background: ${confluenceTheme.bg.subtle};
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
  color: ${confluenceTheme.text.muted};
  font-size: 0.95rem;
`;

const SmallBtn = styled.button`
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background: transparent;
  border: 1px solid ${confluenceTheme.border};
  border-radius: 20px;
  color: ${confluenceTheme.text.secondary};
  cursor: pointer;
  &:hover { background: ${confluenceTheme.bg.hover}; color: ${confluenceTheme.text.primary}; }
`;

// ── 스페이스 설정 모달 스타일 ──

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
  background: ${confluenceTheme.bg.default};
  border-radius: 6px;
  border: 1px solid ${confluenceTheme.border};
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
  border-bottom: 1px solid ${confluenceTheme.border};
`;

const SpaceSettingsTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${confluenceTheme.text.primary};
`;

const SpaceSettingsClose = styled.button`
  background: none;
  border: none;
  font-size: 1rem;
  color: ${confluenceTheme.text.muted};
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  &:hover { color: ${confluenceTheme.text.primary}; }
`;

const SpaceSettingsDesc = styled.div`
  padding: 0.75rem 1.25rem;
  font-size: 0.8125rem;
  color: ${confluenceTheme.text.secondary};
  border-bottom: 1px solid ${confluenceTheme.border};
`;

const SpaceSearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-bottom: 1px solid ${confluenceTheme.border};
`;

const SpaceSearchInput = styled.input`
  flex: 1;
  padding: 0.375rem 0.625rem;
  border: 1px solid ${confluenceTheme.border};
  border-radius: 20px;
  font-size: 0.8125rem;
  background: ${confluenceTheme.bg.subtle};
  color: ${confluenceTheme.text.primary};
  &::placeholder { color: ${confluenceTheme.text.muted}; }
  &:focus {
    outline: none;
    border-color: ${confluenceTheme.primary};
    background: ${confluenceTheme.bg.default};
  }
`;

const SpaceFilterList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
  max-height: 400px;
`;

const SpaceSectionLabel = styled.div`
  padding: 0.375rem 1.25rem 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${confluenceTheme.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid ${confluenceTheme.border};
  margin-bottom: 0.125rem;
  &:not(:first-of-type) {
    margin-top: 0.375rem;
    border-top: 1px solid ${confluenceTheme.border};
    padding-top: 0.5rem;
  }
`;

const SpaceEmptyMsg = styled.div`
  padding: 1.5rem;
  text-align: center;
  font-size: 0.8125rem;
  color: ${confluenceTheme.text.muted};
`;

const SpaceFilterItem = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 1.25rem;
  cursor: pointer;
  transition: background 0.1s;
  background: ${({ $active }) => $active ? confluenceTheme.primaryLight : 'transparent'};
  &:hover {
    background: ${({ $active }) => $active ? confluenceTheme.primaryLight : confluenceTheme.bg.hover};
  }
`;

const SpaceCheckbox = styled.span<{ $checked: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1.5px solid ${({ $checked }) => $checked ? confluenceTheme.primary : confluenceTheme.border};
  background: ${({ $checked }) => $checked ? confluenceTheme.primary : 'transparent'};
  color: white;
  font-size: 0.625rem;
  font-weight: 700;
  flex-shrink: 0;
`;

const SpaceItemName = styled.span`
  flex: 1;
  font-size: 0.8125rem;
  color: ${confluenceTheme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SpaceItemKey = styled.span`
  font-size: 0.6875rem;
  color: ${confluenceTheme.text.muted};
  flex-shrink: 0;
`;

const SpaceSettingsFooter = styled.div`
  padding: 0.75rem 1.25rem;
  border-top: 1px solid ${confluenceTheme.border};
  display: flex;
  justify-content: flex-end;
`;

const SaveBtn = styled.button`
  padding: 0.5rem 1.25rem;
  background: ${confluenceTheme.primary};
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ${transition};
  &:hover { background: ${confluenceTheme.primaryHover}; }
`;

// ─── Item Context Menu ─────────────────────────

const ItemContextOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 500;
`;

const ItemContextBox = styled.div`
  position: fixed;
  background: ${confluenceTheme.bg.default};
  border: 1px solid ${confluenceTheme.border};
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  padding: 0.25rem 0;
  z-index: 501;
`;

const ItemContextMenuItem = styled.div`
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  color: ${confluenceTheme.text.primary};
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: ${confluenceTheme.bg.subtle};
  }
`;
