import { useMemo } from 'react';
import styled from 'styled-components';
import { Star } from 'lucide-react';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { DocsIconButton } from 'lib/styles/docsCommon';

const DocsTopbar = () => {
  const { state, toggleSidebar, openPage, toggleFav, openCloud } = useDocs();

  const crumbs = useMemo(() => {
    const path: { icon: string; title: string; id: string }[] = [];
    let cur: string | null = state.activeId;
    const seen: Record<string, boolean> = {};
    while (cur && state.pagesById[cur] && !seen[cur]) {
      seen[cur] = true;
      const p = state.pagesById[cur] as { icon: string; title: string; id: string; parentId: string | null };
      path.unshift({ icon: p.icon, title: p.title || '제목 없음', id: p.id });
      cur = p.parentId;
    }
    return path;
  }, [state.activeId, state.pagesById]);

  const isFav = state.favorites.includes(state.activeId);
  const savedLabel = '저장됨';
  const cloudDot = state.cloud.connected ? docsTheme.todo : docsTheme.faint;

  return (
    <Bar>
      <DocsIconButton onClick={toggleSidebar} title="사이드바">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></svg>
      </DocsIconButton>

      <Crumbs>
        {crumbs.map((c, i) => (
          <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <CrumbBtn onClick={() => openPage(c.id)}>
              <span style={{ fontSize: 14, flex: '0 0 auto' }}>{c.icon}</span>
              <span style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</span>
            </CrumbBtn>
            {i < crumbs.length - 1 && <Sep>/</Sep>}
          </span>
        ))}
      </Crumbs>

      <Right>
        <DocsIconButton
          title="즐겨찾기"
          style={{ color: isFav ? '#f5a623' : docsTheme.muted }}
          onClick={(e) => { e.stopPropagation(); toggleFav(state.activeId); }}
        >
          <Star size={16} fill={isFav ? '#f5a623' : 'none'} />
        </DocsIconButton>
        <DocsIconButton title="Supabase 동기화" onClick={openCloud} style={{ position: 'relative' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></svg>
          <Dot style={{ background: cloudDot }} />
        </DocsIconButton>
        <SavedLabel>{savedLabel}</SavedLabel>
        <DocsIconButton title="히스토리">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M4 12a8 8 0 0 1 8-8 8 8 0 0 1 8 8 8 8 0 0 1-8 8" /><path d="M12 4v4l3 2" /></svg>
        </DocsIconButton>
        <DocsIconButton title="더보기">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
        </DocsIconButton>
      </Right>
    </Bar>
  );
};

export default DocsTopbar;

const Bar = styled.div`
  flex: 0 0 auto;
  height: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-bottom: 1px solid ${docsTheme.border};
`;

const Crumbs = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  overflow: hidden;
`;

const CrumbBtn = styled.button`
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 6px;
  border-radius: 6px;
  max-width: 220px;
  color: ${docsTheme.text2};
  &:hover { background: ${docsTheme.hover}; }
`;

const Sep = styled.span`
  color: ${docsTheme.faint};
  font-size: 12px;
`;

const Right = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Dot = styled.span`
  position: absolute;
  top: 5px;
  right: 5px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
`;

const SavedLabel = styled.span`
  font-size: 12px;
  color: ${docsTheme.muted};
  margin-right: 4px;
`;
