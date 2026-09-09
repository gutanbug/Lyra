import { Copy, Trash2 } from 'lucide-react';
import { DocsPopup, DocsMenuButton, DocsMenuDivider } from 'lib/styles/docsCommon';
import { useDocs } from 'modules/contexts/docs';
import type { DocsBlockType } from 'types/docs';

export const TURN_INTO: { type: DocsBlockType; icon: string; label: string }[] = [
  { type: 'text', icon: '¶', label: '텍스트로 변경' },
  { type: 'h1', icon: 'H₁', label: '제목 1로 변경' },
  { type: 'h2', icon: 'H₂', label: '제목 2로 변경' },
  { type: 'h3', icon: 'H₃', label: '제목 3로 변경' },
  { type: 'bullet', icon: '•', label: '글머리 기호로 변경' },
  { type: 'number', icon: '1.', label: '번호 목록으로 변경' },
  { type: 'todo', icon: '☑', label: '할 일로 변경' },
  { type: 'toggle', icon: '▸', label: '토글로 변경' },
  { type: 'quote', icon: '❝', label: '인용으로 변경' },
];

const DocsBlockMenu = () => {
  const {
    state, closeMenu, duplicateBlock, removeBlock, turnInto,
  } = useDocs();
  const { blockMenu } = state;
  if (!blockMenu) return null;
  const { id } = blockMenu;

  return (
    <DocsPopup data-docs-menu style={{ left: blockMenu.x, top: blockMenu.y, width: 196, maxHeight: 320, overflowY: 'auto' }}>
      <DocsMenuButton onClick={() => duplicateBlock(id)}><span style={{ width: 18, textAlign: 'center', display: 'inline-flex', justifyContent: 'center' }}><Copy size={14} /></span>복제</DocsMenuButton>
      <DocsMenuButton onClick={() => { closeMenu('blockMenu'); removeBlock(id); }} style={{ color: '#e5484d' }}>
        <span style={{ width: 18, textAlign: 'center', display: 'inline-flex', justifyContent: 'center' }}><Trash2 size={14} /></span>삭제
      </DocsMenuButton>
      <DocsMenuDivider />
      {TURN_INTO.map((t) => (
        <DocsMenuButton key={t.type} onClick={() => turnInto(id, t.type)}>
          <span style={{ width: 18, textAlign: 'center' }}>{t.icon}</span>{t.label}
        </DocsMenuButton>
      ))}
    </DocsPopup>
  );
};

export default DocsBlockMenu;
