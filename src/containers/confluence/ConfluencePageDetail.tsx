import { useCallback, useState, useRef } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { Edit2 } from 'lucide-react';
import { confluenceTheme } from 'lib/styles/confluenceTheme';
import { transition } from 'lib/styles/styles';
import {
  EditorActions, SaveButton, CancelButton, EditButtonWithLabel,
  LightboxOverlay, LightboxClose, LightboxImage,
  PdfOverlay, PdfHeader, PdfTitle, PdfClose, PdfFrame,
  FileLoadingOverlay, FileLoadingSpinner,
  DetailLayout, Toolbar, Section as CommonSection, EmptyState,
} from 'lib/styles/commonStyles';
import { useAdfLinkHandler } from 'lib/hooks/useRichContentLinkHandler';
import useConfluencePageLinkHandler from 'lib/hooks/useConfluencePageLinkHandler';
import { useFilePreview } from 'lib/hooks/useFilePreview';
import { isAtlassianAccount } from 'types/account';
import { integrationController } from 'controllers/account';
import AdfRenderer from 'components/common/AdfRenderer';
import AdfBodyEditor from 'components/common/AdfBodyEditor';
import type { AdfBodyEditorHandle } from 'components/common/AdfBodyEditor';
import { useConfluencePageDetail } from 'lib/hooks/useConfluencePageDetail';
import ConfluencePageHeader from 'components/confluence/ConfluencePageHeader';
import ConfluenceComments from 'components/confluence/ConfluenceComments';
import ConfluenceBreadcrumbs from 'components/confluence/ConfluenceBreadcrumbs';
import ConfluenceHtmlBody from 'components/confluence/ConfluenceHtmlBody';

const ConfluencePageDetailView = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const history = useHistory();

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
    setPage,
  } = useConfluencePageDetail(pageId);

  // 파일 미리보기 (공통 훅)
  const { previewFile, previewLoading, handleFileClick, closePreview } = useFilePreview({
    accountId: activeAccount?.id,
    serviceType: 'confluence',
  });

  // 본문 편집 상태
  const [isEditingBody, setIsEditingBody] = useState(false);
  const [isSavingBody, setIsSavingBody] = useState(false);
  const bodyEditorRef = useRef<AdfBodyEditorHandle>(null);

  const handleSaveBody = useCallback(async () => {
    const adf = await bodyEditorRef.current?.getValue();
    if (!adf || !activeAccount || !page) return;
    setIsSavingBody(true);
    try {
      await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'confluence',
        action: 'updatePageBody',
        params: {
          pageId: page.id,
          title: page.title,
          body: adf,
          version: page.version,
        },
      });
      setPage((prev) => prev ? { ...prev, bodyAdf: adf, version: prev.version + 1 } : prev);
      setIsEditingBody(false);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('409') || msg.includes('conflict')) {
        alert('다른 사용자가 이 페이지를 수정했습니다. 페이지를 새로고침 후 다시 시도해주세요.');
      } else {
        console.error('[ConfluencePageDetail] save body error:', err);
      }
    } finally {
      setIsSavingBody(false);
    }
  }, [activeAccount, page, setPage]);

  const handleAdfLinkClick = useAdfLinkHandler(linkMetaMap);
  const handleContentClick = useConfluencePageLinkHandler({
    activeAccount,
    spaceKey: page?.spaceKey,
    setLightboxSrc,
  });

  const myDisplayName = (activeAccount?.metadata as Record<string, unknown>)?.userDisplayName as string | undefined;

  const goToList = useCallback(() => history.push('/confluence'), [history]);

  const goToPage = useCallback((targetPageId: string) => {
    history.push(`/confluence/page/${targetPageId}`);
  }, [history]);

  const goBack = useCallback(() => {
    goToList();
  }, [goToList]);

  if (!activeAccount || !isAtlassianAccount(activeAccount.serviceType)) {
    return (
      <Layout ref={layoutRef} $theme={confluenceTheme}>
        <ToolbarArea $theme={confluenceTheme}>
          <BackButton onClick={goToList}>&larr; 목록으로</BackButton>
        </ToolbarArea>
        <ContentArea>
          <EmptyMsg $theme={confluenceTheme}>연결된 Atlassian 계정이 없습니다.</EmptyMsg>
        </ContentArea>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout ref={layoutRef} $theme={confluenceTheme}>
        <ToolbarArea $theme={confluenceTheme}>
          <BackButton onClick={goToList}>&larr; 목록으로</BackButton>
        </ToolbarArea>
        <ContentArea>
          <EmptyMsg $theme={confluenceTheme}>로딩 중...</EmptyMsg>
        </ContentArea>
      </Layout>
    );
  }

  if (error || !page) {
    return (
      <Layout ref={layoutRef} $theme={confluenceTheme}>
        <ToolbarArea $theme={confluenceTheme}>
          <BackButton onClick={goBack}>&larr; 뒤로</BackButton>
        </ToolbarArea>
        <ContentArea>
          <EmptyMsg $theme={confluenceTheme}>{error || '페이지를 찾을 수 없습니다.'}</EmptyMsg>
        </ContentArea>
      </Layout>
    );
  }

  return (
    <Layout ref={layoutRef} $theme={confluenceTheme}>
      <ToolbarArea $theme={confluenceTheme}>
        <BackButton onClick={goBack}>
          &larr; 목록으로
        </BackButton>
        <ConfluenceBreadcrumbs
          ancestors={page.ancestors}
          currentTitle={page.title}
          spaceName={page.spaceName}
          spaceKey={page.spaceKey}
          onNavigate={goToPage}
        />
      </ToolbarArea>

      <ContentArea>
        <ConfluencePageHeader
          page={page}
          myDisplayName={myDisplayName}
          activeAccount={activeAccount}
          onGoToPage={goToPage}
        />

        {/* 본문 */}
        {(page.bodyAdf || page.bodyHtml || isEditingBody) && (
          <Section $theme={confluenceTheme}>
            {isEditingBody ? (
              <>
                <AdfBodyEditor
                  ref={bodyEditorRef}
                  defaultValue={page.bodyAdf}
                  onSave={handleSaveBody}
                  confluenceMode
                />
                <EditorActions>
                  <CancelButton $theme={confluenceTheme} onClick={() => setIsEditingBody(false)} disabled={isSavingBody}>취소</CancelButton>
                  <SaveButton $theme={confluenceTheme} onClick={handleSaveBody} disabled={isSavingBody}>
                    {isSavingBody ? '저장 중...' : '저장'}
                  </SaveButton>
                </EditorActions>
              </>
            ) : (
              <>
                {page.bodyAdf && (
                  <BodyEditRow>
                    <EditButtonWithLabel $theme={confluenceTheme} onClick={() => setIsEditingBody(true)} title="본문 편집">
                      <Edit2 size={14} />
                      <span>편집</span>
                    </EditButtonWithLabel>
                  </BodyEditRow>
                )}
                {page.bodyAdf ? (
                  <AdfRenderer document={page.bodyAdf} appearance="full-width" mediaUrlMap={attachmentUrlMap} linkMetaMap={linkMetaMap} fileMetaMap={fileMetaMap} onLinkClick={handleAdfLinkClick} onFileClick={handleFileClick} />
                ) : (
                  <ConfluenceHtmlBody
                    html={page.bodyHtml}
                    attachmentUrlMap={attachmentUrlMap}
                    jiraIssueMap={jiraIssueMap}
                    onClick={handleContentClick}
                  />
                )}
              </>
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
        <PdfOverlay onClick={closePreview}>
          <PdfHeader>
            <PdfTitle>{previewFile.filename}</PdfTitle>
            <PdfClose onClick={closePreview}>&times;</PdfClose>
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
        <FileLoadingOverlay>
          <FileLoadingSpinner />
        </FileLoadingOverlay>
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

const Layout = styled(DetailLayout)`
  zoom: 1.2;
`;

const ToolbarArea = styled(Toolbar)`
  position: sticky;
  top: 0;
  z-index: 10;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
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

// ContentArea: commonStyles에 매칭 없음 — 로컬 유지
const ContentArea = styled.main`
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
`;

const Section = styled(CommonSection)`
  margin-bottom: 1rem;
`;

const EmptyMsg = styled(EmptyState)`
  padding: 4rem 2rem;
`;

// ─── Body Editing ─────────────────────────

const BodyEditRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.5rem;
`;
