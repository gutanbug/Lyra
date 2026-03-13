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

  // ── Mermaid 다이어그램 매크로 ──
  html = html.replace(
    /<ac:structured-macro[^>]*ac:name="mermaid-diagram"[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi,
    (_match, inner) => {
      const bodyMatch = inner.match(/<ac:plain-text-body[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/ac:plain-text-body>/i);
      const code = bodyMatch ? bodyMatch[1].trim() : '';
      if (!code) return '';
      return `<div class="confluence-mermaid" data-mermaid="${escapeHtml(code)}">${escapeHtml(code)}</div>`;
    }
  );

  // ── Jira 이슈 매크로 (ac:structured-macro name="jira") ──
  // <ac:structured-macro ac:name="jira">
  //   <ac:parameter ac:name="server">...</ac:parameter>
  //   <ac:parameter ac:name="key">PROJ-123</ac:parameter>
  // </ac:structured-macro>
  html = html.replace(
    /<ac:structured-macro[^>]*ac:name="jira"[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi,
    (_match, inner) => {
      const keyMatch = inner.match(/<ac:parameter[^>]*ac:name="key"[^>]*>([^<]*)<\/ac:parameter>/i);
      if (keyMatch) {
        const issueKey = keyMatch[1].trim();
        return `<a href="#" class="jira-inline-macro" data-jira-key="${escapeHtml(issueKey)}">${escapeHtml(issueKey)}</a>`;
      }
      // JQL 기반 jira 매크로 (이슈 목록)
      const jqlMatch = inner.match(/<ac:parameter[^>]*ac:name="jqlQuery"[^>]*>([^<]*)<\/ac:parameter>/i);
      if (jqlMatch) {
        return `<span class="jira-macro-placeholder">[Jira: ${escapeHtml(jqlMatch[1].trim())}]</span>`;
      }
      return '';
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
    /<ac:image([^>]*)>([\s\S]*?)<\/ac:image>/gi,
    (_match, outerAttrs, inner) => {
      // 외부 속성에서 width, height, alt 추출
      const widthMatch = outerAttrs.match(/ac:width="([^"]*)"/i);
      const heightMatch = outerAttrs.match(/ac:height="([^"]*)"/i);
      const altMatch = outerAttrs.match(/ac:alt="([^"]*)"/i);

      const extraAttrs: string[] = [];
      if (widthMatch) extraAttrs.push(`width="${escapeHtml(widthMatch[1])}"`);
      if (heightMatch) extraAttrs.push(`height="${escapeHtml(heightMatch[1])}"`);

      // ri:attachment (첨부 이미지)
      const attachMatch = inner.match(/ri:filename="([^"]*)"/i);
      if (attachMatch) {
        const filename = attachMatch[1];
        const alt = altMatch ? altMatch[1] : filename;
        return `<img class="confluence-attachment-img" data-attachment-filename="${escapeHtml(filename)}" alt="${escapeHtml(alt)}" ${extraAttrs.join(' ')} />`;
      }

      // ri:url (외부 URL 이미지)
      const urlMatch = inner.match(/ri:value="([^"]*)"/i);
      if (urlMatch) {
        const url = urlMatch[1];
        const alt = altMatch ? altMatch[1] : '';
        return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" ${extraAttrs.join(' ')} />`;
      }

      // 매칭 안 되는 경우 플레이스홀더
      return '<span class="adf-media-placeholder">[이미지]</span>';
    }
  );

  // ── ac:link → a 태그 ──
  html = html.replace(
    /<ac:link[^>]*>([\s\S]*?)<\/ac:link>/gi,
    (_match, inner) => {
      // 링크 표시 텍스트: plain-text-link-body 또는 link-body (리치 텍스트 별칭)
      const plainBody = inner.match(/<ac:plain-text-link-body[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/ac:plain-text-link-body>/i);
      const richBody = inner.match(/<ac:link-body[^>]*>([\s\S]*?)<\/ac:link-body>/i);
      const linkText = plainBody?.[1]?.trim() || richBody?.[1]?.trim() || '';

      // ri:page (내부 페이지 링크)
      const pageTag = inner.match(/<ri:page[^>]*\/?>/i);
      if (pageTag) {
        const titleMatch = pageTag[0].match(/ri:content-title="([^"]*)"/i);
        const spaceMatch = pageTag[0].match(/ri:space-key="([^"]*)"/i);
        const pageTitle = titleMatch ? titleMatch[1] : '';
        const spaceKey = spaceMatch ? spaceMatch[1] : '';
        const display = linkText || pageTitle;
        const dataAttrs = [
          pageTitle ? `data-confluence-page-title="${escapeHtml(pageTitle)}"` : '',
          spaceKey ? `data-confluence-space-key="${escapeHtml(spaceKey)}"` : '',
        ].filter(Boolean).join(' ');
        return `<a href="#" ${dataAttrs}>${display}</a>`;
      }

      // ri:url (외부 URL 링크)
      const urlTag = inner.match(/<ri:url[^>]*ri:value="([^"]*)"[^>]*\/?>/i);
      if (urlTag) {
        const url = urlTag[1];
        const display = linkText || url;
        return `<a href="${escapeHtml(url)}">${display}</a>`;
      }

      // ri:attachment (첨부파일 링크)
      const attTag = inner.match(/<ri:attachment[^>]*ri:filename="([^"]*)"[^>]*\/?>/i);
      if (attTag) {
        const filename = attTag[1];
        const display = linkText || filename;
        return `<a href="#" data-confluence-attachment="${escapeHtml(filename)}">${display}</a>`;
      }

      // fallback
      return linkText ? `<span>${linkText}</span>` : '';
    }
  );

  // ── Fabric ADF 인라인 카드 (Smart Link) ──
  // <fab:adf><![CDATA[{"type":"inlineCard","attrs":{"url":"https://..."}}]]></fab:adf>
  html = html.replace(
    /<fab:adf>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/fab:adf>/gi,
    (_match, inner) => {
      try {
        const parsed = JSON.parse(inner.trim());
        const url = parsed?.attrs?.url || '';
        if (url) {
          return `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`;
        }
      } catch { /* ignore parse error */ }
      return '';
    }
  );

  // ── 남은 ac: 태그 정리 (self-closing) ──
  html = html.replace(/<ac:[^>]*\/>/gi, '');
  // ── 남은 ac: 태그 정리 (open/close) ──
  html = html.replace(/<\/?ac:[^>]*>/gi, '');
  // ── ri: 태그 정리 ──
  html = html.replace(/<\/?ri:[^>]*\/?>/gi, '');
  // ── fab: 태그 정리 ──
  html = html.replace(/<\/?fab:[^>]*>/gi, '');

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
