import { useCallback, useEffect, useRef, useState } from 'react';
import { integrationController } from 'controllers/account';
import { parsePages } from 'lib/utils/confluenceNormalizers';
import type { NormalizedConfluencePage } from 'types/confluence';
import type { SearchFieldType } from 'lib/hooks/confluence/useConfluencePageSearch';

export interface UseConfluenceSuggestOptions {
  accountId: string;
  activeAccount: { id: string } | null | undefined;
  selectedSpaces: string[];
  searchField: SearchFieldType;
}

export interface UseConfluenceSuggestResult {
  suggestions: NormalizedConfluencePage[];
  setSuggestions: React.Dispatch<React.SetStateAction<NormalizedConfluencePage[]>>;
  showSuggestions: boolean;
  setShowSuggestions: React.Dispatch<React.SetStateAction<boolean>>;
  isSuggestLoading: boolean;
  activeSuggestionIdx: number;
  setActiveSuggestionIdx: React.Dispatch<React.SetStateAction<number>>;
  suggestContainerRef: React.RefObject<HTMLDivElement>;
  handleSearchChange: (query: string) => void;
  fetchSuggestions: (query: string) => Promise<void>;
}

/**
 * Confluence 검색어 자동완성 훅.
 * 300ms debounce로 suggestions를 조회하며, 컨테이너 외부 클릭 시 드롭다운을 닫는다.
 * `handleSearchChange`는 debounced trigger만 담당 — searchQuery state는 composer 소유.
 */
export function useConfluenceSuggest({
  activeAccount,
  selectedSpaces,
  searchField,
}: UseConfluenceSuggestOptions): UseConfluenceSuggestResult {
  const [suggestions, setSuggestions] = useState<NormalizedConfluencePage[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestContainerRef = useRef<HTMLDivElement>(null);

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

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestContainerRef.current && !suggestContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 타이머 정리
  useEffect(() => {
    return () => {
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    };
  }, []);

  return {
    suggestions,
    setSuggestions,
    showSuggestions,
    setShowSuggestions,
    isSuggestLoading,
    activeSuggestionIdx,
    setActiveSuggestionIdx,
    suggestContainerRef,
    handleSearchChange,
    fetchSuggestions,
  };
}
