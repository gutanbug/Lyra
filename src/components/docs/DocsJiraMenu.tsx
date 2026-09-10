import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { DocsPopup, DocsPopupLabel } from 'lib/styles/docsCommon';
import type { DocsJiraIssue } from 'types/docs';

const DocsJiraMenu = () => {
  const {
    state, searchJiraIssues, chooseJiraIssue, jiraType,
  } = useDocs();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DocsJiraIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { jiraMenu } = state;

  useEffect(() => {
    if (!jiraMenu) { setQuery(''); setResults([]); setSearched(false); return; }
    if (!query.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const issues = await searchJiraIssues(query);
      setResults(issues);
      setSearched(true);
      setLoading(false);
    }, 300);
    // eslint-disable-next-line consistent-return
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, jiraMenu]);

  if (!jiraMenu) return null;

  return (
    <DocsPopup data-docs-menu style={{ left: jiraMenu.x, top: jiraMenu.y, width: 320, maxHeight: 360, overflowY: 'auto' }}>
      <DocsPopupLabel>Jira 이슈 검색</DocsPopupLabel>
      <SearchInput
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이슈 키 또는 제목으로 검색…"
      />
      {loading && <Empty>검색 중…</Empty>}
      {!loading && searched && results.length === 0 && <Empty>일치하는 이슈 없음</Empty>}
      {!loading && results.map((issue) => {
        const tc = jiraType(issue.type);
        return (
          <Item key={issue.key} onClick={() => chooseJiraIssue(issue)}>
            <TypeSq style={{ background: tc.color }}>{tc.letter}</TypeSq>
            <Body>
              <IssueKey>{issue.key}</IssueKey>
              <Summary>{issue.summary}</Summary>
            </Body>
          </Item>
        );
      })}
    </DocsPopup>
  );
};

export default DocsJiraMenu;

const SearchInput = styled.input`
  width: 100%;
  font-family: inherit;
  font-size: 12.5px;
  color: ${docsTheme.text};
  background: ${docsTheme.surfaceSoft};
  border: 1px solid ${docsTheme.border};
  border-radius: 8px;
  padding: 7px 9px;
  outline: none;
  margin-bottom: 6px;
  &:focus { border-color: ${docsTheme.accent}; }
`;

const Empty = styled.div`
  padding: 14px 10px;
  font-size: 13px;
  color: ${docsTheme.muted};
  text-align: center;
`;

const Item = styled.button`
  width: 100%;
  appearance: none;
  border: none;
  cursor: pointer;
  background: transparent;
  border-radius: 8px;
  padding: 7px 9px;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  &:hover { background: ${docsTheme.hover}; }
`;

const TypeSq = styled.span`
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: Sora, sans-serif;
`;

const Body = styled.div`
  flex: 1;
  min-width: 0;
`;

const IssueKey = styled.div`
  font-family: 'Sora', monospace;
  font-size: 11px;
  font-weight: 600;
  color: ${docsTheme.muted};
`;

const Summary = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${docsTheme.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
