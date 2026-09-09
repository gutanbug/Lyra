import {
  Type, Hash, List, ListChecks, Calendar, User, Paperclip, Link2, CheckSquare, ListTodo, Clock, History, Link, Sigma,
} from 'lucide-react';
import { useDocs } from 'modules/contexts/docs';
import { DocsPopup, DocsPopupLabel, DocsMenuButton } from 'lib/styles/docsCommon';
import type { DocsDbFieldType } from 'types/docs';

const FIELD_TYPES: { type: DocsDbFieldType; label: string; Icon: typeof Type }[] = [
  { type: 'text', label: '텍스트', Icon: Type },
  { type: 'number', label: '숫자', Icon: Hash },
  { type: 'select', label: '선택', Icon: List },
  { type: 'multiSelect', label: '다중 선택', Icon: ListChecks },
  { type: 'date', label: '날짜', Icon: Calendar },
  { type: 'person', label: 'Person', Icon: User },
  { type: 'file', label: '파일 및 미디어', Icon: Paperclip },
  { type: 'url', label: 'URL', Icon: Link2 },
  { type: 'checkbox', label: '체크박스', Icon: CheckSquare },
  { type: 'checklist', label: '체크리스트', Icon: ListTodo },
  { type: 'createdTime', label: '생성일', Icon: Clock },
  { type: 'lastEditedTime', label: '마지막 수정', Icon: History },
  { type: 'relation', label: '관계', Icon: Link },
  { type: 'rollup', label: 'Rollup', Icon: Sigma },
];

const DocsFieldTypeMenu = () => {
  const { state, addCustomField } = useDocs();
  const { fieldTypeMenu } = state;
  if (!fieldTypeMenu) return null;

  return (
    <DocsPopup data-docs-menu style={{ left: fieldTypeMenu.x, top: fieldTypeMenu.y, width: 200, maxHeight: 340, overflowY: 'auto' }}>
      <DocsPopupLabel>속성 유형</DocsPopupLabel>
      {FIELD_TYPES.map((f) => (
        <DocsMenuButton key={f.type} onClick={() => addCustomField(f.type, f.label)}>
          <span style={{ width: 18, display: 'inline-flex', justifyContent: 'center' }}><f.Icon size={14} /></span>{f.label}
        </DocsMenuButton>
      ))}
    </DocsPopup>
  );
};

export default DocsFieldTypeMenu;
