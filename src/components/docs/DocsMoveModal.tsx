import { useMemo } from 'react';
import styled from 'styled-components';
import { Globe, Lock, Check } from 'lucide-react';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { DocsOverlay, DocsModal, thinScrollbar } from 'lib/styles/docsCommon';
import { PageGlyph } from 'components/docs/DocsSidebar';
import type { DocsPageType } from 'types/docs';

interface TreeRow {
  id: string;
  depth: number;
  title: string;
  icon: string;
  type: DocsPageType | 'space';
  spaceKind?: 'public' | 'private';
  disabled: boolean;
}

const DocsMoveModal = () => {
  const { state, movePage, closeMenu } = useDocs();
  const { moveModal } = state;
  const movingId = moveModal?.id || null;
  const movingPage = movingId ? state.pagesById[movingId] : undefined;

  // 이동 대상 자기 자신과 그 하위 페이지는 이동 불가(사이클 방지)
  const blockedIds = useMemo(() => {
    const set = new Set<string>();
    if (!movingId) return set;
    const collect = (id: string) => {
      set.add(id);
      (state.pagesById[id]?.children || []).forEach(collect);
    };
    collect(movingId);
    return set;
  }, [movingId, state.pagesById]);

  const rows = useMemo(() => {
    if (!movingId) return [];
    const out: TreeRow[] = [];
    const pushPage = (id: string, depth: number) => {
      const p = state.pagesById[id];
      if (!p) return;
      out.push({
        id, depth, title: p.title || '제목 없음', icon: p.icon, type: p.type, disabled: blockedIds.has(id),
      });
      (p.children || []).forEach((c) => pushPage(c, depth + 1));
    };
    state.spaces.forEach((sp) => {
      out.push({
        id: sp.id, depth: 0, title: sp.name, icon: '', type: 'space', spaceKind: sp.kind, disabled: false,
      });
      sp.children.forEach((c) => pushPage(c, 1));
    });
    return out;
  }, [movingId, state.spaces, state.pagesById, blockedIds]);

  if (!moveModal || !movingId) return null;
  const currentParent = movingPage?.parentId;

  return (
    <DocsOverlay data-docs-menu onClick={() => closeMenu('moveModal')}>
      <DocsModal style={{ width: 360, maxWidth: '90vw', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>페이지 이동</Title>
          <Desc>
            <PageLabel>{movingPage?.icon || '📄'} {movingPage?.title || '제목 없음'}</PageLabel>
            의 이동 위치를 선택하세요.
          </Desc>
        </Header>
        <List>
          {rows.map((r) => (
            <Row
              key={r.id}
              $depth={r.depth}
              $disabled={r.disabled}
              onClick={() => { if (!r.disabled) movePage(movingId, r.id); }}
            >
              <RowIcon>
                {r.type === 'space'
                  ? (r.spaceKind === 'public' ? <Globe size={13} color={docsTheme.text2} /> : <Lock size={13} color={docsTheme.text2} />)
                  : <PageGlyph icon={r.icon} type={r.type} />}
              </RowIcon>
              <RowTitle>{r.title}</RowTitle>
              {r.id === currentParent && (
                <CurrentBadge><Check size={11} />현재 위치</CurrentBadge>
              )}
            </Row>
          ))}
        </List>
        <Actions>
          <CancelBtn onClick={() => closeMenu('moveModal')}>취소</CancelBtn>
        </Actions>
      </DocsModal>
    </DocsOverlay>
  );
};

export default DocsMoveModal;

const Header = styled.div`
  padding: 18px 20px 12px;
  border-bottom: 1px solid ${docsTheme.borderSoft};
`;

const Title = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${docsTheme.text};
  margin-bottom: 4px;
`;

const Desc = styled.div`
  font-size: 12.5px;
  line-height: 1.5;
  color: ${docsTheme.text2};
`;

const PageLabel = styled.span`
  font-weight: 700;
  color: ${docsTheme.text};
`;

const List = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 6px;
  ${thinScrollbar}
`;

const Row = styled.div<{ $depth: number; $disabled: boolean }>`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  padding-left: ${({ $depth }) => 10 + $depth * 18}px;
  border-radius: ${docsTheme.radius.ctl};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.4 : 1)};

  &:hover {
    background: ${({ $disabled }) => ($disabled ? 'transparent' : docsTheme.hover)};
  }
`;

const RowIcon = styled.span`
  width: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
`;

const RowTitle = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: ${docsTheme.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CurrentBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 600;
  color: ${docsTheme.accent};
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid ${docsTheme.borderSoft};
`;

const CancelBtn = styled.button`
  appearance: none;
  border: 1px solid ${docsTheme.border};
  background: ${docsTheme.surface};
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: ${docsTheme.text2};
  padding: 7px 14px;
  border-radius: ${docsTheme.radius.ctl};
  &:hover { background: ${docsTheme.hover}; }
`;
