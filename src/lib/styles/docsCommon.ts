import styled, { keyframes } from 'styled-components';
import { docsTheme } from './docsTheme';

export const docsPop = keyframes`
  from { opacity: 0; transform: translateY(-4px) scale(.985); }
  to { opacity: 1; transform: none; }
`;

export const docsFade = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

/** 슬래시/멘션/블록메뉴 등 공통 스크롤 스타일 */
export const thinScrollbar = `
  &::-webkit-scrollbar { width: 10px; height: 10px; }
  &::-webkit-scrollbar-thumb { background: ${docsTheme.border}; border: 3px solid transparent; background-clip: padding-box; border-radius: 9px; }
  &::-webkit-scrollbar-track { background: transparent; }
`;

/** contentEditable 블록 본문 — 포커스 시 placeholder 숨김, 비어있을 때 data-ph 표시 */
export const EditableDiv = styled.div`
  outline: none;
  &:empty:before {
    content: attr(data-ph);
    color: ${docsTheme.faint};
    pointer-events: none;
  }
`;

export const EditableTitle = styled.div`
  outline: none;
  font-family: 'Sora', sans-serif;
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1.15;
  color: ${docsTheme.text};
  margin-bottom: 20px;
  &:empty:before {
    content: attr(data-ph);
    color: ${docsTheme.muted};
    pointer-events: none;
  }
`;

/** 슬래시/멘션/블록메뉴/페이지메뉴/셀에디터/필터/팔레트 공통 팝업 컨테이너 */
export const DocsPopup = styled.div`
  position: fixed;
  z-index: 85;
  background: ${docsTheme.surface};
  border: 1px solid ${docsTheme.border};
  border-radius: 12px;
  box-shadow: ${docsTheme.shadow};
  padding: 6px;
  animation: ${docsPop} 0.13s ease;
  ${thinScrollbar}
`;

export const DocsPopupLabel = styled.div`
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: ${docsTheme.muted};
  padding: 5px 8px 4px;
`;

export const DocsMenuButton = styled.button`
  width: 100%;
  appearance: none;
  border: none;
  cursor: pointer;
  background: transparent;
  border-radius: 7px;
  padding: 7px 9px;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  font-family: inherit;
  font-size: 13px;
  color: ${docsTheme.text};

  &:hover {
    background: ${docsTheme.hover};
  }
`;

export const DocsMenuDivider = styled.div`
  height: 1px;
  background: ${docsTheme.hairline};
  margin: 5px 4px;
`;

export const DocsIconButton = styled.button<{ $active?: boolean }>`
  appearance: none;
  border: none;
  background: ${({ $active }) => ($active ? docsTheme.hover : 'transparent')};
  cursor: pointer;
  color: ${docsTheme.muted};
  width: 30px;
  height: 30px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${docsTheme.hover};
    color: ${docsTheme.text2};
  }
`;

export const DocsOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(20, 18, 16, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${docsFade} 0.12s ease;
`;

export const DocsModal = styled.div`
  background: ${docsTheme.surface};
  border: 1px solid ${docsTheme.border};
  border-radius: 15px;
  box-shadow: ${docsTheme.shadow};
  overflow: hidden;
  animation: ${docsPop} 0.14s ease;
`;

export const DocsChip = styled.span<{ $bg: string; $ink: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 7px;
  background: ${({ $bg }) => $bg};
  color: ${({ $ink }) => $ink};
  white-space: nowrap;
`;

export const DocsAvatar = styled.span<{ $bg: string }>`
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10.5px;
  font-weight: 700;
  color: #fff;
  background: ${({ $bg }) => $bg};
`;
