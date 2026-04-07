import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAccount } from 'modules/contexts/account';
import { integrationController } from 'controllers/account';
import type { ConfluenceSpace, NormalizedConfluencePage, ConfluenceSpaceGroup } from 'types/confluence';
import { parsePages, parseSpaces, groupBySpace } from 'lib/utils/confluenceNormalizers';
import { loadSelectedSpaces, loadSelectedSpacesAsync, saveSelectedSpaces } from 'lib/utils/storageHelpers';

// ── 검색 필드 타입 ──

export type SearchFieldType = 'title' | 'body' | 'title_body' | 'contributor';

export const SEARCH_FIELD_LABELS: Record<SearchFieldType, string> = {
  title: '제목',
  body: '본문',
  title_body: '제목+본문',
  contributor: '작성자',
};

// ── 캐시 ──

interface DashboardCache {
  myPages: NormalizedConfluencePage[];
  spaces: ConfluenceSpace[];
  selectedSpaces: string[];
  searchQuery: string;
  searchResults: NormalizedConfluencePage[] | null;
  expandedSpaces: Set<string>;
  accountId: string;
}

const cache: DashboardCache = {
  myPages: [],
  spaces: [],
  selectedSpaces: [],
  searchQuery: '',
  searchResults: null,
  expandedSpaces: new Set(),
  accountId: '',
};

// ── Hook ──

export function useConfluenceSearch() {
  const { activeAccount } = useAccount();
  const currentAccountId = activeAccount?.id || '';
  const isCacheValid = cache.accountId === currentAccountId && currentAccountId !== '';

  // ── State ──

  const [myPages, setMyPages] = useState<NormalizedConfluencePage[]>(isCacheValid ? cache.myPages : []);
  const [isLoading, setIsLoading] = useState(false);

  const [spaces, setSpaces] = useState<ConfluenceSpace[]>(isCacheValid ? cache.spaces : []);
  const [selectedSpaces, setSelectedSpaces] = useState<string[]>(
    isCacheValid ? cache.selectedSpaces : loadSelectedSpaces(currentAccountId)
  );
  const [showSpaceSettings, setShowSpaceSettings] = useState(false);
  const [spaceFilter, setSpaceFilter] = useState('');

  const [searchQuery, setSearchQuery] = useState(isCacheValid ? cache.searchQuery : '');
  const [searchResults, setSearchResults] = useState<NormalizedConfluencePage[] | null>(isCacheValid ? cache.searchResults : null);
  const [isSearching, setIsSearching] = useState(false);

  const [searchField, setSearchField] = useState<SearchFieldType>('title');
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);
  const fieldDropdownRef = useRef<HTMLDivElement>(null);

  const [suggestions, setSuggestions] = useState<NormalizedConfluencePage[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(isCacheValid ? cache.expandedSpaces : new Set());

  // 스페이스 설정 로드 완료 여부
  const [spaceSettingsLoaded, setSpaceSettingsLoaded] = useState(isCacheValid);

  // ── 최초 마운트 시 저장된 스페이스 설정 로드 ──

  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (initialLoadDone.current || !currentAccountId || isCacheValid) return;
    initialLoadDone.current = true;
    loadSelectedSpacesAsync(currentAccountId).then((keys) => {
      if (keys.length > 0) setSelectedSpaces(keys);
      setSpaceSettingsLoaded(true);
    });
  }, [currentAccountId, isCacheValid]);

  // ── 계정 변경 시 초기화 ──

  const prevAccountIdRef = useRef(currentAccountId);
  useEffect(() => {
    if (prevAccountIdRef.current === currentAccountId) return;
    prevAccountIdRef.current = currentAccountId;

    setMyPages([]);
    setSpaces([]);
    setSelectedSpaces([]);
    setSearchQuery('');
    setSearchResults(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setExpandedSpaces(new Set());
    setSpaceSettingsLoaded(false);

    if (!currentAccountId) return;

    loadSelectedSpacesAsync(currentAccountId).then((keys) => {
      if (keys.length > 0) setSelectedSpaces(keys);
      setSpaceSettingsLoaded(true);
    });
  }, [currentAccountId]);

  // ── 캐시 동기화 ──

  useEffect(() => {
    cache.accountId = currentAccountId;
    cache.myPages = myPages;
    cache.spaces = spaces;
    cache.selectedSpaces = selectedSpaces;
    cache.searchQuery = searchQuery;
    cache.searchResults = searchResults;
    cache.expandedSpaces = expandedSpaces;
  }, [currentAccountId, myPages, spaces, selectedSpaces, searchQuery, searchResults, expandedSpaces]);

  // ── API Callbacks ──

  const fetchSpaces = useCallback(async () => {
    if (!activeAccount) return;
    try {
      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'confluence',
        action: 'getSpaces',
        params: { limit: 250 },
      });
      const list = parseSpaces(result);
      list.sort((a, b) => a.name.localeCompare(b.name));
      setSpaces(list);
    } catch {
      setSpaces([]);
    }
  }, [activeAccount]);

  const fetchMyPages = useCallback(async () => {
    if (!activeAccount) return;
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = {
        limit: 100,
        sort: '-modified-date',
        status: 'current',
        contributor: 'currentUser()',
      };
      if (selectedSpaces.length > 0) {
        params.spaceKeys = selectedSpaces;
      }
      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'confluence',
        action: 'getMyPages',
        params,
      });
      const pages = parsePages(result);
      setMyPages(pages);
    } catch (err) {
      console.error('[ConfluenceDashboard] fetchMyPages error:', err);
      setMyPages([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeAccount, selectedSpaces]);

  const searchPages = useCallback(async () => {
    if (!activeAccount) return;
    const term = searchQuery.trim();
    if (!term) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const params: Record<string, unknown> = {
        query: term,
        limit: 100,
        searchField,
      };
      if (selectedSpaces.length > 0) {
        params.spaceKeys = selectedSpaces;
      }
      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'confluence',
        action: 'searchPages',
        params,
      });
      const pages = parsePages(result);
      pages.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      setSearchResults(pages);
      setExpandedSpaces(new Set(pages.map((p) => p.spaceId || '__no_space__')));
    } catch (err) {
      console.error('[ConfluenceDashboard] searchPages error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [activeAccount, searchQuery, selectedSpaces, searchField]);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!activeAccount || !query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsSuggestLoading(true);
    try {
      const params: Record<string, unknown> = {
        query: query.trim(),
        limit: 10,
        searchField,
      };
      if (selectedSpaces.length > 0) {
        params.spaceKeys = selectedSpaces;
      }
      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'confluence',
        action: 'searchPages',
        params,
      });
      const pages = parsePages(result);
      pages.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      setSuggestions(pages);
      setShowSuggestions(pages.length > 0);
      setActiveSuggestionIdx(-1);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSuggestLoading(false);
    }
  }, [activeAccount, selectedSpaces, searchField]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    suggestTimerRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  }, [fetchSuggestions]);

  // ── Click-outside listeners ──

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (fieldDropdownRef.current && !fieldDropdownRef.current.contains(e.target as Node)) {
        setShowFieldDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // cleanup suggest timer
  useEffect(() => {
    return () => {
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    };
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults(null);
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  // ── Expand / Collapse ──

  const toggleSpace = useCallback((spaceId: string) => {
    setExpandedSpaces((prev) => {
      const next = new Set(prev);
      if (next.has(spaceId)) {
        next.delete(spaceId);
      } else {
        next.add(spaceId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback((groups: ConfluenceSpaceGroup[]) => {
    setExpandedSpaces(new Set(groups.map((g) => g.spaceId)));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedSpaces(new Set());
  }, []);

  // 글로벌 단축키 이벤트 수신
  const spaceGroupsRef = useRef<ConfluenceSpaceGroup[]>([]);
  useEffect(() => {
    const onExpand = () => expandAll(spaceGroupsRef.current);
    const onCollapse = () => collapseAll();
    window.addEventListener('lyra:expand-all', onExpand);
    window.addEventListener('lyra:collapse-all', onCollapse);
    return () => {
      window.removeEventListener('lyra:expand-all', onExpand);
      window.removeEventListener('lyra:collapse-all', onCollapse);
    };
  }, [expandAll, collapseAll]);

  // ── Filtered spaces (for space settings modal) ──

  const filteredSpaces = useMemo(() => {
    const q = spaceFilter.trim().toLowerCase();
    if (!q) return spaces;
    return spaces.filter(
      (s) => s.name.toLowerCase().includes(q) || s.key.toLowerCase().includes(q)
    );
  }, [spaces, spaceFilter]);

  // ── Initial data fetch ──

  const initialFetchDone = useRef(isCacheValid && cache.myPages.length > 0);

  useEffect(() => {
    if (!activeAccount) {
      setSpaces([]);
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
  }, [activeAccount, fetchSpaces, fetchMyPages, spaceSettingsLoaded]);

  // ── Save space settings ──

  const handleSaveSpaceSettings = useCallback(() => {
    saveSelectedSpaces(currentAccountId, selectedSpaces);
    setShowSpaceSettings(false);
    fetchMyPages();
    window.dispatchEvent(new CustomEvent('lyra:confluence-space-settings-changed'));
  }, [currentAccountId, selectedSpaces, fetchMyPages]);

  // ── Computed values ──

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
