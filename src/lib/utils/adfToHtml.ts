/**
 * Atlassian Document Format (ADF) JSON → HTML 변환
 * Jira description, comment 등의 서식을 유지하여 렌더링
 */

interface ADFNode {
  type?: string;
  content?: ADFNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: ADFMark[];
}

interface ADFMark {
  type: string;
  attrs?: Record<string, unknown>;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMarks(text: string, marks?: ADFMark[]): string {
  if (!marks || marks.length === 0) return text;

  let result = text;
  for (const mark of marks) {
    switch (mark.type) {
      case 'strong':
        result = `<strong>${result}</strong>`;
        break;
      case 'em':
        result = `<em>${result}</em>`;
        break;
      case 'code':
        result = `<code>${result}</code>`;
        break;
      case 'strike':
        result = `<s>${result}</s>`;
        break;
      case 'underline':
        result = `<u>${result}</u>`;
        break;
      case 'link': {
        const href = escapeHtml(String(mark.attrs?.href || ''));
        result = `<a href="${href}" target="_blank" rel="noopener noreferrer">${result}</a>`;
        break;
      }
      case 'textColor': {
        const color = escapeHtml(String(mark.attrs?.color || ''));
        result = `<span style="color:${color}">${result}</span>`;
        break;
      }
      case 'subsup': {
        const tag = mark.attrs?.type === 'sup' ? 'sup' : 'sub';
        result = `<${tag}>${result}</${tag}>`;
        break;
      }
    }
  }
  return result;
}

function renderNode(node: ADFNode): string {
  if (!node) return '';

  // 텍스트 노드
  if (node.type === 'text' && typeof node.text === 'string') {
    return renderMarks(escapeHtml(node.text), node.marks);
  }

  const children = node.content?.map(renderNode).join('') ?? '';

  switch (node.type) {
    case 'doc':
      return children;

    case 'paragraph':
      return `<p>${children}</p>`;

    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level) || 1, 1), 6);
      return `<h${level}>${children}</h${level}>`;
    }

    case 'bulletList':
      return `<ul>${children}</ul>`;

    case 'orderedList': {
      const start = node.attrs?.order ? ` start="${node.attrs.order}"` : '';
      return `<ol${start}>${children}</ol>`;
    }

    case 'listItem':
      return `<li>${children}</li>`;

    case 'codeBlock': {
      const lang = node.attrs?.language ? ` class="language-${escapeHtml(String(node.attrs.language))}"` : '';
      return `<pre><code${lang}>${children}</code></pre>`;
    }

    case 'blockquote':
      return `<blockquote>${children}</blockquote>`;

    case 'rule':
      return '<hr />';

    case 'hardBreak':
      return '<br />';

    case 'table':
      return `<table>${children}</table>`;

    case 'tableRow':
      return `<tr>${children}</tr>`;

    case 'tableHeader':
      return `<th>${children}</th>`;

    case 'tableCell':
      return `<td>${children}</td>`;

    case 'panel': {
      const panelType = String(node.attrs?.panelType || 'info');
      return `<div class="adf-panel adf-panel-${escapeHtml(panelType)}">${children}</div>`;
    }

    case 'expand': {
      const title = node.attrs?.title ? escapeHtml(String(node.attrs.title)) : '펼치기';
      return `<details><summary>${title}</summary>${children}</details>`;
    }

    case 'status': {
      const statusText = escapeHtml(String(node.attrs?.text || ''));
      const statusColor = escapeHtml(String(node.attrs?.color || 'neutral'));
      return `<span class="adf-status adf-status-${statusColor}">${statusText}</span>`;
    }

    case 'mention': {
      const mentionText = escapeHtml(String(node.attrs?.text || ''));
      return `<span class="adf-mention">${mentionText}</span>`;
    }

    case 'emoji': {
      const shortName = String(node.attrs?.shortName || '');
      const fallback = String(node.attrs?.text || shortName);
      return fallback;
    }

    case 'inlineCard': {
      const url = String(node.attrs?.url || '');
      if (!url) return '';
      const display = url.replace(/^https?:\/\//, '').split('/').slice(0, 3).join('/');
      return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" data-inline-card="true">${escapeHtml(display)}</a>`;
    }

    case 'mediaSingle':
    case 'mediaGroup':
      return `<div class="adf-media">${children}</div>`;

    case 'media': {
      const mediaType = String(node.attrs?.type || '');
      if (mediaType === 'external') {
        const src = escapeHtml(String(node.attrs?.url || ''));
        return `<img src="${src}" alt="" class="adf-image" />`;
      }
      // file 타입: media ID를 data 속성으로 포함하여 이후 실제 이미지로 대체 가능
      const mediaId = String(node.attrs?.id || '');
      if (mediaId) {
        return `<img class="adf-image adf-attachment-img" data-media-id="${escapeHtml(mediaId)}" alt="첨부 이미지" />`;
      }
      return '<span class="adf-media-placeholder">[첨부 파일]</span>';
    }

    case 'date': {
      const timestamp = node.attrs?.timestamp;
      if (timestamp) {
        try {
          const d = new Date(Number(timestamp));
          return `<time>${d.toLocaleDateString('ko-KR')}</time>`;
        } catch { /* fallthrough */ }
      }
      return '';
    }

    default:
      return children;
  }
}

/**
 * ADF JSON을 HTML 문자열로 변환
 */
export function adfToHtml(adf: unknown): string {
  if (!adf) return '';
  if (typeof adf === 'string') return `<p>${escapeHtml(adf)}</p>`;

  const doc = adf as ADFNode;
  return renderNode(doc);
}
