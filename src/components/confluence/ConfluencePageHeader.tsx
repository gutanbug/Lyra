import React from 'react';
import styled from 'styled-components';
import { confluenceTheme } from 'lib/styles/confluenceTheme';
import { transition } from 'lib/styles/styles';
import { formatDate } from 'lib/utils/typeHelpers';
import { ExternalLink } from 'lucide-react';
import type { ConfluencePageDetail as PageDetailType } from 'types/confluence';
import type { JiraCredentials } from 'types/account';

interface ConfluencePageHeaderProps {
  page: PageDetailType;
  myDisplayName?: string;
  activeAccount: { credentials: unknown };
  onGoToPage: (pageId: string) => void;
}

const ConfluencePageHeader = ({ page, myDisplayName, activeAccount, onGoToPage }: ConfluencePageHeaderProps) => {
  const handleOpenExternal = () => {
    const creds = activeAccount.credentials as JiraCredentials;
    const baseUrl = creds.baseUrl?.replace(/\/$/, '') || '';
    if (baseUrl) {
      const url = `${baseUrl}/wiki/spaces/${page.spaceKey}/pages/${page.id}`;
      const api = (window as any).electronAPI;
      if (api?.openExternal) {
        api.openExternal(url);
      } else {
        window.open(url, '_blank');
      }
    }
  };

  return (
    <HeaderCard>
      <HeaderTopRow>
        <PageIcon>
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
            <path d="M3.8 22.6c-.4.7-.9 1.5-1.2 2-.3.5-.1 1.1.4 1.4l5.8 3.5c.5.3 1.1.1 1.4-.3.3-.5.7-1.1 1.2-1.9 2.2-3.5 4.4-3.1 8.4-1.2l5.9 2.8c.5.2 1.1 0 1.4-.5l2.9-6.2c.2-.5 0-1.1-.5-1.3-1.7-.8-5-2.4-8.1-3.8-6.7-3.2-13.4-3.2-17.6 5.5z" fill="white"/>
            <path d="M28.2 9.4c.4-.7.9-1.5 1.2-2 .3-.5.1-1.1-.4-1.4L23.2 2.5c-.5-.3-1.1-.1-1.4.3-.3.5-.7 1.1-1.2 1.9-2.2 3.5-4.4 3.1-8.4 1.2L6.3 3.1c-.5-.2-1.1 0-1.4.5L2 9.8c-.2.5 0 1.1.5 1.3 1.7.8 5 2.4 8.1 3.8 6.7 3.2 13.4 3.2 17.6-5.5z" fill="rgba(255,255,255,0.7)"/>
          </svg>
        </PageIcon>
        <Title>{page.title || '(제목 없음)'}</Title>
        <OpenInBrowserBtn title="Confluence에서 열기" onClick={handleOpenExternal}>
          <ExternalLink size={16} />
        </OpenInBrowserBtn>
      </HeaderTopRow>

      <MetaGrid>
        <MetaItem>
          <MetaLabel>스페이스</MetaLabel>
          <MetaValue>{page.spaceName || page.spaceKey || '-'}</MetaValue>
        </MetaItem>
        <MetaItem>
          <MetaLabel>작성자</MetaLabel>
          <MetaValue $isMe={page.authorName === myDisplayName}>{page.authorName || '-'}</MetaValue>
        </MetaItem>
        <MetaItem>
          <MetaLabel>생성일</MetaLabel>
          <MetaValue>{formatDate(page.createdAt)}</MetaValue>
        </MetaItem>
        <MetaItem>
          <MetaLabel>수정일</MetaLabel>
          <MetaValue>{formatDate(page.updatedAt)}</MetaValue>
        </MetaItem>
        <MetaItem>
          <MetaLabel>버전</MetaLabel>
          <MetaValue>v{page.version}</MetaValue>
        </MetaItem>
      </MetaGrid>
    </HeaderCard>
  );
};

export default ConfluencePageHeader;

// ── Styled Components ──

const HeaderCard = styled.div`
  padding: 1.5rem;
  background: ${confluenceTheme.bg.default};
  border-radius: 3px;
  border: 1px solid ${confluenceTheme.border};
  margin-bottom: 1rem;
`;

const HeaderTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const PageIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 3px;
  background: ${confluenceTheme.primary};
  color: white;
  font-size: 0.875rem;
  font-weight: 700;
  flex-shrink: 0;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: ${confluenceTheme.text.primary};
  line-height: 1.4;
  flex: 1;
  min-width: 0;
`;

const OpenInBrowserBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: 1px solid ${confluenceTheme.border};
  border-radius: 50%;
  color: ${confluenceTheme.text.muted};
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ${transition};

  &:hover {
    background: ${confluenceTheme.primaryLight};
    border-color: ${confluenceTheme.primary};
    color: ${confluenceTheme.primary};
  }
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${confluenceTheme.border};
`;

const MetaItem = styled.div`
  font-size: 0.8125rem;
`;

const MetaLabel = styled.span`
  display: block;
  color: ${confluenceTheme.text.muted};
  margin-bottom: 0.25rem;
`;

const MetaValue = styled.span<{ $isMe?: boolean }>`
  color: ${({ $isMe }) => ($isMe ? confluenceTheme.primary : confluenceTheme.text.primary)};
  font-weight: ${({ $isMe }) => ($isMe ? 600 : 400)};
`;
