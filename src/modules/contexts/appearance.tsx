/**
 * Appearance Context — 사용자 외형(라이트/다크 모드 + 페이지 배경색) 설정.
 *
 * - mode: 'light' | 'dark' — 컴포넌트 색/폰트/테두리 전체 반전
 * - pageBg: 라이트 모드 캔버스 배경색 (사용자가 직접 변경 가능)
 * - localStorage 영속화
 * - document.documentElement에 CSS 변수(`--lyra-c-*`)를 주입하여
 *   styled-components가 즉시 반응 (theme.ts가 이 변수를 참조)
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import palette from 'lib/styles/palette';

export const APPEARANCE_BG_STORAGE_KEY = 'lyra:appearance:pageBg';
export const APPEARANCE_MODE_STORAGE_KEY = 'lyra:appearance:mode';

// ── Mode ────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark';
export const DEFAULT_MODE: ThemeMode = 'light';

// ── BG presets (라이트 모드 캔버스 색) ────────────────────

export interface BgPreset {
  id: string;
  label: string;
  value: string;
}

export const BG_PRESETS: readonly BgPreset[] = [
  { id: 'sky',     label: '하늘',   value: '#e8f0fa' },
  { id: 'mint',    label: '민트',   value: '#e7f8f3' },
  { id: 'warm',    label: '따뜻',   value: '#f1efec' },
  { id: 'lilac',   label: '라일락', value: '#f1ecfd' },
  { id: 'peach',   label: '복숭아', value: '#fff5e6' },
  { id: 'white',   label: '화이트', value: '#ffffff' },
] as const;

export const DEFAULT_PAGE_BG = '#e8f0fa';

// ── hex util ────────────────────────────────────────────

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const m = hex.trim().replace('#', '');
  if (m.length !== 6) return null;
  const v = parseInt(m, 16);
  if (Number.isNaN(v)) return null;
  return { r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff };
};

const rgbToHex = (r: number, g: number, b: number): string =>
  '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');

const mixWithWhite = (hex: string, ratio: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    rgb.r + (255 - rgb.r) * ratio,
    rgb.g + (255 - rgb.g) * ratio,
    rgb.b + (255 - rgb.b) * ratio,
  );
};

const mixWithBlack = (hex: string, ratio: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(rgb.r * (1 - ratio), rgb.g * (1 - ratio), rgb.b * (1 - ratio));
};

const isValidHex = (s: string): boolean => /^#[0-9a-fA-F]{6}$/.test(s.trim());

// ── 팔레트 정의 (light/dark) ─────────────────────────────

interface PaletteVars {
  // gray (warm 또는 dark gray)
  gray0: string;
  gray1: string;
  gray2: string;
  gray3: string;
  gray5: string;
  gray6: string;
  gray7: string;
  gray8: string;

  // 페이지/표면
  pageBg: string;
  pageBgSoft: string;
  surface: string;
  borderDefault: string;
  borderStrong: string;
  hairline: string;

  // 액센트
  accent: string;
  accentStrong: string;
  accentSoft: string;
  accentLight: string;
  accentDarker: string;

  // 시맨틱
  success: string;
  successInk: string;
  successSoft: string;
  warning: string;
  warningInk: string;
  warningSoft: string;
  danger: string;
  dangerInk: string;
  dangerSoft: string;

  // Git PR merged (purple) + graph lane purple
  mergedBg: string;
  mergedInk: string;
  lanePurple: string;

  // Jira 타임라인 (Gantt) 전용
  timelineEpic: string;
  timelineEpicTrack: string;
  timelineEpicBd: string;
  timelineDep: string;
  timelineToday: string;
  timelineWeekend: string;
  timelineStatusProgress: string;
  timelineStatusReview: string;
  timelineStatusDone: string;
  timelineStatusTodoBd: string;

  // 그림자
  shadowCard: string;
  shadowCardHover: string;
  shadowBtnAccent: string;
  shadowToast: string;
  shadowModal: string;
  shadowFocus: string;
  shadowFocusDanger: string;
  shadowTab: string;
  shadowSegment: string;
}

/** 라이트 모드 팔레트 (현재 디자인 시스템 기본값) */
const lightPalette = (pageBg: string): PaletteVars => ({
  gray0: palette.gray0,
  gray1: palette.gray1,
  gray2: palette.gray2,
  gray3: palette.gray3,
  gray5: palette.gray5,
  gray6: palette.gray6,
  gray7: palette.gray7,
  gray8: palette.gray8,

  pageBg,
  pageBgSoft: mixWithWhite(pageBg, 0.55),
  surface: '#ffffff',
  borderDefault: mixWithBlack(pageBg, 0.08),
  borderStrong: mixWithBlack(pageBg, 0.18),
  hairline: mixWithWhite(pageBg, 0.65),

  accent: palette.blue4,
  accentStrong: palette.blue5,
  accentSoft: palette.blue0,
  accentLight: '#bfdeff',
  accentDarker: '#003e80',

  success: palette.teal4,
  successInk: palette.teal6,
  successSoft: palette.teal0,
  warning: palette.orange4,
  warningInk: palette.orange6,
  warningSoft: palette.orange0,
  danger: palette.red4,
  dangerInk: palette.red6,
  dangerSoft: palette.red0,

  mergedBg: '#f1ecfd',
  mergedInk: '#6b3fd4',
  lanePurple: '#7a5af0',

  timelineEpic: '#7a5af0',
  timelineEpicTrack: '#efeafe',
  timelineEpicBd: '#dccff8',
  timelineDep: '#b0a8a3',
  timelineToday: '#dc3545',
  timelineWeekend: '#f4f2ef',
  timelineStatusProgress: '#007bff',
  timelineStatusReview: '#ff9800',
  timelineStatusDone: '#12b886',
  timelineStatusTodoBd: '#cbc5c2',

  shadowCard: '0 1px 2px rgba(28,27,26,.06), 0 6px 16px rgba(28,27,26,.06)',
  shadowCardHover: '0 12px 30px rgba(28,27,26,.10)',
  shadowBtnAccent: '0 6px 18px rgba(0,123,255,0.32)',
  shadowToast: '0 12px 30px rgba(28,27,26,.22)',
  shadowModal: '0 30px 70px rgba(0,0,0,.45)',
  shadowFocus: '0 0 0 4px rgba(0,123,255,0.14)',
  shadowFocusDanger: '0 0 0 4px rgba(220,53,69,.1)',
  shadowTab: '0 1px 4px rgba(28,27,26,.08)',
  shadowSegment: '0 1px 3px rgba(28,27,26,.13)',
});

/** 다크 모드 팔레트 — IntelliJ New UI 영감 (살짝 따뜻한 soft dark + 명확한 테두리) */
const darkPalette = (): PaletteVars => ({
  // gray scale — 다크 surface 톤
  gray0: '#2b2d30',   // subtle surface elev (input/검색 bg)
  gray1: '#34363a',   // chip 비활성 bg
  gray2: '#43454a',   // scrollbar
  gray3: '#585b62',   // brisk divider
  gray5: '#9c9fa6',   // muted text — 가독성 boost
  gray6: '#c5c8ce',   // secondary text
  gray7: '#dfe1e5',   // text strong
  gray8: '#f0f1f3',   // primary text

  pageBg: '#1e1f22',      // IntelliJ-style soft dark (완전 검정 X)
  pageBgSoft: '#26282b',  // 미세 layer
  surface: '#2b2d30',     // 카드/패널 — pageBg와 명확히 분리
  borderDefault: '#4b4e54',   // 테두리 가시성 강화
  borderStrong: '#6b6f76',
  hairline: '#3a3c40',         // 내부 구분선

  accent: '#588cf0',           // 다크 bg에서 가독 + 채도 약간 낮춤
  accentStrong: '#8ab0f6',
  accentSoft: 'rgba(88, 140, 240, 0.22)',
  accentLight: 'rgba(88, 140, 240, 0.34)',
  accentDarker: '#bfd1f9',

  success: '#5fb87a',
  successInk: '#92d1a4',
  successSoft: 'rgba(95, 184, 122, 0.2)',
  warning: '#e0a96d',
  warningInk: '#f0c699',
  warningSoft: 'rgba(224, 169, 109, 0.2)',
  danger: '#e07a86',
  dangerInk: '#f0a3ad',
  dangerSoft: 'rgba(224, 122, 134, 0.2)',

  mergedBg: 'rgba(149, 108, 225, 0.22)',
  mergedInk: '#c4afe8',
  lanePurple: '#a98ff0',

  timelineEpic: '#9579f5',
  timelineEpicTrack: '#2a2740',
  timelineEpicBd: '#473f6b',
  timelineDep: '#6b6562',
  timelineToday: '#ff6b78',
  timelineWeekend: '#211f1d',
  timelineStatusProgress: '#4d9fff',
  timelineStatusReview: '#ffa733',
  timelineStatusDone: '#1ec99a',
  timelineStatusTodoBd: '#4a4642',

  // 그림자 + 살짝 inset highlight 로 카드 elevation 강조
  shadowCard: 'inset 0 1px 0 rgba(255,255,255,.04), 0 1px 2px rgba(0,0,0,.45), 0 6px 16px rgba(0,0,0,.4)',
  shadowCardHover: 'inset 0 1px 0 rgba(255,255,255,.06), 0 12px 30px rgba(0,0,0,.55)',
  shadowBtnAccent: '0 6px 18px rgba(88,140,240,0.45)',
  shadowToast: '0 12px 30px rgba(0,0,0,.65)',
  shadowModal: '0 30px 70px rgba(0,0,0,.75)',
  shadowFocus: '0 0 0 4px rgba(88,140,240,0.32)',
  shadowFocusDanger: '0 0 0 4px rgba(224,122,134,0.28)',
  shadowTab: 'inset 0 1px 0 rgba(255,255,255,.05), 0 1px 4px rgba(0,0,0,.45)',
  shadowSegment: 'inset 0 1px 0 rgba(255,255,255,.06), 0 1px 3px rgba(0,0,0,.5)',
});

// ── DOM 적용 ────────────────────────────────────────────

const applyPalette = (mode: ThemeMode, pageBg: string) => {
  const p = mode === 'dark' ? darkPalette() : lightPalette(pageBg);
  const root = document.documentElement;
  const set = (name: string, val: string) => root.style.setProperty(`--lyra-c-${name}`, val);

  set('gray0', p.gray0);
  set('gray1', p.gray1);
  set('gray2', p.gray2);
  set('gray3', p.gray3);
  set('gray5', p.gray5);
  set('gray6', p.gray6);
  set('gray7', p.gray7);
  set('gray8', p.gray8);

  set('page-bg', p.pageBg);
  set('page-bg-soft', p.pageBgSoft);
  set('surface', p.surface);
  set('border', p.borderDefault);
  set('border-strong', p.borderStrong);
  set('hairline', p.hairline);

  set('accent', p.accent);
  set('accent-strong', p.accentStrong);
  set('accent-soft', p.accentSoft);
  set('accent-light', p.accentLight);
  set('accent-darker', p.accentDarker);

  set('success', p.success);
  set('success-ink', p.successInk);
  set('success-soft', p.successSoft);
  set('warning', p.warning);
  set('warning-ink', p.warningInk);
  set('warning-soft', p.warningSoft);
  set('danger', p.danger);
  set('danger-ink', p.dangerInk);
  set('danger-soft', p.dangerSoft);

  set('merged-bg', p.mergedBg);
  set('merged-ink', p.mergedInk);
  set('lane-purple', p.lanePurple);

  set('timeline-epic', p.timelineEpic);
  set('timeline-epic-track', p.timelineEpicTrack);
  set('timeline-epic-bd', p.timelineEpicBd);
  set('timeline-dep', p.timelineDep);
  set('timeline-today', p.timelineToday);
  set('timeline-weekend', p.timelineWeekend);
  set('timeline-status-progress', p.timelineStatusProgress);
  set('timeline-status-review', p.timelineStatusReview);
  set('timeline-status-done', p.timelineStatusDone);
  set('timeline-status-todo-bd', p.timelineStatusTodoBd);

  set('shadow-card', p.shadowCard);
  set('shadow-card-hover', p.shadowCardHover);
  set('shadow-btn-accent', p.shadowBtnAccent);
  set('shadow-toast', p.shadowToast);
  set('shadow-modal', p.shadowModal);
  set('shadow-focus', p.shadowFocus);
  set('shadow-focus-danger', p.shadowFocusDanger);
  set('shadow-tab', p.shadowTab);
  set('shadow-segment', p.shadowSegment);

  // legacy 페이지 보조 변수 (--lyra-page-*) 도 함께 갱신 — 기존 코드 호환
  root.style.setProperty('--lyra-page-bg', p.pageBg);
  root.style.setProperty('--lyra-page-bg-soft', p.pageBgSoft);
  root.style.setProperty('--lyra-page-hover', mode === 'dark' ? '#34363a' : mixWithWhite(pageBg, 0.4));
  root.style.setProperty('--lyra-page-hairline', p.hairline);
  root.style.setProperty('--lyra-page-border', p.borderDefault);
  root.style.setProperty('--lyra-page-border-strong', p.borderStrong);

  // <html> color-scheme 힌트 (네이티브 컨트롤 — scrollbar 등)
  root.style.colorScheme = mode === 'dark' ? 'dark' : 'light';
  root.dataset.lyraTheme = mode;
};

// ── storage ─────────────────────────────────────────────

const loadStoredBg = (): string => {
  try {
    const v = localStorage.getItem(APPEARANCE_BG_STORAGE_KEY);
    if (v && isValidHex(v)) return v;
  } catch { /* ignore */ }
  return DEFAULT_PAGE_BG;
};

const loadStoredMode = (): ThemeMode => {
  try {
    const v = localStorage.getItem(APPEARANCE_MODE_STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch { /* ignore */ }
  return DEFAULT_MODE;
};

// ── Context ─────────────────────────────────────────────

interface AppearanceContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  pageBg: string;
  setPageBg: (hex: string) => void;
  resetPageBg: () => void;
  presets: readonly BgPreset[];
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export const useAppearance = (): AppearanceContextValue => {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    return {
      mode: DEFAULT_MODE,
      setMode: () => {},
      toggleMode: () => {},
      pageBg: DEFAULT_PAGE_BG,
      setPageBg: () => {},
      resetPageBg: () => {},
      presets: BG_PRESETS,
    };
  }
  return ctx;
};

const AppearanceProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => loadStoredMode());
  const [pageBg, setPageBgState] = useState<string>(() => loadStoredBg());

  // CSS 변수 갱신
  useEffect(() => {
    applyPalette(mode, pageBg);
  }, [mode, pageBg]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try { localStorage.setItem(APPEARANCE_MODE_STORAGE_KEY, next); } catch { /* ignore */ }
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(APPEARANCE_MODE_STORAGE_KEY, next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const setPageBg = useCallback((hex: string) => {
    if (!isValidHex(hex)) return;
    setPageBgState(hex);
    try { localStorage.setItem(APPEARANCE_BG_STORAGE_KEY, hex); } catch { /* ignore */ }
  }, []);

  const resetPageBg = useCallback(() => {
    setPageBgState(DEFAULT_PAGE_BG);
    try { localStorage.removeItem(APPEARANCE_BG_STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  const value = useMemo<AppearanceContextValue>(
    () => ({ mode, setMode, toggleMode, pageBg, setPageBg, resetPageBg, presets: BG_PRESETS }),
    [mode, pageBg, setMode, toggleMode, setPageBg, resetPageBg],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
};

export default AppearanceProvider;
