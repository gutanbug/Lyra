import { useRef } from 'react';
import styled from 'styled-components';
import { useDocs } from 'modules/contexts/docs';
import { isImeComposing } from 'lib/utils/keyboard';
import { docsTheme } from 'lib/styles/docsTheme';
import { DocsOverlay, DocsModal } from 'lib/styles/docsCommon';
import { PageGlyph } from 'components/docs/DocsSidebar';

const DocsCommandPalette = () => {
  const {
    state, closePalette, setPaletteQuery, setPaletteActive, paletteResults, openPage,
  } = useDocs();
  const inputRef = useRef<HTMLInputElement>(null);
  const { palette } = state;
  if (!palette) return null;

  const results = paletteResults(palette.query);

  const crumbFor = (pageId: string) => {
    const path: string[] = [];
    let cur: string | null = state.pagesById[pageId]?.parentId || null;
    const seen: Record<string, boolean> = {};
    while (cur && state.pagesById[cur] && !seen[cur]) {
      seen[cur] = true;
      path.unshift(state.pagesById[cur].title || '제목 없음');
      cur = state.pagesById[cur].parentId;
    }
    return path.join(' / ');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (isImeComposing(e)) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setPaletteActive((palette.active + 1) % Math.max(1, results.length)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setPaletteActive((palette.active - 1 + results.length) % Math.max(1, results.length)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[palette.active];
      if (r) { openPage(r.id); closePalette(); }
    }
  };

  return (
    <DocsOverlay data-docs-menu onClick={closePalette}>
      <DocsModal style={{ width: 560, maxWidth: '92vw' }} onClick={(e) => e.stopPropagation()}>
        <Head>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={docsTheme.muted} strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <Input
            ref={inputRef}
            autoFocus
            value={palette.query}
            onChange={(e) => setPaletteQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="페이지 검색 또는 이동…"
          />
          <Esc>ESC</Esc>
        </Head>
        <List>
          {results.length === 0 && <Empty>일치하는 페이지가 없습니다</Empty>}
          {results.map((p, idx) => (
            <Item
              key={p.id}
              $active={idx === palette.active}
              onMouseEnter={() => setPaletteActive(idx)}
              onClick={() => { openPage(p.id); closePalette(); }}
            >
              {p.icon ? <span style={{ fontSize: 19, flex: '0 0 auto' }}>{p.icon}</span> : <PageGlyph icon="" type={p.type} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Title>{p.title || '제목 없음'}</Title>
                <Crumb>{crumbFor(p.id)}</Crumb>
                {p.snippet && <Snippet>{p.snippet}</Snippet>}
              </div>
              <span style={{ fontSize: 11, color: docsTheme.faint }}>↵</span>
            </Item>
          ))}
        </List>
      </DocsModal>
    </DocsOverlay>
  );
};

export default DocsCommandPalette;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 15px 18px;
  border-bottom: 1px solid ${docsTheme.hairline};
`;

const Input = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-family: inherit;
  font-size: 16px;
  color: ${docsTheme.text};
`;

const Esc = styled.span`
  font-size: 11px;
  color: ${docsTheme.faint};
  font-family: 'Sora', sans-serif;
  border: 1px solid ${docsTheme.border};
  border-radius: 5px;
  padding: 2px 6px;
`;

const List = styled.div`
  max-height: 52vh;
  overflow-y: auto;
  padding: 8px;
`;

const Empty = styled.div`
  padding: 24px;
  text-align: center;
  font-size: 13.5px;
  color: ${docsTheme.muted};
`;

const Item = styled.button<{ $active: boolean }>`
  width: 100%;
  appearance: none;
  border: none;
  cursor: pointer;
  background: ${({ $active }) => ($active ? docsTheme.hover : 'transparent')};
  border-radius: 9px;
  padding: 9px 11px;
  display: flex;
  align-items: center;
  gap: 11px;
  text-align: left;
`;

const Title = styled.span`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: ${docsTheme.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Crumb = styled.span`
  display: block;
  font-size: 11.5px;
  color: ${docsTheme.muted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Snippet = styled.span`
  display: block;
  font-size: 12px;
  color: ${docsTheme.text2};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
`;
