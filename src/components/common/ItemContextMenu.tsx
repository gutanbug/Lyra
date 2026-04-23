import styled from 'styled-components';

import type { ServiceTheme } from 'lib/styles/commonStyles';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface ItemContextMenuProps {
  theme: ServiceTheme;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  onClose: () => void;
}

const ItemContextMenu = ({ theme, position, items, onClose }: ItemContextMenuProps) => {
  return (
    <Overlay onClick={onClose}>
      <Box
        $theme={theme}
        style={{ left: position.x, top: position.y }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item, idx) => (
          <MenuItem
            key={`${item.label}-${idx}`}
            $theme={theme}
            $disabled={!!item.disabled}
            onClick={() => {
              if (item.disabled) return;
              item.onClick();
              onClose();
            }}
          >
            {item.label}
          </MenuItem>
        ))}
      </Box>
    </Overlay>
  );
};

export default ItemContextMenu;

// ── Styled Components ──

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 500;
`;

const Box = styled.div<{ $theme: ServiceTheme }>`
  position: fixed;
  background: ${({ $theme }) => $theme.bg.default};
  border: 1px solid ${({ $theme }) => $theme.border};
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  padding: 0.25rem 0;
  z-index: 501;
`;

const MenuItem = styled.div<{ $theme: ServiceTheme; $disabled: boolean }>`
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  color: ${({ $theme, $disabled }) => ($disabled ? $theme.text.muted : $theme.text.primary)};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  transition: background 0.1s;

  &:hover {
    background: ${({ $theme, $disabled }) => ($disabled ? 'transparent' : $theme.bg.subtle)};
  }
`;
