import React, { useCallback, useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { confluenceTheme } from 'lib/styles/confluenceTheme';
import { transition } from 'lib/styles/styles';
import { resolveConfluenceAttachments } from 'lib/utils/confluenceToHtml';
import { enrichJiraLinksInHtml } from 'lib/utils/jiraLinkEnricher';
import { useRichContentLinkHandler, useAdfLinkHandler } from 'lib/hooks/useRichContentLinkHandler';
import { useTabs } from 'modules/contexts/splitView';
import { isAtlassianAccount } from 'types/account';
import type { JiraCredentials } from 'types/account';
import { str } from 'lib/utils/typeHelpers';
import { integrationController } from 'controllers/account';
import AdfRenderer from 'components/common/AdfRenderer';
import type { FileMeta } from 'components/common/AdfRenderer';
import { useConfluencePageDetail } from 'lib/hooks/useConfluencePageDetail';
import ConfluencePageHeader from 'components/confluence/ConfluencePageHeader';
import ConfluenceComments from 'components/confluence/ConfluenceComments';

const ConfluencePageDetailView = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const history = useHistory();
  const { addTab } = useTabs();

  const {
    activeAccount,
    layoutRef,
    page,
    comments,
    commentsExpanded,
    setCommentsExpanded,
    isLoading,
    error,
    attachmentUrlMap,
    fileMetaMap,
    jiraIssueMap,
    lightboxSrc,
    setLightboxSrc,
    linkMetaMap,
  } = useConfluencePageDetail(pageId);

  const [previewFile, setPreviewFile] = useState<{ dataUrl: string; filename: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const baseHandleContentClick = useRichContentLinkHandler();
  const handleAdfLinkClick = useAdfLinkHandler(linkMetaMap);

  const myDisplayName = (activeAccount?.metadata as Record<string, unknown>)?.userDisplayName as string | undefined;

  // ESC 키로 PDF 미리보기 닫기
  useEffect(() => {
    if (!previewFile) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewFile(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewFile]);

  const handleFileClick = useCallback((fileMeta: FileMeta) => {
    if (!activeAccount) return;
    const isPdf = fileMeta.mediaType === 'application/pdf' || fileMeta.filename.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      setPreviewLoading(true);
      integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'confluence',
        action: 'getAttachmentContent',
        params: { downloadUrl: fileMeta.downloadUrl },
      }).then((dataUrl) => {
        if (typeof dataUrl === 'string') {
          setPreviewFile({ dataUrl, filename: fileMeta.filename });
        }
      }).catch(() => { /* ignore */ })
        .finally(() => setPreviewLoading(false));
    } else {
      // 비PDF 파일 → 다운로드
      integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'confluence',
        action: 'getAttachmentContent',
        params: { downloadUrl: fileMeta.downloadUrl },
      }).then((dataUrl) => {
        if (typeof dataUrl === 'string') {
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = fileMeta.filename;
          link.click();
        }
      }).catch(() => { /* ignore */ });
    }
  }, [activeAccount]);

  const goToList = useCallback(() => history.push('/confluence'), [history]);

  const goToPage = useCallback((targetPageId: string) => {
    history.push(`/confluence/page/${targetPageId}`);
  }, [history]);

  const goBack = useCallback(() => {
    goToList();
  }, [goToList]);

  const handleContentClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;

    // 이미지 클릭 -> 라이트박스
    if (target.tagName === 'IMG') {
      const src = (target as HTMLImageElement).src;
      if (src) {
        e.preventDefault();
        e.stopPropagation();
        setLightboxSrc(src);
        return;
      }
    }

    const anchor = target.closest('a');
    if (!anchor) return;

    // Confluence 내부 페이지 링크
    const pageTitle = anchor.getAttribute('data-confluence-page-title');
    if (pageTitle && activeAccount) {
      e.preventDefault();
      e.stopPropagation();
      const linkText = anchor.textContent?.trim() || pageTitle;
      const targetSpaceKey = anchor.getAttribute('data-confluence-space-key') || page?.spaceKey || '';
      const spaceKeys = targetSpaceKey ? [targetSpaceKey] : undefined;
      integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'confluence',
        action: 'searchPages',
        params: { query: pageTitle, searchField: 'title', limit: 5, spaceKeys },
      }).then((result) => {
        const r = result as Record<string, unknown>;
        const results = (r.results ?? []) as Record<string, unknown>[];
        if (results.length > 0) {
          const exactMatch = results.find((item) => str(item.title as unknown) === pageTitle);
          const best = exactMatch || results[0];
          const foundId = str(best.id as unknown);
          if (foundId) {
            addTab('confluence', `/confluence/page/${foundId}`, linkText);
            return;
          }
        }
        const creds = activeAccount.credentials as JiraCredentials;
        const baseUrl = creds.baseUrl?.replace(/\/$/, '') || '';
        const spaceKey = anchor.getAttribute('data-confluence-space-key') || '';
        if (baseUrl) {
          const url = spaceKey
            ? `${baseUrl}/wiki/spaces/${spaceKey}/pages?title=${encodeURIComponent(pageTitle)}`
            : `${baseUrl}/wiki/search?text=${encodeURIComponent(pageTitle)}`;
          const api = (window as any).electronAPI;
          if (api?.openExternal) api.openExternal(url);
          else window.open(url, '_blank');
        }
      }).catch(() => { /* ignore */ });
      return;
    }

    // Jira 매크로 링크
    const jiraKey = anchor.getAttribute('data-jira-key');
    if (jiraKey) {
      e.preventDefault();
      e.stopPropagation();
      const label = anchor.textContent?.trim() || jiraKey;
      addTab('jira', `/jira/issue/${jiraKey}`, label);
      return;
    }

    baseHandleContentClick(e);
  }, [activeAccount, baseHandleContentClick, addTab, page?.spaceKey, setLightboxSrc]);

  if (!activeAccount || !isAtlassianAccount(activeAccount.serviceType)) {
    return (
      <Layout ref={layoutRef}>
        <ToolbarArea>
          <BackButton onClick={goToList}>&larr; 목록으로</BackButton>
        </ToolbarArea>
        <ContentArea>
          <EmptyMsg>연결된 Atlassian 계정이 없습니다.</EmptyMsg>
        </ContentArea>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout ref={layoutRef}>
        <ToolbarArea>
          <BackButton onClick={goToList}>&larr; 목록으로</BackButton>
        </ToolbarArea>
        <ContentArea>
          <EmptyMsg>로딩 중...</EmptyMsg>
        </ContentArea>
      </Layout>
    );
  }

  if (error || !page) {
    return (
      <Layout ref={layoutRef}>
        <ToolbarArea>
          <BackButton onClick={goBack}>&larr; 뒤로</BackButton>
        </ToolbarArea>
        <ContentArea>
          <EmptyMsg>{error || '페이지를 찾을 수 없습니다.'}</EmptyMsg>
        </ContentArea>
      </Layout>
    );
  }

  return (
    <Layout ref={layoutRef}>
      <ToolbarArea>
        <BackButton onClick={goBack}>
          &larr; 목록으로
        </BackButton>
        <Breadcrumbs>
          {page.spaceName && (
            <>
              <BreadcrumbLabel>{page.spaceKey?.startsWith('~') ? page.spaceName : (page.spaceKey || page.spaceName)}</BreadcrumbLabel>
              <BreadcrumbSep>/</BreadcrumbSep>
            </>
          )}
          {page.ancestors.map((ancestor) => (
            <React.Fragment key={ancestor.id}>
              <BreadcrumbLink onClick={() => goToPage(ancestor.id)}>
                {ancestor.title}
              </BreadcrumbLink>
              <BreadcrumbSep>/</BreadcrumbSep>
            </React.Fragment>
          ))}
          <BreadcrumbCurrent>{page.title}</BreadcrumbCurrent>
        </Breadcrumbs>
      </ToolbarArea>

      <ContentArea>
        <ConfluencePageHeader
          page={page}
          myDisplayName={myDisplayName}
          activeAccount={activeAccount}
          onGoToPage={goToPage}
        />

        {/* 본문 */}
        {(page.bodyAdf || page.bodyHtml) && (
          <Section>
            {page.bodyAdf ? (
              <AdfRenderer document={page.bodyAdf} appearance="full-width" mediaUrlMap={attachmentUrlMap} linkMetaMap={linkMetaMap} fileMetaMap={fileMetaMap} onLinkClick={handleAdfLinkClick} onFileClick={handleFileClick} />
            ) : (
              <RichContent onClick={handleContentClick} dangerouslySetInnerHTML={{ __html: enrichJiraLinksInHtml(resolveConfluenceAttachments(page.bodyHtml, attachmentUrlMap), jiraIssueMap) }} />
            )}
          </Section>
        )}

        <ConfluenceComments
          comments={comments}
          commentsExpanded={commentsExpanded}
          onToggleExpanded={() => setCommentsExpanded((v) => !v)}
          attachmentUrlMap={attachmentUrlMap}
          linkMetaMap={linkMetaMap}
          onAdfLinkClick={handleAdfLinkClick}
          onContentClick={handleContentClick}
        />
      </ContentArea>

      {/* PDF 미리보기 */}
      {previewFile && (
        <PdfOverlay onClick={() => setPreviewFile(null)}>
          <PdfHeader>
            <PdfTitle>{previewFile.filename}</PdfTitle>
            <PdfClose onClick={() => setPreviewFile(null)}>&times;</PdfClose>
          </PdfHeader>
          <PdfFrame
            src={previewFile.dataUrl}
            title={previewFile.filename}
            onClick={(e) => e.stopPropagation()}
          />
        </PdfOverlay>
      )}

      {/* 파일 로딩 */}
      {previewLoading && (
        <LoadingOverlay>
          <LoadingSpinner />
        </LoadingOverlay>
      )}

      {/* 이미지 라이트박스 */}
      {lightboxSrc && (
        <LightboxOverlay onClick={() => setLightboxSrc(null)}>
          <LightboxClose onClick={() => setLightboxSrc(null)}>&times;</LightboxClose>
          <LightboxImage
            src={lightboxSrc}
            alt=""
            onClick={(e) => e.stopPropagation()}
          />
        </LightboxOverlay>
      )}
    </Layout>
  );
};

export default ConfluencePageDetailView;

// ── Styled Components ──

const Layout = styled.div`
  flex: 1;
  min-height: 0;
  background: ${confluenceTheme.bg.subtle};
  zoom: 1.2;
  overflow-y: auto;
`;

const ToolbarArea = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: ${confluenceTheme.bg.default};
  border-bottom: 1px solid ${confluenceTheme.border};
`;

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: 1px solid ${confluenceTheme.border};
  border-radius: 20px;
  color: ${confluenceTheme.text.secondary};
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ${transition};
  flex-shrink: 0;

  &:hover {
    background: ${confluenceTheme.bg.hover};
    color: ${confluenceTheme.text.primary};
  }
`;

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

const ContentArea = styled.main`
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
`;

const Section = styled.div`
  padding: 1.5rem;
  background: ${confluenceTheme.bg.default};
  border-radius: 3px;
  border: 1px solid ${confluenceTheme.border};
  margin-bottom: 1rem;
`;

const RichContent = styled.div`
  font-size: 0.875rem;
  color: ${confluenceTheme.text.primary};
  line-height: 1.6;

  p { margin: 0 0 0.5rem 0; }
  p:last-child { margin-bottom: 0; }

  h1, h2, h3, h4, h5, h6 {
    margin: 1rem 0 0.5rem 0;
    color: ${confluenceTheme.text.primary};
    line-height: 1.3;
  }
  h1 { font-size: 1.25rem; }
  h2 { font-size: 1.125rem; }
  h3 { font-size: 1rem; }
  h4, h5, h6 { font-size: 0.875rem; }
  h1:first-of-type, h2:first-of-type, h3:first-of-type { margin-top: 0; }

  ul, ol {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }
  li { margin-bottom: 0.25rem; }

  a {
    color: ${confluenceTheme.primary};
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }

  code {
    background: ${confluenceTheme.bg.subtle};
    border: 1px solid ${confluenceTheme.border};
    border-radius: 3px;
    padding: 0.125rem 0.375rem;
    font-size: 0.8125rem;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  }

  pre {
    background: #263238;
    color: #EEFFFF;
    border-radius: 6px;
    padding: 0.75rem 1rem;
    margin: 0.5rem 0;
    overflow-x: auto;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 0.8125rem;
    line-height: 1.5;
    white-space: pre;
    word-wrap: normal;
    overflow-wrap: normal;

    code {
      background: none;
      border: none;
      padding: 0;
      color: inherit;
      font-size: inherit;
      font-family: inherit;
      white-space: inherit;
    }
  }

  blockquote {
    margin: 0.5rem 0;
    padding: 0.5rem 1rem;
    border-left: 3px solid ${confluenceTheme.primary};
    background: ${confluenceTheme.primaryLight};
    color: ${confluenceTheme.text.secondary};
  }

  hr {
    border: none;
    border-top: 1px solid ${confluenceTheme.border};
    margin: 1rem 0;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5rem 0;
  }
  th, td {
    border: 1px solid ${confluenceTheme.border};
    padding: 0.5rem 0.625rem;
    font-size: 0.8125rem;
    text-align: left;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  th {
    background: ${confluenceTheme.bg.subtle};
    font-weight: 600;
  }

  img {
    max-width: 100%;
    border-radius: 3px;
    cursor: zoom-in;
    transition: opacity 0.15s;
    &:hover { opacity: 0.85; }
  }

  .confluence-panel {
    margin: 0.5rem 0;
    padding: 0.75rem 1rem;
    border-radius: 3px;
    border-left: 3px solid;
  }
  .confluence-panel-info { border-color: ${confluenceTheme.primary}; background: ${confluenceTheme.primaryLight}; }
  .confluence-panel-note { border-color: #6554C0; background: #EAE6FF; }
  .confluence-panel-tip { border-color: #36B37E; background: #E3FCEF; }
  .confluence-panel-warning { border-color: #FF991F; background: #FFFAE6; }

  .adf-media-placeholder {
    color: ${confluenceTheme.text.muted};
    font-style: italic;
  }

  .confluence-mermaid {
    margin: 1rem 0;
    padding: 1rem;
    background: #fafafa;
    border: 1px solid ${confluenceTheme.border};
    border-radius: 3px;
    overflow-x: auto;
    white-space: pre-wrap;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 0.8125rem;
    color: ${confluenceTheme.text.secondary};
  }
  .confluence-mermaid-rendered {
    white-space: normal;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
    background: ${confluenceTheme.bg.default};
    text-align: center;

    svg {
      max-width: 100%;
      height: auto;
    }
  }

  details {
    margin: 0.5rem 0;
    border: 1px solid ${confluenceTheme.border};
    border-radius: 3px;

    summary {
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      font-weight: 500;
      background: ${confluenceTheme.bg.subtle};
      &:hover { background: ${confluenceTheme.bg.hover}; }
    }

    > *:not(summary) {
      padding: 0 0.75rem;
    }
  }

  /* Jira 리치 링크 카드 */
  a.jira-rich-link {
    display: inline-flex;
    align-items: center;
    text-decoration: none !important;
    color: inherit;
    vertical-align: middle;
  }

  .jira-rich-link-inner {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.125rem 0.5rem;
    border: 1px solid ${confluenceTheme.border};
    border-radius: 3px;
    background: ${confluenceTheme.bg.subtle};
    font-size: 0.8125rem;
    line-height: 1.5;
    transition: background 0.15s ease;

    &:hover {
      background: ${confluenceTheme.bg.hover};
    }
  }

  .jira-rich-link-key {
    color: ${confluenceTheme.primary};
    font-weight: 600;
    white-space: nowrap;
  }

  .jira-rich-link-summary {
    color: ${confluenceTheme.text.primary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 300px;
  }

  .jira-rich-link-status {
    display: inline-flex;
    align-items: center;
    padding: 0.0625rem 0.375rem;
    border-radius: 3px;
    font-size: 0.6875rem;
    font-weight: 600;
    white-space: nowrap;
    text-transform: uppercase;
    color: ${confluenceTheme.text.secondary};
  }
`;

const EmptyMsg = styled.div`
  padding: 4rem 2rem;
  text-align: center;
  color: ${confluenceTheme.text.secondary};
`;

// ── 이미지 라이트박스 ──

const lightboxFadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const lightboxZoomIn = keyframes`
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
`;

const LightboxOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  cursor: zoom-out;
  animation: ${lightboxFadeIn} 0.2s ease;
`;

const LightboxImage = styled.img`
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  cursor: default;
  animation: ${lightboxZoomIn} 0.2s ease;
`;

const LightboxClose = styled.button`
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

// ── PDF 미리보기 ──

const PdfOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  animation: ${lightboxFadeIn} 0.2s ease;
`;

const PdfHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  background: rgba(0, 0, 0, 0.4);
  flex-shrink: 0;
`;

const PdfTitle = styled.span`
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PdfClose = styled.button`
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

const PdfFrame = styled.iframe`
  flex: 1;
  border: none;
  background: white;
  margin: 0 2rem 2rem;
  border-radius: 6px;
`;

const spinKeyframe = keyframes`
  to { transform: rotate(360deg); }
`;

const LoadingOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
`;

const LoadingSpinner = styled.div`
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spinKeyframe} 0.7s linear infinite;
`;
