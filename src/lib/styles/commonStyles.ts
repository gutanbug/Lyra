/**
 * 공통 Styled Components
 * Jira/Confluence 컨테이너에서 반복되는 레이아웃 패턴을 공유.
 * 테마 색상은 CSS 변수 또는 prop으로 주입.
 */
import styled, { keyframes } from 'styled-components';
import { transition } from 'lib/styles/styles';

// ── 공통 테마 인터페이스 ──

export interface ServiceTheme {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  bg: { default: string; subtle: string; hover: string };
  border: string;
  text: { primary: string; secondary: string; muted: string };
}

// ── 레이아웃 ──

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
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: ${({ $theme }) => $theme.bg.default};
  border-bottom: 1px solid ${({ $theme }) => $theme.border};
  flex-shrink: 0;
`;

export const BackButton = styled.button<{ $theme: ServiceTheme }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: ${({ $theme }) => $theme.text.secondary};
  font-size: 0.8125rem;
  cursor: pointer;
  ${transition()};
  flex-shrink: 0;

  &:hover {
    background: ${({ $theme }) => $theme.bg.hover};
    color: ${({ $theme }) => $theme.text.primary};
  }
`;

export const Breadcrumbs = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  overflow: hidden;
  font-size: 0.8125rem;
`;

// ── 섹션 & 메타 ──

export const Section = styled.div<{ $theme: ServiceTheme }>`
  padding: 1.5rem;
  background: ${({ $theme }) => $theme.bg.default};
  border-radius: 3px;
  border: 1px solid ${({ $theme }) => $theme.border};
`;

export const SectionTitle = styled.h3<{ $theme: ServiceTheme }>`
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ $theme }) => $theme.text.primary};
`;

export const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
`;

export const MetaItem = styled.div`
  font-size: 0.8125rem;
`;

export const MetaLabel = styled.span<{ $theme: ServiceTheme }>`
  display: block;
  color: ${({ $theme }) => $theme.text.muted};
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
`;

export const MetaValue = styled.span<{ $theme: ServiceTheme }>`
  color: ${({ $theme }) => $theme.text.primary};
  font-weight: 500;
`;

// ── 검색 ──
// SearchInputWrapper, SearchInput, SuggestDropdown — 각 SearchToolbar에서 로컬 정의 사용

// ── 로딩 / 빈 상태 ──

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const LoadingArea = styled.div`
  padding: 4rem 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
`;

export const Spinner = styled.div<{ $theme: ServiceTheme }>`
  display: inline-flex;
  color: ${({ $theme }) => $theme.primary};
  animation: ${spin} 1s linear infinite;
`;

export const EmptyState = styled.div<{ $theme: ServiceTheme }>`
  padding: 3rem 2rem;
  text-align: center;
  color: ${({ $theme }) => $theme.text.secondary};
  font-size: 0.875rem;
`;

// ContentArea — 각 컨테이너에서 로컬 정의 사용

// ── 댓글 ──

export const CommentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const CommentItem = styled.div<{ $theme: ServiceTheme }>`
  padding: 1rem;
  border: 1px solid ${({ $theme }) => $theme.border};
  border-radius: 4px;
  background: ${({ $theme }) => $theme.bg.default};
`;

export const CommentHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

// CommentAuthor, CommentDate — 각 댓글 컴포넌트에서 로컬 정의 사용

// ── 섹션 토글 ──

export const SectionToggleHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  padding: 0.5rem 0;
`;

export const SectionToggleArrow = styled.span`
  font-size: 0.625rem;
  width: 1rem;
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
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  cursor: zoom-out;
  animation: ${fadeIn} 0.2s ease;
`;

export const LightboxImage = styled.img`
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  cursor: default;
  animation: ${zoomIn} 0.2s ease;
`;

export const LightboxClose = styled.button`
  position: absolute;
  top: 16px;
  right: 20px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

export const PdfOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${OVERLAY_Z.pdf};
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  animation: ${fadeIn} 0.2s ease;
`;

export const PdfHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  background: rgba(0, 0, 0, 0.4);
  flex-shrink: 0;
`;

export const PdfTitle = styled.span`
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const PdfClose = styled.button`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

export const PdfFrame = styled.iframe`
  flex: 1;
  border: none;
  background: white;
  margin: 0 2rem 2rem;
  border-radius: 6px;
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
  gap: 0.5rem;
  margin-top: 0.75rem;
`;

export const SaveButton = styled.button<{ $theme: ServiceTheme }>`
  padding: 0.375rem 1rem;
  background: ${({ $theme }) => $theme.primary};
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;

  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const CancelButton = styled.button<{ $theme: ServiceTheme }>`
  padding: 0.375rem 1rem;
  background: transparent;
  color: ${({ $theme }) => $theme.text.secondary};
  border: 1px solid ${({ $theme }) => $theme.border};
  border-radius: 4px;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: background 0.15s;

  &:hover { background: ${({ $theme }) => $theme.bg.hover}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const EditIconButton = styled.button<{ $theme: ServiceTheme }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: ${({ $theme }) => $theme.text.muted};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: ${({ $theme }) => $theme.bg.hover};
    border-color: ${({ $theme }) => $theme.border};
    color: ${({ $theme }) => $theme.text.primary};
  }
`;

export const EditButtonWithLabel = styled.button<{ $theme: ServiceTheme }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  background: transparent;
  border: 1px solid ${({ $theme }) => $theme.border};
  border-radius: 4px;
  color: ${({ $theme }) => $theme.text.muted};
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: ${({ $theme }) => $theme.bg.hover};
    border-color: ${({ $theme }) => $theme.primary};
    color: ${({ $theme }) => $theme.primary};
  }
`;
