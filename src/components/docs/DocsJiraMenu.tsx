import { useEffect, useRef, useState } from 'react';
import { Loader2, Search, TriangleAlert } from 'lucide-react';
import styled, { keyframes } from 'styled-components';
import { useDocs } from 'modules/contexts/docs';
import { useAccount } from 'modules/contexts/account';
import { docsTheme } from 'lib/styles/docsTheme';
import { DocsPopup, DocsPopupLabel } from 'lib/styles/docsCommon';
import type { DocsJiraIssue } from 'types/docs';

type Phase = 'idle' | 'loading' | 'done' | 'error';

const DocsJiraMenu = () => {
  const {
    state, searchJiraIssues, chooseJiraIssue, jiraType,
  } = useDocs();
  const { activeAccount } = useAccount();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DocsJiraIssue[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [activeIndex, setActiveIndex] = useState(-1);
  const { jiraMenu } = state;
  const seqRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!jiraMenu) { setQuery(''); setResults([]); setPhase('idle'); setActiveIndex(-1); }
  }, [jiraMenu]);

  useEffect(() => {
    if (!jiraMenu || !activeAccount) return undefined;
    if (!query.trim()) { setResults([]); setPhase('idle'); setActiveIndex(-1); return undefined; }
    const mySeq = (seqRef.current += 1);
    setPhase('loading');
    const t = setTimeout(async () => {
      try {
        const issues = await searchJiraIssues(query);
        if (seqRef.current !== mySeq) return;
        setResults(issues);
        setPhase('done');
        setActiveIndex(issues.length ? 0 : -1);
      } catch (e) {
        if (seqRef.current !== mySeq) return;
        setResults([]);
        setPhase('error');
        setActiveIndex(-1);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, jiraMenu, activeAccount, searchJiraIssues]);

  useEffect(() => {
    if (activeIndex < 0) return;
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!jiraMenu) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      chooseJiraIssue(results[activeIndex]);
    }
  };

  return (
    <DocsPopup data-docs-menu style={{ left: jiraMenu.x, top: jiraMenu.y, width: 340, maxHeight: 392, overflowY: 'auto' }}>
      <DocsPopupLabel>Jira 이슈 검색</DocsPopupLabel>
      <SearchBar>
        <Search size={13} color={docsTheme.faint} />
        <SearchInput
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="이슈 키 또는 제목으로 검색…"
        />
      </SearchBar>

      {!activeAccount && (
        <StateBox>
          <TriangleAlert size={15} color={docsTheme.muted} />
          연결된 Jira 계정이 없습니다
        </StateBox>
      )}

      {activeAccount && phase === 'idle' && (
        <StateBox $muted>검색어를 입력하세요</StateBox>
      )}

      {activeAccount && phase === 'loading' && (
        <StateBox><Spinner size={14} /> 검색 중…</StateBox>
      )}

      {activeAccount && phase === 'error' && (
        <StateBox>
          <TriangleAlert size={15} color={docsTheme.danger} />
          검색에 실패했습니다 · 다시 시도해 주세요
        </StateBox>
      )}

      {activeAccount && phase === 'done' && results.length === 0 && (
        <StateBox $muted>일치하는 이슈가 없습니다</StateBox>
      )}

      {activeAccount && phase === 'done' && results.length > 0 && (
        <>
          <List ref={listRef}>
            {results.map((issue, idx) => {
              const tc = jiraType(issue.type);
              const statusMeta = issue.status ? docsTheme.status[issue.status] : null;
              const prMeta = issue.priority ? docsTheme.priority[issue.priority] : null;
              return (
                <Item
                  key={issue.key}
                  data-idx={idx}
                  $active={idx === activeIndex}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => chooseJiraIssue(issue)}
                >
                  <Row>
                    <TypeSq style={{ background: tc.color }}>{tc.letter}</TypeSq>
                    <IssueKey>{issue.key}</IssueKey>
                    {statusMeta && <StatusChip style={{ background: statusMeta.bg, color: statusMeta.ink }}>{issue.status}</StatusChip>}
                    {prMeta && <PrGlyph style={{ color: prMeta.color }}>{prMeta.glyph}</PrGlyph>}
                    {issue.assignee && (
                      <Avatar title={issue.assignee}>{issue.assignee[0]}</Avatar>
                    )}
                  </Row>
                  <Summary>{issue.summary || '(제목 없음)'}</Summary>
                </Item>
              );
            })}
          </List>
          <Footer>↑↓ 이동 · Enter 선택 · Esc 닫기</Footer>
        </>
      )}
    </DocsPopup>
  );
};

export default DocsJiraMenu;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  background: ${docsTheme.surfaceSoft};
  border: 1px solid ${docsTheme.border};
  border-radius: 8px;
  padding: 0 9px;
  margin-bottom: 6px;
  transition: border-color 0.12s;
  &:focus-within { border-color: ${docsTheme.accent}; }
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  font-family: inherit;
  font-size: 12.5px;
  color: ${docsTheme.text};
  background: transparent;
  border: none;
  padding: 7px 0;
  outline: none;
`;

const StateBox = styled.div<{ $muted?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 20px 10px;
  font-size: 12.5px;
  color: ${({ $muted }) => ($muted ? docsTheme.faint : docsTheme.muted)};
  text-align: center;
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const Spinner = styled(Loader2)`
  animation: ${spin} 0.7s linear infinite;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

const Item = styled.button<{ $active: boolean }>`
  width: 100%;
  appearance: none;
  border: none;
  cursor: pointer;
  background: ${({ $active }) => ($active ? docsTheme.accentSoft : 'transparent')};
  border-radius: 8px;
  padding: 7px 9px 7px 8px;
  border-left: 2px solid ${({ $active }) => ($active ? docsTheme.accent : 'transparent')};
  display: flex;
  flex-direction: column;
  gap: 3px;
  text-align: left;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const TypeSq = styled.span`
  flex: 0 0 auto;
  width: 17px;
  height: 17px;
  border-radius: 5px;
  color: #fff;
  font-size: 9.5px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: Sora, sans-serif;
`;

const IssueKey = styled.span`
  font-family: 'Sora', monospace;
  font-size: 11px;
  font-weight: 700;
  color: ${docsTheme.muted};
`;

const StatusChip = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 6px;
  white-space: nowrap;
`;

const PrGlyph = styled.span`
  font-weight: 800;
  font-size: 12px;
`;

const Avatar = styled.span`
  margin-left: auto;
  flex: 0 0 auto;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: ${docsTheme.muted};
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const Summary = styled.div`
  font-size: 12.5px;
  font-weight: 500;
  color: ${docsTheme.text};
  padding-left: 23px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Footer = styled.div`
  margin-top: 4px;
  padding: 7px 9px 3px;
  border-top: 1px solid ${docsTheme.borderSoft};
  font-size: 10.5px;
  color: ${docsTheme.faint};
  text-align: center;
`;
