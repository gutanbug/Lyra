import { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  Bold, Italic, Underline, Strikethrough, Code2, Link2, AlignLeft, AlignCenter, AlignRight,
  MessageSquarePlus, Type, Highlighter, Repeat2,
} from 'lucide-react';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { isImeComposing } from 'lib/utils/keyboard';
import { TURN_INTO } from 'components/docs/DocsBlockMenu';

const TEXT_COLORS: { label: string; value: string | null }[] = [
  { label: '기본값', value: null },
  { label: '회색', value: '#9b9591' },
  { label: '갈색', value: '#976a41' },
  { label: '주황', value: '#cc722e' },
  { label: '노랑', value: '#c19122' },
  { label: '초록', value: '#548164' },
  { label: '파랑', value: '#487ca5' },
  { label: '보라', value: '#8a67ab' },
  { label: '분홍', value: '#b95482' },
  { label: '빨강', value: '#c4554d' },
];

const BG_COLORS: { label: string; value: string | null }[] = [
  { label: '기본값', value: null },
  { label: '회색', value: '#e9e6e2' },
  { label: '갈색', value: '#f1e4d3' },
  { label: '주황', value: '#fbe4cc' },
  { label: '노랑', value: '#fdf3a0' },
  { label: '초록', value: '#dbf3df' },
  { label: '파랑', value: '#dbe9fb' },
  { label: '보라', value: '#ece3fb' },
  { label: '분홍', value: '#fbe1ec' },
  { label: '빨강', value: '#fbdedb' },
];

const SIZE_OPTS: { label: string; value: 'sm' | 'base' | 'lg' }[] = [
  { label: '작게', value: 'sm' },
  { label: '기본', value: 'base' },
  { label: '크게', value: 'lg' },
];

type PanelKind = 'comment' | 'size' | 'text' | 'bg' | 'turnInto' | 'link' | 'align';

const DocsFormatBar = () => {
  const {
    state, openMenu, closeMenu, applyFmt, applyColor, applySize, applyLink,
    getActiveBlockId, setBlockAlign, addComment, turnInto,
  } = useDocs();
  const { fmtBar } = state;
  const [panel, setPanel] = useState<PanelKind | null>(null);
  const [commentText, setCommentText] = useState('');
  const [linkValue, setLinkValue] = useState('');

  useEffect(() => {
    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        closeMenu('fmtBar');
        return;
      }
      const node = sel.anchorNode;
      const el = node && (node.nodeType === 1 ? node as HTMLElement : node.parentElement);
      const ed = el?.closest('.lyra-ed');
      if (!ed || !document.querySelector('[data-docs-root]')?.contains(ed)) {
        closeMenu('fmtBar');
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (!rect.width && !rect.height) return;
      const x = Math.min(Math.max(8, rect.left + rect.width / 2 - 176), window.innerWidth - 360);
      const y = rect.top - 46 < 8 ? rect.bottom + 8 : rect.top - 46;
      openMenu('fmtBar', { x, y, blockId: getActiveBlockId() });
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fmtBar) { setPanel(null); setCommentText(''); setLinkValue(''); }
  }, [fmtBar]);

  if (!fmtBar) return null;

  const prevent = (e: React.MouseEvent) => e.preventDefault();
  const toggle = (p: PanelKind) => setPanel((v) => (v === p ? null : p));

  const submitComment = () => {
    if (fmtBar.blockId && commentText.trim()) addComment(fmtBar.blockId, commentText);
    setCommentText('');
    setPanel(null);
  };

  const submitLink = () => {
    if (linkValue.trim()) applyLink(linkValue);
    setLinkValue('');
    setPanel(null);
  };

  return (
    <Bar data-docs-menu style={{ left: fmtBar.x, top: fmtBar.y }}>
      <Btn onMouseDown={prevent} onClick={() => toggle('comment')} title="댓글 생성" $active={panel === 'comment'}>
        <MessageSquarePlus size={15} />
      </Btn>
      <Divider />
      <Btn onMouseDown={prevent} onClick={() => toggle('size')} title="텍스트 크기" $active={panel === 'size'}>
        <Type size={15} />
      </Btn>
      <Divider />
      <Btn onMouseDown={prevent} onClick={() => applyFmt('bold')} title="굵게"><Bold size={15} /></Btn>
      <Btn onMouseDown={prevent} onClick={() => applyFmt('underline')} title="밑줄"><Underline size={15} /></Btn>
      <Btn onMouseDown={prevent} onClick={() => applyFmt('italic')} title="기울임꼴"><Italic size={15} /></Btn>
      <Btn onMouseDown={prevent} onClick={() => applyFmt('strike')} title="취소선"><Strikethrough size={15} /></Btn>
      <Divider />
      <Btn onMouseDown={prevent} onClick={() => toggle('text')} title="텍스트 색상" $active={panel === 'text'} style={{ fontWeight: 800, fontSize: 14 }}>A</Btn>
      <Btn onMouseDown={prevent} onClick={() => toggle('bg')} title="배경 색상 (하이라이트)" $active={panel === 'bg'}>
        <Highlighter size={15} />
      </Btn>
      <Btn onMouseDown={prevent} onClick={() => applyFmt('code')} title="인라인 코드"><Code2 size={15} /></Btn>
      <Divider />
      <Btn onMouseDown={prevent} onClick={() => toggle('turnInto')} title="블록 유형 변환" $active={panel === 'turnInto'}>
        <Repeat2 size={15} />
      </Btn>
      <Btn onMouseDown={prevent} onClick={() => toggle('link')} title="링크" $active={panel === 'link'}>
        <Link2 size={15} />
      </Btn>
      <Btn onMouseDown={prevent} onClick={() => toggle('align')} title="텍스트 정렬" $active={panel === 'align'}>
        <AlignLeft size={15} />
      </Btn>

      {panel === 'comment' && (
        <Panel onMouseDown={prevent} style={{ width: 240 }}>
          <CommentTextarea
            autoFocus
            rows={3}
            placeholder="댓글을 입력하세요…"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (isImeComposing(e)) return;
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitComment(); }
            }}
          />
          <PanelSubmitBtn onClick={submitComment}>댓글 남기기</PanelSubmitBtn>
        </Panel>
      )}

      {panel === 'size' && (
        <Panel onMouseDown={prevent}>
          {SIZE_OPTS.map((s) => (
            <PanelItem key={s.value} onClick={() => { applySize(s.value); setPanel(null); }}>{s.label}</PanelItem>
          ))}
        </Panel>
      )}

      {(panel === 'text' || panel === 'bg') && (
        <Panel onMouseDown={prevent}>
          {(panel === 'text' ? TEXT_COLORS : BG_COLORS).map((c) => (
            <PanelItem key={c.label} onClick={() => { applyColor(panel, c.value); setPanel(null); }}>
              <Swatch style={{ background: c.value || 'transparent', border: c.value ? 'none' : `1px solid ${docsTheme.borderStrong}` }} />
              {c.label}
            </PanelItem>
          ))}
        </Panel>
      )}

      {panel === 'turnInto' && (
        <Panel onMouseDown={prevent} style={{ maxHeight: 280, overflowY: 'auto' }}>
          {TURN_INTO.map((t) => (
            <PanelItem
              key={t.type}
              onClick={() => { if (fmtBar.blockId) turnInto(fmtBar.blockId, t.type); setPanel(null); }}
            >
              <span style={{ width: 18, textAlign: 'center' }}>{t.icon}</span>{t.label}
            </PanelItem>
          ))}
        </Panel>
      )}

      {panel === 'link' && (
        <Panel onMouseDown={prevent} style={{ width: 240 }}>
          <LinkInput
            autoFocus
            placeholder="https://…"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              if (isImeComposing(e)) return;
              if (e.key === 'Enter') { e.preventDefault(); submitLink(); }
            }}
          />
          <PanelSubmitBtn onClick={submitLink}>링크 적용</PanelSubmitBtn>
        </Panel>
      )}

      {panel === 'align' && (
        <Panel onMouseDown={prevent} style={{ flexDirection: 'row', width: 'auto' }}>
          <AlignBtn onClick={() => { if (fmtBar.blockId) setBlockAlign(fmtBar.blockId, 'left'); setPanel(null); }} title="왼쪽 정렬"><AlignLeft size={15} /></AlignBtn>
          <AlignBtn onClick={() => { if (fmtBar.blockId) setBlockAlign(fmtBar.blockId, 'center'); setPanel(null); }} title="가운데 정렬"><AlignCenter size={15} /></AlignBtn>
          <AlignBtn onClick={() => { if (fmtBar.blockId) setBlockAlign(fmtBar.blockId, 'right'); setPanel(null); }} title="오른쪽 정렬"><AlignRight size={15} /></AlignBtn>
        </Panel>
      )}
    </Bar>
  );
};

export default DocsFormatBar;

const Bar = styled.div`
  position: fixed;
  z-index: 64;
  display: flex;
  align-items: center;
  gap: 1px;
  background: ${docsTheme.surface};
  border: 1px solid ${docsTheme.border};
  border-radius: ${docsTheme.radius.ctl};
  padding: 4px;
  box-shadow: ${docsTheme.shadow};
`;

const Btn = styled.button<{ $active?: boolean }>`
  appearance: none;
  border: none;
  cursor: pointer;
  background: ${({ $active }) => ($active ? docsTheme.active : 'transparent')};
  color: ${docsTheme.text2};
  width: 30px;
  height: 28px;
  border-radius: 6px;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { background: ${docsTheme.hover}; color: ${docsTheme.text}; }
`;

const Divider = styled.div`
  width: 1px;
  height: 18px;
  background: ${docsTheme.border};
  margin: 0 3px;
`;

const Panel = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 65;
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: ${docsTheme.surface};
  border: 1px solid ${docsTheme.border};
  border-radius: ${docsTheme.radius.ctl};
  padding: 6px;
  box-shadow: ${docsTheme.shadow};
  min-width: 128px;
`;

const PanelItem = styled.button`
  appearance: none;
  border: none;
  cursor: pointer;
  background: transparent;
  color: ${docsTheme.text};
  font-family: inherit;
  font-size: 12.5px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  text-align: left;
  &:hover { background: ${docsTheme.hover}; }
`;

const AlignBtn = styled.button`
  appearance: none;
  border: none;
  cursor: pointer;
  background: transparent;
  color: ${docsTheme.text2};
  width: 30px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { background: ${docsTheme.hover}; color: ${docsTheme.text}; }
`;

const Swatch = styled.span`
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  border-radius: 4px;
`;

const CommentTextarea = styled.textarea`
  width: 100%;
  resize: none;
  font-family: inherit;
  font-size: 12.5px;
  color: ${docsTheme.text};
  background: ${docsTheme.surfaceSoft};
  border: 1px solid ${docsTheme.border};
  border-radius: 8px;
  padding: 8px;
  outline: none;
  &:focus { border-color: ${docsTheme.accent}; }
`;

const LinkInput = styled.input`
  width: 100%;
  font-family: inherit;
  font-size: 12.5px;
  color: ${docsTheme.text};
  background: ${docsTheme.surfaceSoft};
  border: 1px solid ${docsTheme.border};
  border-radius: 8px;
  padding: 7px 8px;
  outline: none;
  &:focus { border-color: ${docsTheme.accent}; }
`;

const PanelSubmitBtn = styled.button`
  appearance: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: #fff;
  background: ${docsTheme.accent};
  border-radius: 7px;
  padding: 7px 0;
  margin-top: 6px;
  &:hover { opacity: .92; }
`;
