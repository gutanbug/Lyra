/**
 * UI Primitives — Lyra Design System (Toss 원칙 기반)
 * Source: design_handoff_lyra_ui_system/README.md
 *
 * Button (Primary/Secondary/Ghost/Danger/IconOnly),
 * TextInput, SearchField, Toggle, SegmentedControl, Checkbox,
 * StatusChip, ServiceChip, CountBadge, Avatar.
 *
 * 토큰은 `theme.ts`에서 직접 import (서비스 무관 공통 primitives).
 */
import styled, { keyframes, css } from 'styled-components';
import { theme } from './theme';

const t = theme;

// ── Button ────────────────────────────────────────────────

type ButtonSize = 'L' | 'M' | 'S';

const sizeMap: Record<ButtonSize, { padY: string; padX: string; font: string }> = {
  L: { padY: '15px', padX: '26px', font: '16px' },
  M: { padY: '13px', padX: '22px', font: '15px' },
  S: { padY: '10px', padX: '16px', font: '13px' },
};

const buttonBase = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: ${t.font.body};
  font-weight: 600;
  letter-spacing: -0.01em;
  border: none;
  cursor: pointer;
  border-radius: ${t.radius.ctl};
  line-height: 1;
  transition: filter ${t.motion.fast}, transform ${t.motion.fast}, background ${t.motion.fast}, border-color ${t.motion.fast};
  white-space: nowrap;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none !important;
    filter: none !important;
  }
`;

export const PrimaryButton = styled.button<{ $size?: ButtonSize }>`
  ${buttonBase};
  background: ${t.color.accent};
  color: #fff;
  padding: ${({ $size = 'M' }) => `${sizeMap[$size].padY} ${sizeMap[$size].padX}`};
  font-size: ${({ $size = 'M' }) => sizeMap[$size].font};
  box-shadow: ${t.shadow.btnAccent};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    filter: brightness(1.07);
  }
  &:active:not(:disabled) {
    transform: scale(0.98);
  }
`;

export const SecondaryButton = styled.button<{ $size?: ButtonSize }>`
  ${buttonBase};
  background: ${t.color.hairline};
  color: ${t.color.gray7};
  border: 1px solid ${t.color.borderStrong};
  padding: ${({ $size = 'M' }) => `${sizeMap[$size].padY} ${sizeMap[$size].padX}`};
  font-size: ${({ $size = 'M' }) => sizeMap[$size].font};

  &:hover:not(:disabled) {
    background: ${t.color.gray1};
  }
  &:active:not(:disabled) {
    transform: scale(0.98);
  }
`;

export const GhostButton = styled.button<{ $size?: ButtonSize }>`
  ${buttonBase};
  background: transparent;
  color: ${t.color.accent};
  padding: ${({ $size = 'M' }) =>
    $size === 'S' ? '10px 14px' : $size === 'L' ? '15px 22px' : '13px 18px'};
  font-size: ${({ $size = 'M' }) => sizeMap[$size].font};

  &:hover:not(:disabled) {
    background: rgba(0, 123, 255, 0.09);
  }
`;

export const DangerButton = styled.button<{ $size?: ButtonSize }>`
  ${buttonBase};
  background: ${t.color.danger};
  color: #fff;
  padding: ${({ $size = 'M' }) => `${sizeMap[$size].padY} ${sizeMap[$size].padX}`};
  font-size: ${({ $size = 'M' }) => sizeMap[$size].font};

  &:hover:not(:disabled) {
    filter: brightness(1.06);
    transform: translateY(-1px);
  }
  &:active:not(:disabled) {
    transform: scale(0.98);
  }
`;

export const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  background: ${t.color.surface};
  border: 1px solid ${t.color.borderStrong};
  border-radius: ${t.radius.ctl};
  color: ${t.color.gray7};
  cursor: pointer;
  transition: background ${t.motion.fast}, border-color ${t.motion.fast};

  &:hover:not(:disabled) {
    background: ${t.color.hairline};
  }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

// 작은 아이콘 버튼 (드롭다운 트리거, 더보기 등)
export const SmallIconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: ${t.radius.ctl};
  color: ${t.color.gray5};
  cursor: pointer;
  transition: all ${t.motion.fast};

  &:hover:not(:disabled) {
    background: ${t.color.hairline};
    border-color: ${t.color.borderStrong};
    color: ${t.color.gray8};
  }
`;

// ── Spinner (버튼 내부용) ──

const spinKf = keyframes`
  to { transform: rotate(360deg); }
`;

export const InlineSpinner = styled.span<{ $size?: number; $color?: string }>`
  display: inline-block;
  width: ${({ $size = 15 }) => `${$size}px`};
  height: ${({ $size = 15 }) => `${$size}px`};
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: ${({ $color }) => $color ?? '#fff'};
  border-radius: 50%;
  animation: ${spinKf} 0.8s linear infinite;
  flex-shrink: 0;
`;

// ── Inputs ────────────────────────────────────────────────

export const TextInput = styled.input<{ $error?: boolean }>`
  width: 100%;
  font-family: ${t.font.body};
  font-size: 15px;
  color: ${t.color.gray8};
  background: ${t.color.surface};
  border: 1.5px solid ${({ $error }) => ($error ? t.color.danger : t.color.borderStrong)};
  border-radius: ${t.radius.ctl};
  padding: 14px 16px;
  outline: none;
  transition: border-color ${t.motion.fast}, box-shadow ${t.motion.fast};
  box-sizing: border-box;

  &::placeholder { color: ${t.color.gray5}; }

  &:focus {
    border-color: ${({ $error }) => ($error ? t.color.danger : t.color.accent)};
    box-shadow: ${({ $error }) => ($error ? t.shadow.focusRingDanger : t.shadow.focusRing)};
  }

  &:disabled { opacity: 0.6; cursor: not-allowed; background: ${t.color.gray0}; }
`;

export const HelperText = styled.span<{ $error?: boolean }>`
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: ${({ $error }) => ($error ? t.color.danger : t.color.gray5)};
`;

export const FieldLabel = styled.label<{ $error?: boolean }>`
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ $error }) => ($error ? t.color.danger : t.color.gray7)};
`;

// ── Search Field ──

export const SearchField = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 15px;
  background: ${t.color.gray0};
  border: 1.5px solid transparent;
  border-radius: ${t.radius.ctl};
  transition: border-color ${t.motion.fast}, background ${t.motion.fast};

  &:focus-within {
    border-color: ${t.color.accent};
    background: ${t.color.surface};
  }
`;

export const SearchFieldIcon = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  color: #a39d96;
`;

export const SearchFieldInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: ${t.font.body};
  font-size: 14px;
  color: ${t.color.gray8};

  &::placeholder { color: ${t.color.gray5}; }
`;

export const SearchFieldShortcut = styled.kbd`
  flex-shrink: 0;
  padding: 3px 7px;
  font-size: 11px;
  font-family: ${t.font.body};
  font-weight: 500;
  color: ${t.color.gray5};
  background: ${t.color.surface};
  border: 1px solid #e0ddd9;
  border-radius: 6px;
`;

// ── Toggle Switch ──

export const Toggle = styled.button<{ $on: boolean }>`
  position: relative;
  width: 52px;
  height: 31px;
  border-radius: 99px;
  padding: 3px;
  border: none;
  background: ${({ $on }) => ($on ? t.color.accent : '#d8d5d2')};
  cursor: pointer;
  transition: background ${t.motion.knob};
  flex-shrink: 0;

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 25px;
    height: 25px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.22);
    transform: translateX(${({ $on }) => ($on ? '21px' : '0')});
    transition: transform ${t.motion.knob};
  }

  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

// ── Segmented Control ──

export const SegmentedGroup = styled.div`
  display: inline-flex;
  background: ${t.color.hairline};
  border-radius: 99px;
  padding: 4px;
  gap: 2px;
`;

export const SegmentedOption = styled.button<{ $active: boolean }>`
  padding: 9px 20px;
  font-family: ${t.font.body};
  font-size: 13.5px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  border: none;
  border-radius: 99px;
  cursor: pointer;
  background: ${({ $active }) => ($active ? t.color.surface : 'transparent')};
  color: ${({ $active }) => ($active ? t.color.gray8 : t.color.gray5)};
  box-shadow: ${({ $active }) => ($active ? t.shadow.segmentActive : 'none')};
  transition: background ${t.motion.fast}, color ${t.motion.fast};

  &:hover:not(:disabled) {
    color: ${t.color.gray8};
  }
`;

// ── Checkbox ──

export const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  appearance: none;
  width: 21px;
  height: 21px;
  border-radius: 7px;
  background: ${t.color.surface};
  border: 1.5px solid #d8d5d2;
  cursor: pointer;
  transition: background ${t.motion.fast}, border-color ${t.motion.fast};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;

  &:checked {
    background: ${t.color.accent};
    border-color: ${t.color.accent};
  }

  &:checked::after {
    content: '';
    position: absolute;
    left: 4px;
    top: 1px;
    width: 6px;
    height: 11px;
    border-right: 3px solid #fff;
    border-bottom: 3px solid #fff;
    transform: rotate(45deg);
  }

  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

// ── Status Chip ───────────────────────────────────────────

type ChipTone =
  | 'todo'
  | 'inProgress'
  | 'review'
  | 'done'
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger';

const chipPalette: Record<ChipTone, { bg: string; fg: string }> = {
  todo:       { bg: t.color.gray1,        fg: t.color.gray6 },
  inProgress: { bg: t.color.accentSoft,   fg: t.color.accentStrong },
  review:     { bg: t.color.warningSoft,  fg: t.color.warningInk },
  done:       { bg: t.color.successSoft,  fg: t.color.successInk },
  neutral:    { bg: t.color.gray1,        fg: t.color.gray6 },
  accent:     { bg: t.color.accentSoft,   fg: t.color.accentStrong },
  success:    { bg: t.color.successSoft,  fg: t.color.successInk },
  warning:    { bg: t.color.warningSoft,  fg: t.color.warningInk },
  danger:     { bg: t.color.dangerSoft,   fg: t.color.dangerInk },
};

export const StatusChip = styled.span<{ $tone?: ChipTone; $small?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: ${({ $small }) => ($small ? '5px 11px' : '7px 13px')};
  background: ${({ $tone = 'neutral' }) => chipPalette[$tone].bg};
  color: ${({ $tone = 'neutral' }) => chipPalette[$tone].fg};
  font-family: ${t.font.body};
  font-size: ${({ $small }) => ($small ? '12px' : '12.5px')};
  font-weight: 600;
  letter-spacing: -0.01em;
  border-radius: ${({ $small }) => ($small ? t.radius.chipSmall : t.radius.chip)};
  white-space: nowrap;
  line-height: 1.2;
`;

// 클릭 가능한 chip (드롭다운 트리거)
export const StatusChipButton = styled.button<{ $tone?: ChipTone; $small?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: ${({ $small }) => ($small ? '5px 11px' : '7px 13px')};
  background: ${({ $tone = 'neutral' }) => chipPalette[$tone].bg};
  color: ${({ $tone = 'neutral' }) => chipPalette[$tone].fg};
  font-family: ${t.font.body};
  font-size: ${({ $small }) => ($small ? '12px' : '12.5px')};
  font-weight: 600;
  letter-spacing: -0.01em;
  border: none;
  border-radius: ${({ $small }) => ($small ? t.radius.chipSmall : t.radius.chip)};
  cursor: pointer;
  white-space: nowrap;
  line-height: 1.2;
  transition: filter ${t.motion.fast};

  &:hover:not(:disabled) { filter: brightness(0.97); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

// ── Service Chip (Jira / Confluence / GitHub / GitLab) ──

export const ServiceChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px 7px 9px;
  background: ${t.color.surface};
  border: 1px solid ${t.color.borderStrong};
  border-radius: ${t.radius.pill};
  font-family: ${t.font.body};
  font-size: 13px;
  font-weight: 500;
  color: ${t.color.gray7};
  white-space: nowrap;
  line-height: 1.2;
`;

// ── Count Badge ──

export const CountBadge = styled.span<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 8px;
  background: ${({ $active }) => ($active ? t.color.accent : t.color.gray1)};
  color: ${({ $active }) => ($active ? '#fff' : t.color.gray5)};
  font-family: ${t.font.body};
  font-size: 12px;
  font-weight: 600;
  border-radius: 99px;
  line-height: 1;
`;

// ── Avatar ──

export const Avatar = styled.span<{ $size?: number; $bg?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size = 28 }) => `${$size}px`};
  height: ${({ $size = 28 }) => `${$size}px`};
  border-radius: 50%;
  background: ${({ $bg }) => $bg ?? t.color.accent};
  color: #fff;
  font-family: ${t.font.body};
  font-weight: 600;
  font-size: ${({ $size = 28 }) => `${Math.max(10, Math.floor($size * 0.42))}px`};
  flex-shrink: 0;
  overflow: hidden;
  user-select: none;
`;

export const AvatarImg = styled.img<{ $size?: number }>`
  width: ${({ $size = 28 }) => `${$size}px`};
  height: ${({ $size = 28 }) => `${$size}px`};
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  display: block;
`;

// 아바타 색상 순환 (이름 기반 시드)
const AVATAR_COLORS = ['#0a7bff', '#12b886', '#7a5af0', '#ff9800', '#dc3545', '#0d815e'];
export const avatarColor = (seed: string): string => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

// ── 표면 (Account/Stat 카드용 작은 헬퍼) ──

export const SurfaceTile = styled.div<{ $size?: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size = 44 }) => `${$size}px`};
  height: ${({ $size = 44 }) => `${$size}px`};
  background: ${t.color.hairline};
  border-radius: ${t.radius.tile};
  flex-shrink: 0;
`;

// ── 우선순위 글리프 ──

type PriorityLevel = 'highest' | 'high' | 'medium' | 'low' | 'lowest';

const priorityGlyphMap: Record<PriorityLevel, { glyph: string; color: string }> = {
  highest: { glyph: '↑↑', color: t.color.danger },
  high:    { glyph: '↑',  color: t.color.danger },
  medium:  { glyph: '=',  color: t.color.warning },
  low:     { glyph: '↓',  color: '#409cff' },
  lowest:  { glyph: '↓↓', color: '#409cff' },
};

export const PriorityGlyph = styled.span<{ $level: PriorityLevel }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  font-family: ${t.font.body};
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  color: ${({ $level }) => priorityGlyphMap[$level].color};

  &::before { content: '${({ $level }) => priorityGlyphMap[$level].glyph}'; }
`;

export const getPriorityMeta = (level: PriorityLevel) => priorityGlyphMap[level];
