/**
 * Jira 테마 — Lyra Design System (warm gray + #007bff) 정합
 * Source: design_handoff_lyra_ui_system/README.md
 */
import palette from './palette';
import { theme } from './theme';

export const jiraTheme = {
  // 액센트
  primary: theme.color.accent,           // #007bff
  primaryHover: theme.color.accentStrong, // #005cbf
  primaryLight: theme.color.accentSoft,  // #e6f2ff

  // 상태 (soft chip 배경 + 짙은 텍스트 모델용 base ink/bg)
  status: {
    todo: theme.color.gray6,           // #5d5957
    todoSoft: theme.color.gray1,       // #eeeceb
    inProgress: theme.color.accentStrong, // #005cbf
    inProgressSoft: theme.color.accentSoft, // #e6f2ff
    review: theme.color.warningInk,    // #b36a00
    reviewSoft: theme.color.warningSoft, // #fff5e6
    done: theme.color.successInk,      // #0d815e
    doneSoft: theme.color.successSoft, // #e7f8f3
    default: theme.color.gray6,
  },

  issueType: {
    task: theme.color.accent,    // #007bff
    bug: theme.color.danger,     // #dc3545
    story: theme.color.success,  // #12b886
    epic: '#7a5af0',
    default: theme.color.gray5,
  },

  priority: {
    highest: theme.color.danger,    // #dc3545
    high: theme.color.danger,
    medium: theme.color.warning,    // #ff9800
    low: palette.blue3,             // #409cff
    lowest: palette.blue3,
    default: theme.color.gray5,
  },

  bg: {
    default: theme.color.surface,        // #ffffff
    subtle: theme.color.pageBg,          // var(--lyra-page-bg) — 사용자 설정 색
    hover: 'var(--lyra-page-hover, #f4f8fd)',
    tile: theme.color.hairline,          // 아이콘 타일/스페이스 태그
  },

  border: theme.color.borderDefault,    // #efedea
  borderStrong: theme.color.borderStrong, // #e6e3df
  hairline: theme.color.hairline,       // #f4f2ef

  text: {
    primary: theme.color.gray8,   // #1c1b1a
    secondary: theme.color.gray6, // #5d5957
    muted: theme.color.gray5,     // #8c8582
  },

  radius: theme.radius,
  shadow: theme.shadow,
  motion: theme.motion,
  typo: theme.typo,
  font: theme.font,
};
