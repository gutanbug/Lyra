/**
 * Atlassian Document Format (ADF) JSON을 텍스트로 변환
 * Jira description 필드가 ADF 형식일 때 사용
 */
interface ADFNode {
  type?: string;
  content?: ADFNode[];
  text?: string;
  attrs?: Record<string, unknown>;
}

function extractTextFromNode(node: ADFNode): string {
  if (!node) return '';

  if (node.text) return node.text;

  const content: ADFNode[] | undefined = node.content;
  const joinContent = (nodes: ADFNode[] | undefined, sep = ''): string =>
    nodes?.map(extractTextFromNode).join(sep) ?? '';

  switch (node.type) {
    case 'paragraph':
    case 'heading':
      return joinContent(content) + '\n';
    case 'bulletList':
    case 'orderedList':
      return content?.map((c) => '• ' + extractTextFromNode(c)).join('\n') ?? '';
    case 'listItem':
      return joinContent(content) + '\n';
    case 'codeBlock':
      return joinContent(content) + '\n';
    case 'blockquote':
      return '> ' + joinContent(content) + '\n';
    case 'rule':
      return '---\n';
    case 'table':
      return (
        content
          ?.map((row) =>
            (row.content as ADFNode[] | undefined)
              ?.map((cell) => extractTextFromNode(cell))
              .join('\t') ?? ''
          )
          .join('\n') ?? ''
      );
    case 'tableRow':
    case 'tableHeader':
    case 'tableCell':
      return joinContent(content);
    default:
      return joinContent(content);
  }
}

export function adfToText(adf: unknown): string {
  if (!adf) return '';
  if (typeof adf === 'string') return adf;

  const doc = adf as ADFNode;
  if (doc.type === 'doc' && Array.isArray(doc.content)) {
    return doc.content.map(extractTextFromNode).join('').trim();
  }

  return extractTextFromNode(doc).trim();
}
