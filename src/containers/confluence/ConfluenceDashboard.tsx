import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { confluenceTheme } from 'lib/styles/confluenceTheme';
import { isAtlassianAccount } from 'types/account';
import { useTabs } from 'modules/contexts/tab';
import { isPersonalSpaceKey } from 'lib/utils/confluenceNormalizers';
import { useConfluenceSearch } from 'lib/hooks/useConfluenceSearch';
import ConfluenceSearchToolbar from 'components/confluence/ConfluenceSearchToolbar';
import ConfluencePageList from 'components/confluence/ConfluencePageList';
import SpaceFilterModal from 'components/common/SpaceFilterModal';
import ItemContextMenu from 'components/common/ItemContextMenu';
import { Rocket } from 'lucide-react';

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
            <EmptyIconWrap><Rocket size={22} /></EmptyIconWrap>
            <EmptyTitle>연결된 Atlassian 계정이 없어요</EmptyTitle>
            <EmptyDesc>계정을 추가하고 활성화하면 Confluence 페이지를 확인할 수 있습니다.</EmptyDesc>
            <EmptyCta onClick={() => history.push('/settings')}>계정 설정으로 이동</EmptyCta>
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

      {showSpaceSettings && (
        <SpaceFilterModal
          theme={confluenceTheme}
          description={`선택한 스페이스의 문서만 조회 및 검색됩니다.${
            selectedSpaces.length > 0 ? ` (${selectedSpaces.length}개 선택됨)` : ' (전체)'
          }`}
          items={filteredSpaces.map((s) => ({
            id: s.id,
            key: s.key,
            name: s.name,
            hideKey: isPersonalSpaceKey(s.key),
          }))}
          selectedKeys={selectedSpaces}
          spaceFilter={spaceFilter}
          onSpaceFilterChange={setSpaceFilter}
          onToggleKey={(key, next) =>
            next
              ? setSelectedSpaces((prev) => [...prev, key])
              : setSelectedSpaces((prev) => prev.filter((k) => k !== key))
          }
          onSelectAll={() => {
            const keys = filteredSpaces.map((s) => s.key);
            setSelectedSpaces((prev) => Array.from(new Set(prev.concat(keys))));
          }}
          onDeselectAll={() => {
            if (spaceFilter) {
              const keys = new Set(filteredSpaces.map((s) => s.key));
              setSelectedSpaces((prev) => prev.filter((k) => !keys.has(k)));
            } else {
              setSelectedSpaces([]);
            }
          }}
          onSave={handleSaveSpaceSettings}
          onClose={() => setShowSpaceSettings(false)}
        />
      )}

      {itemContextMenu && (
        <ItemContextMenu
          theme={confluenceTheme}
          position={{ x: itemContextMenu.x, y: itemContextMenu.y }}
          items={[{ label: '새 탭으로 열기', onClick: handleOpenInNewTab }]}
          onClose={() => setItemContextMenu(null)}
        />
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
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const EmptyIconWrap = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${confluenceTheme.bg.tile};
  color: ${confluenceTheme.text.muted};
  margin-bottom: 14px;
`;

const EmptyTitle = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: ${confluenceTheme.text.primary};
  margin-bottom: 6px;
`;

const EmptyDesc = styled.div`
  font-size: 0.88rem;
  color: ${confluenceTheme.text.muted};
  margin-bottom: 18px;
`;

const EmptyCta = styled.button`
  appearance: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  color: #fff;
  background: ${confluenceTheme.primary};
  padding: 9px 18px;
  border-radius: 8px;
  transition: opacity 0.12s;
  &:hover { opacity: 0.88; }
`;
