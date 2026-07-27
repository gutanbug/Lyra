import {
  useLayoutEffect, useRef,
} from 'react';
import styled from 'styled-components';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { DocsPopup } from 'lib/styles/docsCommon';
import { filterCmds, filteredFlatCmds } from 'lib/utils/docsUtils';

const DocsSlashMenu = () => {
  const { state, applyCmd, openMenu } = useDocs();
  const { slash } = state;
  const menuRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    const activeItem = activeItemRef.current;
    if (!slash || !menu || !activeItem) return;

    const menuRect = menu.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    if (itemRect.top < menuRect.top) {
      menu.scrollTop -= menuRect.top - itemRect.top;
    } else if (itemRect.bottom > menuRect.bottom) {
      menu.scrollTop += itemRect.bottom - menuRect.bottom;
    }
  }, [slash?.active, slash?.query]);

  if (!slash) return null;

  const groups = filterCmds(slash.query);
  const flat = filteredFlatCmds(slash.query);

  if (flat.length === 0) {
    return (
      <DocsPopup data-docs-menu style={{ left: slash.x, top: slash.y, width: 300 }}>
        <Empty>결과 없음</Empty>
      </DocsPopup>
    );
  }

  return (
    <DocsPopup
      ref={menuRef}
      data-docs-menu
      style={{ left: slash.x, top: slash.y, width: 300, maxHeight: 340, overflowY: 'auto' }}
    >
      {groups.map((g) => (
        <div key={g.cat}>
          <Cat>{g.cat}</Cat>
          {g.items.map((it) => {
            const idx = flat.findIndex((f) => f.id === it.id);
            const active = idx === slash.active;
            return (
              <Item
                ref={active ? activeItemRef : undefined}
                key={it.id}
                $active={active}
                onMouseEnter={() => openMenu('slash', { ...slash, active: idx })}
                onClick={() => applyCmd(it.id)}
              >
                <IconBox>{it.icon}</IconBox>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <Label>{it.label}</Label>
                  <Desc>{it.desc}</Desc>
                </div>
              </Item>
            );
          })}
        </div>
      ))}
    </DocsPopup>
  );
};

export default DocsSlashMenu;

const Empty = styled.div`
  padding: 16px 12px;
  font-size: 13px;
  color: ${docsTheme.muted};
  text-align: center;
`;

const Cat = styled.div`
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: ${docsTheme.muted};
  padding: 8px 10px 5px;
`;

const Item = styled.button<{ $active: boolean }>`
  width: 100%;
  appearance: none;
  border: none;
  cursor: pointer;
  background: ${({ $active }) => ($active ? docsTheme.hover : 'transparent')};
  border-radius: 9px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 11px;
  text-align: left;
  font-family: inherit;
`;

const IconBox = styled.span`
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: ${docsTheme.surfaceSoft};
  border: 1px solid ${docsTheme.border};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: ${docsTheme.text2};
  font-family: Sora, sans-serif;
`;

const Label = styled.span`
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  color: ${docsTheme.text};
`;

const Desc = styled.span`
  display: block;
  font-size: 11.5px;
  color: ${docsTheme.muted};
`;
