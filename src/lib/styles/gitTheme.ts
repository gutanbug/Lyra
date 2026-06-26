/**
 * Git / GitHub / GitLab 테마 — Lyra Design System 정합
 * Source: design_handoff_lyra_ui_system/README.md (Git / GitHub 컴포넌트 섹션)
 *
 * - PR / Issue / 파일 변경 상태 색상 (soft bg + ink 텍스트)
 * - Ref(브랜치/태그/원격/HEAD) 칩 색상
 * - 그래프 lane 순환 팔레트
 * - mono 폰트 (코드/식별자/sha/branch)
 *
 * 모든 색상은 theme.color.* (CSS 변수)를 참조하여 라이트/다크 모드
 * 전환 시 자동 반영. pr.merged 의 purple만 별도 CSS 변수
 * (--lyra-c-merged-bg / --lyra-c-merged-ink) 로 정의.
 */
import { theme } from './theme';

export const gitMono = `ui-monospace, 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace`;

// purple (merged) — light/dark 변형은 AppearanceProvider 에서 set
const mergedBg = 'var(--lyra-c-merged-bg, #f1ecfd)';
const mergedInk = 'var(--lyra-c-merged-ink, #6b3fd4)';

// ── PR / Issue 상태 ───────────────────────────────────────

export const prStatus = {
  open:   { bg: theme.color.successSoft, ink: theme.color.successInk },
  merged: { bg: mergedBg,                ink: mergedInk },
  draft:  { bg: theme.color.gray1,       ink: theme.color.gray6 },
  closed: { bg: theme.color.dangerSoft,  ink: theme.color.dangerInk },
} as const;

export type PrStatus = keyof typeof prStatus;

export const issueDot = {
  open:   theme.color.success,
  closed: theme.color.gray5,
} as const;

// ── 파일 변경 상태 (A/M/D/R) ──────────────────────────

export const fileStatus = {
  added:    { bg: theme.color.successSoft, ink: theme.color.successInk, glyph: 'A' },
  modified: { bg: theme.color.warningSoft, ink: theme.color.warningInk, glyph: 'M' },
  deleted:  { bg: theme.color.dangerSoft,  ink: theme.color.dangerInk,  glyph: 'D' },
  renamed:  { bg: theme.color.accentSoft,  ink: theme.color.accentStrong, glyph: 'R' },
} as const;

export type FileStatus = keyof typeof fileStatus;

// ── Ref 칩 (브랜치/태그/원격/HEAD) ─────────────────────

export const refStyle = {
  head:   { bg: theme.color.accentSoft,  ink: theme.color.accentStrong },   // 현재 HEAD
  branch: { bg: theme.color.successSoft, ink: theme.color.successInk },     // 로컬 브랜치
  remote: { bg: theme.color.gray1,       ink: theme.color.gray6 },          // 원격
  tag:    { bg: theme.color.warningSoft, ink: theme.color.warningInk },     // 태그
} as const;

export type RefKind = keyof typeof refStyle;

// ── 그래프 lane 순환 팔레트 ────────────────────────────
//
// 그래프 노드/곡선 stroke 색. accent/success/warning/danger 등 시맨틱
// CSS 변수 사용 → 다크 모드에서 채도 자동 조정.

export const graphLanes: readonly string[] = [
  theme.color.accent,        // var(--lyra-c-accent) — primary
  theme.color.success,       // teal
  'var(--lyra-c-lane-purple, #7a5af0)',
  theme.color.warning,       // orange
  theme.color.danger,        // red
  theme.color.successInk,    // teal dark
  theme.color.accentStrong,  // blue dark
] as const;

export const laneColor = (laneIndex: number): string =>
  graphLanes[Math.abs(laneIndex) % graphLanes.length];

// ── GitHub label 텍스트 대비 결정 (밝으면 dark, 어두우면 white) ──

export const githubLabelInk = (hexBg: string): string => {
  const m = hexBg.trim().replace('#', '');
  if (m.length < 6) return '#24292f';
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? '#24292f' : '#ffffff';
};

// ── Workspace pane bg / divider — CSS 변수 (다크 자동 반영) ─

export const gitWorkspace = {
  paneBg: theme.color.gray0,           // 라이트 #f7f6f3 → 다크 #2b2d30
  divider: theme.color.borderDefault,  // 라이트 #dbe5f0 → 다크 #4b4e54
} as const;

// ── 통합 git 테마 ──────────────────────────────────────

export const gitTheme = {
  primary: theme.color.accent,
  primaryHover: theme.color.accentStrong,
  primaryLight: theme.color.accentSoft,

  bg: {
    default: theme.color.surface,
    subtle: theme.color.pageBg,
    pane: gitWorkspace.paneBg,
    hover: 'var(--lyra-page-hover, #faf9f7)',
    tile: theme.color.hairline,
  },

  border: theme.color.borderDefault,
  borderStrong: theme.color.borderStrong,
  hairline: theme.color.hairline,
  divider: gitWorkspace.divider,

  text: {
    primary: theme.color.gray8,
    secondary: theme.color.gray6,
    muted: theme.color.gray5,
    faint: theme.color.gray3,
  },

  mono: gitMono,
  font: theme.font,
  typo: theme.typo,
  radius: theme.radius,
  shadow: theme.shadow,
  motion: theme.motion,

  pr: prStatus,
  issueDot,
  file: fileStatus,
  ref: refStyle,
  lanes: graphLanes,
  laneColor,
  githubLabelInk,
} as const;

export type GitTheme = typeof gitTheme;
