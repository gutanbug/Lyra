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
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

const Panel = styled.div<{ $theme: ServiceTheme }>`
  background: ${({ $theme }) => $theme.bg.default};
  border-radius: 6px;
  border: 1px solid ${({ $theme }) => $theme.border};
  width: 420px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`;

const Header = styled.div<{ $theme: ServiceTheme }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid ${({ $theme }) => $theme.border};
`;

const Title = styled.h3<{ $theme: ServiceTheme }>`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ $theme }) => $theme.text.primary};
`;

const CloseBtn = styled.button<{ $theme: ServiceTheme }>`
  background: none;
  border: none;
  font-size: 1rem;
  color: ${({ $theme }) => $theme.text.muted};
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;

  &:hover { color: ${({ $theme }) => $theme.text.primary}; }
`;

const Desc = styled.div<{ $theme: ServiceTheme }>`
  padding: 0.75rem 1.25rem;
  font-size: 0.8125rem;
  color: ${({ $theme }) => $theme.text.secondary};
  border-bottom: 1px solid ${({ $theme }) => $theme.border};
`;

const SearchRow = styled.div<{ $theme: ServiceTheme }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-bottom: 1px solid ${({ $theme }) => $theme.border};
`;

const SearchInput = styled.input<{ $theme: ServiceTheme }>`
  flex: 1;
  padding: 0.375rem 0.625rem;
  border: 1px solid ${({ $theme }) => $theme.border};
  border-radius: 20px;
  font-size: 0.8125rem;
  background: ${({ $theme }) => $theme.bg.subtle};
  color: ${({ $theme }) => $theme.text.primary};

  &::placeholder { color: ${({ $theme }) => $theme.text.muted}; }
  &:focus {
    outline: none;
    border-color: ${({ $theme }) => $theme.primary};
    background: ${({ $theme }) => $theme.bg.default};
  }
`;

const SmallBtn = styled.button<{ $theme: ServiceTheme }>`
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background: transparent;
  border: 1px solid ${({ $theme }) => $theme.border};
  border-radius: 20px;
  color: ${({ $theme }) => $theme.text.secondary};
  cursor: pointer;

  &:hover {
    background: ${({ $theme }) => $theme.bg.hover};
    color: ${({ $theme }) => $theme.text.primary};
  }
`;

const List = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
  max-height: 400px;
`;

const SectionLabel = styled.div<{ $theme: ServiceTheme }>`
  padding: 0.375rem 1.25rem 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${({ $theme }) => $theme.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid ${({ $theme }) => $theme.border};
  margin-bottom: 0.125rem;

  &:not(:first-of-type) {
    margin-top: 0.375rem;
    border-top: 1px solid ${({ $theme }) => $theme.border};
    padding-top: 0.5rem;
  }
`;

const Empty = styled.div<{ $theme: ServiceTheme }>`
  padding: 1.5rem;
  text-align: center;
  font-size: 0.8125rem;
  color: ${({ $theme }) => $theme.text.muted};
`;

const Item = styled.div<{ $theme: ServiceTheme; $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 1.25rem;
  cursor: pointer;
  transition: background 0.1s;
  background: ${({ $theme, $active }) => ($active ? $theme.primaryLight : 'transparent')};

  &:hover {
    background: ${({ $theme, $active }) => ($active ? $theme.primaryLight : $theme.bg.hover)};
  }
`;

const Check = styled.span<{ $theme: ServiceTheme; $checked: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 20px;
  border: 2px solid ${({ $theme, $checked }) => ($checked ? $theme.primary : $theme.border)};
  background: ${({ $theme, $checked }) => ($checked ? $theme.primary : 'transparent')};
  color: white;
  font-size: 0.6875rem;
  font-weight: 700;
  flex-shrink: 0;
`;

const Name = styled.span<{ $theme: ServiceTheme }>`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${({ $theme }) => $theme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`;

const ItemKey = styled.span<{ $theme: ServiceTheme }>`
  font-size: 0.75rem;
  color: ${({ $theme }) => $theme.text.muted};
  flex-shrink: 0;
`;

const Footer = styled.div<{ $theme: ServiceTheme }>`
  display: flex;
  justify-content: flex-end;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid ${({ $theme }) => $theme.border};
`;

const SaveBtn = styled.button<{ $theme: ServiceTheme }>`
  padding: 0.5rem 1.25rem;
  background: ${({ $theme }) => $theme.primary};
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ${transition};

  &:hover { background: ${({ $theme }) => $theme.primaryHover}; }
`;
