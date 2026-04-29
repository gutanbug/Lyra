import { useCallback, useRef, useState } from 'react';
import { integrationController } from 'controllers/account';
import { parsePages } from 'lib/utils/confluenceNormalizers';
import type { NormalizedConfluencePage } from 'types/confluence';

export type SearchFieldType = 'title' | 'body' | 'title_body' | 'contributor';

export const SEARCH_FIELD_LABELS: Record<SearchFieldType, string> = {
  title: '제목',
  body: '본문',
  title_body: '제목+본문',
  contributor: '작성자',
};

export interface UseConfluencePageSearchOptions {
  accountId: string;
  activeAccount: { id: string } | null | undefined;
  selectedSpaces: string[];
  /** 검색 결과 로드 완료 시 composer에서 expandedSpaces 세팅 등 후속 작업 처리 */
  onResultsLoaded?: (pages: NormalizedConfluencePage[]) => void;
  cached?: {
    searchQuery?: string;
    searchResults?: NormalizedConfluencePage[] | null;
  };
}

export interface UseConfluencePageSearchResult {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  searchResults: NormalizedConfluencePage[] | null;
  setSearchResults: React.Dispatch<React.SetStateAction<NormalizedConfluencePage[] | null>>;
  isSearching: boolean;
  searchedOnce: boolean;
  searchField: SearchFieldType;
  setSearchField: React.Dispatch<React.SetStateAction<SearchFieldType>>;
  showFieldDropdown: boolean;
  setShowFieldDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  fieldDropdownRef: React.RefObject<HTMLDivElement>;
  searchPages: () => Promise<void>;
  clearSearch: () => void;
}

/**
 * Confluence Dashboard 페이지 검색 훅.
 * 필드 선택(title/body/title_body/contributor)을 지원하며,
 * 결과 로드 시 `onResultsLoaded`로 composer에 expandedSpaces 제어를 위임한다.
 */
export function useConfluencePageSearch({
  activeAccount,
  selectedSpaces,
  onResultsLoaded,
  cached,
}: UseConfluencePageSearchOptions): UseConfluencePageSearchResult {
  const [searchQuery, setSearchQuery] = useState(cached?.searchQuery ?? '');
  const [searchResults, setSearchResults] = useState<NormalizedConfluencePage[] | null>(cached?.searchResults ?? null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchedOnce, setSearchedOnce] = useState(Boolean(cached?.searchResults));

  const [searchField, setSearchField] = useState<SearchFieldType>('title');
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);
  const fieldDropdownRef = useRef<HTMLDivElement>(null);

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
      setSearchedOnce(true);
      if (onResultsLoaded) onResultsLoaded(pages);
    } catch (err) {
      console.error('[ConfluenceDashboard] searchPages error:', err);
      setSearchResults([]);
      setSearchedOnce(true);
    } finally {
      setIsSearching(false);
    }
  }, [activeAccount, searchQuery, selectedSpaces, searchField, onResultsLoaded]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults(null);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    isSearching,
    searchedOnce,
    searchField,
    setSearchField,
    showFieldDropdown,
    setShowFieldDropdown,
    fieldDropdownRef,
    searchPages,
    clearSearch,
  };
}
