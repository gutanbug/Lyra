import React from 'react';
import styled from 'styled-components';
import { confluenceTheme } from 'lib/styles/confluenceTheme';
import { transition } from 'lib/styles/styles';

interface Ancestor {
  id: string;
  title: string;
}

interface Props {
  ancestors?: Ancestor[];
  currentTitle?: string;
  spaceName?: string;
  spaceKey?: string;
  onNavigate: (pageId: string) => void;
}

const ConfluenceBreadcrumbs = ({ ancestors, currentTitle, spaceName, spaceKey, onNavigate }: Props) => {
  return (
    <Breadcrumbs>
      {spaceName && (
        <>
          <BreadcrumbLabel>{spaceKey?.startsWith('~') ? spaceName : (spaceKey || spaceName)}</BreadcrumbLabel>
          <BreadcrumbSep>/</BreadcrumbSep>
        </>
      )}
      {ancestors?.map((ancestor) => (
        <React.Fragment key={ancestor.id}>
          <BreadcrumbLink onClick={() => onNavigate(ancestor.id)}>
            {ancestor.title}
          </BreadcrumbLink>
          <BreadcrumbSep>/</BreadcrumbSep>
        </React.Fragment>
      ))}
      <BreadcrumbCurrent>{currentTitle}</BreadcrumbCurrent>
    </Breadcrumbs>
  );
};

export default ConfluenceBreadcrumbs;

const Breadcrumbs = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  overflow: hidden;
  flex-wrap: wrap;
  font-family: ${confluenceTheme.font.body};
`;

const BreadcrumbSep = styled.span`
  color: #cbc5c2;
  font-size: 13px;
  flex-shrink: 0;
`;

const BreadcrumbLabel = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  background: transparent;
  border-radius: 6px;
  color: ${confluenceTheme.text.secondary};
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.01em;
  white-space: nowrap;
  flex-shrink: 0;
`;

const BreadcrumbLink = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: ${confluenceTheme.text.secondary};
  font-family: ${confluenceTheme.font.body};
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.01em;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
  transition: background ${confluenceTheme.motion.fast}, color ${confluenceTheme.motion.fast};

  &:hover {
    background: ${confluenceTheme.hairline};
    color: ${confluenceTheme.text.primary};
  }
`;

const BreadcrumbCurrent = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${confluenceTheme.text.primary};
  border-radius: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
