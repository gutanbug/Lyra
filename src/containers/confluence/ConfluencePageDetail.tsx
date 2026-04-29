import { useCallback } from 'react';
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
import { useAdfBodyEditor } from 'lib/hooks/useAdfBodyEditor';
import { isAtlassianAccount } from 'types/account';
import AdfRenderer from 'components/common/AdfRenderer';
import AdfBodyEditor from 'components/common/AdfBodyEditor';
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

  // 본문 편집 상태 (공통 훅)
  const buildBodyParams = useCallback((adf: unknown) => ({
    pageId: page?.id,
    title: page?.title,
    body: adf,
    version: page?.version,
  }), [page?.id, page?.title, page?.version]);
  const handleBodySaved = useCallback((adf: unknown) => {
    setPage((prev) => prev ? { ...prev, bodyAdf: adf, version: prev.version + 1 } : prev);
  }, [setPage]);
  const handleBodyConflict = useCallback(() => {
    alert('다른 사용자가 이 페이지를 수정했습니다. 페이지를 새로고침 후 다시 시도해주세요.');
  }, []);
  const {
    isEditing: isEditingBody,
    isSaving: isSavingBody,
    editorRef: bodyEditorRef,
    startEdit: startEditBody,
    cancelEdit: cancelEditBody,
    save: handleSaveBody,
  } = useAdfBodyEditor({
    accountId: activeAccount?.id,
    serviceType: 'confluence',
    action: 'updatePageBody',
    buildParams: buildBodyParams,
    onSaved: handleBodySaved,
    onConflict: handleBodyConflict,
  });

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
                  <CancelButton $theme={confluenceTheme} onClick={cancelEditBody} disabled={isSavingBody}>취소</CancelButton>
                  <SaveButton $theme={confluenceTheme} onClick={handleSaveBody} disabled={isSavingBody}>
                    {isSavingBody ? '저장 중...' : '저장'}
                  </SaveButton>
                </EditorActions>
              </>
            ) : (
              <>
                {page.bodyAdf && (
                  <BodyEditRow>
                    <EditButtonWithLabel $theme={confluenceTheme} onClick={startEditBody} title="본문 편집">
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
                    linkMetaMap={linkMetaMap}
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
