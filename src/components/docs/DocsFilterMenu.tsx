import styled from 'styled-components';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { DocsPopup, DocsPopupLabel, DocsChip } from 'lib/styles/docsCommon';
import { DOCS_STATUS_OPTS, DOCS_PRIORITY_OPTS } from 'types/docs';
import type {
  DocsDbFilter, DocsDbFilterField, DocsDbFilterOp, DocsDbTagOption,
} from 'types/docs';

const FIELD_OPTS: { field: DocsDbFilterField; label: string }[] = [
  { field: 'status', label: '상태' },
  { field: 'assignee', label: '담당자' },
  { field: 'priority', label: '우선순위' },
  { field: 'tag', label: '태그' },
  { field: 'due', label: '마감일' },
];

const OP_OPTS: { op: DocsDbFilterOp; label: string }[] = [
  { op: 'is', label: '다음 값' },
  { op: 'isNot', label: '다음 값 아님' },
  { op: 'isEmpty', label: '비어있음' },
  { op: 'isNotEmpty', label: '비어있지 않음' },
];

const valueOptsFor = (field: DocsDbFilterField, tagOptions: DocsDbTagOption[]): string[] | null => {
  if (field === 'status') return [...DOCS_STATUS_OPTS];
  if (field === 'priority') return [...DOCS_PRIORITY_OPTS];
  if (field === 'tag') return tagOptions.map((t) => t.id);
  return null; // assignee/due는 자유 입력값이라 프리셋이 없음 — 비어있음 여부만 필터링
};

const DocsFilterMenu = () => {
  const {
    state, addFilter, updateFilter, removeFilter,
  } = useDocs();
  const { filterMenu } = state;
  if (!filterMenu) return null;
  const d = state.db[state.activeId];
  const filters = d?.filter || [];
  const tagOptions = d?.tagOptions || [];

  const toggleValue = (f: DocsDbFilter, v: string) => {
    const values = f.values.includes(v) ? f.values.filter((x) => x !== v) : [...f.values, v];
    updateFilter(f.id, { values });
  };

  return (
    <DocsPopup data-docs-menu style={{ left: filterMenu.x, top: filterMenu.y, width: 264, maxHeight: 400, overflowY: 'auto' }}>
      <DocsPopupLabel>필터</DocsPopupLabel>
      {filters.length === 0 && <Empty>조건이 없습니다</Empty>}
      {filters.map((f) => {
        const valueOpts = valueOptsFor(f.field, tagOptions);
        return (
          <FilterRow key={f.id}>
            <RowTop>
              <Select
                value={f.field}
                onChange={(e) => {
                  const nextField = e.target.value as DocsDbFilterField;
                  const nextOpts = valueOptsFor(nextField, tagOptions);
                  updateFilter(f.id, { field: nextField, values: [], op: nextOpts ? 'is' : 'isEmpty' });
                }}
              >
                {FIELD_OPTS.map((o) => <option key={o.field} value={o.field}>{o.label}</option>)}
              </Select>
              <Select value={f.op} onChange={(e) => updateFilter(f.id, { op: e.target.value as DocsDbFilterOp })}>
                {OP_OPTS.filter((o) => valueOpts || o.op === 'isEmpty' || o.op === 'isNotEmpty').map((o) => (
                  <option key={o.op} value={o.op}>{o.label}</option>
                ))}
              </Select>
              <RemoveBtn onClick={() => removeFilter(f.id)} title="필터 삭제">✕</RemoveBtn>
            </RowTop>
            {(f.op === 'is' || f.op === 'isNot') && valueOpts && (
              <ValueList>
                {valueOpts.map((v) => {
                  const on = f.values.includes(v);
                  const tagOpt = f.field === 'tag' ? tagOptions.find((t) => t.id === v) : undefined;
                  return (
                    <ValueItem key={v} onClick={() => toggleValue(f, v)}>
                      <Box $on={on}>{on ? '✓' : ''}</Box>
                      {f.field === 'status' && <DocsChip $bg={docsTheme.status[v]?.bg || ''} $ink={docsTheme.status[v]?.ink || ''}>{v}</DocsChip>}
                      {f.field === 'priority' && <span style={{ fontSize: 12.5 }}>{docsTheme.priority[v]?.glyph} {v}</span>}
                      {f.field === 'tag' && tagOpt && <DocsChip $bg={`${tagOpt.color}22`} $ink={tagOpt.color}>{tagOpt.label}</DocsChip>}
                    </ValueItem>
                  );
                })}
              </ValueList>
            )}
          </FilterRow>
        );
      })}
      <AddFilterMenu>
        {FIELD_OPTS.map((o) => (
          <AddFilterBtn key={o.field} onClick={() => addFilter(o.field)}>+ {o.label} 필터</AddFilterBtn>
        ))}
      </AddFilterMenu>
    </DocsPopup>
  );
};

export default DocsFilterMenu;

const Empty = styled.div`
  min-height: 32px;
  padding: 7px 8px;
  font-size: 12.5px;
  line-height: 1.4;
  color: ${docsTheme.muted};
  text-align: center;
`;

const FilterRow = styled.div`
  padding: 7px 6px;
  border-bottom: 1px solid ${docsTheme.hairline};
  display: flex;
  flex-direction: column;
  gap: 6px;
  &:last-of-type { border-bottom: none; }
`;

const RowTop = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`;

const Select = styled.select`
  flex: 1;
  min-width: 0;
  font-family: inherit;
  font-size: 12px;
  color: ${docsTheme.text};
  background: ${docsTheme.surfaceSoft};
  border: 1px solid ${docsTheme.border};
  border-radius: 7px;
  padding: 5px 6px;
  outline: none;
  &:focus { border-color: ${docsTheme.accent}; }
`;

const RemoveBtn = styled.button`
  flex: 0 0 auto;
  appearance: none;
  border: none;
  cursor: pointer;
  background: transparent;
  color: ${docsTheme.muted};
  width: 22px;
  height: 22px;
  border-radius: 6px;
  font-size: 12px;
  &:hover { background: ${docsTheme.hover}; color: ${docsTheme.text}; }
`;

const ValueList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-left: 2px;
`;

const ValueItem = styled.button`
  width: 100%;
  appearance: none;
  border: none;
  cursor: pointer;
  background: transparent;
  border-radius: 7px;
  padding: 5px 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  &:hover { background: ${docsTheme.hover}; }
`;

const Box = styled.span<{ $on: boolean }>`
  width: 15px;
  height: 15px;
  border-radius: 4px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #fff;
  background: ${({ $on }) => ($on ? docsTheme.accent : 'transparent')};
  border: 1.5px solid ${({ $on }) => ($on ? docsTheme.accent : docsTheme.borderStrong)};
`;

const AddFilterMenu = styled.div`
  display: flex;
  flex-direction: column;
  padding-top: 4px;
`;

const AddFilterBtn = styled.button`
  width: 100%;
  appearance: none;
  border: none;
  cursor: pointer;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  line-height: 1.4;
  color: ${docsTheme.muted};
  border-radius: 7px;
  min-height: 32px;
  padding: 7px 8px;
  text-align: left;
  &:hover { background: ${docsTheme.hover}; color: ${docsTheme.text2}; }
`;
