import {
  useEffect, useMemo,
} from 'react';
import styled from 'styled-components';
import DocsBlockRow from 'components/docs/DocsBlockRow';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import type { DocsBlock } from 'types/docs';

const DocsRowNoteEditor = ({ rowId }: { rowId: string }) => {
  const {
    state, openRowNote, closeRowNote, ensureTrailing,
  } = useDocs();
  const noteDocId = `card-note:${state.activeId}:${rowId}`;
  const blocks = state.docs[noteDocId] || [];

  useEffect(() => {
    openRowNote(rowId);
    return closeRowNote;
  }, [rowId, openRowNote, closeRowNote]);

  const visibleBlocks = useMemo(() => {
    const output: { block: DocsBlock; numLabel: number }[] = [];
    let hideNested = false;
    let number = 0;
    blocks.forEach((block, index) => {
      if (hideNested) {
        if ((block.indent || 0) === 0) hideNested = false;
        else return;
      }
      if (block.type === 'number') {
        number = blocks[index - 1]?.type === 'number' ? number + 1 : 1;
      } else {
        number = 0;
      }
      output.push({ block, numLabel: number });
      if (block.type === 'toggle' && state.collapsed[block.id]) hideNested = true;
    });
    return output;
  }, [blocks, state.collapsed]);

  const focusOrAppend = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('[data-block-id]')) return;
    const last = blocks[blocks.length - 1];
    if (!last) return;
    const editable = document.querySelector<HTMLElement>(`[data-block-id="${last.id}"] .lyra-ed`);
    if (editable && !(editable.textContent || '').length) {
      editable.focus();
      return;
    }
    const nextId = ensureTrailing(last.id);
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-block-id="${nextId}"] .lyra-ed`)?.focus();
    });
  };

  return (
    <NoteEditor onClick={focusOrAppend} data-docs-editor-scope>
      <NoteLabel>메모</NoteLabel>
      <NoteBlocks>
        {visibleBlocks.map(({ block, numLabel }, index) => (
          <DocsBlockRow
            key={block.id}
            block={block}
            numLabel={numLabel}
            placeholder={index === 0 ? '메모를 입력하거나 / 명령어 사용…' : undefined}
          />
        ))}
      </NoteBlocks>
    </NoteEditor>
  );
};

export default DocsRowNoteEditor;

const NoteEditor = styled.div`
  min-height: 150px;
  cursor: text;
`;

const NoteLabel = styled.div`
  margin-bottom: 8px;
  color: ${docsTheme.muted};
  font-size: 12px;
  font-weight: 700;
`;

const NoteBlocks = styled.div`
  min-height: 112px;

  [data-block-id] {
    margin-right: 4px;
  }

  .blk-gutter {
    left: auto;
    right: 0;
    padding-left: 6px;
    background: linear-gradient(90deg, transparent, ${docsTheme.surface} 22%);
  }
`;
