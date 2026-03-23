import React from 'react';
import styled from 'styled-components';
import { getServiceIcon, hasServiceIcon } from 'lib/icons/services';
import { confluenceTheme } from 'lib/styles/confluenceTheme';
import { transition } from 'lib/styles/styles';
import { isPersonalSpaceKey } from 'lib/utils/confluenceNormalizers';
import type { ConfluenceSpace, NormalizedConfluencePage } from 'types/confluence';
import type { SearchFieldType } from 'lib/hooks/useConfluenceSearch';
import { SEARCH_FIELD_LABELS } from 'lib/hooks/useConfluenceSearch';

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

// ── Props ──

interface ConfluenceSearchToolbarProps {
  // search
  searchQuery: string;
  searchResults: NormalizedConfluencePage[] | null;
  isSearching: boolean;
  searchField: SearchFieldType;
  showFieldDropdown: boolean;
  fieldDropdownRef: React.RefObject<HTMLDivElement>;
  searchWrapperRef: React.RefObject<HTMLDivElement>;
  onSearchChange: (value: string) => void;
  onSearchField: (field: SearchFieldType) => void;
  onToggleFieldDropdown: () => void;
  onSearch: () => void;
  onClearSearch: () => void;

  // suggestions
  suggestions: NormalizedConfluencePage[];
  showSuggestions: boolean;
  isSuggestLoading: boolean;
  activeSuggestionIdx: number;
  onSetActiveSuggestionIdx: (idx: number) => void;
  onHideSuggestions: () => void;
  onShowSuggestions: () => void;
  onGoToPage: (pageId: string) => void;

  // space settings
  selectedSpacesCount: number;
  onOpenSpaceSettings: () => void;

  // loading
  isLoading: boolean;
  onRefresh: () => void;
}

// ── Component ──

const ConfluenceSearchToolbar = ({
  searchQuery,
  searchResults,
  isSearching,
  searchField,
  showFieldDropdown,
  fieldDropdownRef,
  searchWrapperRef,
  onSearchChange,
  onSearchField,
  onToggleFieldDropdown,
  onSearch,
  onClearSearch,
  suggestions,
  showSuggestions,
  isSuggestLoading,
  activeSuggestionIdx,
  onSetActiveSuggestionIdx,
  onHideSuggestions,
  onShowSuggestions,
  onGoToPage,
  selectedSpacesCount,
  onOpenSpaceSettings,
  isLoading,
  onRefresh,
}: ConfluenceSearchToolbarProps) => {
  return (
    <Toolbar>
      <Logo>
        {hasServiceIcon('confluence') && (
          <LogoIconWrap>{getServiceIcon('confluence', 24)}</LogoIconWrap>
        )}
        Confluence
      </Logo>
      <SearchWrapper ref={searchWrapperRef}>
        <SpaceFilterBtn onClick={onOpenSpaceSettings}>
          스페이스
          {selectedSpacesCount > 0 && (
            <SpaceCount>{selectedSpacesCount}</SpaceCount>
          )}
        </SpaceFilterBtn>
        <SearchInputWrapper>
          <SearchInput
            data-search-input
            placeholder="문서 제목, 내용 검색..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ paddingRight: '5.5rem' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (showSuggestions && activeSuggestionIdx >= 0 && suggestions[activeSuggestionIdx]) {
                  onHideSuggestions();
                  onGoToPage(suggestions[activeSuggestionIdx].id);
                } else {
                  onHideSuggestions();
                  onSearch();
                }
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                onSetActiveSuggestionIdx(Math.min(activeSuggestionIdx + 1, suggestions.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                onSetActiveSuggestionIdx(Math.max(activeSuggestionIdx - 1, -1));
              } else if (e.key === 'Escape') {
                onHideSuggestions();
              }
            }}
            onFocus={() => {
              if (suggestions.length > 0) onShowSuggestions();
            }}
          />
          <FieldFilterWrap ref={fieldDropdownRef}>
            <FieldFilterBtn onClick={onToggleFieldDropdown}>
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
                      onSearchField(key);
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
                    onHideSuggestions();
                    onGoToPage(page.id);
                  }}
                  onMouseEnter={() => onSetActiveSuggestionIdx(idx)}
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
        <SearchButton onClick={() => { onHideSuggestions(); onSearch(); }} disabled={isSearching}>
          {isSearching ? '검색 중...' : '검색'}
        </SearchButton>
        {searchResults !== null && (
          <ClearButton onClick={onClearSearch}>초기화</ClearButton>
        )}
      </SearchWrapper>
      <RefreshBtn onClick={onRefresh} disabled={isLoading}>
        새로고침
      </RefreshBtn>
    </Toolbar>
  );
};

export default ConfluenceSearchToolbar;

// ── Styled Components ──

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
