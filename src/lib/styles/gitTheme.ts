/**
 * Git / GitHub / GitLab 테마 — Lyra Design System 정합
 * Source: design_handoff_lyra_ui_system/README.md (Git / GitHub 컴포넌트 섹션)
 *
 * - PR / Issue / 파일 변경 상태 색상 (soft bg + ink 텍스트)
 * - Ref(브랜치/태그/원격/HEAD) 칩 색상
 * - 그래프 lane 순환 팔레트
 * - mono 폰트 (코드/식별자/sha/branch)
 */
import { theme } from './theme';

export const gitMono = `ui-monospace, 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace`;

// ── PR / Issue 상태 ───────────────────────────────────────

export const prStatus = {
  open:   { bg: '#e7f8f3', ink: '#0d815e' },
  merged: { bg: '#f1ecfd', ink: '#6b3fd4' },
  draft:  { bg: '#eeeceb', ink: '#5d5957' },
  closed: { bg: '#fcebec', ink: '#9a2530' },
} as const;

export type PrStatus = keyof typeof prStatus;

export const issueDot = {
  open:   '#12b886',
  closed: '#8c8582',
} as const;

// ── 파일 변경 상태 (A/M/D/R) ──────────────────────────

export const fileStatus = {
  added:    { bg: '#e7f8f3', ink: '#0d815e', glyph: 'A' },
  modified: { bg: '#fff5e6', ink: '#b36a00', glyph: 'M' },
  deleted:  { bg: '#fcebec', ink: '#9a2530', glyph: 'D' },
  renamed:  { bg: '#e6f2ff', ink: '#005cbf', glyph: 'R' },
} as const;

export type FileStatus = keyof typeof fileStatus;

// ── Ref 칩 (브랜치/태그/원격/HEAD) ─────────────────────

export const refStyle = {
  head:   { bg: '#e6f2ff', ink: '#005cbf' },   // 현재 브랜치(HEAD)
  branch: { bg: '#e7f8f3', ink: '#0d815e' },   // 로컬 브랜치
  remote: { bg: '#eeeceb', ink: '#5d5957' },   // 원격
  tag:    { bg: '#fff5e6', ink: '#b36a00' },   // 태그
} as const;

export type RefKind = keyof typeof refStyle;

// ── 그래프 lane 순환 팔레트 ────────────────────────────

export const graphLanes: readonly string[] = [
  '#007bff',  // blue4 (primary)
  '#12b886',  // teal4
  '#7a5af0',  // purple (epic)
  '#ff9800',  // orange4
  '#dc3545',  // red4
  '#0d815e',  // teal6
  '#005cbf',  // blue5
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

// ── Workspace pane bg ───────────────────────────────────

export const gitWorkspace = {
  paneBg: '#f4f7fc',
  divider: '#dbe5f0',
} as const;

// ── 통합 git 테마 (theme alias 포함) ──────────────────

export const gitTheme = {
  primary: theme.color.accent,
  primaryHover: theme.color.accentStrong,
  primaryLight: theme.color.accentSoft,

  bg: {
    default: theme.color.surface,
    subtle: theme.color.pageBg,
    pane: gitWorkspace.paneBg,
    hover: '#faf9f7',
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
    faint: '#b0a8a3',
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
