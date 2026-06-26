/**
 * Confluence 테마 — Lyra Design System (warm gray + #007bff) 정합
 * Source: design_handoff_lyra_ui_system/README.md
 */
import { theme } from './theme';

export const confluenceTheme = {
  primary: theme.color.accent,
  primaryHover: theme.color.accentStrong,
  primaryLight: theme.color.accentSoft,

  accent: theme.color.accent,
  accentLight: theme.color.accentSoft,

  bg: {
    default: theme.color.surface,
    subtle: theme.color.pageBg,          // var(--lyra-page-bg) — 사용자 설정 색
    hover: 'var(--lyra-page-hover, #f4f8fd)',
    tile: theme.color.hairline,
  },

  border: theme.color.borderDefault,
  borderStrong: theme.color.borderStrong,
  hairline: theme.color.hairline,

  text: {
    primary: theme.color.gray8,
    secondary: theme.color.gray6,
    muted: theme.color.gray5,
  },

  // 스페이스/페이지 태그용 컬러 (soft chip 모델)
  space: {
    color: theme.color.accentStrong, // #005cbf
    bg: theme.color.accentSoft,      // #e6f2ff
    ink: theme.color.accentStrong,
  },

  page: {
    color: theme.color.successInk,   // #0d815e
    bg: theme.color.successSoft,     // #e7f8f3
    ink: theme.color.successInk,
  },

  radius: theme.radius,
  shadow: theme.shadow,
  motion: theme.motion,
  typo: theme.typo,
  font: theme.font,
};
