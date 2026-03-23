import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Loader } from 'lucide-react';
import { theme } from 'lib/styles/theme';
import { getServiceIcon } from 'lib/icons/services';
import { formatDate } from 'lib/utils/typeHelpers';
import type { ConfluencePageInfo, SpaceCount, ConfluenceCtxMenu } from 'components/stats/types';

interface Props {
  confluencePages: ConfluencePageInfo[];
  confluenceTotalCount: number;
  isConfluenceLoading: boolean;
  expandedSpace: string | null;
  confluenceCtx: ConfluenceCtxMenu | null;
  selectedYear: number | null;
  confluenceBySpace: SpaceCount[];
  confluencePagesBySpace: Map<string, ConfluencePageInfo[]>;
  onExpandSpace: (spaceName: string | null) => void;
  onCtxMenu: (e: React.MouseEvent, pageId: string, title: string) => void;
  onCloseCtxMenu: () => void;
  onOpenInNewTab: (pageId: string, title: string) => void;
}

const StatsConfluenceSection = ({
  confluenceTotalCount,
  isConfluenceLoading,
  expandedSpace,
  confluenceCtx,
  selectedYear,
  confluenceBySpace,
  confluencePagesBySpace,
  onExpandSpace,
  onCtxMenu,
  onCloseCtxMenu,
  onOpenInNewTab,
}: Props) => {
  return (
    <>
      <SectionCard>
        <SectionHeader>
          <SectionIconWrap>{getServiceIcon('confluence', 20)}</SectionIconWrap>
          <SectionTitle>Confluence 문서 통계</SectionTitle>
        </SectionHeader>

        {isConfluenceLoading ? (
          <LoadingArea>
            <Spinner><Loader size={20} /></Spinner>
            <LoadingText>Confluence 데이터를 불러오는 중...</LoadingText>
          </LoadingArea>
        ) : confluenceTotalCount === 0 ? (
          <EmptySection>
            {selectedYear !== null ? `${selectedYear}년에 ` : ''}작성한 문서가 없습니다.
          </EmptySection>
        ) : (
          <>
            <TotalBadge>
              총 <strong>{confluenceTotalCount}</strong>건
            </TotalBadge>
            {confluenceBySpace.length > 0 && (
              <SpaceList>
                <SpaceListHeader>
                  <span>스페이스</span>
                  <span>문서 수</span>
                </SpaceListHeader>
                {confluenceBySpace.map((s) => (
                  <React.Fragment key={s.name}>
                    <SpaceListItem
                      $clickable
                      onClick={() => onExpandSpace(expandedSpace === s.name ? null : s.name)}
                    >
                      <SpaceNameRow>
                        <StatusExpandIcon>{expandedSpace === s.name ? '▼' : '▶'}</StatusExpandIcon>
                        <SpaceName>{s.name}</SpaceName>
                      </SpaceNameRow>
                      <SpaceCount>{s.count}건</SpaceCount>
                    </SpaceListItem>
                    {expandedSpace === s.name && (
                      <ConfluencePageList>
                        {(confluencePagesBySpace.get(s.name) || []).map((p) => (
                          <ConfluencePageItem
                            key={p.id}
                            onClick={() => onOpenInNewTab(p.id, p.title)}
                            onContextMenu={(e) => onCtxMenu(e, p.id, p.title)}
                          >
                            <ConfluencePageTitle>{p.title}</ConfluencePageTitle>
                            <ConfluencePageDate>{formatDate(p.createdAt, true)}</ConfluencePageDate>
                          </ConfluencePageItem>
                        ))}
                      </ConfluencePageList>
                    )}
                  </React.Fragment>
                ))}
              </SpaceList>
            )}
          </>
        )}
      </SectionCard>

      {confluenceCtx && (
        <CtxOverlay onClick={onCloseCtxMenu}>
          <CtxBox style={{ left: confluenceCtx.x, top: confluenceCtx.y }} onClick={(e) => e.stopPropagation()}>
            <CtxMenuItem onClick={() => onOpenInNewTab(confluenceCtx.pageId, confluenceCtx.title)}>새 탭으로 열기</CtxMenuItem>
          </CtxBox>
        </CtxOverlay>
      )}
    </>
  );
};

export default StatsConfluenceSection;

// ── Styled Components ──

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const SectionCard = styled.div`
  background: ${theme.bgPrimary};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1rem;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 1rem;
`;

const SectionIconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${theme.textPrimary};
  flex: 1;
`;

const LoadingArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem 0;
`;

const Spinner = styled.span`
  display: inline-flex;
  color: ${theme.blue};
  animation: ${spin} 1s linear infinite;
`;

const LoadingText = styled.span`
  font-size: 0.8125rem;
  color: ${theme.textMuted};
`;

const EmptySection = styled.div`
  padding: 1.5rem 0;
  text-align: center;
  font-size: 0.8125rem;
  color: ${theme.textMuted};
`;

const TotalBadge = styled.div`
  font-size: 0.875rem;
  color: ${theme.textSecondary};

  strong {
    font-weight: 700;
    color: ${theme.textPrimary};
  }
`;

const SpaceList = styled.div`
  border: 1px solid ${theme.border};
  border-radius: 6px;
  overflow: hidden;
`;

const SpaceListHeader = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: ${theme.bgTertiary};
  font-size: 0.75rem;
  font-weight: 600;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.02em;
`;

const SpaceListItem = styled.div<{ $clickable?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.625rem 0.75rem;
  border-top: 1px solid ${theme.border};
  transition: background 0.1s;
  cursor: ${({ $clickable }) => $clickable ? 'pointer' : 'default'};
  user-select: none;

  &:hover {
    background: ${theme.bgSecondary};
  }
`;

const SpaceNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;

const StatusExpandIcon = styled.span`
  font-size: 0.625rem;
  color: ${theme.textMuted};
  width: 0.75rem;
  flex-shrink: 0;
`;

const SpaceName = styled.span`
  font-size: 0.8125rem;
  color: ${theme.textPrimary};
`;

const SpaceCount = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${theme.textSecondary};
`;

const ConfluencePageList = styled.div`
  border-top: 1px solid ${theme.border};
  background: ${theme.bgSecondary};
`;

const ConfluencePageItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem 0.5rem 2rem;
  cursor: pointer;
  transition: background 0.1s;
  border-bottom: 1px solid ${theme.border};

  &:last-child { border-bottom: none; }
  &:hover { background: ${theme.bgTertiary}; }
`;

const ConfluencePageTitle = styled.span`
  font-size: 0.8125rem;
  color: ${theme.textPrimary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
`;

const ConfluencePageDate = styled.span`
  font-size: 0.75rem;
  color: ${theme.textMuted};
  white-space: nowrap;
  flex-shrink: 0;
`;

const CtxOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 500;
`;

const CtxBox = styled.div`
  position: fixed;
  background: ${theme.bgPrimary};
  border: 1px solid ${theme.border};
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  min-width: 140px;
  padding: 0.25rem;
  z-index: 501;
`;

const CtxMenuItem = styled.div`
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  color: ${theme.textPrimary};
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: ${theme.blueLight};
    color: ${theme.blue};
  }
`;
