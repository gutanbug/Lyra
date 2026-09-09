import React from 'react';
import styled from 'styled-components';
import { RingSpinner as Spinner } from 'lib/styles/primitives';
import { confluenceTheme } from 'lib/styles/confluenceTheme';
import { transition } from 'lib/styles/styles';
import { isPersonalSpaceKey } from 'lib/utils/confluenceNormalizers';
import { formatDate } from 'lib/utils/typeHelpers';
import type { ConfluenceSpaceGroup } from 'types/confluence';

// ── 인라인 아이콘 ──

const PageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
    <path d="M3.8 22.6c-.4.7-.9 1.5-1.2 2-.3.5-.1 1.1.4 1.4l5.8 3.5c.5.3 1.1.1 1.4-.3.3-.5.7-1.1 1.2-1.9 2.2-3.5 4.4-3.1 8.4-1.2l5.9 2.8c.5.2 1.1 0 1.4-.5l2.9-6.2c.2-.5 0-1.1-.5-1.3-1.7-.8-5-2.4-8.1-3.8-6.7-3.2-13.4-3.2-17.6 5.5z" fill="#1868DB"/>
    <path d="M28.2 9.4c.4-.7.9-1.5 1.2-2 .3-.5.1-1.1-.4-1.4L23.2 2.5c-.5-.3-1.1-.1-1.4.3-.3.5-.7 1.1-1.2 1.9-2.2 3.5-4.4 3.1-8.4 1.2L6.3 3.1c-.5-.2-1.1 0-1.4.5L2 9.8c-.2.5 0 1.1.5 1.3 1.7.8 5 2.4 8.1 3.8 6.7 3.2 13.4 3.2 17.6-5.5z" fill="#6DA2EE"/>
  </svg>
);

const SpaceIconSvg = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={confluenceTheme.space.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

// ── Props ──

interface ConfluencePageListProps {
  spaceGroups: ConfluenceSpaceGroup[];
  expandedSpaces: Set<string>;
  isSearchMode: boolean;
  isLoading: boolean;
  isSearching: boolean;
  myDisplayName?: string;
  onToggleSpace: (spaceId: string) => void;
  onExpandAll: (groups: ConfluenceSpaceGroup[]) => void;
  onCollapseAll: () => void;
  onGoToPage: (pageId: string) => void;
  onItemContextMenu: (e: React.MouseEvent, path: string, label: string) => void;
}

// ── Component ──

const ConfluencePageList = ({
  spaceGroups,
  expandedSpaces,
  isSearchMode,
  isLoading,
  isSearching,
  myDisplayName,
  onToggleSpace,
  onExpandAll,
  onCollapseAll,
  onGoToPage,
  onItemContextMenu,
}: ConfluencePageListProps) => {
  const totalPages = spaceGroups.reduce((n, g) => n + g.pages.length, 0);

  return (
    <Content>
      <SectionHeader>
        <SectionTitle>
          {isSearchMode
            ? `검색 결과 (${totalPages}건)`
            : `내가 작성한 문서 (${totalPages}건)`}
        </SectionTitle>
        {spaceGroups.length > 0 && (
          <ToggleAllButtons>
            <SmallBtn onClick={() => onExpandAll(spaceGroups)}>모두 펼치기</SmallBtn>
            <SmallBtn onClick={onCollapseAll}>모두 접기</SmallBtn>
          </ToggleAllButtons>
        )}
      </SectionHeader>

      {isLoading || isSearching ? (
        <LoadingArea>
          <Spinner />
          <LoadingText>{isSearching ? '검색 중' : '로딩 중'}</LoadingText>
        </LoadingArea>
      ) : spaceGroups.length === 0 ? (
        <Empty>
          {isSearchMode
            ? '검색 결과가 없습니다.'
            : '작성한 문서가 없습니다.'}
        </Empty>
      ) : (
        <SpaceList>
          {spaceGroups.map((group) => {
            const isExpanded = expandedSpaces.has(group.spaceId);
            return (
              <SpaceCard key={group.spaceId}>
                <SpaceHeader onClick={() => onToggleSpace(group.spaceId)}>
                  <SpaceToggle>{isExpanded ? '▼' : '▶'}</SpaceToggle>
                  <SpaceIconWrap>
                    <SpaceIconSvg />
                  </SpaceIconWrap>
                  <SpaceName>{group.spaceName}</SpaceName>
                  {group.spaceKey && !isPersonalSpaceKey(group.spaceKey) && (
                    <SpaceKey>{group.spaceKey}</SpaceKey>
                  )}
                  <SpacePageCount>{group.pages.length}</SpacePageCount>
                </SpaceHeader>

                {isExpanded && (
                  <PageTable>
                    <TableHeader>
                      <span>제목</span>
                      <span>상태</span>
                      <span>작성자</span>
                      <span>수정일</span>
                    </TableHeader>
                    {group.pages.map((page) => (
                      <PageRow
                        key={page.id}
                        onClick={() => onGoToPage(page.id)}
                        onContextMenu={(e) => onItemContextMenu(e, `/confluence/page/${page.id}`, page.title || '(제목 없음)')}
                      >
                        <PageTitleCell>
                          <PageIcon />
                          <PageTitle>{page.title || '(제목 없음)'}</PageTitle>
                        </PageTitleCell>
                        <PageStatus>{page.status}</PageStatus>
                        <AuthorText $isMe={page.authorName === myDisplayName}>{page.authorName || '-'}</AuthorText>
                        <DateText>{formatDate(page.updatedAt || page.createdAt, true)}</DateText>
                      </PageRow>
                    ))}
                  </PageTable>
                )}
              </SpaceCard>
            );
          })}
        </SpaceList>
      )}
    </Content>
  );
};

export default ConfluencePageList;

// ── Styled Components ──

const Content = styled.main`
  flex: 1;
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-family: ${confluenceTheme.font.body};
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${confluenceTheme.text.primary};
`;

const ToggleAllButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const SmallBtn = styled.button`
  padding: 6px 12px;
  font-family: ${confluenceTheme.font.body};
  font-size: 12.5px;
  font-weight: 600;
  background: ${confluenceTheme.bg.default};
  border: 1px solid ${confluenceTheme.borderStrong};
  border-radius: 99px;
  color: ${confluenceTheme.text.secondary};
  cursor: pointer;
  transition: background ${confluenceTheme.motion.fast}, color ${confluenceTheme.motion.fast};

  &:hover { background: ${confluenceTheme.hairline}; color: ${confluenceTheme.text.primary}; }
`;

const LoadingArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 4rem 2rem;
`;

const LoadingText = styled.span`
  font-size: 0.8125rem;
  color: ${confluenceTheme.text.secondary};
`;

const Empty = styled.div`
  padding: 4rem 2rem;
  text-align: center;
  color: ${confluenceTheme.text.secondary};
`;

const SpaceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const SpaceCard = styled.div`
  border-radius: ${confluenceTheme.radius.card};
  border: 1px solid ${confluenceTheme.border};
  background: ${confluenceTheme.bg.default};
  box-shadow: ${confluenceTheme.shadow.card};
  overflow: hidden;
`;

const SpaceHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 22px;
  background: ${confluenceTheme.bg.default};
  cursor: pointer;
  user-select: none;
  transition: background ${confluenceTheme.motion.fast};
  min-width: 0;
  border-left: 3px solid ${confluenceTheme.space.color};

  &:hover { background: ${confluenceTheme.hairline}; }
`;

const SpaceToggle = styled.span`
  font-size: 10px;
  color: ${confluenceTheme.text.muted};
  width: 14px;
  flex-shrink: 0;
`;

const SpaceIconWrap = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
`;

const SpaceName = styled.span`
  font-family: ${confluenceTheme.font.body};
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${confluenceTheme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`;

const SpaceKey = styled.span`
  font-family: ${confluenceTheme.font.body};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${confluenceTheme.text.muted};
  background: ${confluenceTheme.hairline};
  padding: 4px 8px;
  border-radius: 6px;
  flex-shrink: 0;
`;

const SpacePageCount = styled.span`
  font-family: ${confluenceTheme.font.body};
  font-size: 12px;
  font-weight: 700;
  color: ${confluenceTheme.space.ink};
  background: ${confluenceTheme.space.bg};
  border-radius: 99px;
  padding: 4px 10px;
  flex-shrink: 0;
  line-height: 1;
`;

const PageTable = styled.div``;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr minmax(70px, 90px) minmax(70px, 110px) minmax(70px, 100px);
  gap: 14px;
  padding: 12px 22px 12px 32px;
  background: ${confluenceTheme.hairline};
  border-top: 1px solid ${confluenceTheme.border};
  font-family: ${confluenceTheme.font.body};
  font-size: 11px;
  font-weight: 700;
  color: ${confluenceTheme.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-align: center;

  & > span:first-of-type { text-align: left; }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    padding-left: 22px;
    span:nth-child(2),
    span:nth-child(3),
    span:nth-child(4) { display: none; }
  }
`;

const PageRow = styled.div`
  display: grid;
  grid-template-columns: 1fr minmax(70px, 90px) minmax(70px, 110px) minmax(70px, 100px);
  gap: 14px;
  padding: 16px 22px 16px 32px;
  background: ${confluenceTheme.bg.default};
  border-top: 1px solid ${confluenceTheme.hairline};
  align-items: center;
  cursor: pointer;
  transition: background ${confluenceTheme.motion.fast};

  &:first-of-type { border-top: none; }
  &:hover { background: ${confluenceTheme.bg.hover}; }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    padding-left: 22px;
  }
`;

const PageTitleCell = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

const PageTitle = styled.span`
  font-family: ${confluenceTheme.font.body};
  font-size: 14.5px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: ${confluenceTheme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PageStatus = styled.span`
  font-family: ${confluenceTheme.font.body};
  font-size: 11.5px;
  font-weight: 600;
  color: ${confluenceTheme.text.secondary};
  text-align: center;
  text-transform: capitalize;

  @media (max-width: 600px) { display: none; }
`;

const AuthorText = styled.span<{ $isMe?: boolean }>`
  font-family: ${confluenceTheme.font.body};
  font-size: 12.5px;
  color: ${({ $isMe }) => ($isMe ? confluenceTheme.primary : confluenceTheme.text.secondary)};
  font-weight: ${({ $isMe }) => ($isMe ? 600 : 500)};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;

  @media (max-width: 600px) { display: none; }
`;

const DateText = styled.span`
  font-family: ${confluenceTheme.font.body};
  font-size: 12.5px;
  color: ${confluenceTheme.text.muted};
  text-align: center;
  white-space: nowrap;

  @media (max-width: 600px) { display: none; }
`;
