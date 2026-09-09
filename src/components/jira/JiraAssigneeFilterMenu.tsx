import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { ChevronDown, Check, User } from 'lucide-react';
import { jiraTheme } from 'lib/styles/jiraTheme';
import type { AssigneeCount } from 'lib/hooks/jira/useJiraAssigneeFilter';

interface JiraAssigneeFilterMenuProps {
  assigneeCounts: AssigneeCount[];
  isSelected: (name: string) => boolean;
  onToggle: (name: string) => void;
  isActive: boolean;
  selectedCount: number;
  onClear: () => void;
}

/** 담당자 다중 선택 필터 드롭다운. 대시보드 이슈 목록과 상세조회 하위 업무 양쪽에서 공통으로 사용. */
const JiraAssigneeFilterMenu = ({
  assigneeCounts, isSelected, onToggle, isActive, selectedCount, onClear,
}: JiraAssigneeFilterMenuProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown, true);
    return () => document.removeEventListener('mousedown', onDown, true);
  }, [open]);

  if (assigneeCounts.length === 0) return null;

  return (
    <Wrap ref={ref}>
      <TriggerBtn type="button" $active={isActive} onClick={() => setOpen((v) => !v)}>
        <User size={12} strokeWidth={2.5} />
        담당자
        {isActive && <CountBadge>{selectedCount}</CountBadge>}
        <ChevronDown size={12} />
      </TriggerBtn>
      {open && (
        <Panel>
          <PanelHeader>
            <span>담당자로 필터</span>
            {isActive && <ResetLink onClick={onClear}>전체 보기</ResetLink>}
          </PanelHeader>
          <List>
            {assigneeCounts.map((a) => (
              <Item key={a.name} onClick={() => onToggle(a.name)}>
                <CheckBox $checked={isSelected(a.name)}>
                  {isSelected(a.name) && <Check size={10} strokeWidth={3} />}
                </CheckBox>
                <Name>{a.name}</Name>
                <Count>{a.count}</Count>
              </Item>
            ))}
          </List>
        </Panel>
      )}
    </Wrap>
  );
};

export default JiraAssigneeFilterMenu;

const Wrap = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const TriggerBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.625rem;
  background: ${({ $active }) => ($active ? jiraTheme.primary : jiraTheme.bg.default)};
  color: ${({ $active }) => ($active ? '#fff' : jiraTheme.text.primary)};
  border: 1.5px solid ${({ $active }) => ($active ? jiraTheme.primary : jiraTheme.border)};
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${jiraTheme.primary};
  }
`;

const CountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 0.25rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.28);
  font-size: 0.6875rem;
  font-weight: 700;
`;

const Panel = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 220px;
  max-width: 280px;
  background: ${jiraTheme.bg.default};
  border: 1px solid ${jiraTheme.border};
  border-radius: ${jiraTheme.radius.ctl};
  box-shadow: ${jiraTheme.shadow.cardHover};
  z-index: 200;
  overflow: hidden;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${jiraTheme.text.secondary};
  border-bottom: 1px solid ${jiraTheme.border};
`;

const ResetLink = styled.button`
  appearance: none;
  border: none;
  background: transparent;
  color: ${jiraTheme.primary};
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  &:hover { text-decoration: underline; }
`;

const List = styled.div`
  max-height: 280px;
  overflow-y: auto;
  padding: 4px;
`;

const Item = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  &:hover { background: ${jiraTheme.bg.hover}; }
`;

const CheckBox = styled.span<{ $checked: boolean }>`
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: 1.5px solid ${({ $checked }) => ($checked ? jiraTheme.primary : jiraTheme.border)};
  background: ${({ $checked }) => ($checked ? jiraTheme.primary : 'transparent')};
  color: #fff;
`;

const Name = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 0.8125rem;
  color: ${jiraTheme.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Count = styled.span`
  flex: 0 0 auto;
  font-size: 0.6875rem;
  color: ${jiraTheme.text.muted};
`;
