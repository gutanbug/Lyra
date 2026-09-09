import {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import styled from 'styled-components';
import { FileText, Database, Image as ImageIcon } from 'lucide-react';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { EditableTitle } from 'lib/styles/docsCommon';
import { useEditableRef } from 'lib/hooks/useEditableRef';
import { moveDocsCaretByArrow } from 'lib/utils/docsCaretNavigation';
import { isImeComposing } from 'lib/utils/keyboard';
import DocsBlockRow from 'components/docs/DocsBlockRow';
import EmojiPickerPanel from 'components/common/EmojiPicker';
import type { DocsBlock } from 'types/docs';

const DocsDocView = () => {
  const {
    state, activePage, getBlocks, onTitleInput, addCover, removeCover, setPageIcon,
  } = useDocs();
  const page = activePage();
  const blocks = getBlocks();
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const visibleBlocks = useMemo(() => {
    const out: { block: DocsBlock; numLabel: number }[] = [];
    let hideUntilIndent0 = false;
    let numCounter = 0;
    blocks.forEach((b, i) => {
      if (hideUntilIndent0) {
        if ((b.indent || 0) === 0) hideUntilIndent0 = false;
        else return;
      }
      if (b.type === 'number') {
        const prev = blocks[i - 1];
        numCounter = prev && prev.type === 'number' ? numCounter + 1 : 1;
      } else {
        numCounter = 0;
      }
      out.push({ block: b, numLabel: numCounter });
      if (b.type === 'toggle' && !!state.collapsed[b.id]) hideUntilIndent0 = true;
    });
    return out;
  }, [blocks, state.collapsed]);

  const getTitle = useCallback(() => page?.title || '', [page]);
  const onTitleChange = useCallback((v: string) => onTitleInput(v), [onTitleInput]);
  const { setRef: setTitleRef, onInput: onTitleInputHandler } = useEditableRef(getTitle, onTitleChange);

  const onTitleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isImeComposing(e)) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = blocks[0];
      if (first) document.querySelector<HTMLElement>(`[data-block-id="${first.id}"] .lyra-ed`)?.focus();
      return;
    }
    moveDocsCaretByArrow(e, e.currentTarget);
  };

  const onDocClick = (e: React.MouseEvent) => {
    const el = e.target as HTMLElement;
    // subpage/page-mention 칩 클릭은 각 블록에서 자체 처리하므로 여기서는 빈 영역(블록 바깥) 클릭만 처리한다.
    // 제목/블록 내부 클릭은 네이티브 contentEditable 커서 배치를 그대로 따라야 하므로 가로채지 않는다.
    if (el.closest('[data-page]') || el.closest('[data-block-id]') || el.closest('.lyra-title')) return;
    if (blocks.length === 0) return;
    // 빈 영역 클릭은 실제 문서 편집기처럼 마지막으로 줄바꿈된 위치(마지막 블록의 끝)에만 커서를 둔다.
    // 매번 새 블록을 만들면 클릭할 때마다 커서가 계속 아래로 밀려나므로 블록을 추가하지 않는다.
    const last = blocks[blocks.length - 1];
    const lastText = document.querySelector<HTMLElement>(`[data-block-id="${last.id}"] .lyra-ed`);
    if (!lastText) return;
    lastText.focus();
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.selectNodeContents(lastText);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  };

  useEffect(() => { setIconPickerOpen(false); }, [page?.id]);

  if (!page) return null;

  return (
    <>
      {page.cover && (
        <Cover style={{ background: page.cover }}>
          <CoverControls className="cover-controls">
            <CoverActionBtn onClick={addCover}>커버 변경</CoverActionBtn>
            <CoverActionBtn onClick={removeCover}>제거</CoverActionBtn>
          </CoverControls>
        </Cover>
      )}
      <Wrap onClick={onDocClick} data-docs-editor-scope>
        <IconWrap>
          <PageIcon onClick={(e) => { e.stopPropagation(); setIconPickerOpen((v) => !v); }} title="아이콘 변경">
            {page.icon || (page.type === 'db' ? <Database size={34} color={docsTheme.faint} /> : <FileText size={34} color={docsTheme.faint} />)}
          </PageIcon>
          {iconPickerOpen && (
            <EmojiPickerPanel
              onSelect={(emoji) => { setPageIcon(page.id, emoji); setIconPickerOpen(false); }}
              onClose={() => setIconPickerOpen(false)}
            />
          )}
        </IconWrap>
        <CoverRow className="nav-row">
          {!page.cover && <CoverBtn className="nav-add" onClick={addCover}><ImageIcon size={14} /> 커버</CoverBtn>}
        </CoverRow>
        <EditableTitle
          className="lyra-title"
          data-docs-text-editor="true"
          contentEditable
          suppressContentEditableWarning
          ref={setTitleRef as unknown as React.Ref<HTMLDivElement>}
          onInput={onTitleInputHandler}
          onKeyDown={onTitleKey}
          data-ph="제목 없음"
        />
        {visibleBlocks.map(({ block, numLabel }) => (
          <DocsBlockRow key={block.id} block={block} numLabel={numLabel} />
        ))}
      </Wrap>
    </>
  );
};

export default DocsDocView;

const Cover = styled.div`
  height: 180px;
  position: relative;
  &:hover .cover-controls { opacity: 1; }
`;

const CoverControls = styled.div`
  position: absolute;
  right: 20px;
  bottom: 12px;
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.12s;
`;

const CoverActionBtn = styled.button`
  appearance: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${docsTheme.text};
  background: rgba(255, 255, 255, 0.85);
  padding: 5px 10px;
  border-radius: ${docsTheme.radius.ctl};
  box-shadow: ${docsTheme.shadow};
  &:hover { background: #fff; }
`;

const Wrap = styled.div`
  max-width: 760px;
  margin: 0 auto;
  padding: 36px 60px 40vh;
  position: relative;
`;

const IconWrap = styled.div`
  position: relative;
  width: fit-content;
`;

const PageIcon = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 68px;
  height: 68px;
  font-size: 58px;
  line-height: 1;
  margin-bottom: 8px;
  cursor: pointer;
  user-select: none;
  border-radius: 12px;
  &:hover { background: ${docsTheme.hover}; }
`;

const CoverRow = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  min-height: 1px;
`;

const CoverBtn = styled.button`
  opacity: 0;
  transition: opacity 0.12s;
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  color: ${docsTheme.muted};
  padding: 4px 8px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  ${Wrap}:hover & { opacity: 1; }
  &:hover { background: ${docsTheme.hover}; color: ${docsTheme.text2}; }
`;
