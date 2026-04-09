import React from 'react';
import styled from 'styled-components';
import { getServiceIcon, hasServiceIcon } from 'lib/icons/services';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { transition } from 'lib/styles/styles';
import { getStatusColor } from 'lib/utils/jiraUtils';
import JiraTaskIcon, { resolveTaskType } from 'components/jira/JiraTaskIcon';
import type { NormalizedIssue } from 'types/jira';

interface JiraSearchToolbarProps {
  searchQuery: string;
  searchResults: NormalizedIssue[] | null;
  isSearching: boolean;
  isLoading: boolean;
  suggestions: NormalizedIssue[];
  showSuggestions: boolean;
  isSuggestLoading: boolean;
  activeSuggestionIdx: number;
  selectedProjectsCount: number;
  searchWrapperRef: React.RefObject<HTMLDivElement>;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onClearSearch: () => void;
  onRefresh: () => void;
  onOpenSpaceSettings: () => void;
  onGoToIssue: (key: string) => void;
  onSetShowSuggestions: (show: boolean) => void;
  onSetActiveSuggestionIdx: (idx: number | ((prev: number) => number)) => void;
}

const JiraSearchToolbar = ({
  searchQuery,
  searchResults,
  isSearching,
  isLoading,
  suggestions,
  showSuggestions,
  isSuggestLoading,
  activeSuggestionIdx,
  selectedProjectsCount,
  searchWrapperRef,
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
  onRefresh,
  onOpenSpaceSettings,
  onGoToIssue,
  onSetShowSuggestions,
  onSetActiveSuggestionIdx,
}: JiraSearchToolbarProps) => {
  return (
    <Toolbar>
      <Logo>
        {hasServiceIcon('jira') && (
          <LogoIconBtn
            onClick={() => window.dispatchEvent(new Event('lyra:toggle-sidebar'))}
            title="사이드바 열기/닫기 (⌘\)"
          >
            {getServiceIcon('jira', 24)}
          </LogoIconBtn>
        )}
        Jira
      </Logo>
      <SearchWrapper ref={searchWrapperRef}>
        <SpaceFilterBtn onClick={onOpenSpaceSettings}>
          스페이스
          {selectedProjectsCount > 0 && (
            <SpaceCount>{selectedProjectsCount}</SpaceCount>
          )}
        </SpaceFilterBtn>
        <SearchInputWrapper>
          <SearchInput
            data-search-input
            placeholder="티켓 번호, 제목, 내용, 담당자 검색..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (showSuggestions && activeSuggestionIdx >= 0 && suggestions[activeSuggestionIdx]) {
                  onGoToIssue(suggestions[activeSuggestionIdx].key);
                  onSetShowSuggestions(false);
                } else {
                  onSetShowSuggestions(false);
                  onSearchSubmit();
                }
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                onSetActiveSuggestionIdx((prev: number) => Math.min(prev + 1, suggestions.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                onSetActiveSuggestionIdx((prev: number) => Math.max(prev - 1, -1));
              } else if (e.key === 'Escape') {
                onSetShowSuggestions(false);
              }
            }}
            onFocus={() => {
              if (suggestions.length > 0) onSetShowSuggestions(true);
            }}
          />
          {showSuggestions && (
            <SuggestDropdown>
              {suggestions.map((issue, idx) => (
                <SuggestItem
                  key={issue.key}
                  $active={idx === activeSuggestionIdx}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onGoToIssue(issue.key);
                    onSetShowSuggestions(false);
                  }}
                  onMouseEnter={() => onSetActiveSuggestionIdx(idx)}
                >
                  <SuggestIcon>
                    <JiraTaskIcon type={resolveTaskType(issue.issueTypeName)} size={16} />
                  </SuggestIcon>
                  <SuggestKey>{issue.key}</SuggestKey>
                  <SuggestSummary>{issue.summary || '(제목 없음)'}</SuggestSummary>
                  <SuggestStatus $color={getStatusColor(issue.statusName, issue.statusCategory)}>
                    {issue.statusName}
                  </SuggestStatus>
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
        <SearchButton onClick={() => { onSetShowSuggestions(false); onSearchSubmit(); }} disabled={isSearching}>
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

export default JiraSearchToolbar;

// ── Styled Components ──

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: ${jiraTheme.bg.default};
  border-bottom: 1px solid ${jiraTheme.border};
  flex-wrap: wrap;
  flex-shrink: 0;

  @media (max-width: 900px) {
    padding: 0.75rem 1rem;
    gap: 0.5rem;
  }
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1.125rem;
  color: ${jiraTheme.text.primary};
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

const LogoIconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ${transition};

  & > svg { width: 1.5rem; height: 1.5rem; }

  &:hover {
    background: ${jiraTheme.bg.hover};
  }
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
  border: 1px solid ${jiraTheme.border};
  border-radius: 20px;
  font-size: 0.8125rem;
  background: ${jiraTheme.bg.subtle};
  color: ${jiraTheme.text.primary};
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ${transition};

  &:hover {
    background: ${jiraTheme.bg.hover};
    border-color: ${jiraTheme.primary};
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
  background: ${jiraTheme.primary};
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
  border: 1px solid ${jiraTheme.border};
  border-radius: 20px;
  font-size: 0.875rem;
  background: ${jiraTheme.bg.subtle} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2397A0AF' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E") no-repeat 0.5rem center;
  box-sizing: border-box;

  &::placeholder { color: ${jiraTheme.text.muted}; }
  &:focus {
    outline: none;
    border-color: ${jiraTheme.primary};
    background-color: ${jiraTheme.bg.default};
  }
`;

const SuggestDropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: ${jiraTheme.bg.default};
  border: 1px solid ${jiraTheme.border};
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 200;
  max-height: 360px;
  overflow-y: auto;
`;

const SuggestItem = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  background: ${({ $active }) => $active ? jiraTheme.bg.hover : 'transparent'};
  transition: background 0.1s;

  &:hover { background: ${jiraTheme.bg.hover}; }
  &:not(:last-child) { border-bottom: 1px solid ${jiraTheme.border}; }
`;

const SuggestIcon = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
`;

const SuggestKey = styled.span`
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${jiraTheme.primary};
  min-width: 80px;
`;

const SuggestSummary = styled.span`
  flex: 1;
  font-size: 0.8125rem;
  color: ${jiraTheme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SuggestStatus = styled.span<{ $color?: string }>`
  flex-shrink: 0;
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.125rem 0.375rem;
  border-radius: 20px;
  background: ${({ $color }) => $color || jiraTheme.status.default};
  color: white;
`;

const SuggestLoading = styled.div`
  padding: 0.75rem;
  text-align: center;
  font-size: 0.8125rem;
  color: ${jiraTheme.text.muted};
`;

const SearchButton = styled.button`
  padding: 0.5rem 1rem;
  background: ${jiraTheme.primary};
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ${transition};
  flex-shrink: 0;

  &:hover { background: ${jiraTheme.primaryHover}; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const ClearButton = styled.button`
  padding: 0.5rem 0.75rem;
  background: transparent;
  color: ${jiraTheme.text.secondary};
  border: 1px solid ${jiraTheme.border};
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  flex-shrink: 0;

  &:hover { background: ${jiraTheme.bg.hover}; color: ${jiraTheme.text.primary}; }
`;

const RefreshBtn = styled.button`
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  background: transparent;
  border: 1px solid ${jiraTheme.border};
  border-radius: 20px;
  color: ${jiraTheme.text.secondary};
  cursor: pointer;
  flex-shrink: 0;

  &:hover { background: ${jiraTheme.bg.hover}; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;
