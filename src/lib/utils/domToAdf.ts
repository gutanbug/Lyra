/**
 * contentEditable DOM → ADF (Atlassian Document Format) 변환
 * Jira 댓글, Confluence 본문 등에서 공통으로 사용
 */

/** ADF 마크 수집 (인라인 서식) */
function collectMarks(el: HTMLElement): unknown[] | undefined {
  const marks: unknown[] = [];
  let node: HTMLElement | null = el;
  while (node) {
    const tag = node.tagName;
    if (tag === 'B' || tag === 'STRONG') marks.push({ type: 'strong' });
    else if (tag === 'I' || tag === 'EM') marks.push({ type: 'em' });
    else if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') marks.push({ type: 'strike' });
    else if (tag === 'CODE' && node.parentElement?.tagName !== 'PRE') marks.push({ type: 'code' });
    else if (tag === 'U') marks.push({ type: 'underline' });
    else if (tag === 'SUB') marks.push({ type: 'subsup', attrs: { type: 'sub' } });
    else if (tag === 'SUP') marks.push({ type: 'subsup', attrs: { type: 'sup' } });
    else if (tag === 'A') {
      const href = node.getAttribute('href');
      if (href) marks.push({ type: 'link', attrs: { href } });
    }
    else if (tag === 'SPAN') {
      const color = node.style.color;
      if (color) marks.push({ type: 'textColor', attrs: { color } });
    }
    node = node.parentElement;
    if (node?.getAttribute('contenteditable') === 'true') break;
  }
  return marks.length > 0 ? marks : undefined;
}

/** 인라인 노드 수집 */
function inlineNodes(container: Node): unknown[] {
  const result: unknown[] = [];
  container.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || '';
      if (!text) return;
      const marks = collectMarks(child.parentElement!);
      const node: Record<string, unknown> = { type: 'text', text };
      if (marks) node.marks = marks;
      result.push(node);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;

      // 멘션 칩
      if (el.dataset.mentionName) {
        result.push({
          type: 'mention',
          attrs: {
            id: el.dataset.accountId || '',
            text: `@${el.dataset.mentionName}`,
            accessLevel: '',
          },
        });
        return;
      }

      // emoji
      if (el.dataset.emoji) {
        result.push({
          type: 'emoji',
          attrs: { shortName: el.dataset.emoji, text: el.textContent || '' },
        });
        return;
      }

      // 인라인 코드가 아닌 BR
      if (el.tagName === 'BR') return;

      // 인라인 서식 → 재귀
      result.push(...inlineNodes(el));
    }
  });
  return result;
}

/** 헤딩 레벨 추출 */
function headingLevel(tag: string): number | null {
  const m = /^H([1-6])$/.exec(tag);
  return m ? parseInt(m[1], 10) : null;
}

/** 블록 노드 처리 */
function processBlock(node: Node, blocks: unknown[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent || '').trim();
    if (!text) return;
    blocks.push({ type: 'paragraph', content: [{ type: 'text', text }] });
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  const tag = el.tagName;

  // 헤딩
  const hLevel = headingLevel(tag);
  if (hLevel) {
    const content = inlineNodes(el);
    if (content.length > 0) {
      blocks.push({ type: 'heading', attrs: { level: hLevel }, content });
    }
    return;
  }

  // 리스트
  if (tag === 'UL' || tag === 'OL') {
    const listType = tag === 'UL' ? 'bulletList' : 'orderedList';
    const items: unknown[] = [];
    el.querySelectorAll(':scope > li').forEach((li) => {
      const content = inlineNodes(li);
      if (content.length > 0) {
        items.push({ type: 'listItem', content: [{ type: 'paragraph', content }] });
      }
    });
    if (items.length > 0) blocks.push({ type: listType, content: items });
    return;
  }

  // blockquote
  if (tag === 'BLOCKQUOTE') {
    const innerBlocks: unknown[] = [];
    el.childNodes.forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName === 'P') {
        const content = inlineNodes(child);
        if (content.length > 0) innerBlocks.push({ type: 'paragraph', content });
      } else {
        const content = inlineNodes(el);
        if (content.length > 0 && innerBlocks.length === 0) {
          innerBlocks.push({ type: 'paragraph', content });
        }
      }
    });
    if (innerBlocks.length === 0) {
      const content = inlineNodes(el);
      if (content.length > 0) innerBlocks.push({ type: 'paragraph', content });
    }
    if (innerBlocks.length > 0) blocks.push({ type: 'blockquote', content: innerBlocks });
    return;
  }

  // 코드블록 (pre > code 또는 pre)
  if (tag === 'PRE') {
    const codeEl = el.querySelector('code');
    const text = (codeEl || el).textContent || '';
    const lang = codeEl?.className?.replace(/^language-/, '') || '';
    const attrs: Record<string, unknown> = {};
    if (lang) attrs.language = lang;
    blocks.push({
      type: 'codeBlock',
      attrs,
      content: text ? [{ type: 'text', text }] : [],
    });
    return;
  }

  // 수평선
  if (tag === 'HR') {
    blocks.push({ type: 'rule' });
    return;
  }

  // 테이블
  if (tag === 'TABLE') {
    const rows: unknown[] = [];
    el.querySelectorAll(':scope > thead > tr, :scope > tbody > tr, :scope > tr').forEach((tr) => {
      const cells: unknown[] = [];
      tr.querySelectorAll(':scope > td, :scope > th').forEach((td) => {
        const cellType = td.tagName === 'TH' ? 'tableHeader' : 'tableCell';
        const content = inlineNodes(td);
        cells.push({
          type: cellType,
          content: [{ type: 'paragraph', content: content.length > 0 ? content : [{ type: 'text', text: '' }] }],
        });
      });
      if (cells.length > 0) rows.push({ type: 'tableRow', content: cells });
    });
    if (rows.length > 0) blocks.push({ type: 'table', content: rows });
    return;
  }

  // 일반 블록 (div, p 등)
  const content = inlineNodes(el);
  if (content.length > 0) {
    blocks.push({ type: 'paragraph', content });
  }
}

/**
 * contentEditable DOM 루트를 ADF로 변환
 * @param root contentEditable 요소
 * @param mentionId 대댓글 시 선행 멘션 ID
 * @param mentionName 대댓글 시 선행 멘션 이름
 */
export function domToAdf(
  root: HTMLElement,
  mentionId?: string,
  mentionName?: string,
): unknown {
  const blocks: unknown[] = [];

  const blockTags = ['DIV', 'P', 'UL', 'OL', 'BLOCKQUOTE', 'PRE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'TABLE'];
  const hasBlockChildren = Array.from(root.childNodes).some(
    (n) => n.nodeType === Node.ELEMENT_NODE && blockTags.includes((n as HTMLElement).tagName)
  );

  if (hasBlockChildren) {
    root.childNodes.forEach((n) => processBlock(n, blocks));
  } else {
    const content = inlineNodes(root);
    if (content.length > 0) {
      blocks.push({ type: 'paragraph', content });
    }
  }

  if (blocks.length === 0) {
    blocks.push({ type: 'paragraph', content: [{ type: 'text', text: '' }] });
  }

  // reply mention 삽입
  if (mentionId && mentionName) {
    const first = blocks[0] as Record<string, unknown>;
    if (first.type === 'paragraph' && Array.isArray(first.content)) {
      first.content = [
        { type: 'mention', attrs: { id: mentionId, text: `@${mentionName}`, accessLevel: '' } },
        { type: 'text', text: ' ' },
        ...first.content,
      ];
    }
  }

  return { version: 1, type: 'doc', content: blocks };
}

export default domToAdf;
