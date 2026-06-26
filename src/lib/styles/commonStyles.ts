/**
 * 공통 Styled Components — Lyra Design System (Toss 원칙 기반)
 * Source: design_handoff_lyra_ui_system/README.md
 * Jira/Confluence 컨테이너에서 반복되는 레이아웃 패턴 공유.
 * 테마 토큰은 $theme prop으로 주입 (ServiceTheme 인터페이스).
 */
import styled, { keyframes, css } from 'styled-components';

// ── 공통 테마 인터페이스 ──

export interface ServiceTheme {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  bg: {
    default: string;
    subtle: string;
    hover: string;
    tile?: string;
  };
  border: string;
  borderStrong?: string;
  hairline?: string;
  text: { primary: string; secondary: string; muted: string };
  radius?: {
    card: string;
    modal: string;
    ctl: string;
    chip: string;
    chipSmall: string;
    pill: string;
    tile: string;
  };
  shadow?: {
    card: string;
    cardHover: string;
    btnAccent: string;
    toast: string;
    modal: string;
    focusRing: string;
    focusRingDanger: string;
    tabActive: string;
    segmentActive: string;
  };
  motion?: {
    fast: string;
    base: string;
    med: string;
    knob: string;
    spin: string;
    skeleton: string;
  };
  typo?: {
    display: { size: string; weight: number; tracking: string; line: number };
    hero:    { size: string; weight: number; tracking: string; line: number };
    title:   { size: string; weight: number; tracking: string; line: number };
    heading: { size: string; weight: number; tracking: string; line: number };
    body:    { size: string; weight: number; tracking: string; line: number };
    caption: { size: string; weight: number; tracking: string; line: number };
    micro:   { size: string; weight: number; tracking: string; line: number };
  };
  font?: { body: string; brand: string };
}

// ── 토큰 fallback ──
const r = (t: ServiceTheme) => t.radius ?? {
  card: '20px', modal: '22px', ctl: '12px', chip: '8px', chipSmall: '7px', pill: '99px', tile: '13px',
};
const sh = (t: ServiceTheme) => t.shadow ?? {
  card: '0 1px 2px rgba(28,27,26,.04), 0 8px 24px rgba(28,27,26,.04)',
  cardHover: '0 12px 30px rgba(28,27,26,.08)',
  btnAccent: '0 6px 18px rgba(0,123,255,0.32)',
  toast: '0 12px 30px rgba(28,27,26,.22)',
  modal: '0 30px 70px rgba(0,0,0,.45)',
  focusRing: '0 0 0 4px rgba(0,123,255,0.14)',
  focusRingDanger: '0 0 0 4px rgba(220,53,69,.1)',
  tabActive: '0 1px 4px rgba(28,27,26,.08)',
  segmentActive: '0 1px 3px rgba(28,27,26,.13)',
};
const m = (t: ServiceTheme) => t.motion ?? {
  fast: '.12s ease', base: '.14s ease', med: '.16s ease',
  knob: '.2s cubic-bezier(.2,.8,.2,1)', spin: '.8s linear infinite', skeleton: '1.3s linear infinite',
};
const tile = (t: ServiceTheme) => t.bg.tile ?? t.bg.hover;
const borderStrong = (t: ServiceTheme) => t.borderStrong ?? t.border;
const hairline = (t: ServiceTheme) => t.hairline ?? t.border;

// ── 레이아웃 ────────────────────────────────────────────────

/** 디테일 페이지 전체 레이아웃 (스크롤 가능) */
export const DetailLayout = styled.div<{ $theme: ServiceTheme }>`
  flex: 1;
  min-height: 0;
  background: ${({ $theme }) => $theme.bg.subtle};
  overflow-y: auto;
`;

/** 대시보드 전체 레이아웃 (고정 높이) */
export const DashboardLayout = styled.div<{ $theme: ServiceTheme }>`
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  background: ${({ $theme }) => $theme.bg.subtle};
`;

// ── 툴바 ──

export const Toolbar = styled.div<{ $theme: ServiceTheme }>`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: ${({ $theme }) => $theme.bg.default};
  border-radius: ${({ $theme }) => r($theme).card};
  border: 1px solid ${({ $theme }) => $theme.border};
  box-shadow: ${({ $theme }) => sh($theme).card};
  flex-shrink: 0;
`;

export const BackButton = styled.button<{ $theme: ServiceTheme }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 13px;
  background: transparent;
  border: none;
  border-radius: 10px;
  color: ${({ $theme }) => $theme.text.secondary};
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background ${({ $theme }) => m($theme).base}, color ${({ $theme }) => m($theme).base};
  flex-shrink: 0;

  &:hover {
    background: ${({ $theme }) => tile($theme)};
    color: ${({ $theme }) => $theme.text.primary};
  }
`;

export const Breadcrumbs = styled.div<{ $theme: ServiceTheme }>`
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  color: ${({ $theme }) => $theme.text.secondary};
`;

// ── 섹션 & 카드 ──

export const Section = styled.div<{ $theme: ServiceTheme }>`
  padding: 26px 28px;
  background: ${({ $theme }) => $theme.bg.default};
  border-radius: ${({ $theme }) => r($theme).card};
  border: 1px solid ${({ $theme }) => $theme.border};
  box-shadow: ${({ $theme }) => sh($theme).card};
`;

export const SectionTitle = styled.h3<{ $theme: ServiceTheme }>`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ $theme }) => $theme.text.primary};
`;

/** 카드 표면 (Section의 light-weight 변형) */
export const CardShell = styled.div<{ $theme: ServiceTheme; $hoverable?: boolean }>`
  background: ${({ $theme }) => $theme.bg.default};
  border-radius: ${({ $theme }) => r($theme).card};
  border: 1px solid ${({ $theme }) => $theme.border};
  box-shadow: ${({ $theme }) => sh($theme).card};
  transition: transform ${({ $theme }) => m($theme).base}, box-shadow ${({ $theme }) => m($theme).base};
  ${({ $hoverable, $theme }) => $hoverable && css`
    cursor: pointer;
    &:hover {
      transform: translateY(-2px);
      box-shadow: ${sh($theme).cardHover};
    }
  `}
`;

export const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 18px;
`;

export const MetaItem = styled.div`
  font-size: 13.5px;
`;

export const MetaLabel = styled.span<{ $theme: ServiceTheme }>`
  display: block;
  color: ${({ $theme }) => $theme.text.muted};
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

export const MetaValue = styled.span<{ $theme: ServiceTheme }>`
  color: ${({ $theme }) => $theme.text.primary};
  font-weight: 500;
  font-size: 14px;
`;

// ── 로딩 / 빈 상태 ──

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const LoadingArea = styled.div`
  padding: 56px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

export const Spinner = styled.div<{ $theme: ServiceTheme }>`
  width: 36px;
  height: 36px;
  border: 3px solid ${({ $theme }) => $theme.bg.subtle};
  border-top-color: ${({ $theme }) => $theme.primary};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

export const EmptyState = styled.div<{ $theme: ServiceTheme }>`
  padding: 48px 24px;
  text-align: center;
  color: ${({ $theme }) => $theme.text.secondary};
  font-size: 14.5px;
  font-weight: 600;
`;

// 스켈레톤 애니메이션
const shimmer = keyframes`
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

export const Skeleton = styled.div<{ $theme: ServiceTheme; $width?: string; $height?: string; $rounded?: string }>`
  display: block;
  width: ${({ $width }) => $width ?? '100%'};
  height: ${({ $height }) => $height ?? '12px'};
  border-radius: ${({ $rounded, $theme }) => $rounded ?? r($theme).chipSmall};
  background: linear-gradient(90deg, var(--lyra-c-gray1, #efedea) 0%, var(--lyra-c-gray0, #f7f6f3) 50%, var(--lyra-c-gray1, #efedea) 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.3s linear infinite;
`;

// ── 댓글 ──

export const CommentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const CommentItem = styled.div<{ $theme: ServiceTheme }>`
  padding: 18px 20px;
  border: 1px solid ${({ $theme }) => $theme.border};
  border-radius: ${({ $theme }) => r($theme).ctl};
  background: ${({ $theme }) => $theme.bg.default};
`;

export const CommentHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

// ── 섹션 토글 ──

export const SectionToggleHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  padding: 6px 0;
`;

export const SectionToggleArrow = styled.span`
  font-size: 10px;
  width: 16px;
  text-align: center;
`;

// ── 오버레이 & 라이트박스 (Jira/Confluence 공통) ──

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const zoomIn = keyframes`
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
`;

export const OVERLAY_Z = {
  lightbox: 200,
  fileLoading: 999,
  pdf: 1000,
} as const;

export const LightboxOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${OVERLAY_Z.lightbox};
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(12, 12, 16, 0.7);
  backdrop-filter: blur(4px);
  cursor: zoom-out;
  animation: ${fadeIn} 0.2s ease;
`;

export const LightboxImage = styled.img`
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.45);
  cursor: default;
  animation: ${zoomIn} 0.2s ease;
`;

export const LightboxClose = styled.button`
  position: absolute;
  top: 18px;
  right: 22px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s;

  &:hover { background: rgba(255, 255, 255, 0.28); }
`;

export const PdfOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${OVERLAY_Z.pdf};
  display: flex;
  flex-direction: column;
  background: rgba(12, 12, 16, 0.85);
  backdrop-filter: blur(4px);
  animation: ${fadeIn} 0.2s ease;
`;

export const PdfHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.4);
  flex-shrink: 0;
`;

export const PdfTitle = styled.span`
  color: white;
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const PdfClose = styled.button`
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;

  &:hover { background: rgba(255, 255, 255, 0.28); }
`;

export const PdfFrame = styled.iframe`
  flex: 1;
  border: none;
  background: white;
  margin: 0 28px 28px;
  border-radius: 12px;
`;

export const FileLoadingOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${OVERLAY_Z.fileLoading};
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
`;

export const FileLoadingSpinner = styled.div`
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;

// ── 에디터 액션 버튼 (Jira/Confluence 공통) ──

export const EditorActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
`;

export const SaveButton = styled.button<{ $theme: ServiceTheme }>`
  padding: 10px 18px;
  background: ${({ $theme }) => $theme.primary};
  color: #fff;
  border: none;
  border-radius: ${({ $theme }) => r($theme).ctl};
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: filter ${({ $theme }) => m($theme).fast}, transform ${({ $theme }) => m($theme).fast};
  box-shadow: ${({ $theme }) => sh($theme).btnAccent};

  &:hover { filter: brightness(1.07); transform: translateY(-1px); }
  &:active { transform: scale(0.98); }
  &:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
`;

export const CancelButton = styled.button<{ $theme: ServiceTheme }>`
  padding: 10px 18px;
  background: ${({ $theme }) => hairline($theme)};
  color: ${({ $theme }) => $theme.text.primary};
  border: 1px solid ${({ $theme }) => borderStrong($theme)};
  border-radius: ${({ $theme }) => r($theme).ctl};
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background ${({ $theme }) => m($theme).fast};

  &:hover { background: ${({ $theme }) => tile($theme)}; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

export const EditIconButton = styled.button<{ $theme: ServiceTheme }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: ${({ $theme }) => r($theme).ctl};
  color: ${({ $theme }) => $theme.text.muted};
  cursor: pointer;
  transition: all ${({ $theme }) => m($theme).fast};

  &:hover {
    background: ${({ $theme }) => tile($theme)};
    border-color: ${({ $theme }) => borderStrong($theme)};
    color: ${({ $theme }) => $theme.text.primary};
  }
`;

export const EditButtonWithLabel = styled.button<{ $theme: ServiceTheme }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid ${({ $theme }) => borderStrong($theme)};
  border-radius: ${({ $theme }) => r($theme).ctl};
  color: ${({ $theme }) => $theme.text.muted};
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all ${({ $theme }) => m($theme).fast};

  &:hover {
    background: ${({ $theme }) => tile($theme)};
    border-color: ${({ $theme }) => $theme.primary};
    color: ${({ $theme }) => $theme.primary};
  }
`;
