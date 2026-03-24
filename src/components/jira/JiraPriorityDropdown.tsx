import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';
import JiraPriorityIcon from './JiraPriorityIcon';

const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

interface Props {
  target: { issueKey: string; top: number; left: number };
  currentPriority: string;
  onSelect: (issueKey: string, priorityName: string) => void;
  onClose: () => void;
}

const JiraPriorityDropdown = ({ target, currentPriority, onSelect, onClose }: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return createPortal(
    <Overlay onClick={onClose}>
      <Dropdown
        ref={ref}
        style={{ top: target.top, left: target.left }}
        onClick={(e) => e.stopPropagation()}
      >
        {PRIORITIES.map((p) => (
          <Item
            key={p}
            $active={currentPriority.toLowerCase() === p.toLowerCase()}
            onClick={() => { onSelect(target.issueKey, p); onClose(); }}
          >
            <JiraPriorityIcon priority={p} size={16} />
            <Label>{p}</Label>
          </Item>
        ))}
      </Dropdown>
    </Overlay>,
    document.getElementById('portal-root') || document.body
  );
};

export default JiraPriorityDropdown;

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
  min-width: 140px;
  padding: 0.25rem 0;
`;

const Item = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4375rem 0.75rem;
  cursor: pointer;
  transition: background 0.1s;
  background: ${({ $active }) => ($active ? jiraTheme.bg.hover : 'transparent')};
  font-weight: ${({ $active }) => ($active ? 600 : 400)};

  &:hover { background: ${jiraTheme.bg.hover}; }
`;

const Label = styled.span`
  font-size: 0.8125rem;
  color: ${jiraTheme.text.primary};
`;
