/**
 * Lyra Design System Tokens — Toss 원칙 기반 리디자인 (2026-06)
 * Source: design_handoff_lyra_ui_system/README.md
 * Base palette: src/lib/styles/palette.ts (warm gray + #007bff accent)
 *
 * 모든 색상 토큰은 CSS 변수(`--lyra-c-*`)를 참조하여
 * AppearanceProvider(modules/contexts/appearance.tsx)가 라이트/다크 모드를
 * 런타임에 즉시 전환할 수 있다. fallback 값은 라이트 모드 기본값.
 */
import palette from './palette';

// CSS var helper — fallback은 라이트 기본값
const v = (name: string, fallback: string) => `var(--lyra-c-${name}, ${fallback})`;

// ── 색상 ────────────────────────────────────────────────────────

const color = {
  // 중립 (warm gray) — 다크 모드에서 역전
  gray0: v('gray0', palette.gray0),  // #f7f6f3 → dark surface elev1
  gray1: v('gray1', palette.gray1),  // #eeeceb → dark surface elev2
  gray2: v('gray2', palette.gray2),  // #dedddb → dark border subtle
  gray3: v('gray3', palette.gray3),  // #cbc5c2 → dark border
  gray5: v('gray5', palette.gray5),  // #8c8582 → dark muted text
  gray6: v('gray6', palette.gray6),  // #5d5957 → dark secondary text
  gray7: v('gray7', palette.gray7),  // #2f2c2b → dark text strong
  gray8: v('gray8', palette.gray8),  // #1c1b1a → dark primary text (밝게 반전)

  // 페이지/표면
  pageBg: v('page-bg', '#e8f0fa'),
  pageBgSoft: v('page-bg-soft', '#f4f7fc'),
  surface: v('surface', '#ffffff'),
  borderDefault: v('border', '#dbe5f0'),
  borderStrong: v('border-strong', '#c7d3e2'),
  hairline: v('hairline', '#eef3f9'),

  // 액센트 (blue4)
  accent: v('accent', palette.blue4),
  accentStrong: v('accent-strong', palette.blue5),
  accentSoft: v('accent-soft', palette.blue0),

  // 시맨틱
  success: v('success', palette.teal4),
  successInk: v('success-ink', palette.teal6),
  successSoft: v('success-soft', palette.teal0),
  warning: v('warning', palette.orange4),
  warningInk: v('warning-ink', palette.orange6),
  warningSoft: v('warning-soft', palette.orange0),
  danger: v('danger', palette.red4),
  dangerInk: v('danger-ink', palette.red6),
  dangerSoft: v('danger-soft', palette.red0),
} as const;

// ── 타이포그래피 ───────────────────────────────────────────────

const font = {
  body: '"Pretendard Variable", "Pretendard", "AppleSDGothicNeo", "SpoqaHanSans", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
  brand: '"Sora", "Pretendard Variable", "Pretendard", sans-serif',
} as const;

const typo = {
  display: { size: '34px', weight: 800, tracking: '-0.025em', line: 1.15 },
  hero:    { size: '42px', weight: 800, tracking: '-0.025em', line: 1.1  },
  title:   { size: '22px', weight: 700, tracking: '-0.01em',  line: 1.3  },
  heading: { size: '18px', weight: 600, tracking: '-0.01em',  line: 1.35 },
  body:    { size: '15px', weight: 500, tracking: '0',        line: 1.5  },
  caption: { size: '13px', weight: 500, tracking: '0.01em',   line: 1.45 },
  micro:   { size: '11px', weight: 700, tracking: '0.08em',   line: 1.3  },
} as const;

// ── 간격 (8px base) ────────────────────────────────────────────

const space = {
  xs: '4px',
  sm: '8px',
  md: '14px',
  lg: '20px',
  xl: '26px',
  xxl: '34px',
} as const;

// ── Radius ─────────────────────────────────────────────────────

const radius = {
  card: '20px',
  modal: '22px',
  ctl: '12px',
  chip: '8px',
  chipSmall: '7px',
  pill: '99px',
  tile: '13px',
} as const;

// ── Shadow ─────────────────────────────────────────────────────
//
// 다크 모드에서는 그림자 강도를 조정하기 위해 CSS 변수 alpha 사용.

const shadow = {
  card: v('shadow-card', '0 1px 2px rgba(28,27,26,.06), 0 6px 16px rgba(28,27,26,.06)'),
  cardHover: v('shadow-card-hover', '0 12px 30px rgba(28,27,26,.10)'),
  btnAccent: v('shadow-btn-accent', '0 6px 18px rgba(0,123,255,0.32)'),
  toast: v('shadow-toast', '0 12px 30px rgba(28,27,26,.22)'),
  modal: v('shadow-modal', '0 30px 70px rgba(0,0,0,.45)'),
  focusRing: v('shadow-focus', '0 0 0 4px rgba(0,123,255,0.14)'),
  focusRingDanger: v('shadow-focus-danger', '0 0 0 4px rgba(220,53,69,.1)'),
  tabActive: v('shadow-tab', '0 1px 4px rgba(28,27,26,.08)'),
  segmentActive: v('shadow-segment', '0 1px 3px rgba(28,27,26,.13)'),
} as const;

// ── Motion ─────────────────────────────────────────────────────

const motion = {
  fast: '.12s ease',
  base: '.14s ease',
  med: '.16s ease',
  knob: '.2s cubic-bezier(.2,.8,.2,1)',
  spin: '.8s linear infinite',
  skeleton: '1.3s linear infinite',
} as const;

// ── 통합 theme (호환 alias 포함) ─────────────────────────────

export const theme = {
  color,
  font,
  typo,
  space,
  radius,
  shadow,
  motion,

  // Legacy alias (기존 import 호환)
  bgPrimary: color.surface,
  bgSecondary: color.gray0,
  bgTertiary: color.pageBg,

  blue: color.accent,
  blueLight: color.accentSoft,
  blueLighter: v('accent-light', '#bfdeff'),
  blueDark: color.accentStrong,
  blueDarker: v('accent-darker', '#003e80'),

  textPrimary: color.gray8,
  textSecondary: color.gray6,
  textMuted: color.gray5,

  border: color.borderDefault,
  borderFocus: color.accent,

  success: color.success,
  error: color.danger,
  warning: color.warning,
} as const;

export type Theme = typeof theme;
export type Color = typeof color;
export type Typo = typeof typo;
export type Radius = typeof radius;
export type Shadow = typeof shadow;
