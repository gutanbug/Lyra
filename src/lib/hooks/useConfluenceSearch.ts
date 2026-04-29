import { useCallback, useEffect, useRef } from 'react';
import { useAccount } from 'modules/contexts/account';
import type { ConfluenceSpace, NormalizedConfluencePage, ConfluenceSpaceGroup } from 'types/confluence';
import { groupBySpace } from 'lib/utils/confluenceNormalizers';
import { createAccountScopedCache, useAccountScopedCache } from 'lib/hooks/_shared/useAccountScopedCache';
import { useConfluenceSpaces } from 'lib/hooks/confluence/useConfluenceSpaces';
import { useConfluenceMyPages } from 'lib/hooks/confluence/useConfluenceMyPages';
import { useConfluencePageSearch } from 'lib/hooks/confluence/useConfluencePageSearch';
import { useConfluenceSuggest } from 'lib/hooks/confluence/useConfluenceSuggest';
import { useConfluenceExpandState } from 'lib/hooks/confluence/useConfluenceExpandState';

export type { SearchFieldType } from 'lib/hooks/confluence/useConfluencePageSearch';
export { SEARCH_FIELD_LABELS } from 'lib/hooks/confluence/useConfluencePageSearch';

// ── 계정별 캐시 slot ──

interface DashboardCache {
  myPages: NormalizedConfluencePage[];
  spaces: ConfluenceSpace[];
  selectedSpaces: string[];
  searchQuery: string;
  searchResults: NormalizedConfluencePage[] | null;
  expandedSpaces: Set<string>;
}

const confluenceDashboardCache = createAccountScopedCache<DashboardCache>();

// ── Composer Hook ──

export function useConfluenceSearch() {
  const { activeAccount } = useAccount();
  const currentAccountId = activeAccount?.id || '';
  const cached = currentAccountId ? confluenceDashboardCache.get(currentAccountId) : undefined;

  // spaces (+ 설정 로드/영속)
  const spacesHook = useConfluenceSpaces({
    accountId: currentAccountId,
    activeAccount,
    cached: cached ? { spaces: cached.spaces, selectedSpaces: cached.selectedSpaces } : undefined,
  });
  const {
    spaces,
    selectedSpaces,
    setSelectedSpaces,
    showSpaceSettings,
    setShowSpaceSettings,
    spaceFilter,
    setSpaceFilter,
    filteredSpaces,
    spaceSettingsLoaded,
    fetchSpaces,
    handleSaveSpaceSettings: saveSpacesOnly,
  } = spacesHook;

  // my pages
  const myPagesHook = useConfluenceMyPages({
    accountId: currentAccountId,
    activeAccount,
    selectedSpaces,
    cached: cached ? { myPages: cached.myPages } : undefined,
  });
  const { myPages, setMyPages, isLoading, fetchMyPages } = myPagesHook;

  // space group 단축키용 ref (expand-state와 search 양쪽에서 참조)
  const spaceGroupsRef = useRef<ConfluenceSpaceGroup[]>([]);

  // expand/collapse
  const expandStateHook = useConfluenceExpandState({
    spaceGroupsRef,
    cached: cached ? { expandedSpaces: cached.expandedSpaces } : undefined,
  });
  const { expandedSpaces, setExpandedSpaces, toggleSpace, expandAll, collapseAll } = expandStateHook;

  // page search (결과 로드 시 전체 expand)
  const pageSearchHook = useConfluencePageSearch({
    accountId: currentAccountId,
    activeAccount,
    selectedSpaces,
    onResultsLoaded: useCallback((pages: NormalizedConfluencePage[]) => {
      setExpandedSpaces(new Set(pages.map((p) => p.spaceId || '__no_space__')));
    }, [setExpandedSpaces]),
    cached: cached ? { searchQuery: cached.searchQuery, searchResults: cached.searchResults } : undefined,
  });
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchField,
    setSearchField,
    showFieldDropdown,
    setShowFieldDropdown,
    fieldDropdownRef,
    searchPages,
    clearSearch: clearSearchOnly,
  } = pageSearchHook;

  // suggest (debounced + click-outside)
  const suggestHook = useConfluenceSuggest({
    accountId: currentAccountId,
    activeAccount,
    selectedSpaces,
    searchField,
  });
  const {
    suggestions,
    setSuggestions,
    showSuggestions,
    setShowSuggestions,
    isSuggestLoading,
    activeSuggestionIdx,
    setActiveSuggestionIdx,
    suggestContainerRef: searchWrapperRef,
    handleSearchChange: triggerSuggest,
  } = suggestHook;

  // ── 계정 변경 시 검색/자동완성/확장 상태 리셋 (spaces/myPages는 각 훅 내부에서 리셋) ──

  const prevAccountIdRef = useRef(currentAccountId);
  useEffect(() => {
    if (prevAccountIdRef.current === currentAccountId) return;
    prevAccountIdRef.current = currentAccountId;

    setMyPages([]);
    setSearchQuery('');
    pageSearchHook.setSearchResults(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setExpandedSpaces(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccountId]);

  // ── 캐시 동기화 ──

  useAccountScopedCache(
    confluenceDashboardCache,
    currentAccountId,
    [myPages, spaces, selectedSpaces, searchQuery, searchResults, expandedSpaces],
    () => ({ myPages, spaces, selectedSpaces, searchQuery, searchResults, expandedSpaces }),
  );

  // ── 검색어 변경: state 갱신 + debounced suggest ──

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    triggerSuggest(value);
  }, [setSearchQuery, triggerSuggest]);

  const clearSearch = useCallback(() => {
    clearSearchOnly();
    setSuggestions([]);
    setShowSuggestions(false);
  }, [clearSearchOnly, setSuggestions, setShowSuggestions]);

  // ── 스페이스 설정 저장 시 후속 fetch 합성 ──

  const handleSaveSpaceSettings = useCallback(() => {
    saveSpacesOnly();
    fetchMyPages();
  }, [saveSpacesOnly, fetchMyPages]);

  // ── 초기 데이터 로드 ──

  const initialFetchDone = useRef(Boolean(cached && cached.myPages.length > 0));
  useEffect(() => {
    if (!activeAccount) {
      setMyPages([]);
      return;
    }
    if (initialFetchDone.current) {
      initialFetchDone.current = false;
      return;
    }
    if (!spaceSettingsLoaded) return;
    fetchSpaces();
    fetchMyPages();
  }, [activeAccount, fetchSpaces, fetchMyPages, spaceSettingsLoaded, setMyPages]);

  // ── Computed ──

  const isSearchMode = searchResults !== null;
  const displayPages = isSearchMode ? searchResults : myPages;

  const computeSpaceGroups = useCallback((pages: NormalizedConfluencePage[], allSpaces: ConfluenceSpace[]) => {
    const groups = groupBySpace(pages, allSpaces);
    spaceGroupsRef.current = groups;
    return groups;
  }, []);

  return {
    // account
    activeAccount,
    currentAccountId,

    // pages
    myPages,
    isLoading,
    displayPages,
    isSearchMode,
    computeSpaceGroups,

    // spaces
    spaces,
    selectedSpaces,
    setSelectedSpaces,
    showSpaceSettings,
    setShowSpaceSettings,
    spaceFilter,
    setSpaceFilter,
    filteredSpaces,
    handleSaveSpaceSettings,

    // search
    searchQuery,
    searchResults,
    isSearching,
    searchField,
    setSearchField,
    showFieldDropdown,
    setShowFieldDropdown,
    fieldDropdownRef,
    handleSearchChange,
    searchPages,
    clearSearch,

    // suggestions
    suggestions,
    showSuggestions,
    setShowSuggestions,
    isSuggestLoading,
    activeSuggestionIdx,
    setActiveSuggestionIdx,
    searchWrapperRef,

    // expand/collapse
    expandedSpaces,
    toggleSpace,
    expandAll,
    collapseAll,

    // actions
    fetchMyPages,
  };
}
