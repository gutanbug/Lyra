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
function preprocessAdf(
  node: unknown,
  urlMap: Record<string, string>,
  linkMeta: Record<string, LinkMeta>,
): unknown {
  if (!node || typeof node !== 'object') return node;
  const n = node as Record<string, unknown>;

  // mediaSingle/mediaGroup
  if (n.type === 'mediaSingle' || n.type === 'mediaGroup') {
    const children = n.content as unknown[] | undefined;
    if (Array.isArray(children)) {
      const converted: unknown[] = [];
      let hasValidMedia = false;
      for (const child of children) {
        const c = child as Record<string, unknown>;
        if (c.type === 'media') {
          const attrs = c.attrs as Record<string, unknown> | undefined;
          if (attrs && attrs.type === 'file' && typeof attrs.id === 'string') {
            const url = urlMap[attrs.id];
            if (url) {
              converted.push({
                type: 'media',
                attrs: { type: 'external', url, width: attrs.width, height: attrs.height },
              });
              hasValidMedia = true;
            }
          } else {
            converted.push(child);
            hasValidMedia = true;
          }
        } else {
          converted.push(preprocessAdf(child, urlMap, linkMeta));
          hasValidMedia = true;
        }
      }
      if (!hasValidMedia) {
        return { type: 'paragraph', content: [] };
      }
      return { ...n, content: converted };
    }
    return node;
  }

  // 단독 media 노드
  if (n.type === 'media') {
    const attrs = n.attrs as Record<string, unknown> | undefined;
    if (attrs && attrs.type === 'file' && typeof attrs.id === 'string') {
      const url = urlMap[attrs.id];
      if (url) {
        return { type: 'media', attrs: { type: 'external', url, width: attrs.width, height: attrs.height } };
      }
      return { type: 'text', text: '' };
    }
    return node;
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

  const content = n.content as unknown[] | undefined;
  if (Array.isArray(content)) {
    return {
      ...n,
      content: content.map((child) => preprocessAdf(child, urlMap, linkMeta)),
    };
  }

  return node;
}

/** 상태 카테고리별 색상 */
function getStatusBadgeColor(category: string): { bg: string; color: string } {
  switch (category.toLowerCase()) {
    case 'done': case '완료': return { bg: '#E3FCEF', color: '#006644' };
    case 'in progress': case '진행 중': return { bg: '#DEEBFF', color: '#0747A6' };
    case 'to do': case '새 작업': case 'new': return { bg: '#F4F5F7', color: '#42526E' };
    default: return { bg: '#F4F5F7', color: '#42526E' };
  }
}

const AdfRenderer = ({ document: adfDoc, onLinkClick, appearance = 'comment', className, mediaUrlMap, linkMetaMap }: AdfRendererProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleLinkClick = useCallback(
    (event: React.SyntheticEvent, url?: string) => {
      if (!url) return;
      event.preventDefault();
      onLinkClick?.(url);
    },
    [onLinkClick]
  );

  const processedDoc = useMemo(() => {
    if (!isValidAdf(adfDoc)) return null;
    return preprocessAdf(adfDoc, mediaUrlMap ?? {}, linkMetaMap ?? {});
  }, [adfDoc, mediaUrlMap, linkMetaMap]);

  // DOM 후처리: 링크를 리치 카드로 변환
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || !linkMetaMap || Object.keys(linkMetaMap).length === 0) return;

    const links = el.querySelectorAll<HTMLAnchorElement>('a[href]');
    links.forEach((a) => {
      const href = a.getAttribute('href') || '';
      const meta = linkMetaMap[href];
      if (!meta || a.dataset.richCard) return;
      a.dataset.richCard = 'true';

      if (meta.type === 'jira' && meta.issueKey) {
        // Jira 이슈 카드: [키] 제목 [상태 뱃지]
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
          const colors = getStatusBadgeColor(meta.statusCategory || '');
          badge.style.background = colors.bg;
          badge.style.color = colors.color;
          badge.textContent = meta.statusName;
          a.appendChild(badge);
        }
      } else if (meta.type === 'confluence') {
        // Confluence 페이지 카드: [📄] 제목
        a.textContent = '';
        a.className = 'rich-link-card confluence-card';

        const icon = document.createElement('span');
        icon.className = 'rich-link-icon';
        icon.textContent = '\uD83D\uDCC4'; // 📄
        a.appendChild(icon);

        const titleSpan = document.createElement('span');
        titleSpan.className = 'rich-link-title';
        titleSpan.textContent = meta.title;
        a.appendChild(titleSpan);
      }
    });
  }, [processedDoc, linkMetaMap]);

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
  overflow: hidden;

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
  }
  a.confluence-card .rich-link-title {
    max-width: 400px;
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
