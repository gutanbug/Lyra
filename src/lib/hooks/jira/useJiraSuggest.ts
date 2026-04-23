import { useCallback, useEffect, useRef, useState } from 'react';
import { integrationController } from 'controllers/account';
import { escapeJql, KEY_PATTERN, NUMBER_ONLY_PATTERN } from 'lib/utils/jiraUtils';
import { parseIssues, buildProjectClause } from 'lib/utils/jiraNormalizers';
import type { NormalizedIssue, JiraProject } from 'types/jira';

export interface UseJiraSuggestOptions {
  accountId: string;
  activeAccount: { id: string } | null | undefined;
  selectedProjects: string[];
  projects: JiraProject[];
}

export interface UseJiraSuggestResult {
  suggestions: NormalizedIssue[];
  setSuggestions: React.Dispatch<React.SetStateAction<NormalizedIssue[]>>;
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
 * Jira 검색어 자동완성 훅.
 * 300ms debounce로 suggestions를 조회하고, 컨테이너 외부 클릭 시 드롭다운을 닫는다.
 * `handleSearchChange`는 debounced trigger만 담당 — searchQuery state는 composer(useJiraIssueSearch) 소유.
 */
export function useJiraSuggest({
  activeAccount,
  selectedProjects,
  projects,
}: UseJiraSuggestOptions): UseJiraSuggestResult {
  const [suggestions, setSuggestions] = useState<NormalizedIssue[]>([]);
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
      const clauses: string[] = [];
      const pc = buildProjectClause(selectedProjects);
      if (pc) clauses.push(pc);

      const term = query.trim();
      if (KEY_PATTERN.test(term)) {
        clauses.push(`key = "${escapeJql(term)}"`);
      } else if (NUMBER_ONLY_PATTERN.test(term)) {
        const prefixes = selectedProjects.length > 0 ? selectedProjects : projects.map((p) => p.key);
        if (prefixes.length > 0) {
          const keys = prefixes.map((pk) => `"${pk}-${term}"`);
          clauses.push(keys.length === 1 ? `key = ${keys[0]}` : `key IN (${keys.join(',')})`);
        }
      } else {
        const words = term.split(/\s+/).filter(Boolean);
        const wordClauses = words.map((w) => `summary ~ "${escapeJql(w)}"`);
        clauses.push(wordClauses.length === 1 ? wordClauses[0] : wordClauses.join(' AND '));
      }

      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'jira',
        action: 'searchIssues',
        params: {
          jql: `${clauses.join(' AND ')} ORDER BY updated DESC`,
          maxResults: 10,
          skipCache: true,
        },
      });
      const issues = parseIssues(result);
      setSuggestions(issues);
      setShowSuggestions(issues.length > 0);
      setActiveSuggestionIdx(-1);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSuggestLoading(false);
    }
  }, [activeAccount, selectedProjects, projects]);

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
