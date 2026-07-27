const EDITOR_SELECTOR = '[data-docs-text-editor="true"]';
const SCOPE_SELECTOR = '[data-docs-editor-scope]';

const getSelectionOffset = (editor: HTMLElement) => {
  const selection = window.getSelection();
  if (!selection?.isCollapsed || !selection.anchorNode || !editor.contains(selection.anchorNode)) return null;
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.setEnd(selection.anchorNode, selection.anchorOffset);
  return range.toString().length;
};

const getTextNodes = (editor: HTMLElement) => {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      return parent?.closest('[contenteditable="false"]')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  return nodes;
};

const getTextLength = (editor: HTMLElement) => (
  getTextNodes(editor).reduce((sum, node) => sum + (node.textContent?.length || 0), 0)
);

const makeCaretRange = (editor: HTMLElement, requestedOffset: number) => {
  const range = document.createRange();
  const nodes = getTextNodes(editor);
  let offset = Math.max(0, requestedOffset);
  for (const node of nodes) {
    const length = node.textContent?.length || 0;
    if (offset <= length) {
      range.setStart(node, offset);
      range.collapse(true);
      return range;
    }
    offset -= length;
  }
  range.selectNodeContents(editor);
  range.collapse(false);
  return range;
};

const getRangeRect = (range: Range) => {
  const rects = typeof range.getClientRects === 'function' ? range.getClientRects() : null;
  if (rects?.length) return rects[0];
  return typeof range.getBoundingClientRect === 'function' ? range.getBoundingClientRect() : null;
};

const setCaret = (editor: HTMLElement, offset: number) => {
  editor.focus();
  const selection = window.getSelection();
  if (!selection) return;
  const range = makeCaretRange(editor, offset);
  selection.removeAllRanges();
  selection.addRange(range);
};

const isVisibleEditor = (editor: HTMLElement) => {
  if (editor.closest('[aria-hidden="true"]')) return false;
  const style = window.getComputedStyle(editor);
  return style.display !== 'none' && style.visibility !== 'hidden';
};

const getEditors = (editor: HTMLElement) => {
  const scope = editor.closest<HTMLElement>(SCOPE_SELECTOR);
  if (!scope) return [];
  return Array.from(scope.querySelectorAll<HTMLElement>(EDITOR_SELECTOR)).filter(isVisibleEditor);
};

const isOnBoundaryLine = (editor: HTMLElement, direction: 'up' | 'down', offset: number) => {
  const caretRect = getRangeRect(makeCaretRange(editor, offset));
  const editorRect = editor.getBoundingClientRect();
  if (!caretRect || !editorRect.height || (!caretRect.top && !caretRect.bottom)) {
    return direction === 'up' ? offset === 0 : offset === getTextLength(editor);
  }
  const computedLineHeight = Number.parseFloat(window.getComputedStyle(editor).lineHeight);
  const lineHeight = Number.isFinite(computedLineHeight) ? computedLineHeight : Math.max(16, caretRect.height);
  return direction === 'up'
    ? caretRect.top <= editorRect.top + lineHeight * 0.75
    : caretRect.bottom >= editorRect.bottom - lineHeight * 0.75;
};

const closestVisualOffset = (
  editor: HTMLElement,
  direction: 'up' | 'down',
  preferredOffset: number,
  preferredX: number | null,
) => {
  const length = getTextLength(editor);
  if (preferredX === null || length === 0) return Math.min(preferredOffset, length);

  // 한 블록이 매우 긴 경우에도 방향키 한 번에 과도한 레이아웃 측정이 일어나지 않게 표본 수를 제한한다.
  const step = Math.max(1, Math.ceil(length / 600));
  const candidates: { offset: number; left: number; top: number }[] = [];
  for (let offset = 0; offset <= length; offset += step) {
    const rect = getRangeRect(makeCaretRange(editor, offset));
    if (rect && (rect.left || rect.top || rect.width || rect.height)) {
      candidates.push({ offset, left: rect.left, top: rect.top });
    }
  }
  if (length % step !== 0) {
    const rect = getRangeRect(makeCaretRange(editor, length));
    if (rect) candidates.push({ offset: length, left: rect.left, top: rect.top });
  }
  if (!candidates.length) return Math.min(preferredOffset, length);

  const edgeTop = direction === 'down'
    ? Math.min(...candidates.map((candidate) => candidate.top))
    : Math.max(...candidates.map((candidate) => candidate.top));
  const lineHeight = Number.parseFloat(window.getComputedStyle(editor).lineHeight) || 20;
  const edgeCandidates = candidates.filter((candidate) => Math.abs(candidate.top - edgeTop) < lineHeight / 2);
  return edgeCandidates.reduce((best, candidate) => (
    Math.abs(candidate.left - preferredX) < Math.abs(best.left - preferredX) ? candidate : best
  )).offset;
};

/**
 * contentEditable 사이의 커서를 Notion/AppFlowy처럼 연결한다.
 * 같은 편집기 안에서는 브라우저의 기본 이동을 유지하고, 경계에서만 인접 편집기로 이동한다.
 */
export const moveDocsCaretByArrow = (
  event: React.KeyboardEvent<HTMLElement>,
  editor: HTMLElement,
) => {
  if (isImeComposing(event)) return false;
  if (event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return false;
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return false;

  const offset = getSelectionOffset(editor);
  if (offset === null) return false;
  const length = getTextLength(editor);
  const editors = getEditors(editor);
  const index = editors.indexOf(editor);
  if (index < 0) return false;

  let targetIndex = index;
  let targetOffset = offset;
  let verticalDirection: 'up' | 'down' | null = null;

  if (event.key === 'ArrowLeft' && offset === 0) {
    targetIndex = index - 1;
    targetOffset = Number.POSITIVE_INFINITY;
  } else if (event.key === 'ArrowRight' && offset === length) {
    targetIndex = index + 1;
    targetOffset = 0;
  } else if (event.key === 'ArrowUp' && isOnBoundaryLine(editor, 'up', offset)) {
    targetIndex = index - 1;
    verticalDirection = 'up';
  } else if (event.key === 'ArrowDown' && isOnBoundaryLine(editor, 'down', offset)) {
    targetIndex = index + 1;
    verticalDirection = 'down';
  } else {
    return false;
  }

  const target = editors[targetIndex];
  if (!target) return false;
  event.preventDefault();

  if (verticalDirection) {
    const currentRect = getRangeRect(makeCaretRange(editor, offset));
    targetOffset = closestVisualOffset(
      target,
      verticalDirection,
      offset,
      currentRect ? currentRect.left : null,
    );
  } else if (!Number.isFinite(targetOffset)) {
    targetOffset = getTextLength(target);
  }

  setCaret(target, targetOffset);
  target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  return true;
};
import { isImeComposing } from 'lib/utils/keyboard';
