import type { DocsBlockType } from 'types/docs';

/** 슬래시(/) 명령 목록 — Source: Lyra Docs.dc.html CMDS */
export interface DocsCmdItem {
  id: string;
  icon: string;
  label: string;
  desc: string;
}
export interface DocsCmdGroup {
  cat: string;
  items: DocsCmdItem[];
}

export const DOCS_CMDS: DocsCmdGroup[] = [
  { cat: '기본', items: [
    { id: 'text', icon: '¶', label: '텍스트', desc: '일반 문단' },
    { id: 'h1', icon: 'H₁', label: '제목 1', desc: '큰 섹션 제목' },
    { id: 'h2', icon: 'H₂', label: '제목 2', desc: '중간 제목' },
    { id: 'h3', icon: 'H₃', label: '제목 3', desc: '작은 제목' },
  ] },
  { cat: '목록', items: [
    { id: 'bullet', icon: '•', label: '글머리 기호 목록', desc: '순서 없는 목록' },
    { id: 'number', icon: '1.', label: '번호 목록', desc: '순서 있는 목록' },
    { id: 'todo', icon: '☑', label: '할 일 목록', desc: '체크박스' },
    { id: 'toggle', icon: '▸', label: '토글 목록', desc: '접을 수 있는 블록' },
  ] },
  { cat: '블록', items: [
    { id: 'quote', icon: '❝', label: '인용', desc: '인용문' },
    { id: 'callout', icon: '💡', label: '콜아웃', desc: '강조 상자' },
    { id: 'code', icon: '</>', label: '코드', desc: '코드 스니펫' },
    { id: 'math', icon: '∑', label: '수식', desc: '수학 공식 (LaTeX)' },
    { id: 'divider', icon: '—', label: '구분선', desc: '수평선' },
    { id: 'table', icon: '田', label: '표', desc: '간단한 표' },
    { id: 'outline', icon: '≡', label: '목차', desc: '제목 자동 목차' },
  ] },
  { cat: '미디어', items: [
    { id: 'image', icon: '🖼️', label: '이미지', desc: '이미지 업로드' },
    { id: 'video', icon: '🎬', label: '동영상', desc: '동영상 임베드' },
    { id: 'file', icon: '📎', label: '파일', desc: '파일 첨부' },
    { id: 'bookmark', icon: '🔖', label: '웹 북마크', desc: '링크 미리보기' },
  ] },
  { cat: '페이지', items: [
    { id: 'subpage', icon: '📄', label: '하위 페이지', desc: '문서 안에 새 페이지' },
    { id: 'pagemention', icon: '🔗', label: '페이지 멘션', desc: '다른 페이지 링크' },
    { id: 'date', icon: '📅', label: '날짜', desc: '인라인 날짜' },
  ] },
  { cat: '연동', items: [
    { id: 'jira-card', icon: 'J', label: 'Jira 카드', desc: '이슈 카드 임베드' },
    { id: 'jira-inline', icon: '@', label: 'Jira 인라인 멘션', desc: '문장 속 이슈 칩' },
    { id: 'jira-link', icon: '🔖', label: 'Jira 링크', desc: '북마크 형태' },
  ] },
];

export const flattenCmds = (): DocsCmdItem[] => DOCS_CMDS.flatMap((g) => g.items);

export const filteredFlatCmds = (query: string): DocsCmdItem[] => filterCmds(query).flatMap((g) => g.items);

export const filterCmds = (query: string): DocsCmdGroup[] => {
  const q = (query || '').toLowerCase().trim();
  return DOCS_CMDS.map((g) => ({
    cat: g.cat,
    items: g.items.filter((it) => !q || it.label.toLowerCase().includes(q) || it.id.includes(q)),
  })).filter((g) => g.items.length > 0);
};

const MARKDOWN_MAP: Record<string, DocsBlockType> = {
  '# ': 'h1', '## ': 'h2', '### ': 'h3', '- ': 'bullet', '* ': 'bullet',
  '1. ': 'number', '[] ': 'todo', '[ ] ': 'todo', '> ': 'quote', '``` ': 'code', '"" ': 'quote',
};

/** 마크다운 단축 입력 감지 — Source: matchMarkdown() */
export const matchMarkdown = (t: string): { type: DocsBlockType } | null => {
  if (MARKDOWN_MAP[t]) return { type: MARKDOWN_MAP[t] };
  if (t === '```') return { type: 'code' };
  if (t === '---' || t === '***') return { type: 'divider' };
  return null;
};

/** 인라인 칩 HTML 생성 시 사용하는 최소 HTML 이스케이프 */
export const escapeHtml = (s: string): string => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));

/** Jira 이슈 키 인라인 참조: [[LYRA-142]] */
export const JIRA_KEY_RE = /\[\[([A-Z][A-Z0-9]+-\d+)\]\]/g;
/** 페이지 멘션: [[page:p1a]] */
export const PAGE_MENTION_RE = /\[\[page:([a-zA-Z0-9_]+)\]\]/g;
/** 날짜 칩: [[date:2026-07-14]] */
export const DATE_MENTION_RE = /\[\[date:(\d{4}-\d{2}-\d{2})\]\]/g;

/**
 * contentEditable 요소를 순회하며 인라인 칩(data-jira/data-page/data-docs-date)을
 * [[...]] 마커 텍스트로 직렬화한다. blur 시 buildHydratedHtml이 이 마커를 다시 칩으로
 * 복원하므로, 이 직렬화를 거치지 않으면 칩이 일반 텍스트로 퇴화한다.
 */
export const serializeChipText = (el: HTMLElement): string => {
  let out = '';
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent || '';
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const elNode = node as HTMLElement;
    const jiraKey = elNode.getAttribute('data-jira');
    const pageId = elNode.getAttribute('data-page');
    const dateIso = elNode.getAttribute('data-docs-date');
    if (jiraKey) out += `[[${jiraKey}]]`;
    else if (pageId) out += `[[page:${pageId}]]`;
    else if (dateIso) out += `[[date:${dateIso}]]`;
    else out += elNode.textContent || '';
  });
  return out;
};
