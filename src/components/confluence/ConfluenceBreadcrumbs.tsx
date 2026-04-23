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
  gap: 0.25rem;
  min-width: 0;
  overflow: hidden;
  flex-wrap: wrap;
`;

const BreadcrumbSep = styled.span`
  color: ${confluenceTheme.text.muted};
  font-size: 0.8125rem;
  flex-shrink: 0;
`;

const BreadcrumbLabel = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid ${confluenceTheme.border};
  border-radius: 20px;
  color: ${confluenceTheme.text.secondary};
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
`;

const BreadcrumbLink = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid ${confluenceTheme.border};
  border-radius: 20px;
  color: ${confluenceTheme.primary};
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.15s ${transition};

  &:hover {
    background: ${confluenceTheme.primaryLight};
    border-color: ${confluenceTheme.primary};
  }
`;

const BreadcrumbCurrent = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${confluenceTheme.text.primary};
  background: ${confluenceTheme.bg.subtle};
  border-radius: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
