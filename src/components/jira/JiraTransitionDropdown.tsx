import { RefObject } from 'react';
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
  return createPortal(
    <Overlay onClick={onClose}>
      <Dropdown
        ref={dropdownRef}
        style={{ top: target.top, left: target.left }}
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading ? (
          <Message>로딩 중...</Message>
        ) : transitions.length === 0 ? (
          <Message>전환 가능한 상태가 없습니다.</Message>
        ) : (
          transitions.map((t) => {
            const catName = t.to?.statusCategory?.name || '';
            const color = getStatusColor(t.to?.name || t.name, catName);
            return (
              <Item
                key={t.id}
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
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  min-width: 160px;
  max-height: 240px;
  overflow-y: auto;
`;

const Item = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  color: ${jiraTheme.text.primary};
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.1s;

  &:hover { background: ${jiraTheme.bg.hover}; }
  &:not(:last-child) { border-bottom: 1px solid ${jiraTheme.border}; }
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
