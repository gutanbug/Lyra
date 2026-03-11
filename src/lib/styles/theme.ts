/**
 * 흰색 / 연한 파랑색 테마
 */
export const theme = {
  // 배경
  bgPrimary: '#ffffff',
  bgSecondary: '#f8fafc',
  bgTertiary: '#f1f5f9',

  // 연한 파랑
  blueLight: '#e0f2fe',
  blueLighter: '#bae6fd',
  blue: '#0ea5e9',
  blueDark: '#0284c7',
  blueDarker: '#0369a1',

  // 텍스트
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',

  // 테두리
  border: '#e2e8f0',
  borderFocus: '#0ea5e9',

  // 상태
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
};

export type Theme = typeof theme;
