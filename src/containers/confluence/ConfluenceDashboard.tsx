import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useAccount } from 'modules/contexts/account';
import { integrationController } from 'controllers/account';
import { getServiceIcon, hasServiceIcon } from 'lib/icons/services';
import { confluenceTheme } from 'lib/styles/confluenceTheme';
import { transition } from 'lib/styles/styles';
import { isAtlassianAccount } from 'types/account';
import { useTabs } from 'modules/contexts/splitView';
import type { ConfluenceSpace, NormalizedConfluencePage, ConfluenceSpaceGroup } from 'types/confluence';

// ── 유틸리티 ──

function str(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return '';
}

function obj(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

/** 개인 스페이스 키 여부 (~accountId 또는 긴 숫자/해시) */
function isPersonalSpaceKey(key: string): boolean {
  return key.startsWith('~') || /^-?\d{10,}/.test(key);
}

function normalizePage(raw: Record<string, unknown>): NormalizedConfluencePage {
  const id = str(raw.id);
  const title = str(raw.title);
  const status = str(raw.status) || 'current';

  // space 정보
  const spaceRaw = obj(raw.space) || obj(raw.spaceInfo);
  const spaceId = str(raw.spaceId) || str(spaceRaw?.id) || '';
  const spaceName = str(spaceRaw?.name) || '';
  const spaceKey = str(spaceRaw?.key) || '';

  // 작성자
  const authorRaw = obj(raw.author) || obj(raw.ownedBy) || obj(raw.createdBy);
  const authorId = str(authorRaw?.accountId) || str(authorRaw?.publicName) || '';
  const authorName = str(authorRaw?.displayName) || str(authorRaw?.publicName) || '';

  // 날짜
  const createdAt = str(raw.createdAt) || str(raw.created) || '';
  const updatedAt = str(raw.updatedAt) || str(raw.lastModified) || '';

  // 부모
  const parentId = str(raw.parentId) || '';
  const parentTitle = str(raw.parentTitle) || '';

  // 버전
  const versionRaw = obj(raw.version);
  const version = versionRaw ? Number(versionRaw.number) || 1 : (typeof raw.version === 'number' ? raw.version : 1);

  return {
    id, title, spaceId, spaceName, spaceKey, status,
    authorId, authorName, createdAt, updatedAt,
    parentId, parentTitle, version,
  };
}

function parsePages(result: unknown): NormalizedConfluencePage[] {
  if (!result || typeof result !== 'object') return [];
  const r = result as Record<string, unknown>;
  const list = (r.results ?? r.pages ?? r.values ?? []) as Record<string, unknown>[];
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => item && typeof item === 'object')
    .map(normalizePage)
    .filter((page) => page.id && page.title);
}

function parseSpaces(result: unknown): ConfluenceSpace[] {
  if (!result || typeof result !== 'object') return [];
  const r = result as Record<string, unknown>;
  const list = (r.results ?? r.spaces ?? r.values ?? []) as Record<string, unknown>[];
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: str(item.id),
      key: str(item.key),
      name: str(item.name),
      type: str(item.type),
      status: str(item.status),
    }))
    .filter((s) => s.id && s.key);
}

function groupBySpace(pages: NormalizedConfluencePage[], spaces: ConfluenceSpace[]): ConfluenceSpaceGroup[] {
  const spaceMap = new Map<string, ConfluenceSpaceGroup>();
  const NO_SPACE = '__no_space__';

  // 스페이스 이름 매핑
  const spaceNameMap = new Map<string, { name: string; key: string }>();
  for (const s of spaces) {
    spaceNameMap.set(s.id, { name: s.name, key: s.key });
  }

  for (const page of pages) {
    const sid = page.spaceId || NO_SPACE;
    if (!spaceMap.has(sid)) {
      const info = spaceNameMap.get(sid);
      const key = page.spaceKey || info?.key || '';
      let name = page.spaceName || info?.name || (sid === NO_SPACE ? '기타' : sid);
      // 개인 스페이스: ~ID 형식이면 spaceName 사용, 없으면 작성자 이름으로 대체
      if (isPersonalSpaceKey(key) && (!name || name === key)) {
        name = page.authorName || name;
      }
      spaceMap.set(sid, {
        spaceId: sid,
        spaceName: name,
        spaceKey: key,
        pages: [],
      });
    }
    spaceMap.get(sid)!.pages.push(page);
  }

  const groups = Array.from(spaceMap.values()).filter((g) => g.pages.length > 0);
  groups.sort((a, b) => {
    if (a.spaceId === NO_SPACE) return 1;
    if (b.spaceId === NO_SPACE) return -1;
    return a.spaceName.localeCompare(b.spaceName);
  });
  return groups;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return dateStr.slice(0, 10);
  }
}

// ── 캐시 ──

function loadSelectedSpaces(accountId: string): string[] {
  return [];
}

async function loadSelectedSpacesAsync(accountId: string): Promise<string[]> {
  try {
    if ((window as any).workspaceAPI?.settings) {
      return await (window as any).workspaceAPI.settings.getSelectedSpaces?.(accountId) ?? [];
    }
    const raw = localStorage.getItem(`lyra:confluence:selectedSpaces:${accountId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

function saveSelectedSpaces(accountId: string, keys: string[]): void {
  try {
    if ((window as any).workspaceAPI?.settings) {
      (window as any).workspaceAPI.settings.setSelectedSpaces?.(accountId, keys);
    }
    localStorage.setItem(`lyra:confluence:selectedSpaces:${accountId}`, JSON.stringify(keys));
  } catch { /* ignore */ }
}

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

// ── 컴포넌트 ──

const ConfluenceDashboard = () => {
  const { activeAccount } = useAccount();
  const myDisplayName = (activeAccount?.metadata as Record<string, unknown>)?.userDisplayName as string | undefined;
  const history = useHistory();
  const { addTab } = useTabs();

  // 우클릭 컨텍스트 메뉴 (새 탭으로 열기)
  const [itemContextMenu, setItemContextMenu] = useState<{ x: number; y: number; path: string; label: string } | null>(null);

  const handleItemContextMenu = (e: React.MouseEvent, path: string, label: string) => {
    e.preventDefault();
    e.stopPropagation();
    // zoom: 1.2 보정 — fixed 포지션이 zoom 컨테이너 안에 있으므로 좌표를 나눠야 정확
    const zoom = 1.2;
    setItemContextMenu({ x: e.clientX / zoom, y: e.clientY / zoom, path, label });
  };

  const handleOpenInNewTab = () => {
    if (!itemContextMenu) return;
    addTab('confluence', itemContextMenu.path, itemContextMenu.label);
    setItemContextMenu(null);
  };

  const currentAccountId = activeAccount?.id || '';
  const isCacheValid = cache.accountId === currentAccountId && currentAccountId !== '';

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

  type SearchFieldType = 'title' | 'body' | 'title_body' | 'contributor';
  const SEARCH_FIELD_LABELS: Record<SearchFieldType, string> = {
    title: '제목',
    body: '본문',
    title_body: '제목+본문',
    contributor: '작성자',
  };
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

  // 스페이스 설정 로드 완료 여부 (로드 전에 fetch 방지)
  const [spaceSettingsLoaded, setSpaceSettingsLoaded] = useState(isCacheValid);

  // 최초 마운트 시 저장된 스페이스 설정 로드
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (initialLoadDone.current || !currentAccountId || isCacheValid) return;
    initialLoadDone.current = true;
    loadSelectedSpacesAsync(currentAccountId).then((keys) => {
      if (keys.length > 0) setSelectedSpaces(keys);
      setSpaceSettingsLoaded(true);
    });
  }, [currentAccountId, isCacheValid]);

  // 계정 변경 시 초기화
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

  // 캐시 동기화
  useEffect(() => {
    cache.accountId = currentAccountId;
    cache.myPages = myPages;
    cache.spaces = spaces;
    cache.selectedSpaces = selectedSpaces;
    cache.searchQuery = searchQuery;
    cache.searchResults = searchResults;
    cache.expandedSpaces = expandedSpaces;
  }, [currentAccountId, myPages, spaces, selectedSpaces, searchQuery, searchResults, expandedSpaces]);

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

  useEffect(() => {
    return () => {
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    };
  }, []);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const goToPage = (pageId: string) => {
    if (pageId) history.push(`/confluence/page/${pageId}`);
  };

  const initialFetchDone = React.useRef(isCacheValid && cache.myPages.length > 0);

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
    // 스페이스 설정이 로드되기 전에는 페이지를 가져오지 않음
    if (!spaceSettingsLoaded) return;
    fetchSpaces();
    fetchMyPages();
  }, [activeAccount, fetchSpaces, fetchMyPages, spaceSettingsLoaded]);

  const toggleSpace = (spaceId: string) => {
    setExpandedSpaces((prev) => {
      const next = new Set(prev);
      if (next.has(spaceId)) {
        next.delete(spaceId);
      } else {
        next.add(spaceId);
      }
      return next;
    });
  };

  const expandAll = (groups: ConfluenceSpaceGroup[]) => {
    setExpandedSpaces(new Set(groups.map((g) => g.spaceId)));
  };

  const collapseAll = () => {
    setExpandedSpaces(new Set());
  };

  // 글로벌 단축키 이벤트 수신 (모두 접기/펼치기)
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
  }, []);

  const filteredSpaces = React.useMemo(() => {
    const q = spaceFilter.trim().toLowerCase();
    if (!q) return spaces;
    return spaces.filter(
      (s) => s.name.toLowerCase().includes(q) || s.key.toLowerCase().includes(q)
    );
  }, [spaces, spaceFilter]);

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
  const displayPages = isSearchMode ? searchResults : myPages;
  const spaceGroups = groupBySpace(displayPages, spaces);
  spaceGroupsRef.current = spaceGroups;

  return (
    <Layout>
      <Toolbar>
        <Logo>
          {hasServiceIcon('confluence') && (
            <LogoIconWrap>{getServiceIcon('confluence', 24)}</LogoIconWrap>
          )}
          Confluence
        </Logo>
        <SearchWrapper ref={searchWrapperRef}>
          <SpaceFilterBtn onClick={() => { setSpaceFilter(''); setShowSpaceSettings(true); }}>
            스페이스
            {selectedSpaces.length > 0 && (
              <SpaceCount>{selectedSpaces.length}</SpaceCount>
            )}
          </SpaceFilterBtn>
          <SearchInputWrapper>
            <SearchInput
              data-search-input
              placeholder="문서 제목, 내용 검색..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{ paddingRight: '5.5rem' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (showSuggestions && activeSuggestionIdx >= 0 && suggestions[activeSuggestionIdx]) {
                    setShowSuggestions(false);
                    goToPage(suggestions[activeSuggestionIdx].id);
                  } else {
                    setShowSuggestions(false);
                    searchPages();
                  }
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActiveSuggestionIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActiveSuggestionIdx((prev) => Math.max(prev - 1, -1));
                } else if (e.key === 'Escape') {
                  setShowSuggestions(false);
                }
              }}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
            />
            <FieldFilterWrap ref={fieldDropdownRef}>
              <FieldFilterBtn onClick={() => setShowFieldDropdown((v) => !v)}>
                {SEARCH_FIELD_LABELS[searchField]}
                <FieldFilterArrow>{showFieldDropdown ? '▲' : '▼'}</FieldFilterArrow>
              </FieldFilterBtn>
              {showFieldDropdown && (
                <FieldDropdown>
                  {(Object.keys(SEARCH_FIELD_LABELS) as SearchFieldType[]).map((key) => (
                    <FieldDropdownItem
                      key={key}
                      $active={key === searchField}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearchField(key);
                        setShowFieldDropdown(false);
                      }}
                    >
                      {SEARCH_FIELD_LABELS[key]}
                      {key === searchField && <FieldCheck>✓</FieldCheck>}
                    </FieldDropdownItem>
                  ))}
                </FieldDropdown>
              )}
            </FieldFilterWrap>
            {showSuggestions && (
              <SuggestDropdown>
                {suggestions.map((page, idx) => (
                  <SuggestItem
                    key={page.id}
                    $active={idx === activeSuggestionIdx}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowSuggestions(false);
                      goToPage(page.id);
                    }}
                    onMouseEnter={() => setActiveSuggestionIdx(idx)}
                  >
                    <SuggestIcon>
                      <PageIcon />
                    </SuggestIcon>
                    <SuggestTitle>{page.title}</SuggestTitle>
                    {page.authorName && (
                      <SuggestAuthor>{page.authorName}</SuggestAuthor>
                    )}
                    {page.spaceKey && (
                      <SuggestSpace>
                        {isPersonalSpaceKey(page.spaceKey) ? (page.spaceName || page.authorName || page.spaceKey) : page.spaceKey}
                      </SuggestSpace>
                    )}
                  </SuggestItem>
                ))}
                {isSuggestLoading && <SuggestLoading>검색 중...</SuggestLoading>}
              </SuggestDropdown>
            )}
            {isSuggestLoading && !showSuggestions && searchQuery.trim() && (
              <SuggestDropdown>
                <SuggestLoading>검색 중...</SuggestLoading>
              </SuggestDropdown>
            )}
          </SearchInputWrapper>
          <SearchButton onClick={() => { setShowSuggestions(false); searchPages(); }} disabled={isSearching}>
            {isSearching ? '검색 중...' : '검색'}
          </SearchButton>
          {searchResults !== null && (
            <ClearButton onClick={clearSearch}>초기화</ClearButton>
          )}
        </SearchWrapper>
        <RefreshBtn onClick={fetchMyPages} disabled={isLoading}>
          새로고침
        </RefreshBtn>
      </Toolbar>

      <Content>
        <SectionHeader>
          <SectionTitle>
            {isSearchMode
              ? `검색 결과 (${spaceGroups.reduce((n, g) => n + g.pages.length, 0)}건)`
              : `내가 작성한 문서 (${spaceGroups.reduce((n, g) => n + g.pages.length, 0)}건)`}
          </SectionTitle>
          {spaceGroups.length > 0 && (
            <ToggleAllButtons>
              <SmallBtn onClick={() => expandAll(spaceGroups)}>모두 펼치기</SmallBtn>
              <SmallBtn onClick={collapseAll}>모두 접기</SmallBtn>
            </ToggleAllButtons>
          )}
        </SectionHeader>

        {isLoading || isSearching ? (
          <LoadingArea>
            <Spinner />
            <LoadingText>{isSearching ? '검색 중' : '로딩 중'}</LoadingText>
          </LoadingArea>
        ) : spaceGroups.length === 0 ? (
          <Empty>
            {isSearchMode
              ? '검색 결과가 없습니다.'
              : '작성한 문서가 없습니다.'}
          </Empty>
        ) : (
          <SpaceList>
            {spaceGroups.map((group) => {
              const isExpanded = expandedSpaces.has(group.spaceId);
              return (
                <SpaceCard key={group.spaceId}>
                  <SpaceHeader onClick={() => toggleSpace(group.spaceId)}>
                    <SpaceToggle>{isExpanded ? '▼' : '▶'}</SpaceToggle>
                    <SpaceIconWrap>
                      <SpaceIconSvg />
                    </SpaceIconWrap>
                    <SpaceName>{group.spaceName}</SpaceName>
                    {group.spaceKey && !isPersonalSpaceKey(group.spaceKey) && (
                      <SpaceKey>{group.spaceKey}</SpaceKey>
                    )}
                    <SpacePageCount>{group.pages.length}</SpacePageCount>
                  </SpaceHeader>

                  {isExpanded && (
                    <PageTable>
                      <TableHeader>
                        <span>제목</span>
                        <span>상태</span>
                        <span>작성자</span>
                        <span>수정일</span>
                      </TableHeader>
                      {group.pages.map((page) => (
                        <PageRow
                          key={page.id}
                          onClick={() => goToPage(page.id)}
                          onContextMenu={(e) => handleItemContextMenu(e, `/confluence/page/${page.id}`, page.title || '(제목 없음)')}
                        >
                          <PageTitleCell>
                            <PageIcon />
                            <PageTitle>{page.title || '(제목 없음)'}</PageTitle>
                          </PageTitleCell>
                          <PageStatus>{page.status}</PageStatus>
                          <AuthorText $isMe={page.authorName === myDisplayName}>{page.authorName || '-'}</AuthorText>
                          <DateText>{formatDate(page.updatedAt || page.createdAt)}</DateText>
                        </PageRow>
                      ))}
                    </PageTable>
                  )}
                </SpaceCard>
              );
            })}
          </SpaceList>
        )}
      </Content>

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
              <SaveBtn
                onClick={() => {
                  saveSelectedSpaces(currentAccountId, selectedSpaces);
                  setShowSpaceSettings(false);
                  fetchMyPages();
                  window.dispatchEvent(new CustomEvent('lyra:confluence-space-settings-changed'));
                }}
              >
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

// ── 인라인 아이콘 ──

const PageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={confluenceTheme.page.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const SpaceIconSvg = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={confluenceTheme.space.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

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

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: ${confluenceTheme.bg.default};
  border-bottom: 1px solid ${confluenceTheme.border};
  flex-wrap: wrap;
  flex-shrink: 0;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1.125rem;
  color: ${confluenceTheme.text.primary};
  flex-shrink: 0;
`;

const LogoIconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
  & > svg { width: 100%; height: 100%; }
`;

const SearchWrapper = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
`;

const SpaceFilterBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid ${confluenceTheme.border};
  border-radius: 20px;
  font-size: 0.8125rem;
  background: ${confluenceTheme.bg.subtle};
  color: ${confluenceTheme.text.primary};
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ${transition};
  &:hover {
    background: ${confluenceTheme.bg.hover};
    border-color: ${confluenceTheme.primary};
  }
`;

const SpaceCount = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 0.25rem;
  border-radius: 9px;
  background: ${confluenceTheme.primary};
  color: white;
  font-size: 0.6875rem;
  font-weight: 600;
`;

const SearchInputWrapper = styled.div`
  flex: 1;
  position: relative;
  min-width: 120px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2rem;
  border: 1px solid ${confluenceTheme.border};
  border-radius: 20px;
  font-size: 0.875rem;
  background: ${confluenceTheme.bg.subtle} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2397A0AF' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E") no-repeat 0.5rem center;
  box-sizing: border-box;
  &::placeholder { color: ${confluenceTheme.text.muted}; }
  &:focus {
    outline: none;
    border-color: ${confluenceTheme.primary};
    background-color: ${confluenceTheme.bg.default};
  }
`;

const FieldFilterWrap = styled.div`
  position: absolute;
  right: 0.375rem;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
`;

const FieldFilterBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  background: transparent;
  border: none;
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${confluenceTheme.text.secondary};
  cursor: pointer;
  transition: color 0.15s ${transition};
  white-space: nowrap;

  &:hover {
    color: ${confluenceTheme.primary};
  }
`;

const FieldFilterArrow = styled.span`
  font-size: 0.5rem;
  line-height: 1;
`;

const FieldDropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: ${confluenceTheme.bg.default};
  border: 1px solid ${confluenceTheme.border};
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  min-width: 100px;
  padding: 0.25rem 0;
  z-index: 300;
`;

const FieldDropdownItem = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  color: ${({ $active }) => ($active ? confluenceTheme.primary : confluenceTheme.text.primary)};
  background: ${({ $active }) => ($active ? confluenceTheme.primaryLight : 'transparent')};
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: ${({ $active }) => ($active ? confluenceTheme.primaryLight : confluenceTheme.bg.hover)};
  }
`;

const FieldCheck = styled.span`
  font-size: 0.6875rem;
  color: ${confluenceTheme.primary};
  margin-left: 0.5rem;
`;

const SuggestDropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: ${confluenceTheme.bg.default};
  border: 1px solid ${confluenceTheme.border};
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 200;
  max-height: 420px;
  overflow-y: auto;
`;

const SuggestItem = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  background: ${({ $active }) => $active ? confluenceTheme.bg.hover : 'transparent'};
  transition: background 0.1s;
  &:hover { background: ${confluenceTheme.bg.hover}; }
  &:not(:last-child) { border-bottom: 1px solid ${confluenceTheme.border}; }
`;

const SuggestIcon = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
`;

const SuggestTitle = styled.span`
  flex: 1;
  font-size: 0.8125rem;
  color: ${confluenceTheme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SuggestAuthor = styled.span`
  flex-shrink: 0;
  font-size: 0.6875rem;
  color: ${confluenceTheme.text.secondary};
  white-space: nowrap;
`;

const SuggestSpace = styled.span`
  flex-shrink: 0;
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.125rem 0.375rem;
  border-radius: 20px;
  background: ${confluenceTheme.space.bg};
  color: ${confluenceTheme.space.color};
`;

const SuggestLoading = styled.div`
  padding: 0.75rem;
  text-align: center;
  font-size: 0.8125rem;
  color: ${confluenceTheme.text.muted};
`;

const SearchButton = styled.button`
  padding: 0.5rem 1rem;
  background: ${confluenceTheme.primary};
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ${transition};
  flex-shrink: 0;
  &:hover { background: ${confluenceTheme.primaryHover}; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const ClearButton = styled.button`
  padding: 0.5rem 0.75rem;
  background: transparent;
  color: ${confluenceTheme.text.secondary};
  border: 1px solid ${confluenceTheme.border};
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  flex-shrink: 0;
  &:hover { background: ${confluenceTheme.bg.hover}; color: ${confluenceTheme.text.primary}; }
`;

const RefreshBtn = styled.button`
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  background: transparent;
  border: 1px solid ${confluenceTheme.border};
  border-radius: 20px;
  color: ${confluenceTheme.text.secondary};
  cursor: pointer;
  flex-shrink: 0;
  &:hover { background: ${confluenceTheme.bg.hover}; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

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
  color: ${confluenceTheme.text.primary};
`;

const ToggleAllButtons = styled.div`
  display: flex;
  gap: 0.5rem;
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
  border: 2.5px solid ${confluenceTheme.border};
  border-top-color: ${confluenceTheme.primary};
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;

const LoadingText = styled.span`
  font-size: 0.8125rem;
  color: ${confluenceTheme.text.secondary};
`;

const Empty = styled.div`
  padding: 4rem 2rem;
  text-align: center;
  color: ${confluenceTheme.text.secondary};
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

const SpaceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SpaceCard = styled.div`
  border-radius: 6px;
  border: 1px solid ${confluenceTheme.border};
  overflow: hidden;
`;

const SpaceHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 1rem;
  background: #F8F9FB;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ${transition};
  min-width: 0;
  border-left: 3px solid ${confluenceTheme.space.color};
  &:hover { background: ${confluenceTheme.bg.hover}; }
`;

const SpaceToggle = styled.span`
  font-size: 0.625rem;
  color: ${confluenceTheme.text.muted};
  width: 0.875rem;
  flex-shrink: 0;
`;

const SpaceIconWrap = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
`;

const SpaceName = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${confluenceTheme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`;

const SpaceKey = styled.span`
  font-size: 0.6875rem;
  font-weight: 500;
  color: ${confluenceTheme.space.color};
  flex-shrink: 0;
`;

const SpacePageCount = styled.span`
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${confluenceTheme.space.color};
  background: ${confluenceTheme.space.bg};
  border-radius: 10px;
  padding: 0.125rem 0.5rem;
  flex-shrink: 0;
`;

const PageTable = styled.div``;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr minmax(70px, 90px) minmax(70px, 110px) minmax(70px, 100px);
  gap: 0.75rem;
  padding: 0.4rem 1rem 0.4rem 2.25rem;
  background: #ECEEF2;
  border-top: 1px solid ${confluenceTheme.border};
  font-size: 0.6875rem;
  font-weight: 700;
  color: ${confluenceTheme.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.03em;
  text-align: center;

  & > span:first-of-type { text-align: left; }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    padding-left: 1rem;
    span:nth-child(2),
    span:nth-child(3),
    span:nth-child(4) { display: none; }
  }
`;

const PageRow = styled.div`
  display: grid;
  grid-template-columns: 1fr minmax(70px, 90px) minmax(70px, 110px) minmax(70px, 100px);
  gap: 0.75rem;
  padding: 0.5rem 1rem 0.5rem 2.25rem;
  background: ${confluenceTheme.bg.default};
  border-top: 1px solid #F0F1F3;
  align-items: center;
  cursor: pointer;
  transition: background 0.12s ${transition};

  &:first-of-type { border-top: none; }
  &:hover { background: #F5F7FA; }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    padding-left: 1rem;
  }
`;

const PageTitleCell = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
`;

const PageTitle = styled.span`
  font-size: 0.8125rem;
  color: ${confluenceTheme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PageStatus = styled.span`
  font-size: 0.6875rem;
  font-weight: 500;
  color: ${confluenceTheme.text.secondary};
  text-align: center;
  text-transform: capitalize;

  @media (max-width: 600px) { display: none; }
`;

const AuthorText = styled.span<{ $isMe?: boolean }>`
  font-size: 0.75rem;
  color: ${({ $isMe }) => ($isMe ? confluenceTheme.primary : confluenceTheme.text.secondary)};
  font-weight: ${({ $isMe }) => ($isMe ? 600 : 400)};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;

  @media (max-width: 600px) { display: none; }
`;

const DateText = styled.span`
  font-size: 0.75rem;
  color: ${confluenceTheme.text.muted};
  text-align: center;
  white-space: nowrap;

  @media (max-width: 600px) { display: none; }
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
