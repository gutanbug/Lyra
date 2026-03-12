/**
 * Confluence Storage Format → 렌더링 가능한 HTML 변환
 *
 * Confluence는 <ac:structured-macro>, <ac:rich-text-body>, <ac:parameter> 등
 * Atlassian 전용 XML 태그를 사용한다. 이를 표준 HTML로 변환한다.
 */

/**
 * Confluence 저장 형식 HTML을 렌더링 가능한 HTML로 변환
 */
export function confluenceToHtml(raw: string): string {
  if (!raw) return '';

  let html = raw;

  // ── 코드 블록 (ac:structured-macro name="code") ──
  // <ac:structured-macro ac:name="code">
  //   <ac:parameter ac:name="language">javascript</ac:parameter>
  //   <ac:plain-text-body><![CDATA[코드 내용]]></ac:plain-text-body>
  // </ac:structured-macro>
  html = html.replace(
    /<ac:structured-macro[^>]*ac:name="code"[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi,
    (_match, inner) => {
      // 언어 추출
      const langMatch = inner.match(/<ac:parameter[^>]*ac:name="language"[^>]*>(.*?)<\/ac:parameter>/i);
      const lang = langMatch ? langMatch[1].trim() : '';
      const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : '';

      // 코드 본문 추출 (CDATA 또는 plain text)
      const bodyMatch = inner.match(/<ac:plain-text-body[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/ac:plain-text-body>/i);
      const code = bodyMatch ? bodyMatch[1] : '';

      return `<pre><code${langClass}>${escapeHtml(code)}</code></pre>`;
    }
  );

  // ── 정보/노트/경고 패널 (ac:structured-macro name="info|note|warning|tip") ──
  html = html.replace(
    /<ac:structured-macro[^>]*ac:name="(info|note|warning|tip)"[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi,
    (_match, type, inner) => {
      const bodyMatch = inner.match(/<ac:rich-text-body[^>]*>([\s\S]*?)<\/ac:rich-text-body>/i);
      const body = bodyMatch ? bodyMatch[1] : inner;
      const panelClass = type.toLowerCase();
      return `<div class="confluence-panel confluence-panel-${panelClass}">${body}</div>`;
    }
  );

  // ── 확장 매크로 (expand) ──
  html = html.replace(
    /<ac:structured-macro[^>]*ac:name="expand"[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi,
    (_match, inner) => {
      const titleMatch = inner.match(/<ac:parameter[^>]*ac:name="title"[^>]*>(.*?)<\/ac:parameter>/i);
      const title = titleMatch ? titleMatch[1].trim() : '펼치기';
      const bodyMatch = inner.match(/<ac:rich-text-body[^>]*>([\s\S]*?)<\/ac:rich-text-body>/i);
      const body = bodyMatch ? bodyMatch[1] : '';
      return `<details><summary>${escapeHtml(title)}</summary>${body}</details>`;
    }
  );

  // ── 목차 매크로 (toc) → 제거 ──
  html = html.replace(/<ac:structured-macro[^>]*ac:name="toc"[^>]*>[\s\S]*?<\/ac:structured-macro>/gi, '');

  // ── 나머지 structured-macro → 내부 rich-text-body만 추출 ──
  html = html.replace(
    /<ac:structured-macro[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi,
    (_match, inner) => {
      const bodyMatch = inner.match(/<ac:rich-text-body[^>]*>([\s\S]*?)<\/ac:rich-text-body>/i);
      return bodyMatch ? bodyMatch[1] : '';
    }
  );

  // ── ac:emoticon → 이모지 텍스트 ──
  html = html.replace(
    /<ac:emoticon[^>]*ac:name="([^"]*)"[^>]*\/?\s*>/gi,
    (_match, name) => {
      const emojiMap: Record<string, string> = {
        smile: '😊', sad: '😢', tick: '✅', cross: '❌',
        warning: '⚠️', information: 'ℹ️', plus: '➕', minus: '➖',
        question: '❓', 'thumbs-up': '👍', 'thumbs-down': '👎',
        'light-on': '💡', 'light-off': '💡', star_yellow: '⭐',
        heart: '❤️', laugh: '😂', wink: '😉',
      };
      return emojiMap[name] || '';
    }
  );

  // ── ac:image → img ──
  html = html.replace(
    /<ac:image[^>]*>[\s\S]*?<ri:attachment ri:filename="([^"]*)"[^>]*\/>[\s\S]*?<\/ac:image>/gi,
    (_match, filename) => `<img class="confluence-attachment-img" data-attachment-filename="${escapeHtml(filename)}" alt="${escapeHtml(filename)}" />`
  );

  // ── ac:link → a 태그 ──
  html = html.replace(
    /<ac:link[^>]*>[\s\S]*?<ri:page ri:content-title="([^"]*)"[^>]*\/>[\s\S]*?(?:<ac:plain-text-link-body[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/ac:plain-text-link-body>[\s\S]*?)?<\/ac:link>/gi,
    (_match, title, linkText) => {
      const display = linkText?.trim() || title;
      return `<a href="#">${escapeHtml(display)}</a>`;
    }
  );

  // ── 남은 ac: 태그 정리 (self-closing) ──
  html = html.replace(/<ac:[^>]*\/>/gi, '');
  // ── 남은 ac: 태그 정리 (open/close) ──
  html = html.replace(/<\/?ac:[^>]*>/gi, '');
  // ── ri: 태그 정리 ──
  html = html.replace(/<\/?ri:[^>]*\/?>/gi, '');

  return html;
}

/**
 * HTML 내 data-attachment-filename img 태그에 실제 src를 삽입
 */
export function resolveConfluenceAttachments(html: string, attachmentUrlMap: Record<string, string>): string {
  return html.replace(
    /<img\s+([^>]*data-attachment-filename="([^"]*)"[^>]*)\/?\s*>/g,
    (fullMatch, attrs, filename) => {
      const src = attachmentUrlMap[filename];
      if (src) {
        return `<img src="${src}" ${attrs} />`;
      }
      return `<span class="adf-media-placeholder">[첨부: ${filename}]</span>`;
    }
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
