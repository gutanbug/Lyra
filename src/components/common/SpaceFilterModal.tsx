import { ReactNode } from 'react';
import styled from 'styled-components';

import { transition } from 'lib/styles/styles';
import type { ServiceTheme } from 'lib/styles/commonStyles';

export interface SpaceFilterItem {
  id?: string;
  key: string;
  name: string;
  hideKey?: boolean;
}

export interface SpaceFilterModalProps {
  theme: ServiceTheme;
  title?: string;
  description: string;
  items: SpaceFilterItem[];
  selectedKeys: string[];
  spaceFilter: string;
  onSpaceFilterChange: (v: string) => void;
  onToggleKey: (key: string, next: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSave: () => void;
  onClose: () => void;
  emptyMessage?: string;
  /** 선택된 항목에 추가 액션(설정 아이콘 등)을 렌더링할 때 사용. 비워두면 미노출. */
  renderItemAction?: (key: string) => ReactNode;
}

const SpaceFilterModal = ({
  theme,
  title = '스페이스 필터 설정',
  description,
  items,
  selectedKeys,
  spaceFilter,
  onSpaceFilterChange,
  onToggleKey,
  onSelectAll,
  onDeselectAll,
  onSave,
  onClose,
  emptyMessage = '일치하는 스페이스가 없습니다.',
  renderItemAction,
}: SpaceFilterModalProps) => {
  const selectedSet = new Set(selectedKeys);
  const pinned = items.filter((item) => selectedSet.has(item.key));
  const unpinned = items.filter((item) => !selectedSet.has(item.key));

  return (
    <Overlay onClick={onClose}>
      <Panel $theme={theme} onClick={(e) => e.stopPropagation()}>
        <Header $theme={theme}>
          <Title $theme={theme}>{title}</Title>
          <CloseBtn $theme={theme} onClick={onClose}>✕</CloseBtn>
        </Header>
        <Desc $theme={theme}>{description}</Desc>
        <SearchRow $theme={theme}>
          <SearchInput
            $theme={theme}
            placeholder="스페이스 검색..."
            value={spaceFilter}
            onChange={(e) => onSpaceFilterChange(e.target.value)}
            autoFocus
          />
          <SmallBtn $theme={theme} onClick={onSelectAll}>
            전체 선택
          </SmallBtn>
          <SmallBtn $theme={theme} onClick={onDeselectAll}>
            전체 해제
          </SmallBtn>
        </SearchRow>
        <List>
          {pinned.length > 0 && (
            <>
              <SectionLabel $theme={theme}>선택됨</SectionLabel>
              {pinned.map((item) => (
                <Item
                  key={item.id ?? item.key}
                  $theme={theme}
                  $active
                  onClick={() => onToggleKey(item.key, false)}
                >
                  <Check $theme={theme} $checked>{'✓'}</Check>
                  <Name $theme={theme}>{item.name}</Name>
                  {!item.hideKey && <ItemKey $theme={theme}>{item.key}</ItemKey>}
                  {renderItemAction && (
                    <ActionSlot onClick={(e) => e.stopPropagation()}>
                      {renderItemAction(item.key)}
                    </ActionSlot>
                  )}
                </Item>
              ))}
            </>
          )}
          {unpinned.length > 0 && (
            <>
              {pinned.length > 0 && <SectionLabel $theme={theme}>전체</SectionLabel>}
              {unpinned.map((item) => (
                <Item
                  key={item.id ?? item.key}
                  $theme={theme}
                  $active={false}
                  onClick={() => onToggleKey(item.key, true)}
                >
                  <Check $theme={theme} $checked={false} />
                  <Name $theme={theme}>{item.name}</Name>
                  {!item.hideKey && <ItemKey $theme={theme}>{item.key}</ItemKey>}
                </Item>
              ))}
            </>
          )}
          {pinned.length === 0 && unpinned.length === 0 && (
            <Empty $theme={theme}>{emptyMessage}</Empty>
          )}
        </List>
        <Footer $theme={theme}>
          <SaveBtn $theme={theme} onClick={onSave}>저장</SaveBtn>
        </Footer>
      </Panel>
    </Overlay>
  );
};

export default SpaceFilterModal;

// ── Styled Components ──

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(12, 12, 16, 0.5);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

const Panel = styled.div<{ $theme: ServiceTheme }>`
  background: ${({ $theme }) => $theme.bg.default};
  border-radius: 22px;
  border: 1px solid ${({ $theme }) => $theme.border};
  width: 460px;
  max-height: 72vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.45);
  overflow: hidden;
`;

const Header = styled.div<{ $theme: ServiceTheme }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 14px;
`;

const Title = styled.h3<{ $theme: ServiceTheme }>`
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ $theme }) => $theme.text.primary};
`;

const CloseBtn = styled.button<{ $theme: ServiceTheme }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: none;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  color: ${({ $theme }) => $theme.text.muted};
  cursor: pointer;
  line-height: 1;
  transition: background 0.12s ease, color 0.12s ease;

  &:hover { background: rgba(0,0,0,.05); color: ${({ $theme }) => $theme.text.primary}; }
`;

const Desc = styled.div<{ $theme: ServiceTheme }>`
  padding: 0 24px 14px;
  font-size: 13.5px;
  color: ${({ $theme }) => $theme.text.secondary};
`;

const SearchRow = styled.div<{ $theme: ServiceTheme }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 24px 14px;
`;

const SearchInput = styled.input<{ $theme: ServiceTheme }>`
  flex: 1;
  padding: 11px 14px;
  border: 1.5px solid var(--lyra-c-border-strong, #c7d3e2);
  border-radius: 12px;
  font-size: 14px;
  background: var(--lyra-c-gray0, #f7f6f3);
  color: ${({ $theme }) => $theme.text.primary};
  transition: border-color 0.12s ease, background 0.12s ease;

  &::placeholder { color: ${({ $theme }) => $theme.text.muted}; }
  &:focus {
    outline: none;
    border-color: ${({ $theme }) => $theme.primary};
    background: ${({ $theme }) => $theme.bg.default};
  }
`;

const SmallBtn = styled.button<{ $theme: ServiceTheme }>`
  padding: 8px 12px;
  font-size: 12.5px;
  font-weight: 600;
  background: transparent;
  border: 1px solid #e6e3df;
  border-radius: 99px;
  color: ${({ $theme }) => $theme.text.secondary};
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;

  &:hover {
    background: #f4f2ef;
    color: ${({ $theme }) => $theme.text.primary};
  }
`;

const List = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 4px 0 8px;
  max-height: 420px;
`;

const SectionLabel = styled.div<{ $theme: ServiceTheme }>`
  padding: 14px 24px 6px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ $theme }) => $theme.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.08em;

  &:not(:first-of-type) {
    margin-top: 4px;
    border-top: 1px solid #f4f2ef;
  }
`;

const Empty = styled.div<{ $theme: ServiceTheme }>`
  padding: 28px;
  text-align: center;
  font-size: 13.5px;
  color: ${({ $theme }) => $theme.text.muted};
`;

const Item = styled.div<{ $theme: ServiceTheme; $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 24px;
  cursor: pointer;
  transition: background 0.12s ease;
  background: ${({ $theme, $active }) => ($active ? 'var(--lyra-c-accent-soft, rgba(0,123,255,.07))' : 'transparent')};

  &:hover {
    background: ${({ $theme, $active }) => ($active ? 'var(--lyra-c-accent-soft, rgba(0,123,255,.09))' : 'var(--lyra-c-hairline, #faf9f7)')};
  }
`;

const Check = styled.span<{ $theme: ServiceTheme; $checked: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 21px;
  height: 21px;
  border-radius: 7px;
  border: 1.5px solid ${({ $theme, $checked }) => ($checked ? $theme.primary : '#d8d5d2')};
  background: ${({ $theme, $checked }) => ($checked ? $theme.primary : 'transparent')};
  color: white;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
`;

const Name = styled.span<{ $theme: ServiceTheme }>`
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: ${({ $theme }) => $theme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`;

const ItemKey = styled.span<{ $theme: ServiceTheme }>`
  font-size: 12px;
  font-weight: 500;
  color: ${({ $theme }) => $theme.text.muted};
  flex-shrink: 0;
`;

const ActionSlot = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: 6px;
  flex-shrink: 0;
`;

const Footer = styled.div<{ $theme: ServiceTheme }>`
  display: flex;
  justify-content: flex-end;
  padding: 14px 24px 20px;
`;

const SaveBtn = styled.button<{ $theme: ServiceTheme }>`
  padding: 13px 22px;
  background: ${({ $theme }) => $theme.primary};
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(0,123,255,0.32);
  transition: filter 0.12s ease, transform 0.12s ease;

  &:hover { filter: brightness(1.07); transform: translateY(-1px); }
  &:active { transform: scale(0.98); }
`;
