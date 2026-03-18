import React, { useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import styled from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';

/* ════════════════════════════════════════
   execCommand 기반 서식 헬퍼
   ════════════════════════════════════════ */

function exec(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

/** 인라인 코드 토글 */
function toggleInlineCode() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const parent = range.commonAncestorContainer.parentElement;
  if (parent?.tagName === 'CODE' && parent.parentElement?.tagName !== 'PRE') {
    const text = parent.textContent || '';
    const textNode = document.createTextNode(text);
    parent.parentNode?.replaceChild(textNode, parent);
    const newRange = document.createRange();
    newRange.selectNodeContents(textNode);
    sel.removeAllRanges();
    sel.addRange(newRange);
  } else if (!sel.isCollapsed) {
    const code = document.createElement('code');
    code.appendChild(range.extractContents());
    range.insertNode(code);
    const newRange = document.createRange();
    newRange.selectNodeContents(code);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }
}

/** 코드블록 삽입 */
function insertCodeBlock(editorEl: HTMLElement) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);

  // 이미 pre 안에 있으면 해제
  let preParent: HTMLElement | null = range.commonAncestorContainer as HTMLElement;
  while (preParent && preParent !== editorEl) {
    if (preParent.tagName === 'PRE') {
      const text = preParent.textContent || '';
      const p = document.createElement('div');
      p.textContent = text || '\u00A0';
      preParent.parentNode?.replaceChild(p, preParent);
      return;
    }
    preParent = preParent.parentElement;
  }

  const pre = document.createElement('pre');
  const code = document.createElement('code');
  const selected = range.toString();
  code.textContent = selected || '\u00A0';
  pre.appendChild(code);

  range.deleteContents();
  range.insertNode(pre);

  // 코드블록 뒤에 빈 줄 추가
  const after = document.createElement('div');
  after.innerHTML = '<br>';
  pre.parentNode?.insertBefore(after, pre.nextSibling);

  const newRange = document.createRange();
  newRange.selectNodeContents(code);
  newRange.collapse(false);
  sel.removeAllRanges();
  sel.addRange(newRange);
}

/** 현재 커서 위치의 서식 상태 감지 */
function queryFormats(): Set<string> {
  const active = new Set<string>();
  if (document.queryCommandState('bold')) active.add('bold');
  if (document.queryCommandState('italic')) active.add('italic');
  if (document.queryCommandState('underline')) active.add('underline');
  if (document.queryCommandState('strikeThrough')) active.add('strike');
  if (document.queryCommandState('insertUnorderedList')) active.add('ul');
  if (document.queryCommandState('insertOrderedList')) active.add('ol');

  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    let node: HTMLElement | null = sel.getRangeAt(0).startContainer as HTMLElement;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    while (node) {
      const tag = node.tagName;
      if (tag === 'CODE' && node.parentElement?.tagName !== 'PRE') active.add('code');
      if (tag === 'PRE') active.add('codeblock');
      if (tag === 'BLOCKQUOTE') active.add('blockquote');
      if (tag === 'A') active.add('link');
      if (/^H[1-6]$/.test(tag)) active.add('heading');
      if (node.getAttribute('contenteditable') === 'true') break;
      node = node.parentElement;
    }
  }
  return active;
}

/** 수평선 삽입 */
function insertHorizontalRule() {
  exec('insertHorizontalRule');
}

/** 헤딩 토글 */
function toggleHeading(level: number) {
  const tag = `h${level}`;
  exec('formatBlock', `<${tag}>`);
}

/** 인용 토글 */
function toggleBlockquote() {
  exec('formatBlock', '<blockquote>');
}

/* ════════════════════════════════════════
   마크다운 실시간 변환
   ════════════════════════════════════════ */

/** 현재 커서가 속한 텍스트 노드와 그 블록 컨테이너를 반환 */
function getCursorContext(editorEl: HTMLElement) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return null;
  const textNode = range.startContainer;
  if (textNode.nodeType !== Node.TEXT_NODE) return null;

  // 에디터 내부인지 확인
  let block: HTMLElement | null = textNode.parentElement;
  while (block && block !== editorEl && !['DIV', 'P'].includes(block.tagName)) {
    block = block.parentElement;
  }
  // 이미 서식이 적용된 블록(pre, blockquote, h1~h6, li)이면 무시
  let check: HTMLElement | null = textNode.parentElement;
  while (check && check !== editorEl) {
    const t = check.tagName;
    if (['PRE', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(t)) return null;
    check = check.parentElement;
  }

  return { textNode, offset: range.startOffset, block: block || editorEl, range };
}

/**
 * 블록 수준 마크다운 패턴 (줄 시작에서 Space 입력 시 변환)
 * - `# ` ~ `#### ` → 제목
 * - `> ` → 인용
 * - `- ` / `* ` → 글머리 기호 목록
 * - `1. ` → 번호 매기기 목록
 * - `--- ` → 구분선
 */
function tryBlockMarkdown(editorEl: HTMLElement): boolean {
  const ctx = getCursorContext(editorEl);
  if (!ctx) return false;
  const { textNode, offset } = ctx;
  const text = textNode.textContent || '';
  const lineText = text.slice(0, offset);

  // 제목: # ~ ####
  const headingMatch = /^(#{1,4}) $/.exec(lineText);
  if (headingMatch) {
    const level = headingMatch[1].length;
    // 텍스트 노드에서 마크다운 제거
    textNode.textContent = text.slice(offset);
    exec('formatBlock', `<h${level}>`);
    return true;
  }

  // 인용: >
  if (lineText === '> ') {
    textNode.textContent = text.slice(offset);
    exec('formatBlock', '<blockquote>');
    return true;
  }

  // 글머리 기호 목록: - 또는 *
  if (lineText === '- ' || lineText === '* ') {
    textNode.textContent = text.slice(offset);
    exec('insertUnorderedList');
    return true;
  }

  // 번호 매기기 목록: 1.
  if (lineText === '1. ') {
    textNode.textContent = text.slice(offset);
    exec('insertOrderedList');
    return true;
  }

  // 구분선: ---
  if (lineText === '--- ') {
    const block = ctx.block;
    textNode.textContent = text.slice(offset);
    if (!textNode.textContent) {
      block.parentNode?.removeChild(block);
    }
    insertHorizontalRule();
    return true;
  }

  return false;
}

/**
 * 인라인 마크다운 패턴 (닫는 마커 입력 시 변환)
 * - `**text**` → 굵게
 * - `*text*` / `_text_` → 기울임
 * - `~~text~~` → 취소선
 * - `` `text` `` → 인라인 코드
 */
function tryInlineMarkdown(editorEl: HTMLElement): boolean {
  const ctx = getCursorContext(editorEl);
  if (!ctx) return false;
  const { textNode, offset } = ctx;
  const text = textNode.textContent || '';
  const before = text.slice(0, offset);

  const patterns: { regex: RegExp; tag: string; marker: number }[] = [
    { regex: /\*\*(.+)\*\*$/, tag: 'strong', marker: 2 },
    { regex: /(?<!\*)\*(?!\*)(.+)\*$/, tag: 'em', marker: 1 },
    { regex: /_(.+)_$/, tag: 'em', marker: 1 },
    { regex: /~~(.+)~~$/, tag: 's', marker: 2 },
    { regex: /`(.+)`$/, tag: 'code', marker: 1 },
  ];

  for (const { regex, tag } of patterns) {
    const m = regex.exec(before);
    if (!m) continue;

    const content = m[1];
    const matchStart = m.index;
    const matchEnd = matchStart + m[0].length;

    // 텍스트 분할
    const beforeText = text.slice(0, matchStart);
    const afterText = text.slice(matchEnd) + (text.slice(offset) !== text.slice(matchEnd) ? '' : '');

    const parent = textNode.parentNode!;
    const beforeNode = document.createTextNode(beforeText);
    const el = document.createElement(tag);
    el.textContent = content;
    const afterNode = document.createTextNode(afterText.length > 0 ? afterText : '\u00A0');

    parent.insertBefore(beforeNode, textNode);
    parent.insertBefore(el, textNode);
    parent.insertBefore(afterNode, textNode);
    parent.removeChild(textNode);

    // 커서를 서식 뒤로 이동
    const sel = window.getSelection()!;
    const newRange = document.createRange();
    newRange.setStart(afterNode, afterNode.textContent === '\u00A0' ? 1 : 0);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    return true;
  }

  return false;
}

/**
 * 코드블록 마크다운: ``` 입력 후 Enter 시 변환
 */
function tryCodeBlockMarkdown(editorEl: HTMLElement): boolean {
  const ctx = getCursorContext(editorEl);
  if (!ctx) return false;
  const { textNode } = ctx;
  const text = (textNode.textContent || '').trim();

  // ``` 또는 ```language
  const m = /^```(\w*)$/.exec(text);
  if (!m) return false;

  const lang = m[1];
  const block = ctx.block;

  // pre > code 생성
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  if (lang) code.className = `language-${lang}`;
  code.textContent = '\u00A0';
  pre.appendChild(code);

  // 기존 블록 교체
  block.parentNode?.replaceChild(pre, block);

  // 코드블록 뒤에 빈 줄 추가
  const after = document.createElement('div');
  after.innerHTML = '<br>';
  pre.parentNode?.insertBefore(after, pre.nextSibling);

  // 커서를 code 안으로
  const sel = window.getSelection()!;
  const newRange = document.createRange();
  newRange.setStart(code, 0);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);

  return true;
}

/* ════════════════════════════════════════
   컴포넌트
   ════════════════════════════════════════ */

export interface RichTextEditorHandle {
  getElement: () => HTMLDivElement | null;
  clear: () => void;
  focus: () => void;
  getPlainText: () => string;
}

interface RichTextEditorProps {
  placeholder?: string;
  onInput?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onBlur?: () => void;
  onSubmit?: () => void;
  minHeight?: number;
  maxHeight?: number;
  /** 멘션 기능 비활성화 (Confluence 등) */
  disableMention?: boolean;
}

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  ({ placeholder, onInput, onKeyDown, onBlur, onSubmit, minHeight = 42, maxHeight = 300 }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [showHeadingMenu, setShowHeadingMenu] = React.useState(false);
    const headingRef = useRef<HTMLDivElement>(null);
    const linkGroupRef = useRef<HTMLDivElement>(null);
    const [activeFormats, setActiveFormats] = React.useState<Set<string>>(new Set());
    const [showLinkInput, setShowLinkInput] = React.useState(false);
    const [linkUrl, setLinkUrl] = React.useState('');
    const [linkText, setLinkText] = React.useState('');
    const savedSelRef = useRef<Range | null>(null);
    const linkInputRef = useRef<HTMLInputElement>(null);

    /** 서식 상태 업데이트 */
    const updateFormats = useCallback(() => {
      setActiveFormats(queryFormats());
    }, []);

    // 외부 노출 API
    useImperativeHandle(ref, () => ({
      getElement: () => editorRef.current,
      clear: () => {
        if (editorRef.current) editorRef.current.textContent = '';
      },
      focus: () => editorRef.current?.focus(),
      getPlainText: () => {
        const el = editorRef.current;
        if (!el) return '';
        let text = '';
        const walk = (node: Node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent || '';
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const elem = node as HTMLElement;
            if (elem.dataset.mentionName) {
              text += `@${elem.dataset.mentionName}`;
              return;
            }
            if (elem.tagName === 'BR') { text += '\n'; return; }
            if (elem.tagName === 'DIV' && elem !== el && elem.previousSibling) text += '\n';
            elem.childNodes.forEach(walk);
          }
        };
        el.childNodes.forEach(walk);
        return text;
      },
    }));

    // 클릭 외부 → 헤딩 메뉴 / 링크 팝오버 닫기
    React.useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (headingRef.current && !headingRef.current.contains(e.target as Node)) {
          setShowHeadingMenu(false);
        }
        if (linkGroupRef.current && !linkGroupRef.current.contains(e.target as Node)) {
          setShowLinkInput(false);
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);

    // selectionchange로 커서 이동 시 서식 상태 갱신
    React.useEffect(() => {
      const handler = () => {
        if (editorRef.current?.contains(document.activeElement) ||
            editorRef.current === document.activeElement) {
          updateFormats();
        }
      };
      document.addEventListener('selectionchange', handler);
      return () => document.removeEventListener('selectionchange', handler);
    }, [updateFormats]);

    /** input 이벤트에서 인라인 마크다운 변환 시도 */
    const handleInput = useCallback(() => {
      if (editorRef.current) {
        tryInlineMarkdown(editorRef.current);
      }
      updateFormats();
      onInput?.();
    }, [onInput, updateFormats]);

    /** 링크 입력 UI 토글 */
    const openLinkInput = useCallback(() => {
      if (showLinkInput) {
        setShowLinkInput(false);
        editorRef.current?.focus();
        return;
      }
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        savedSelRef.current = sel.getRangeAt(0).cloneRange();
        setLinkText(sel.toString());
      }
      setLinkUrl('');
      setShowLinkInput(true);
      setTimeout(() => linkInputRef.current?.focus(), 50);
    }, [showLinkInput]);

    /** 링크 삽입 실행 */
    const handleLinkSubmit = useCallback(() => {
      const url = linkUrl.trim();
      if (!url) { setShowLinkInput(false); return; }

      const el = editorRef.current;
      if (!el) return;

      // 저장된 selection 복원
      const sel = window.getSelection();
      if (sel && savedSelRef.current) {
        sel.removeAllRanges();
        sel.addRange(savedSelRef.current);
      }

      el.focus();

      if (linkText) {
        // 선택된 텍스트가 있으면 createLink
        exec('createLink', url);
      } else {
        // 없으면 링크 노드 직접 삽입
        const range = sel?.getRangeAt(0);
        if (range) {
          const a = document.createElement('a');
          a.href = url;
          a.textContent = url;
          a.target = '_blank';
          range.insertNode(a);
          range.setStartAfter(a);
          range.collapse(true);
          if (sel) { sel.removeAllRanges(); sel.addRange(range); }
        }
      }

      setShowLinkInput(false);
      setLinkUrl('');
      setLinkText('');
      savedSelRef.current = null;
      onInput?.();
    }, [linkUrl, linkText, onInput]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        const mod = e.metaKey || e.ctrlKey;

        // 서식 단축키
        if (mod && e.key === 'b') { e.preventDefault(); exec('bold'); return; }
        if (mod && e.key === 'i') { e.preventDefault(); exec('italic'); return; }
        if (mod && e.key === 'u') { e.preventDefault(); exec('underline'); return; }
        if (mod && e.shiftKey && e.key === 's') { e.preventDefault(); exec('strikeThrough'); return; }
        if (mod && e.key === 'e') { e.preventDefault(); toggleInlineCode(); return; }
        if (mod && e.shiftKey && e.key === 'c') {
          e.preventDefault();
          if (editorRef.current) insertCodeBlock(editorRef.current);
          return;
        }
        if (mod && e.key === 'k') { e.preventDefault(); openLinkInput(); return; }

        // 전송
        if (mod && e.key === 'Enter') {
          e.preventDefault();
          onSubmit?.();
          return;
        }

        // Space: 블록 마크다운 변환 (# , > , - , * , 1. , --- )
        if (e.key === ' ' && editorRef.current) {
          // setTimeout으로 space가 삽입된 후 체크
          setTimeout(() => {
            if (editorRef.current && tryBlockMarkdown(editorRef.current)) {
              onInput?.();
            }
          }, 0);
        }

        // Enter: 코드블록 마크다운 변환 (```)
        if (e.key === 'Enter' && !mod && editorRef.current) {
          if (tryCodeBlockMarkdown(editorRef.current)) {
            e.preventDefault();
            onInput?.();
            return;
          }
        }

        // Tab 키: 코드블록 내에서 들여쓰기
        if (e.key === 'Tab') {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            let node: Node | null = sel.getRangeAt(0).startContainer;
            while (node && node !== editorRef.current) {
              if ((node as HTMLElement).tagName === 'PRE') {
                e.preventDefault();
                exec('insertText', '  ');
                return;
              }
              node = node.parentNode;
            }
          }
        }

        onKeyDown?.(e);
      },
      [onKeyDown, onSubmit, onInput, openLinkInput]
    );

    const tb = (
      handler: (e: React.MouseEvent) => void,
    ) => (e: React.MouseEvent) => {
      e.preventDefault();
      handler(e);
      editorRef.current?.focus();
    };

    return (
      <Wrapper>
        <Toolbar>
          {/* 인라인 서식 */}
          <ToolGroup>
            <TBtn $active={activeFormats.has('bold')} title="굵게 (⌘B)" onMouseDown={tb(() => exec('bold'))}><strong>B</strong></TBtn>
            <TBtn $active={activeFormats.has('italic')} title="기울임 (⌘I)" onMouseDown={tb(() => exec('italic'))}><em>I</em></TBtn>
            <TBtn $active={activeFormats.has('underline')} title="밑줄 (⌘U)" onMouseDown={tb(() => exec('underline'))}><u>U</u></TBtn>
            <TBtn $active={activeFormats.has('strike')} title="취소선 (⌘⇧S)" onMouseDown={tb(() => exec('strikeThrough'))}><s>S</s></TBtn>
          </ToolGroup>

          <Sep />

          {/* 코드 */}
          <ToolGroup>
            <TBtn $active={activeFormats.has('code')} title="인라인 코드 (⌘E)" onMouseDown={tb(toggleInlineCode)}>
              <CodeIcon>&lt;/&gt;</CodeIcon>
            </TBtn>
            <TBtn $active={activeFormats.has('codeblock')} title="코드블록 (⌘⇧C)" onMouseDown={tb(() => {
              if (editorRef.current) insertCodeBlock(editorRef.current);
            })}>
              <CodeIcon>{'{ }'}</CodeIcon>
            </TBtn>
          </ToolGroup>

          <Sep />

          {/* 헤딩 */}
          <ToolGroup ref={headingRef} style={{ position: 'relative' }}>
            <TBtn $active={activeFormats.has('heading')} title="제목" onMouseDown={(e) => { e.preventDefault(); setShowHeadingMenu(!showHeadingMenu); }}>
              H
            </TBtn>
            {showHeadingMenu && (
              <HeadingMenu>
                {[1, 2, 3, 4].map((l) => (
                  <HeadingMenuItem key={l} onMouseDown={tb(() => { toggleHeading(l); setShowHeadingMenu(false); })}>
                    <span style={{ fontSize: `${1.2 - l * 0.1}rem`, fontWeight: 600 }}>제목 {l}</span>
                  </HeadingMenuItem>
                ))}
                <HeadingMenuItem onMouseDown={tb(() => { exec('formatBlock', '<div>'); setShowHeadingMenu(false); })}>
                  <span style={{ fontSize: '0.8125rem' }}>본문</span>
                </HeadingMenuItem>
              </HeadingMenu>
            )}
          </ToolGroup>

          <Sep />

          {/* 블록 */}
          <ToolGroup>
            <TBtn $active={activeFormats.has('ul')} title="글머리 기호 목록" onMouseDown={tb(() => exec('insertUnorderedList'))}>•</TBtn>
            <TBtn $active={activeFormats.has('ol')} title="번호 매기기 목록" onMouseDown={tb(() => exec('insertOrderedList'))}>1.</TBtn>
            <TBtn $active={activeFormats.has('blockquote')} title="인용 블록" onMouseDown={tb(toggleBlockquote)}>"</TBtn>
          </ToolGroup>

          <Sep />

          {/* 기타 */}
          <ToolGroup ref={linkGroupRef} style={{ position: 'relative' }}>
            <TBtn $active={activeFormats.has('link')} title="링크 삽입 (⌘K)" onMouseDown={(e) => { e.preventDefault(); openLinkInput(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
            </TBtn>
            <TBtn title="구분선" onMouseDown={tb(insertHorizontalRule)}>—</TBtn>
            {showLinkInput && (
              <LinkPopover>
                <LinkField
                  ref={linkInputRef}
                  type="url"
                  placeholder="URL을 입력하세요"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleLinkSubmit(); }
                    if (e.key === 'Escape') { setShowLinkInput(false); editorRef.current?.focus(); }
                  }}
                />
                <LinkSubmitBtn onMouseDown={(e) => { e.preventDefault(); handleLinkSubmit(); }}>삽입</LinkSubmitBtn>
              </LinkPopover>
            )}
          </ToolGroup>
        </Toolbar>

        <Editor
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder || '내용을 입력하세요...'}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          $minH={minHeight}
          $maxH={maxHeight}
        />
      </Wrapper>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';
export default RichTextEditor;

/* ════════════════════════════════════════
   Styled Components
   ════════════════════════════════════════ */

const Wrapper = styled.div`
  border: 1px solid ${jiraTheme.border};
  border-radius: 8px;
  overflow: hidden;
  background: ${jiraTheme.bg.default};
  transition: border-color 0.15s;

  &:focus-within {
    border-color: ${jiraTheme.primary};
  }
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  border-bottom: 1px solid ${jiraTheme.border};
  background: ${jiraTheme.bg.subtle};
  flex-wrap: wrap;
`;

const ToolGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 1px;
`;

const Sep = styled.div`
  width: 1px;
  height: 16px;
  background: ${jiraTheme.border};
  margin: 0 4px;
`;

const TBtn = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: ${({ $active }) => ($active ? jiraTheme.bg.hover : 'transparent')};
  color: ${({ $active }) => ($active ? jiraTheme.primary : jiraTheme.text.secondary)};
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;

  &:hover {
    background: ${jiraTheme.bg.hover};
    color: ${({ $active }) => ($active ? jiraTheme.primary : jiraTheme.text.primary)};
  }
`;

const LinkPopover = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 20;
  margin-top: 4px;
  display: flex;
  gap: 4px;
  padding: 6px;
  background: ${jiraTheme.bg.default};
  border: 1px solid ${jiraTheme.border};
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  min-width: 260px;
`;

const LinkField = styled.input`
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
  border: 1px solid ${jiraTheme.border};
  border-radius: 4px;
  font-size: 0.75rem;
  outline: none;
  background: ${jiraTheme.bg.default};
  color: ${jiraTheme.text.primary};

  &:focus {
    border-color: ${jiraTheme.primary};
  }
`;

const LinkSubmitBtn = styled.button`
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  background: ${jiraTheme.primary};
  color: #fff;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    opacity: 0.9;
  }
`;

const CodeIcon = styled.span`
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 0.625rem;
`;

const HeadingMenu = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 10;
  margin-top: 2px;
  background: ${jiraTheme.bg.default};
  border: 1px solid ${jiraTheme.border};
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 120px;
  padding: 4px;
`;

const HeadingMenuItem = styled.button`
  display: block;
  width: 100%;
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  background: none;
  text-align: left;
  cursor: pointer;
  color: ${jiraTheme.text.primary};

  &:hover {
    background: ${jiraTheme.bg.hover};
  }
`;

const Editor = styled.div<{ $minH: number; $maxH: number }>`
  width: 100%;
  min-height: ${({ $minH }) => $minH}px;
  max-height: ${({ $maxH }) => $maxH}px;
  padding: 0.625rem 0.75rem;
  font-size: 0.8125rem;
  font-family: inherit;
  line-height: 1.6;
  box-sizing: border-box;
  overflow-y: auto;
  outline: none;
  color: ${jiraTheme.text.primary};
  word-wrap: break-word;
  white-space: pre-wrap;
  overflow-wrap: break-word;

  &:empty::before {
    content: attr(data-placeholder);
    color: ${jiraTheme.text.muted};
    pointer-events: none;
  }

  /* 멘션 칩 */
  .mention-chip {
    display: inline-block;
    color: ${jiraTheme.primary};
    background: #deebff;
    padding: 1px 5px;
    border-radius: 12px;
    font-size: 0.8125rem;
    line-height: 1.5;
    user-select: all;
  }

  /* 인라인 코드 */
  code {
    background: ${jiraTheme.bg.subtle};
    border: 1px solid ${jiraTheme.border};
    border-radius: 3px;
    padding: 1px 4px;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 0.75rem;
    color: #e45649;
  }

  /* 코드블록 */
  pre {
    background: #282c34;
    color: #abb2bf;
    border-radius: 6px;
    padding: 12px 16px;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 0.75rem;
    line-height: 1.5;
    overflow-x: auto;
    margin: 8px 0;
    white-space: pre;

    code {
      background: none;
      border: none;
      padding: 0;
      color: inherit;
      font-size: inherit;
    }
  }

  /* 헤딩 */
  h1 { font-size: 1.5rem; font-weight: 600; margin: 12px 0 4px; }
  h2 { font-size: 1.25rem; font-weight: 600; margin: 10px 0 4px; }
  h3 { font-size: 1.1rem; font-weight: 600; margin: 8px 0 4px; }
  h4 { font-size: 1rem; font-weight: 600; margin: 6px 0 4px; }

  /* 리스트 */
  ul, ol {
    padding-left: 1.5rem;
    margin: 4px 0;
  }
  li {
    margin: 2px 0;
  }

  /* 인용 */
  blockquote {
    border-left: 3px solid ${jiraTheme.primary};
    padding: 4px 12px;
    margin: 8px 0;
    color: ${jiraTheme.text.secondary};
    background: ${jiraTheme.bg.subtle};
    border-radius: 0 4px 4px 0;
  }

  /* 수평선 */
  hr {
    border: none;
    border-top: 1px solid ${jiraTheme.border};
    margin: 12px 0;
  }

  /* 링크 */
  a {
    color: ${jiraTheme.primary};
    text-decoration: underline;
    cursor: pointer;
  }

  /* 테이블 */
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 8px 0;
  }
  th, td {
    border: 1px solid ${jiraTheme.border};
    padding: 6px 10px;
    font-size: 0.8125rem;
    text-align: left;
  }
  th {
    background: ${jiraTheme.bg.subtle};
    font-weight: 600;
  }

  b, strong { font-weight: 600; }
  i, em { font-style: italic; }
  s, strike, del { text-decoration: line-through; }
  u { text-decoration: underline; }
`;
