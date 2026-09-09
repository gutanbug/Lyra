/**
 * Lyra Docs 테마 — Lyra Design System(warm gray + #007bff) 정합
 * Source: design_handoff_lyra_docs/designs/Lyra Docs.dc.html (CSS 변수 --bg,--sidebar,--text 등)
 *
 * 목업의 로컬 CSS 변수는 값 대조 결과 기존 theme.ts(`--lyra-c-*`)와 1:1로 대응한다.
 * (예: --st-prog-t #005cbf = theme.color.accentStrong, --st-done-t #0d815e = theme.color.successInk)
 * 별도 CSS 변수 스코프를 새로 만들지 않고 theme.ts를 그대로 참조해 앱 전역 다크모드에 자동으로 올라탄다.
 */
import palette from './palette';
import { theme } from './theme';
import { jiraTheme } from './jiraTheme';

export const docsTheme = {
  bg: theme.color.pageBg,          // --bg (사용자 지정 페이지 배경 프리셋)
  sidebar: theme.color.pageBgSoft, // --sidebar (Appearance 설정의 페이지 배경 프리셋을 반영)
  surface: theme.color.surface,    // --surface
  surfaceSoft: theme.color.gray0,  // --surface-2
  hover: theme.color.gray1,        // --hover
  active: theme.color.gray2,       // --active
  border: theme.color.borderDefault,   // --border
  borderSoft: theme.color.gray1,       // --border-soft
  hairline: theme.color.hairline,      // --hairline
  borderStrong: theme.color.borderStrong, // --border-strong
  text: theme.color.gray8,         // --text
  text2: theme.color.gray6,        // --text-2
  muted: theme.color.gray5,        // --muted
  faint: theme.color.gray3,        // --faint
  accent: theme.color.accent,      // --accent
  accentSoft: theme.color.accentSoft, // --accent-soft
  danger: theme.color.danger,
  calloutBg: theme.color.gray0,    // --callout-bg
  codeBg: theme.color.gray0,       // --code-bg
  codeText: theme.color.gray7,     // --code-text
  todo: theme.color.success,       // --todo (체크박스 체크됨)
  shadow: theme.shadow.cardHover,  // --shadow (드롭다운/카드/모달 공통)
  selection: theme.color.accentSoft, // --sel

  // DB 상태 칩 — Jira 상태 팔레트 재사용(값 동일)
  status: {
    '할 일': { bg: jiraTheme.status.todoSoft, ink: jiraTheme.status.todo },
    '진행 중': { bg: jiraTheme.status.inProgressSoft, ink: jiraTheme.status.inProgress },
    '리뷰 중': { bg: jiraTheme.status.reviewSoft, ink: jiraTheme.status.review },
    '완료': { bg: jiraTheme.status.doneSoft, ink: jiraTheme.status.done },
  } as Record<string, { bg: string; ink: string }>,

  // 우선순위 화살표 — Jira 우선순위 팔레트 재사용
  priority: {
    긴급: { glyph: '⇈', color: jiraTheme.priority.highest },
    높음: { glyph: '↑', color: jiraTheme.priority.high },
    보통: { glyph: '=', color: jiraTheme.priority.medium },
    낮음: { glyph: '↓', color: jiraTheme.priority.low },
  } as Record<string, { glyph: string; color: string }>,

  // 담당자 아바타 색 — 자유 입력이므로 사전 정의된 이름 없이 muted 폴백을 사용한다
  avatar: {} as Record<string, string>,

  // 갤러리 뷰 커버(상태별)
  cover: {
    '할 일': [theme.color.gray1, '📋'],
    '진행 중': [theme.color.accentSoft, '⚙️'],
    '완료': [theme.color.successSoft, '✅'],
  } as Record<string, [string, string]>,

  // Jira 임베드 이슈 타입
  jiraType: {
    버그: { color: theme.color.danger, letter: 'B' },
    스토리: { color: theme.color.success, letter: 'S' },
    태스크: { color: theme.color.accent, letter: 'T' },
    에픽: { color: '#7a5af0', letter: 'E' },
    link: { color: theme.color.gray5, letter: '🔗' },
  } as Record<string, { color: string; letter: string }>,

  radius: theme.radius,
  motion: theme.motion,
  font: theme.font,
};

export const docsFaintHex = palette.gray4; // 정적 fallback (아이콘 hover 등)
