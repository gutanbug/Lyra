import styled from 'styled-components';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { DocsPopup, DocsPopupLabel, DocsChip } from 'lib/styles/docsCommon';
import { DOCS_PRIORITY_OPTS, DOCS_STATUS_OPTS } from 'types/docs';
import { isImeComposing } from 'lib/utils/keyboard';

const FIELD_TITLE: Record<string, string> = {
  status: '상태', assignee: '담당자', priority: '우선순위',
};

const DocsCellEditor = () => {
  const { state, setCell } = useDocs();
  const { cellEditor } = state;
  if (!cellEditor) return null;
  const { rowId, field } = cellEditor;
  const row = state.db[state.activeId]?.rows.find((r) => r.id === rowId);
  if (!row) return null;
  const cur = row[field];

  let options: string[] = [];
  if (field === 'status') options = [...DOCS_STATUS_OPTS];
  else if (field === 'priority') options = [...DOCS_PRIORITY_OPTS];

  if (field === 'assignee') {
    return (
      <DocsPopup data-docs-menu style={{ left: cellEditor.x, top: cellEditor.y, width: 186 }}>
        <DocsPopupLabel>{FIELD_TITLE.assignee}</DocsPopupLabel>
        <AssigneeInput
          key={rowId}
          autoFocus
          defaultValue={typeof cur === 'string' ? cur : ''}
          placeholder="이름 입력"
          onKeyDown={(e) => {
            if (isImeComposing(e)) return;
            if (e.key === 'Enter') setCell(rowId, 'assignee', e.currentTarget.value.trim());
          }}
          onBlur={(e) => setCell(rowId, 'assignee', e.currentTarget.value.trim())}
        />
      </DocsPopup>
    );
  }

  return (
    <DocsPopup data-docs-menu style={{ left: cellEditor.x, top: cellEditor.y, width: 186, maxHeight: 260, overflowY: 'auto' }}>
      <DocsPopupLabel>{FIELD_TITLE[field]}</DocsPopupLabel>
      {options.map((v) => (
        <Item key={v} $on={v === cur} onClick={() => setCell(rowId, field, v)}>
          {field === 'status' && <DocsChip $bg={docsTheme.status[v]?.bg || ''} $ink={docsTheme.status[v]?.ink || ''}>{v}</DocsChip>}
          {field === 'priority' && (
            <>
              <span style={{ fontWeight: 800, fontSize: 14, color: docsTheme.priority[v]?.color }}>{docsTheme.priority[v]?.glyph}</span>
              <span style={{ fontSize: 13, color: docsTheme.text }}>{v}</span>
            </>
          )}
          {v === cur && <Check>✓</Check>}
        </Item>
      ))}
    </DocsPopup>
  );
};

export default DocsCellEditor;

const Item = styled.button<{ $on: boolean }>`
  width: 100%;
  appearance: none;
  border: none;
  cursor: pointer;
  background: ${({ $on }) => ($on ? docsTheme.hover : 'transparent')};
  border-radius: 8px;
  padding: 7px 9px;
  display: flex;
  align-items: center;
  gap: 9px;
  text-align: left;
`;

const Check = styled.span`
  margin-left: auto;
  color: ${docsTheme.accent};
  font-size: 13px;
`;

const AssigneeInput = styled.input`
  width: 100%;
  font-family: inherit;
  font-size: 13px;
  color: ${docsTheme.text};
  background: ${docsTheme.surfaceSoft};
  border: 1.5px solid ${docsTheme.border};
  border-radius: 8px;
  padding: 7px 9px;
  outline: none;
  &:focus { border-color: ${docsTheme.accent}; background: ${docsTheme.surface}; }
`;
