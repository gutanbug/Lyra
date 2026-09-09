import { useCallback, useEffect, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { EditableDiv } from 'lib/styles/docsCommon';
import { useEditableRef } from 'lib/hooks/useEditableRef';
import { useDocsMediaUrl } from 'lib/hooks/useDocsMediaUrl';
import { useDocsInlineChips, buildHydratedHtml } from 'lib/hooks/useDocsInlineChips';
import { matchMarkdown, filteredFlatCmds, serializeChipText } from 'lib/utils/docsUtils';
import { moveDocsCaretByArrow } from 'lib/utils/docsCaretNavigation';
import { isImeComposing } from 'lib/utils/keyboard';
import { renderMath } from 'lib/utils/katexLoader';
import DocsJiraBlock from 'components/docs/DocsJiraBlock';
import type { DocsBlock, DocsBlockType } from 'types/docs';

interface Props { block: DocsBlock; numLabel: number; placeholder?: string }

const BLOCK_DND_MIME = 'application/x-docs-block-id';

const BlockGutter = ({ id, top }: { id: string; top: number }) => {
  const { state, addBelow, focusBlock, openBlockMenu, removeComment } = useDocs();
  const [threadOpen, setThreadOpen] = useState(false);
  const comments = state.comments[id] || [];
  return (
    <Gutter className="blk-gutter" style={{ top }}>
      <GutterBtn
        title="아래에 추가"
        onClick={() => { const nid = addBelow(id); focusBlock(nid, false); }}
      >＋
      </GutterBtn>
      <DragHandle
        title="블록 메뉴 · 드래그로 이동"
        draggable
        data-docs-menu
        onDragStart={(e) => e.dataTransfer.setData(BLOCK_DND_MIME, id)}
        onClick={(e) => { e.stopPropagation(); openBlockMenu(id, e.clientX, e.clientY); }}
      >⠿
      </DragHandle>
      {comments.length > 0 && (
        <CommentBadge
          data-docs-menu
          title="댓글 보기"
          onClick={(e) => { e.stopPropagation(); setThreadOpen((v) => !v); }}
        >
          💬{comments.length}
          {threadOpen && (
            <CommentThread data-docs-menu onClick={(e) => e.stopPropagation()}>
              {comments.map((c) => (
                <CommentThreadItem key={c.id}>
                  <CommentText>{c.text}</CommentText>
                  <CommentDelBtn onClick={() => removeComment(id, c.id)} title="삭제">✕</CommentDelBtn>
                </CommentThreadItem>
              ))}
            </CommentThread>
          )}
        </CommentBadge>
      )}
    </Gutter>
  );
};

const useBlockDnd = (id: string) => {
  const { moveBlock } = useDocs();
  const onDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);
  const onDrop = useCallback((e: React.DragEvent) => {
    const src = e.dataTransfer.getData(BLOCK_DND_MIME);
    if (!src || src === id) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const after = e.clientY - rect.top > rect.height / 2;
    moveBlock(src, id, after);
  }, [id, moveBlock]);
  return { onDragOver, onDrop };
};

const DocsBlockRow = ({ block, numLabel, placeholder }: Props) => {
  const {
    state, getText, setText, setEl, getBlocks, addBelow, focusBlock, ensureTrailing,
    toggleCheck, toggleCollapse, replaceBlock, setBlocks, openMenu, closeMenu,
    openMention, chooseMention, onBlockPaste, applyCmd, resolveIssueByKey, schedulePersist,
    openPage, filteredPages, openDateMenu,
  } = useDocs();
  const { makeChipHTML, makePageChipHTML, makeDateChipHTML } = useDocsInlineChips();
  const dnd = useBlockDnd(block.id);
  const indent = block.indent || 0;

  const getValue = useCallback(() => getText(block.id), [getText, block.id]);
  const onChange = useCallback((v: string) => setText(block.id, v), [setText, block.id]);
  const renderValue = useCallback((el: HTMLElement, value: string) => {
    el.innerHTML = buildHydratedHtml(
      value,
      resolveIssueByKey,
      (id) => state.pagesById[id],
      makeChipHTML,
      makePageChipHTML,
      makeDateChipHTML,
    );
  }, [resolveIssueByKey, state.pagesById, makeChipHTML, makePageChipHTML, makeDateChipHTML]);

  const { setRef, resync } = useEditableRef(getValue, onChange, renderValue);

  const setElRef = useCallback((el: HTMLElement | null) => {
    setRef(el);
    setEl(block.id, el);
  }, [setRef, setEl, block.id]);

  const onInput = (e: React.FormEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const txt = serializeChipText(el);
    setText(block.id, txt);
    schedulePersist();

    if (txt.startsWith('/')) {
      const rect = el.getBoundingClientRect();
      let y = rect.bottom + 6;
      if (y + 330 > window.innerHeight) y = Math.max(10, rect.top - 336);
      openMenu('slash', { id: block.id, query: txt.slice(1), x: Math.min(rect.left, window.innerWidth - 316), y, active: 0 });
      if (state.mention) closeMenu('mention');
      return;
    }

    const md = matchMarkdown(txt);
    if (md && el.childElementCount === 0) {
      setText(block.id, '');
      el.textContent = '';
      replaceBlock(block.id, {
        id: block.id, type: md.type, indent,
        checked: md.type === 'todo' ? false : undefined,
        icon: md.type === 'callout' ? '💡' : undefined,
      });
      if (md.type === 'divider') ensureTrailing(block.id);
      else focusBlock(block.id, true);
      return;
    }

    const m = txt.match(/@([^\s@]{0,20})$/);
    if (m) openMention(block.id, m[1], el);
    else if (state.mention?.id === block.id) closeMenu('mention');

    if (state.slash?.id === block.id) closeMenu('slash');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isImeComposing(e)) return;
    const s = state;
    if (s.slash && s.slash.id === block.id) {
      const flat = filteredFlatCmds(s.slash.query);
      if (e.key === 'ArrowDown') { e.preventDefault(); openMenu('slash', { ...s.slash, active: (s.slash.active + 1) % Math.max(1, flat.length) }); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); openMenu('slash', { ...s.slash, active: (s.slash.active - 1 + flat.length) % Math.max(1, flat.length) }); return; }
      if (e.key === 'Enter') { e.preventDefault(); if (flat[s.slash.active]) applyCmd(flat[s.slash.active].id); return; }
      if (e.key === 'Escape') { e.preventDefault(); closeMenu('slash'); return; }
    }
    if (s.mention && s.mention.id === block.id) {
      const flat = filteredPages(s.mention.query);
      if (e.key === 'ArrowDown') { e.preventDefault(); openMenu('mention', { ...s.mention, active: (s.mention.active + 1) % Math.max(1, flat.length) }); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); openMenu('mention', { ...s.mention, active: (s.mention.active - 1 + flat.length) % Math.max(1, flat.length) }); return; }
      if (e.key === 'Enter') { e.preventDefault(); if (flat[s.mention.active]) chooseMention(flat[s.mention.active].id); return; }
      if (e.key === 'Escape') { e.preventDefault(); closeMenu('mention'); return; }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const isEmpty = (getText(block.id) || '').length === 0;
      const isListType = ['bullet', 'number', 'todo'].includes(block.type);
      if (isListType && isEmpty) {
        // Notion/AppFlowy 방식: 빈 리스트/체크박스에서 Enter — 중첩돼 있으면 한 단계 내어쓰기, 최상위면 일반 텍스트로 전환(리스트 종료)
        if (indent > 0) {
          replaceBlock(block.id, { id: block.id, type: block.type, indent: indent - 1, checked: block.type === 'todo' ? block.checked : undefined });
        } else {
          replaceBlock(block.id, { id: block.id, type: 'text', indent: 0 });
        }
        return;
      }
      const inheritList = isListType && !isEmpty;
      const nid = addBelow(block.id);
      if (inheritList) setBlocks((x) => x.map((b) => (b.id === nid ? { id: nid, type: block.type, indent } : b)));
      focusBlock(nid, false);
      return;
    }
    if (e.key === 'Backspace' && (getText(block.id) || '').length === 0) {
      const bs = getBlocks();
      const idx = bs.findIndex((b) => b.id === block.id);
      if (bs.length > 1 && idx > 0) {
        e.preventDefault();
        const prev = bs[idx - 1];
        setBlocks((x) => x.filter((b) => b.id !== block.id));
        focusBlock(prev.id, true);
        return;
      }
    }
    moveDocsCaretByArrow(e, e.currentTarget);
  };

  const mediaSrc = useDocsMediaUrl(block.mediaId, block.url);
  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => onBlockPaste(block.id, e);
  const openMediaMenuFor = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    openMenu('mediaMenu', { blockId: block.id, x: Math.min(r.left, window.innerWidth - 340), y: r.bottom + 6 });
  };
  const onDocPageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const pageChip = target.closest<HTMLElement>('[data-page]');
    if (pageChip) { e.preventDefault(); openPage(pageChip.getAttribute('data-page')!); return; }
    const dateChip = target.closest<HTMLElement>('[data-docs-date]');
    if (dateChip) { e.preventDefault(); e.stopPropagation(); openDateMenu(block.id, dateChip); }
  };

  // ── math (LaTeX 렌더링 미리보기 ↔ 편집 토글) ──
  const [mathFocused, setMathFocused] = useState(false);
  const mathPreviewRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (block.type !== 'math' || mathFocused || !mathPreviewRef.current) return;
    renderMath(mathPreviewRef.current, getText(block.id));
  }, [block.type, block.id, mathFocused, getText]);

  // ── divider ──
  if (block.type === 'divider') {
    return (
      <BlockRowShell {...dnd} $align={block.align} data-block-id={block.id} style={{ padding: '10px 0' }}>
        <BlockGutter id={block.id} top={-2} />
        <Divider />
      </BlockRowShell>
    );
  }

  // ── image ──
  if (block.type === 'image') {
    return (
      <BlockRowShell {...dnd} $align={block.align} data-block-id={block.id} style={{ padding: '5px 0' }}>
        <BlockGutter id={block.id} top={8} />
        {mediaSrc ? (
          <MediaImg src={mediaSrc} alt={block.title || ''} onClick={openMediaMenuFor} />
        ) : (
          <MediaPlaceholder onClick={openMediaMenuFor}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="M21 15l-5-5L5 21" /></svg>
            <span style={{ fontSize: 13.5 }}>이미지를 추가하려면 클릭 또는 드래그</span>
          </MediaPlaceholder>
        )}
      </BlockRowShell>
    );
  }

  // ── video / file ──
  if (block.type === 'video' || block.type === 'file') {
    return (
      <BlockRowShell {...dnd} $align={block.align} data-block-id={block.id} style={{ padding: '5px 0' }}>
        <BlockGutter id={block.id} top={8} />
        {mediaSrc ? (
          block.type === 'video' ? (
            <MediaVideo src={mediaSrc} controls />
          ) : (
            <FileChip href={mediaSrc} download={block.title || undefined} target="_blank" rel="noreferrer">
              <span style={{ fontSize: 20, flex: '0 0 auto' }}>📎</span>
              <span style={{ fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{block.title || block.url}</span>
            </FileChip>
          )
        ) : (
          <MediaPlaceholder $row onClick={openMediaMenuFor}>
            <span style={{ fontSize: 26, flex: '0 0 auto' }}>{block.type === 'video' ? '🎬' : '📎'}</span>
            <span style={{ fontSize: 13.5 }}>{block.type === 'video' ? '동영상을 추가하려면 클릭 또는 URL 붙여넣기' : '파일을 추가하려면 클릭 또는 드래그'}</span>
          </MediaPlaceholder>
        )}
      </BlockRowShell>
    );
  }

  // ── subpage ──
  if (block.type === 'subpage') {
    const p = block.pageId ? state.pagesById[block.pageId] : undefined;
    return (
      <BlockRowShell {...dnd} $align={block.align} data-block-id={block.id} style={{ padding: '2px 0' }}>
        <BlockGutter id={block.id} top={4} />
        <SubpageLink onClick={() => block.pageId && openPage(block.pageId)}>
          <span style={{ fontSize: 17 }}>{p?.icon || '📄'}</span>
          <span style={{ fontSize: 15, fontWeight: 500, borderBottom: `1px solid ${docsTheme.borderStrong}` }}>{p?.title || '(삭제된 페이지)'}</span>
        </SubpageLink>
      </BlockRowShell>
    );
  }

  // ── bookmark ──
  if (block.type === 'bookmark') {
    return (
      <BlockRowShell {...dnd} $align={block.align} data-block-id={block.id} style={{ padding: '5px 0' }}>
        <BlockGutter id={block.id} top={12} />
        <Bookmark>
          <div style={{ flex: 1, minWidth: 0, padding: '12px 15px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: docsTheme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{block.title || '웹 북마크'}</div>
            <div style={{ fontSize: 11.5, color: docsTheme.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 4 }}>{block.url || ''}</div>
          </div>
          <BookmarkThumb>
            <span style={{ width: 30, height: 30, borderRadius: 7, background: docsTheme.accent, color: '#fff', fontSize: 15, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora' }}>{(block.host || 'W')[0].toUpperCase()}</span>
          </BookmarkThumb>
        </Bookmark>
      </BlockRowShell>
    );
  }

  // ── table ──
  if (block.type === 'table') {
    const cells = block.cells || [['', '', '']];
    return (
      <BlockRowShell {...dnd} $align={block.align} data-block-id={block.id} style={{ padding: '6px 0' }}>
        <BlockGutter id={block.id} top={8} />
        <TableBox>
          {cells.map((row, ri) => (
            // eslint-disable-next-line react/no-array-index-key
            <TableRow key={ri}>
              {row.map((_val, ci) => (
                // eslint-disable-next-line react/no-array-index-key
                <TableCell key={ci} id={`${block.id}:${ri}:${ci}`} block={block} ri={ri} ci={ci} header={ri === 0} />
              ))}
            </TableRow>
          ))}
        </TableBox>
      </BlockRowShell>
    );
  }

  // ── outline ──
  if (block.type === 'outline') {
    const items = getBlocks().filter((x) => x.type === 'h1' || x.type === 'h2' || x.type === 'h3').map((x) => ({
      id: x.id, text: getText(x.id) || '(제목 없음)', level: x.type === 'h1' ? 0 : x.type === 'h2' ? 1 : 2,
    }));
    return (
      <BlockRowShell {...dnd} $align={block.align} data-block-id={block.id} style={{ padding: '6px 0' }}>
        <BlockGutter id={block.id} top={8} />
        <Outline>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', color: docsTheme.muted, marginBottom: 4 }}>목차</div>
          {items.map((it) => (
            <OutlineItem key={it.id} style={{ paddingLeft: it.level * 14 }} onClick={() => focusBlock(it.id, false)}>{it.text}</OutlineItem>
          ))}
        </Outline>
      </BlockRowShell>
    );
  }

  // ── jira ──
  if (block.type === 'jira') {
    return <DocsJiraBlock block={block} dnd={dnd} />;
  }

  // ── math ──
  if (block.type === 'math') {
    const showEditor = mathFocused || !getText(block.id);
    return (
      <BlockRowShell {...dnd} $align={block.align} data-block-id={block.id} style={{ margin: '6px 0' }} onClick={onDocPageClick}>
        <BlockGutter id={block.id} top={18} />
        {showEditor ? (
          <EditableDiv
            className="lyra-ed"
            data-docs-text-editor="true"
            contentEditable
            suppressContentEditableWarning
            ref={setElRef as unknown as React.Ref<HTMLDivElement>}
            onInput={onInput}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onFocus={() => setMathFocused(true)}
            onBlur={() => { resync(); setMathFocused(false); }}
            data-ph="E = mc^2"
            style={{
              flex: 1, minWidth: 0, outline: 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6,
              fontFamily: "'JetBrains Mono',monospace", fontSize: 16, color: docsTheme.text, textAlign: 'center',
              background: docsTheme.surfaceSoft, border: `1px solid ${docsTheme.border}`, borderRadius: 11, padding: '18px 16px',
            }}
          />
        ) : (
          <MathPreview
            ref={mathPreviewRef}
            onClick={() => { setMathFocused(true); focusBlock(block.id, true); }}
          />
        )}
      </BlockRowShell>
    );
  }

  // ── editable (text/h1/h2/h3/quote/callout/code/bullet/number/todo/toggle) ──
  const meta = editableMeta(block, numLabel, indent);

  return (
    <BlockRowShell {...dnd} $align={block.align} data-block-id={block.id} style={meta.rowStyle} onClick={onDocPageClick}>
      <BlockGutter id={block.id} top={meta.gutterTop} />
      {block.type === 'toggle' && (
        <ToggleCaret $open={!state.collapsed[block.id]} onClick={(e) => { e.stopPropagation(); toggleCollapse(block.id); }}>▶</ToggleCaret>
      )}
      {block.type === 'todo' && (
        <Checkbox $checked={!!block.checked} onClick={(e) => { e.stopPropagation(); toggleCheck(block.id); }}>{block.checked ? '✓' : ''}</Checkbox>
      )}
      {block.type === 'bullet' && <Bullet>{indent > 0 ? '◦' : '•'}</Bullet>}
      {block.type === 'number' && <NumberLabel>{numLabel}.</NumberLabel>}
      {block.type === 'callout' && <CalloutIcon>{block.icon || '💡'}</CalloutIcon>}
      <EditableDiv
        className="lyra-ed"
        data-docs-text-editor="true"
        contentEditable
        suppressContentEditableWarning
        ref={setElRef as unknown as React.Ref<HTMLDivElement>}
        onInput={onInput}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onBlur={resync}
        data-ph={meta.placeholder || (block.type === 'text' ? placeholder : undefined)}
        style={meta.contentStyle}
      />
    </BlockRowShell>
  );
};

export default DocsBlockRow;

const editableMeta = (block: DocsBlock, numLabel: number, indent: number) => {
  const base: React.CSSProperties = {
    flex: 1, minWidth: 0, outline: 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6,
  };
  let contentStyle: React.CSSProperties = { ...base, fontSize: 16, color: docsTheme.text };
  let placeholder: string | undefined;
  let rowStyle: React.CSSProperties = {};
  let gutterTop = 4;

  switch (block.type) {
    case 'h1':
      contentStyle = { ...base, fontFamily: "'Sora',sans-serif", fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.25 };
      placeholder = '제목 1'; rowStyle = { paddingTop: 26 }; gutterTop = 30;
      break;
    case 'h2':
      contentStyle = { ...base, fontFamily: "'Sora',sans-serif", fontSize: 23, fontWeight: 800, letterSpacing: '-.015em', lineHeight: 1.3 };
      placeholder = '제목 2'; rowStyle = { paddingTop: 20 }; gutterTop = 24;
      break;
    case 'h3':
      contentStyle = { ...base, fontFamily: "'Sora',sans-serif", fontSize: 18.5, fontWeight: 700, lineHeight: 1.35 };
      placeholder = '제목 3'; rowStyle = { paddingTop: 14 }; gutterTop = 18;
      break;
    case 'quote':
      contentStyle = { ...base, fontSize: 16, fontStyle: 'italic', color: docsTheme.text2 };
      placeholder = '인용';
      rowStyle = { borderLeft: `3px solid ${docsTheme.borderStrong}`, paddingLeft: 16 + indent * 26 };
      break;
    case 'callout':
      contentStyle = { ...base, fontSize: 15, color: docsTheme.text };
      rowStyle = { background: docsTheme.calloutBg, borderRadius: 11, padding: '14px 16px' };
      gutterTop = 16;
      break;
    case 'code':
      contentStyle = { ...base, fontFamily: "'JetBrains Mono',monospace", fontSize: 13.5, color: docsTheme.codeText };
      placeholder = '코드';
      rowStyle = {
        background: docsTheme.codeBg, border: `1px solid ${docsTheme.border}`, borderRadius: 11, padding: '14px 16px', margin: '6px 0',
      };
      gutterTop = 16;
      break;
    case 'bullet':
      contentStyle = { ...base, fontSize: 16, color: docsTheme.text };
      placeholder = '목록';
      break;
    case 'number':
      contentStyle = { ...base, fontSize: 16, color: docsTheme.text };
      placeholder = '목록';
      void numLabel;
      break;
    case 'todo':
      contentStyle = {
        ...base, fontSize: 16, color: block.checked ? docsTheme.muted : docsTheme.text, textDecoration: block.checked ? 'line-through' : 'none',
      };
      placeholder = '할 일';
      break;
    case 'toggle':
      contentStyle = { ...base, fontSize: 16, fontWeight: 600, color: docsTheme.text };
      placeholder = '토글';
      break;
    default:
      contentStyle = { ...base, fontSize: 16, color: docsTheme.text };
  }

  const finalPaddingLeft = rowStyle.paddingLeft ?? indent * 26;
  return {
    contentStyle,
    placeholder,
    // paddingLeft는 반드시 마지막 키로 두어 위의 padding 축약형(shorthand)에 덮어써지지 않게 한다.
    rowStyle: {
      position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 6, padding: '2px 0', ...rowStyle, paddingLeft: finalPaddingLeft,
    } as React.CSSProperties,
    gutterTop,
  };
};

// TableCell — 표 셀 개별 contentEditable
const TableCell = ({ id, block, ri, ci, header }: { id: string; block: DocsBlock; ri: number; ci: number; header: boolean }) => {
  const { getText, setText, schedulePersist } = useDocs();
  const key = `${block.id}:${ri}:${ci}`;
  const getValue = useCallback(() => getText(key), [getText, key]);
  const onChange = useCallback((v: string) => { setText(key, v); schedulePersist(); }, [setText, key, schedulePersist]);
  const { setRef, onInput } = useEditableRef(getValue, onChange);
  void id;
  return (
    <TableCellDiv
      className="lyra-ed"
      data-docs-text-editor="true"
      contentEditable
      suppressContentEditableWarning
      ref={setRef as unknown as React.Ref<HTMLDivElement>}
      onInput={onInput}
      onKeyDown={(event) => moveDocsCaretByArrow(event, event.currentTarget)}
      $header={header}
    />
  );
};

const BlockRowShell = styled.div<{ $align?: 'left' | 'center' | 'right' }>`
  position: relative;
  text-align: ${({ $align }) => $align || 'left'};
`;

const Gutter = styled.div`
  position: absolute;
  left: -54px;
  display: flex;
  gap: 1px;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.12s;
  ${BlockRowShell}:hover & { opacity: 1; }
`;

const GutterBtn = styled.button`
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${docsTheme.faint};
  width: 20px;
  height: 22px;
  border-radius: 5px;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  &:hover { background: ${docsTheme.hover}; color: ${docsTheme.text2}; }
`;

const DragHandle = styled(GutterBtn)`
  width: 16px;
  font-size: 13px;
  cursor: grab;
`;

const CommentBadge = styled.button`
  position: relative;
  appearance: none;
  border: none;
  cursor: pointer;
  background: ${docsTheme.accentSoft};
  color: ${docsTheme.accent};
  font-family: inherit;
  font-size: 10.5px;
  font-weight: 700;
  height: 22px;
  padding: 0 6px;
  border-radius: 5px;
  margin-left: 2px;
  white-space: nowrap;
  &:hover { opacity: .85; }
`;

const CommentThread = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 65;
  width: 220px;
  max-height: 260px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: ${docsTheme.surface};
  border: 1px solid ${docsTheme.border};
  border-radius: ${docsTheme.radius.ctl};
  box-shadow: ${docsTheme.shadow};
  padding: 8px;
  cursor: default;
  text-align: left;
`;

const CommentThreadItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 6px;
`;

const CommentText = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 500;
  color: ${docsTheme.text};
  white-space: pre-wrap;
  word-break: break-word;
`;

const CommentDelBtn = styled.button`
  flex: 0 0 auto;
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${docsTheme.faint};
  font-size: 11px;
  &:hover { color: ${docsTheme.danger}; }
`;

const Divider = styled.div`
  height: 1px;
  background: ${docsTheme.border};
`;

const MediaPlaceholder = styled.div<{ $row?: boolean }>`
  border: 1.5px dashed ${docsTheme.borderStrong};
  border-radius: 12px;
  padding: ${({ $row }) => ($row ? '26px' : '34px')};
  display: flex;
  ${({ $row }) => ($row ? css`flex-direction: row; align-items: center; gap: 12px;` : css`flex-direction: column; align-items: center; gap: 8px;`)}
  color: ${docsTheme.muted};
  background: ${docsTheme.surfaceSoft};
  cursor: pointer;
  &:hover { border-color: ${docsTheme.accent}; color: ${docsTheme.text2}; }
`;

const MediaImg = styled.img`
  display: block;
  max-width: 100%;
  border-radius: 10px;
  cursor: pointer;
`;

const MediaVideo = styled.video`
  display: block;
  max-width: 100%;
  border-radius: 10px;
`;

const FileChip = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  max-width: 100%;
  padding: 10px 14px;
  border: 1px solid ${docsTheme.border};
  border-radius: 10px;
  background: ${docsTheme.surfaceSoft};
  color: ${docsTheme.text};
  text-decoration: none;
  &:hover { background: ${docsTheme.hover}; }
`;

const SubpageLink = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  color: ${docsTheme.text};
  &:hover { background: ${docsTheme.hover}; }
`;

const Bookmark = styled.div`
  display: flex;
  align-items: stretch;
  border: 1px solid ${docsTheme.border};
  border-radius: 11px;
  overflow: hidden;
  background: ${docsTheme.surface};
  cursor: pointer;
  width: 100%;
  &:hover { border-color: ${docsTheme.borderStrong}; box-shadow: ${docsTheme.shadow}; }
`;

const BookmarkThumb = styled.div`
  flex: 0 0 84px;
  background: ${docsTheme.surfaceSoft};
  border-left: 1px solid ${docsTheme.border};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const TableBox = styled.div`
  border: 1px solid ${docsTheme.border};
  border-radius: 10px;
  overflow: hidden;
  width: 100%;
`;

const TableRow = styled.div`
  display: flex;
  border-bottom: 1px solid ${docsTheme.hairline};
  &:last-child { border-bottom: none; }
`;

const TableCellDiv = styled(EditableDiv)<{ $header: boolean }>`
  flex: 1;
  min-width: 0;
  padding: 9px 12px;
  border-right: 1px solid ${docsTheme.hairline};
  outline: none;
  font-size: 13.5px;
  ${({ $header }) => ($header
    ? css`font-weight: 600; color: ${docsTheme.text}; background: ${docsTheme.surfaceSoft};`
    : css`color: ${docsTheme.text2};`)}
  &:last-child { border-right: none; }
`;

const Outline = styled.div`
  border-left: 2px solid ${docsTheme.border};
  padding-left: 14px;
  width: 100%;
`;

const OutlineItem = styled.div`
  font-size: 14px;
  color: ${docsTheme.text2};
  padding: 3px 0;
  cursor: pointer;
  &:hover { color: ${docsTheme.accent}; }
`;

const ToggleCaret = styled.button<{ $open: boolean }>`
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${docsTheme.text2};
  font-size: 11px;
  flex: 0 0 auto;
  width: 20px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s;
  transform: ${({ $open }) => ($open ? 'rotate(90deg)' : 'none')};
`;

const Checkbox = styled.button<{ $checked: boolean }>`
  appearance: none;
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  margin-top: 4px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #fff;
  transition: all 0.12s;
  border: ${({ $checked }) => ($checked ? 'none' : `2px solid ${docsTheme.borderStrong}`)};
  background: ${({ $checked }) => ($checked ? docsTheme.todo : 'transparent')};
`;

const MathPreview = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 24px;
  cursor: text;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${docsTheme.surfaceSoft};
  border: 1px solid ${docsTheme.border};
  border-radius: 11px;
  padding: 18px 16px;
  color: ${docsTheme.text};
  overflow-x: auto;
`;

const Bullet = styled.span`
  flex: 0 0 auto;
  width: 20px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${docsTheme.text};
  font-size: 18px;
  line-height: 1;
`;

const NumberLabel = styled.span`
  flex: 0 0 auto;
  min-width: 20px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: ${docsTheme.text2};
  font-size: 15px;
  font-family: 'Sora', sans-serif;
`;

const CalloutIcon = styled.span`
  flex: 0 0 auto;
  font-size: 19px;
  line-height: 1.4;
`;
