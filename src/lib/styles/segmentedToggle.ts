import styled, { css } from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';

/**
 * Lyra Design System segmented control 공통 스타일.
 * design_handoff_lyra_ui_system/designs/Lyra Components.dc.html `세그먼트 · Segmented` 기준.
 *
 * 사용 예:
 *   <SegmentedGroup>
 *     <SegmentedBtn $active>리스트</SegmentedBtn>
 *     <SegmentedBtn>타임라인</SegmentedBtn>
 *   </SegmentedGroup>
 */

export const SegmentedGroup = styled.div`
  display: inline-flex;
  background: ${jiraTheme.hairline};
  border-radius: 99px;
  padding: 3px;
  gap: 2px;
`;

const segmentedBase = css<{ $active?: boolean }>`
  font-family: inherit;
  font-size: 12.5px;
  border: none;
  cursor: pointer;
  border-radius: 99px;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: ${({ $active }) => ($active ? jiraTheme.bg.default : 'transparent')};
  color: ${({ $active }) => ($active ? jiraTheme.text.primary : jiraTheme.text.muted)};
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  box-shadow: ${({ $active }) => ($active ? '0 1px 3px rgba(28, 27, 26, 0.13)' : 'none')};
  &:hover {
    color: ${jiraTheme.text.primary};
  }
`;

/** 라벨/아이콘 혼합 segmented 버튼. padding: 7px 16px. */
export const SegmentedBtn = styled.button<{ $active?: boolean }>`
  ${segmentedBase}
  padding: 6px 14px;
`;

/** 아이콘 only segmented 버튼. 정사각 형태. */
export const SegmentedIconBtn = styled.button<{ $active?: boolean }>`
  ${segmentedBase}
  padding: 0;
  width: 30px;
  height: 26px;
`;
