import { RefObject, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { getStatusColor } from 'lib/utils/jiraUtils';
import type { JiraTransition } from 'types/jira';

interface Props {
  target: { issueKey: string; top: number; left: number };
  transitions: JiraTransition[];
  isLoading: boolean;
  dropdownRef: RefObject<HTMLDivElement>;
  onSelect: (issueKey: string, transitionId: string, toName: string, toCategory: string) => void;
  onClose: () => void;
}

const JiraTransitionDropdown = ({ target, transitions, isLoading, dropdownRef, onSelect, onClose }: Props) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // 열릴 때 리스트로 포커스를 옮겨 키보드 조작을 즉시 가능하게 한다.
  useEffect(() => {
    dropdownRef.current?.focus();
    setActiveIndex(0);
  }, [dropdownRef, transitions.length]);

  const selectAt = (index: number) => {
    const t = transitions[index];
    if (!t) return;
    onSelect(target.issueKey, t.id, t.to?.name || t.name, t.to?.statusCategory?.name || '');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (transitions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % transitions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + transitions.length) % transitions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectAt(activeIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return createPortal(
    <Overlay onClick={onClose}>
      <Dropdown
        ref={dropdownRef}
        style={{ top: target.top, left: target.left }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="listbox"
        aria-label="상태 전환"
        aria-activedescendant={transitions[activeIndex] ? `transition-opt-${transitions[activeIndex].id}` : undefined}
        tabIndex={-1}
      >
        {isLoading ? (
          <Message>로딩 중...</Message>
        ) : transitions.length === 0 ? (
          <Message>전환 가능한 상태가 없습니다.</Message>
        ) : (
          transitions.map((t, i) => {
            const catName = t.to?.statusCategory?.name || '';
            const color = getStatusColor(t.to?.name || t.name, catName);
            return (
              <Item
                key={t.id}
                id={`transition-opt-${t.id}`}
                role="option"
                aria-selected={i === activeIndex}
                $active={i === activeIndex}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => onSelect(target.issueKey, t.id, t.to?.name || t.name, catName)}
              >
                <Dot $color={color} />
                {t.to?.name || t.name}
              </Item>
            );
          })
        )}
      </Dropdown>
    </Overlay>,
    document.getElementById('portal-root') || document.body
  );
};

export default JiraTransitionDropdown;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
`;

const Dropdown = styled.div`
  position: fixed;
  transform: translateX(-50%);
  background: ${jiraTheme.bg.default};
  border: 1px solid ${jiraTheme.border};
  border-radius: ${jiraTheme.radius.ctl};
  box-shadow: ${jiraTheme.shadow.cardHover};
  z-index: 10000;
  min-width: 180px;
  max-height: 280px;
  overflow-y: auto;
  padding: 4px 0;
`;

const Item = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  font-family: ${jiraTheme.font.body};
  font-size: 13px;
  font-weight: 500;
  color: ${jiraTheme.text.primary};
  cursor: pointer;
  white-space: nowrap;
  transition: background ${jiraTheme.motion.fast};
  background: ${({ $active }) => ($active ? jiraTheme.hairline : 'transparent')};

  &:hover { background: ${jiraTheme.hairline}; }
`;

const Dot = styled.span<{ $color?: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color || jiraTheme.status.default};
  flex-shrink: 0;
`;

const Message = styled.div`
  padding: 0.75rem;
  text-align: center;
  font-size: 0.75rem;
  color: ${jiraTheme.text.muted};
`;
