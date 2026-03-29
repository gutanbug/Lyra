/**
 * @atlaskit/renderer 기반 ADF 렌더러 래퍼 컴포넌트
 * Jira description, comment 등의 ADF JSON을 렌더링
 *
 * - media 노드(type:'file') → external 이미지로 변환
 * - inlineCard/blockCard/embedCard → 리치 링크로 변환
 */
import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { IntlProvider } from 'react-intl';
import { ReactRenderer } from '@atlaskit/renderer';
import { jiraTheme } from 'lib/styles/jiraTheme';

type RendererAppearance = 'comment' | 'full-page' | 'full-width';

/** 링크 메타 정보 */
export interface LinkMeta {
  type: 'jira' | 'confluence';
  title: string;
  issueKey?: string;
  statusName?: string;
  statusCategory?: string;
  /** Jira statusCategory.key — 항상 'new' | 'indeterminate' | 'done' 중 하나 */
  statusCategoryKey?: string;
}

/** 첨부파일 메타 정보 (비이미지) */
export interface FileMeta {
  filename: string;
  mediaType: string;
  size: number;
  downloadUrl: string;
}

interface AdfRendererProps {
  /** ADF JSON document */
  document: unknown;
  /** 링크 클릭 핸들러 — 미지정 시 기본 동작 */
  onLinkClick?: (url: string) => void;
  /** appearance */
  appearance?: RendererAppearance;
  /** 추가 className */
  className?: string;
  /** media ID → data URL 매핑 (media 노드를 이미지로 변환) */
  mediaUrlMap?: Record<string, string>;
  /** URL → 링크 메타 정보 매핑 (inlineCard를 리치 링크로 표시) */
  linkMetaMap?: Record<string, LinkMeta>;
  /** media ID → 파일 메타 매핑 (비이미지 첨부파일 카드 표시) */
  fileMetaMap?: Record<string, FileMeta>;
  /** 파일 카드 클릭 핸들러 */
  onFileClick?: (fileMeta: FileMeta) => void;
}

/** ADF document 유효성 간단 체크 */
function isValidAdf(doc: unknown): boolean {
  if (!doc || typeof doc !== 'object') return false;
  const d = doc as Record<string, unknown>;
  return d.type === 'doc' && Array.isArray(d.content);
}

/** 링크 메타로 표시 텍스트 생성 */
function getLinkDisplayText(url: string, meta?: LinkMeta): string {
  if (!meta) return url;
  if (meta.type === 'jira' && meta.issueKey) {
    return meta.issueKey;
  }
  return meta.title;
}

/**
 * ADF 트리를 재귀 순회하며 전처리:
 * 1. mediaSingle/media 노드 → external 이미지 변환
 * 2. inlineCard/blockCard/embedCard → 텍스트 링크 변환 (메타 정보 반영)
 */
/** 파일 크기를 사람이 읽을 수 있는 형태로 변환 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 파일 확장자에 따른 아이콘 색상 */
function getFileIconColor(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return '#E5322D';
  if (['doc', 'docx'].includes(ext)) return '#2B579A';
  if (['xls', 'xlsx'].includes(ext)) return '#217346';
  if (['ppt', 'pptx'].includes(ext)) return '#D24726';
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) return '#F0A30A';
  return '#6B778C';
}

/** ADF 노드에서 텍스트를 추출 */
function adfNodeText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as Record<string, unknown>;
  if (typeof n.text === 'string') return n.text;
  const content = n.content as unknown[] | undefined;
  if (Array.isArray(content)) return content.map(adfNodeText).join('');
  return '';
}

/** ADF document에서 모든 heading을 수집 */
function collectHeadings(doc: unknown): { level: number; text: string; id: string }[] {
  const headings: { level: number; text: string; id: string }[] = [];
  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    if (n.type === 'heading') {
      const level = Number((n.attrs as Record<string, unknown>)?.level ?? 1);
      const text = adfNodeText(n).trim();
      if (text) {
        headings.push({ level, text, id: encodeURIComponent(text.replace(/\s+/g, '-')) });
      }
    }
    const content = n.content as unknown[] | undefined;
    if (Array.isArray(content)) content.forEach(walk);
  }
  walk(doc);
  return headings;
}

/** TOC extension 노드를 heading 기반 목차 bulletList ADF 노드로 변환 */
function buildTocNode(headings: { level: number; text: string; id: string }[]): unknown {
  if (headings.length === 0) return { type: 'paragraph', content: [{ type: 'text', text: '(목차 없음)' }] };

  const minLevel = Math.min(...headings.map((h) => h.level));

  const buildList = (items: { level: number; text: string; id: string }[], startIdx: number, baseLevel: number): { node: unknown; nextIdx: number } => {
    const listItems: unknown[] = [];
    let i = startIdx;

    while (i < items.length) {
      const h = items[i];
      if (h.level < baseLevel) break;

      if (h.level === baseLevel) {
        const listItem: Record<string, unknown> = {
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: [{
              type: 'text',
              text: h.text,
              marks: [{ type: 'link', attrs: { href: `#${h.id}` } }],
            }],
          }],
        };
        i++;

        // 하위 레벨이 있으면 중첩 리스트 생성
        if (i < items.length && items[i].level > baseLevel) {
          const sub = buildList(items, i, items[i].level);
          (listItem.content as unknown[]).push(sub.node);
          i = sub.nextIdx;
        }

        listItems.push(listItem);
      } else {
        // 현재 레벨보다 깊으면 중첩 리스트
        const sub = buildList(items, i, h.level);
        if (listItems.length > 0) {
          const lastItem = listItems[listItems.length - 1] as Record<string, unknown>;
          (lastItem.content as unknown[]).push(sub.node);
        } else {
          listItems.push({ type: 'listItem', content: [sub.node] });
        }
        i = sub.nextIdx;
      }
    }

    return { node: { type: 'bulletList', content: listItems }, nextIdx: i };
  };

  return buildList(headings, 0, minLevel).node;
}

function preprocessAdf(
  node: unknown,
  urlMap: Record<string, string>,
  linkMeta: Record<string, LinkMeta>,
  fileMeta: Record<string, FileMeta>,
  headings?: { level: number; text: string; id: string }[],
): unknown {
  if (!node || typeof node !== 'object') return node;
  const n = node as Record<string, unknown>;

  // 최상위 document에서 headings 수집 (한 번만)
  if (n.type === 'doc' && !headings) {
    headings = collectHeadings(n);
  }

  // extension / bodiedExtension 노드 — TOC 매크로 감지
  if (n.type === 'extension' || n.type === 'bodiedExtension') {
    const attrs = n.attrs as Record<string, unknown> | undefined;
    const extKey = String(attrs?.extensionKey || '').toLowerCase();
    if (extKey === 'toc' || extKey === 'toc-zone') {
      return buildTocNode(headings ?? []);
    }
    // 기타 매크로는 빈 단락으로 대체
    return { type: 'paragraph', content: [] };
  }

  // emoji 노드 → Unicode 텍스트 노드로 변환 (EmojiProvider 불필요)
  if (n.type === 'emoji') {
    const attrs = n.attrs as Record<string, unknown> | undefined;
    const text = String(attrs?.text || attrs?.shortName || '');
    if (text) {
      return { type: 'text', text };
    }
  }

  // media 노드를 이미지 또는 파일 카드로 변환하는 헬퍼
  // 주의: 원본 media 노드를 Atlaskit에 그대로 전달하면 Media API 로드를 시도해 무한 로딩됨
  const convertMedia = (c: Record<string, unknown>): { node: unknown; valid: boolean } => {
    const attrs = c.attrs as Record<string, unknown> | undefined;

    // 이미 external로 변환된 노드는 그대로 통과
    if (attrs?.type === 'external') return { node: c, valid: true };

    // type:file media 노드 처리
    if (typeof attrs?.id === 'string') {
      const mediaId = attrs.id;
      const url = urlMap[mediaId];
      if (url) {
        // 이미지 → external media로 변환
        return {
          node: { type: 'media', attrs: { type: 'external', url, width: attrs.width, height: attrs.height } },
          valid: true,
        };
      }
      // 비이미지 파일 메타가 있으면 파일 카드 텍스트 노드로 변환
      const fmeta = fileMeta[mediaId];
      if (fmeta) {
        const sizeStr = formatFileSize(fmeta.size);
        return {
          node: {
            type: 'paragraph',
            content: [{
              type: 'text',
              text: `📎 ${fmeta.filename} (${sizeStr})`,
              marks: [{ type: 'link', attrs: { href: `#__file__:${mediaId}`, __fileMeta: JSON.stringify(fmeta) } }],
            }],
          },
          valid: true,
        };
      }
    }

    // 미매칭 media 노드 → 빈 텍스트로 변환 (Atlaskit에 원본 전달 방지)
    return { node: { type: 'text', text: '' }, valid: false };
  };

  // mediaSingle/mediaGroup
  if (n.type === 'mediaSingle' || n.type === 'mediaGroup') {
    const children = n.content as unknown[] | undefined;
    if (Array.isArray(children)) {
      const converted: unknown[] = [];
      let hasValidMedia = false;
      for (const child of children) {
        const c = child as Record<string, unknown>;
        if (c.type === 'media') {
          const result = convertMedia(c);
          if (result.valid) {
            converted.push(result.node);
            hasValidMedia = true;
          }
        } else {
          converted.push(preprocessAdf(child, urlMap, linkMeta, fileMeta) as Record<string, unknown>);
          hasValidMedia = true;
        }
      }
      if (!hasValidMedia) {
        return { type: 'paragraph', content: [] };
      }
      return { ...n, content: converted };
    }
    return { type: 'paragraph', content: [] };
  }

  // 단독 media 노드
  if (n.type === 'media') {
    const result = convertMedia(n as Record<string, unknown>);
    return result.node;
  }

  // mediaInline 노드 (인라인 첨부파일 — Atlaskit에 전달하면 Media API 로드 시도)
  if (n.type === 'mediaInline') {
    const attrs = n.attrs as Record<string, unknown> | undefined;
    if (typeof attrs?.id === 'string') {
      const mediaId = attrs.id;
      const url = urlMap[mediaId];
      if (url) {
        // 이미지 → 인라인 이미지로 변환
        return {
          type: 'text',
          text: '',
          marks: [{ type: 'link', attrs: { href: url } }],
        };
      }
      const fmeta = fileMeta[mediaId];
      if (fmeta) {
        const sizeStr = formatFileSize(fmeta.size);
        return {
          type: 'text',
          text: `📎 ${fmeta.filename} (${sizeStr})`,
          marks: [{ type: 'link', attrs: { href: `#__file__:${mediaId}`, __fileMeta: JSON.stringify(fmeta) } }],
        };
      }
    }
    // 미매칭 mediaInline → 빈 텍스트 (Atlaskit Media API 로드 방지)
    return { type: 'text', text: '' };
  }

  // inlineCard → 텍스트 링크
  if (n.type === 'inlineCard') {
    const attrs = n.attrs as Record<string, unknown> | undefined;
    const url = attrs?.url as string | undefined;
    if (url) {
      const meta = linkMeta[url];
      const text = getLinkDisplayText(url, meta);
      return {
        type: 'text',
        text,
        marks: [{ type: 'link', attrs: { href: url, __linkMeta: meta ? JSON.stringify(meta) : undefined } }],
      };
    }
    return node;
  }

  // blockCard → paragraph 안의 링크
  if (n.type === 'blockCard') {
    const attrs = n.attrs as Record<string, unknown> | undefined;
    const url = attrs?.url as string | undefined;
    if (url) {
      const meta = linkMeta[url];
      const text = getLinkDisplayText(url, meta);
      return {
        type: 'paragraph',
        content: [{
          type: 'text',
          text,
          marks: [{ type: 'link', attrs: { href: url, __linkMeta: meta ? JSON.stringify(meta) : undefined } }],
        }],
      };
    }
    return node;
  }

  // embedCard → paragraph 안의 링크
  if (n.type === 'embedCard') {
    const attrs = n.attrs as Record<string, unknown> | undefined;
    const url = attrs?.url as string | undefined;
    if (url) {
      const meta = linkMeta[url];
      const text = getLinkDisplayText(url, meta);
      return {
        type: 'paragraph',
        content: [{
          type: 'text',
          text,
          marks: [{ type: 'link', attrs: { href: url, __linkMeta: meta ? JSON.stringify(meta) : undefined } }],
        }],
      };
    }
    return node;
  }

  // text 노드의 link mark — linkMeta에 있으면 표시 텍스트를 제목으로 교체
  if (n.type === 'text' && Array.isArray(n.marks)) {
    const marks = n.marks as Record<string, unknown>[];
    const linkMark = marks.find((m) => m.type === 'link');
    if (linkMark) {
      const attrs = linkMark.attrs as Record<string, unknown> | undefined;
      const href = attrs?.href as string | undefined;
      if (href) {
        const meta = linkMeta[href];
        if (meta) {
          const displayText = getLinkDisplayText(href, meta);
          const text = n.text as string;
          // URL이 텍스트와 동일하거나 텍스트가 URL 전체인 경우만 교체
          if (text === href || text.startsWith('http')) {
            return { ...n, text: displayText };
          }
        }
      }
    }
  }

  const content = n.content as unknown[] | undefined;
  if (Array.isArray(content)) {
    return {
      ...n,
      content: content.map((child) => preprocessAdf(child, urlMap, linkMeta, fileMeta, headings)),
    };
  }

  return node;
}

/**
 * statusCategoryKey 기반으로 뱃지 색상 결정.
 * Jira statusCategory.key는 항상 'new' | 'indeterminate' | 'done' 중 하나.
 * key가 없으면 colorName/name으로 폴백.
 */
function getStatusBadgeColor(meta: LinkMeta): { bg: string; color: string } {
  const key = (meta.statusCategoryKey || '').toLowerCase();
  // key 기반 — 가장 정확
  if (key === 'done') return { bg: '#E3FCEF', color: '#006644' };
  if (key === 'indeterminate') return { bg: '#DEEBFF', color: '#0747A6' };
  if (key === 'new') return { bg: '#F4F5F7', color: '#42526E' };
  // key가 없으면 statusCategory(name/colorName)로 폴백
  const s = ((meta.statusCategory || '') + ' ' + (meta.statusName || '')).toLowerCase();
  if (s.includes('done') || s.includes('완료') || s.includes('green')) return { bg: '#E3FCEF', color: '#006644' };
  if (s.includes('progress') || s.includes('진행') || s.includes('indeterminate') || s.includes('yellow') || s.includes('blue-gray')) return { bg: '#DEEBFF', color: '#0747A6' };
  if (s.includes('to do') || s.includes('해야') || s.includes('new')) return { bg: '#F4F5F7', color: '#42526E' };
  return { bg: '#F4F5F7', color: '#42526E' };
}

const AdfRenderer = ({ document: adfDoc, onLinkClick, appearance = 'comment', className, mediaUrlMap, linkMetaMap, fileMetaMap, onFileClick }: AdfRendererProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleLinkClick = useCallback(
    (event: React.SyntheticEvent, url?: string) => {
      if (!url) return;
      event.preventDefault();
      // 앵커 링크 (TOC 목차 등) — 페이지 내 heading으로 스크롤
      if (url.startsWith('#') && !url.startsWith('#__file__:')) {
        const id = decodeURIComponent(url.slice(1));
        const el = window.document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }
      // 파일 카드 클릭 처리
      if (url.startsWith('#__file__:') && onFileClick && fileMetaMap) {
        const mediaId = url.replace('#__file__:', '');
        const fmeta = fileMetaMap[mediaId];
        if (fmeta) {
          onFileClick(fmeta);
          return;
        }
      }
      onLinkClick?.(url);
    },
    [onLinkClick, onFileClick, fileMetaMap]
  );

  const processedDoc = useMemo(() => {
    if (!isValidAdf(adfDoc)) return null;
    return preprocessAdf(adfDoc, mediaUrlMap ?? {}, linkMetaMap ?? {}, fileMetaMap ?? {});
  }, [adfDoc, mediaUrlMap, linkMetaMap, fileMetaMap]);

  // DOM 후처리: 링크를 리치 카드로 변환
  // ReactRenderer의 비동기 DOM 업데이트 이후 실행되도록 약간의 지연 적용
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || !linkMetaMap || Object.keys(linkMetaMap).length === 0) return;

    const applyRichCards = () => {
      const links = el.querySelectorAll<HTMLAnchorElement>('a[href]');
      links.forEach((a) => {
        const href = a.getAttribute('href') || '';
        const meta = linkMetaMap[href];
        if (!meta) return;

        // 이미 처리된 카드는 statusCategory가 갱신되었을 수 있으므로 뱃지만 업데이트
        if (a.dataset.richCard === 'true') {
          if (meta.type === 'jira' && meta.statusName) {
            const badge = a.querySelector('.rich-link-status') as HTMLSpanElement | null;
            if (badge) {
              const colors = getStatusBadgeColor(meta);
              badge.style.background = colors.bg;
              badge.style.color = colors.color;
            }
          }
          return;
        }
        a.dataset.richCard = 'true';

        if (meta.type === 'jira' && meta.issueKey) {
          a.textContent = '';
          a.className = 'rich-link-card jira-card';

          const keySpan = document.createElement('span');
          keySpan.className = 'rich-link-key';
          keySpan.textContent = meta.issueKey;
          a.appendChild(keySpan);

          const titleSpan = document.createElement('span');
          titleSpan.className = 'rich-link-title';
          titleSpan.textContent = meta.title;
          a.appendChild(titleSpan);

          if (meta.statusName) {
            const badge = document.createElement('span');
            badge.className = 'rich-link-status';
            const colors = getStatusBadgeColor(meta);
            badge.style.background = colors.bg;
            badge.style.color = colors.color;
            badge.textContent = meta.statusName;
            a.appendChild(badge);
          }
        } else if (meta.type === 'confluence') {
          a.textContent = '';
          a.className = 'rich-link-card confluence-card';

          const icon = document.createElement('span');
          icon.className = 'rich-link-icon confluence-page-icon';
          icon.innerHTML = '<svg width="16" height="16" viewBox="0 0 32 32" fill="none"><path d="M3.8 22.6c-.4.7-.9 1.5-1.2 2-.3.5-.1 1.1.4 1.4l5.8 3.5c.5.3 1.1.1 1.4-.3.3-.5.7-1.1 1.2-1.9 2.2-3.5 4.4-3.1 8.4-1.2l5.9 2.8c.5.2 1.1 0 1.4-.5l2.9-6.2c.2-.5 0-1.1-.5-1.3-1.7-.8-5-2.4-8.1-3.8-6.7-3.2-13.4-3.2-17.6 5.5z" fill="#1868DB"/><path d="M28.2 9.4c.4-.7.9-1.5 1.2-2 .3-.5.1-1.1-.4-1.4L23.2 2.5c-.5-.3-1.1-.1-1.4.3-.3.5-.7 1.1-1.2 1.9-2.2 3.5-4.4 3.1-8.4 1.2L6.3 3.1c-.5-.2-1.1 0-1.4.5L2 9.8c-.2.5 0 1.1.5 1.3 1.7.8 5 2.4 8.1 3.8 6.7 3.2 13.4 3.2 17.6-5.5z" fill="#6DA2EE"/></svg>';
          a.appendChild(icon);

          const titleSpan = document.createElement('span');
          titleSpan.className = 'rich-link-title';
          titleSpan.textContent = meta.title;
          a.appendChild(titleSpan);
        }
      });
    };

    // 파일 카드 스타일 적용 (href 유지 — Atlaskit ReactRenderer의 link.onClick 핸들러에 위임)
    const applyFileCards = () => {
      const fileLinks = el.querySelectorAll<HTMLAnchorElement>('a[href^="#__file__:"]');
      fileLinks.forEach((a) => {
        if (a.dataset.fileCard === 'true') return;
        a.dataset.fileCard = 'true';

        const href = a.getAttribute('href') || '';
        const mediaId = href.replace('#__file__:', '');
        const fmeta = fileMetaMap?.[mediaId];
        if (!fmeta) return;

        const filename = fmeta.filename;
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const iconColor = getFileIconColor(filename);

        a.textContent = '';
        a.className = 'file-card';
        // href 유지 — Atlaskit의 eventHandlers.link.onClick이 이 값을 읽어 handleLinkClick에 전달

        // lucide-react FileText 아이콘 (stroke 기반)
        const icon = document.createElement('span');
        icon.className = 'file-card-icon';
        icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 13H8"/><path d="M16 17H8"/><path d="M16 13h-2"/></svg>`;
        a.appendChild(icon);

        const info = document.createElement('span');
        info.className = 'file-card-info';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'file-card-name';
        nameSpan.textContent = filename;
        info.appendChild(nameSpan);

        const detailSpan = document.createElement('span');
        detailSpan.className = 'file-card-detail';
        detailSpan.textContent = `${ext.toUpperCase()} · ${formatFileSize(fmeta.size)}`;
        info.appendChild(detailSpan);

        a.appendChild(info);
      });
    };

    // heading에 ID 주입 (TOC 앵커 점프용)
    const applyHeadingIds = () => {
      const headings = el.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6');
      headings.forEach((h) => {
        if (h.id) return;
        const text = (h.textContent || '').trim();
        if (text) {
          h.id = encodeURIComponent(text.replace(/\s+/g, '-'));
        }
      });
    };

    // 코드 블록 줄 번호 gutter inline style 보정
    const fixCodeBlockGutters = () => {
      const gutters = el.querySelectorAll<HTMLElement>('.line-number-gutter, td[class*="line-number"]');
      gutters.forEach((gutter) => {
        gutter.style.minWidth = '44px';
        gutter.style.width = '44px';
        gutter.style.paddingLeft = '8px';
        gutter.style.paddingRight = '10px';
        gutter.style.textAlign = 'right';
        gutter.style.background = '#EBECF0';
        gutter.style.borderRight = '1px solid #dfe1e6';
        gutter.style.color = '#6b778c';
        gutter.style.boxSizing = 'border-box';
      });
    };

    // 즉시 실행 + ReactRenderer의 비동기 DOM 업데이트 대응
    applyRichCards();
    applyFileCards();
    applyHeadingIds();
    fixCodeBlockGutters();
    const timer = setTimeout(() => { applyRichCards(); applyFileCards(); applyHeadingIds(); fixCodeBlockGutters(); }, 100);
    return () => clearTimeout(timer);
  }, [processedDoc, linkMetaMap, fileMetaMap]);

  if (!processedDoc) {
    return null;
  }

  return (
    <IntlProvider locale="ko" onError={() => {}}>
      <Wrapper className={className} ref={wrapperRef}>
        <ReactRenderer
          document={processedDoc as any}
          appearance={appearance}
          eventHandlers={{
            link: {
              onClick: handleLinkClick,
            },
          }}
        />
      </Wrapper>
    </IntlProvider>
  );
};

const Wrapper = styled.div`
  font-size: 0.875rem;
  color: ${jiraTheme.text.primary};
  line-height: 1.6;

  /* mediaSingle 이미지가 컨테이너를 넘치지 않도록 제한 */
  .rich-media-item {
    max-width: 100% !important;
    width: auto !important;
  }
  .rich-media-item img,
  .rich-media-item video {
    max-width: 100% !important;
    height: auto !important;
    object-fit: contain;
  }

  /* 기본 atlaskit 스타일 위에 프로젝트 테마 덮어쓰기 */
  a {
    color: ${jiraTheme.primary};
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }

  /* 리치 링크 카드 공통 */
  a.rich-link-card {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    border: 1px solid ${jiraTheme.border};
    background: ${jiraTheme.bg.subtle};
    text-decoration: none !important;
    font-size: 0.8125rem;
    line-height: 1.5;
    vertical-align: baseline;
    transition: background 0.12s, border-color 0.12s;

    &:hover {
      background: ${jiraTheme.bg.hover};
      border-color: ${jiraTheme.primary};
      text-decoration: none !important;
    }
  }

  /* Jira 이슈 카드 */
  .rich-link-key {
    font-weight: 600;
    color: ${jiraTheme.primary};
    white-space: nowrap;
  }
  .rich-link-title {
    color: ${jiraTheme.text.primary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 300px;
  }
  .rich-link-status {
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 3px;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  /* Confluence 카드 */
  .rich-link-icon {
    font-size: 0.875rem;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
  }
  .rich-link-icon.confluence-page-icon svg {
    display: block;
  }
  a.confluence-card .rich-link-title {
    max-width: 400px;
  }

  /* 파일 첨부 카드 */
  a.file-card {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    border: 1px solid ${jiraTheme.border};
    background: ${jiraTheme.bg.subtle};
    text-decoration: none !important;
    font-size: 0.8125rem;
    line-height: 1.4;
    transition: background 0.12s, border-color 0.12s;
    max-width: 400px;

    &:hover {
      background: ${jiraTheme.bg.hover};
      border-color: ${jiraTheme.primary};
    }
  }
  .file-card-icon {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
  }
  .file-card-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .file-card-name {
    color: ${jiraTheme.text.primary};
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .file-card-detail {
    color: ${jiraTheme.text.muted};
    font-size: 0.6875rem;
  }

  /* 테이블 셀 오버플로 방지 */
  th, td {
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  /* Atlaskit 인라인 코드 — 자체 스타일을 오버라이드하여 회색 배경 통일 */
  span[data-renderer-mark="code"],
  code {
    background: ${jiraTheme.bg.subtle} !important;
    border: 1px solid ${jiraTheme.border} !important;
    border-radius: 3px !important;
    padding: 0.125rem 0.375rem !important;
    font-size: 0.8125rem !important;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace !important;
    color: ${jiraTheme.text.primary} !important;
    box-decoration-break: clone;
  }

  pre code {
    background: none !important;
    border: none !important;
    padding: 0 !important;
    color: inherit !important;
    font-size: inherit !important;
  }

  /* 코드 블록 — Jira 스타일 (회색 배경) */
  .code-block {
    background: ${jiraTheme.bg.subtle} !important;
    border: 1px solid ${jiraTheme.border} !important;
    border-radius: 3px !important;
    margin: 0.5rem 0;
    overflow: hidden;
    font-size: 0.8125rem;
    line-height: 1.5;
  }

  .code-block .code-content code,
  .code-block code {
    background: none !important;
    border: none !important;
    padding: 0 !important;
    color: inherit !important;
    font-size: inherit !important;
  }

  .code-block .line-number-gutter,
  .code-block td.line-number-gutter,
  [class*="line-number-gutter"] {
    color: #6b778c !important;
    background: #EBECF0 !important;
    border-right: 1px solid #dfe1e6 !important;
    min-width: 44px !important;
    width: 44px !important;
    padding: 0 10px 0 8px !important;
    text-align: right !important;
    user-select: none;
    box-sizing: border-box !important;
  }

  .code-block .line-number-gutter span,
  [class*="line-number-gutter"] span {
    color: #6b778c !important;
  }

  /* 블록인용 */
  blockquote {
    margin: 0.5rem 0;
    padding: 0.5rem 1rem;
    border-left: 3px solid ${jiraTheme.primary};
    background: ${jiraTheme.primaryLight};
    color: ${jiraTheme.text.secondary};
  }

  /* 테이블 */
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5rem 0;
  }
  th, td {
    border: 1px solid ${jiraTheme.border};
    padding: 0.5rem 0.625rem;
    font-size: 0.8125rem;
    text-align: left;
  }
  th {
    background: ${jiraTheme.bg.subtle};
    font-weight: 600;
  }

  /* 패널 */
  .ak-renderer-extension, [data-panel-type] {
    margin: 0.5rem 0;
    padding: 0.75rem 1rem;
    border-radius: 3px;
    border-left: 3px solid ${jiraTheme.primary};
    background: ${jiraTheme.primaryLight};
  }

  /* 이미지 */
  img {
    max-width: 100%;
    border-radius: 3px;
  }

  /* 멘션 — Atlaskit 내부 스타일을 오버라이드 */
  [data-mention-id],
  [data-mention-id] > span {
    color: ${jiraTheme.primary} !important;
    background: #deebff !important;
    padding: 2px 6px !important;
    border-radius: 4px !important;
    font-weight: 500;
    border: none !important;
    box-shadow: none !important;
  }

  /* 상태 로젠지 */
  [data-node-type="status"] span {
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 3px;
    text-transform: uppercase;
  }

  /* 구분선 */
  hr {
    border: none;
    border-top: 1px solid ${jiraTheme.border};
    margin: 1rem 0;
  }
`;

export default AdfRenderer;
