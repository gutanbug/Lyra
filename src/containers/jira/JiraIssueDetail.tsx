import React, { useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useAccount } from 'modules/contexts/account';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { transition } from 'lib/styles/styles';
import {
  EditorActions, SaveButton, CancelButton, EditIconButton,
  LightboxOverlay, LightboxImage,
  PdfOverlay, PdfHeader, PdfTitle, PdfClose, PdfFrame,
  FileLoadingOverlay, FileLoadingSpinner,
} from 'lib/styles/commonStyles';
import { buildCommentThreads } from 'lib/utils/jiraNormalizers';
import { normalizeComments, prependMentionToAdf } from 'lib/utils/jiraNormalizers';
import { extractInlineCardUrls } from 'lib/utils/adfUtils';
import { useTransitionDropdown } from 'lib/hooks/useTransitionDropdown';
import { useAssigneeDropdown } from 'lib/hooks/useAssigneeDropdown';
import { useRichContentLinkHandler, useAdfLinkHandler } from 'lib/hooks/useRichContentLinkHandler';
import { useJiraComments } from 'lib/hooks/useJiraComments';
import { useJiraIssueDetail } from 'lib/hooks/useJiraIssueDetail';
import { useFilePreview } from 'lib/hooks/useFilePreview';
import { usePriorityDropdown } from 'lib/hooks/usePriorityDropdown';
import JiraTransitionDropdown from 'components/jira/JiraTransitionDropdown';
import JiraAssigneeDropdown from 'components/jira/JiraAssigneeDropdown';
import JiraTaskIcon, { resolveTaskType } from 'components/jira/JiraTaskIcon';
import AdfRenderer from 'components/common/AdfRenderer';
import AdfBodyEditor from 'components/common/AdfBodyEditor';
import type { AdfBodyEditorHandle } from 'components/common/AdfBodyEditor';
import JiraPriorityDropdown from 'components/jira/JiraPriorityDropdown';
import { integrationController } from 'controllers/account';
import { Edit2 } from 'lucide-react';
import JiraIssueHeader from 'components/jira/JiraIssueHeader';
import JiraIssueComments from 'components/jira/JiraIssueComments';
import JiraChildIssues from 'components/jira/JiraChildIssues';
import JiraLinkedIssues from 'components/jira/JiraLinkedIssues';
import JiraConfluenceLinks from 'components/jira/JiraConfluenceLinks';

const JiraIssueDetail = () => {
  const { issueKey } = useParams<{ issueKey: string }>();
  const { activeAccount } = useAccount();
  const accountMeta = activeAccount?.metadata as Record<string, unknown> | undefined;
  const myDisplayName = accountMeta?.userDisplayName as string | undefined;
  const myAccountId = accountMeta?.userAccountId as string | undefined;
  const myAvatarUrl = accountMeta?.userAvatarUrl as string | undefined;
  const layoutRef = useRef<HTMLDivElement>(null);

  // resolveCardTitles ref (순환 의존 방지)
  const resolveCardTitlesRef = useRef<(urls: string[]) => Promise<void>>();

  // 댓글 CRUD (useJiraComments 훅)
  const {
    comments, setComments,
    isSubmitting: isSubmittingComment,
    replyTarget, setReplyTarget,
    editTarget, setEditTarget,
    editEditorEmpty, setEditEditorEmpty,
    editorEmpty, setEditorEmpty,
    isDeletingComment,
    emojiPickerTarget, setEmojiPickerTarget,
    commentReactions,
    commentsExpanded, setCommentsExpanded,
    newCommentRef, editCommentRef,
    refreshComments,
    handleAddComment, handleUpdateComment, handleDeleteComment,
    startReply, startEdit, toggleReaction,
  } = useJiraComments({
    accountId: activeAccount?.id,
    issueKey,
    normalizeComments,
    prependMentionToAdf,
    onNewCardUrls: (urls) => resolveCardTitlesRef.current?.(urls),
    extractInlineCardUrls,
  });

  // 이슈 데이터 페칭 및 상태 관리
  const {
    issue,
    isLoading,
    error,
    linkedIssues,
    confluenceLinks,
    expandedPages,
    pageContents,
    loadingPages,
    childIssues,
    childIssuesLoading,
    expandedChildren,
    setExpandedChildren,
    linkMetaMap,
    fileMetaMap,
    attachments,
    attachmentImages,
    mediaUrlMap,
    lightboxSrc,
    setLightboxSrc,
    breadcrumbs,
    handleTransitioned,
    handleAssigned,
    goToChildIssue,
    goToBreadcrumb,
    goBack,
    toggleConfluencePage,
    updateDescriptionAdf,
    updatePriority,
  } = useJiraIssueDetail({
    issueKey,
    activeAccount,
    layoutRef,
    setComments,
    resolveCardTitlesRef,
  });

  const handleContentClick = useRichContentLinkHandler();
  const handleAdfLinkClick = useAdfLinkHandler(linkMetaMap);

  const { target: transitionTarget, transitions, isLoading: isTransitionLoading, dropdownRef: transitionRef, open: openTransitionDropdown, execute: executeTransition, close: closeTransition } = useTransitionDropdown({
    accountId: activeAccount?.id,
    serviceType: 'jira',
    onTransitioned: handleTransitioned,
  });

  const { target: assigneeTarget, users: assigneeUsers, isLoading: isAssigneeLoading, dropdownRef: assigneeRef, open: openAssigneeDropdown, search: searchAssignee, assign: executeAssign, close: closeAssignee } = useAssigneeDropdown({
    accountId: activeAccount?.id,
    serviceType: 'jira',
    onAssigned: handleAssigned,
  });

  // 파일 미리보기 (공통 훅)
  const { previewFile, previewLoading, handleFileClick, closePreview } = useFilePreview({
    accountId: activeAccount?.id,
    serviceType: 'jira',
  });

  // 설명 편집 상태
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [isSavingDesc, setIsSavingDesc] = useState(false);
  const descEditorRef = useRef<AdfBodyEditorHandle>(null);

  const handleSaveDescription = useCallback(async () => {
    const adf = await descEditorRef.current?.getValue();
    if (!adf || !activeAccount || !issueKey) return;
    setIsSavingDesc(true);
    try {
      await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'jira',
        action: 'updateIssueDescription',
        params: { issueKey, description: adf },
      });
      updateDescriptionAdf(adf);
      setIsEditingDesc(false);
    } catch (err) {
      console.error('[JiraIssueDetail] save description error:', err);
    } finally {
      setIsSavingDesc(false);
    }
  }, [activeAccount, issueKey, updateDescriptionAdf]);

  // 우선순위 드롭다운 (공통 훅)
  const { priorityTarget, openPriorityDropdown, handlePriorityChange, closePriorityDropdown } = usePriorityDropdown({
    accountId: activeAccount?.id,
    serviceType: 'jira',
    onPriorityChanged: (_key, name) => updatePriority(name),
  });

  if (!activeAccount) {
    return (
      <Layout ref={layoutRef}>
        <Content>
          <ErrorMessage>계정을 먼저 설정해주세요.</ErrorMessage>
        </Content>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout ref={layoutRef}>
        <Content>
          <Loading>로딩 중...</Loading>
        </Content>
      </Layout>
    );
  }

  if (error || !issue) {
    return (
      <Layout ref={layoutRef}>
        <ToolbarArea>
          <BackButton onClick={goBack}>
            &larr; 뒤로가기
          </BackButton>
        </ToolbarArea>
        <Content>
          <ErrorMessage>{error ?? '이슈를 찾을 수 없습니다.'}</ErrorMessage>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout ref={layoutRef}>
      <ToolbarArea>
        <BackButton onClick={goBack}>
          &larr; 뒤로가기
        </BackButton>
        <Breadcrumbs>
          {breadcrumbs.map((b) => (
            <React.Fragment key={b.key}>
              <BreadcrumbSep>&gt;</BreadcrumbSep>
              <BreadcrumbItem onClick={() => goToBreadcrumb(b.key)} title={b.summary}>
                <JiraTaskIcon type={resolveTaskType(b.issueTypeName)} size={14} />
                <span>{b.key}</span>
                {b.summary && <BreadcrumbSummary>{b.summary}</BreadcrumbSummary>}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
          <BreadcrumbSep>&gt;</BreadcrumbSep>
          <BreadcrumbCurrent title={issue.summary}>
            <JiraTaskIcon type={resolveTaskType(issue.issueTypeName)} size={14} />
            <span>{issue.key}</span>
          </BreadcrumbCurrent>
        </Breadcrumbs>
      </ToolbarArea>

      <Content>
        <>
        {/* 헤더 */}
        <JiraIssueHeader
          issue={issue}
          myDisplayName={myDisplayName}
          activeAccount={activeAccount}
          onOpenTransition={openTransitionDropdown}
          onOpenAssignee={openAssigneeDropdown}
          onOpenPriority={openPriorityDropdown}
        />

        {/* 설명 */}
        {(issue.descriptionAdf || isEditingDesc) && (
          <Section>
            <SectionHeader>
              <SectionTitle>설명</SectionTitle>
              {!isEditingDesc && (
                <EditIconButton $theme={jiraTheme} onClick={() => setIsEditingDesc(true)} title="설명 편집">
                  <Edit2 size={14} />
                </EditIconButton>
              )}
            </SectionHeader>
            {isEditingDesc ? (
              <>
                <AdfBodyEditor
                  ref={descEditorRef}
                  defaultValue={issue.descriptionAdf}
                  accountId={activeAccount.id}
                  issueKey={issueKey}
                  onSave={handleSaveDescription}
                />
                <EditorActions>
                  <CancelButton $theme={jiraTheme} onClick={() => setIsEditingDesc(false)} disabled={isSavingDesc}>취소</CancelButton>
                  <SaveButton $theme={jiraTheme} onClick={handleSaveDescription} disabled={isSavingDesc}>
                    {isSavingDesc ? '저장 중...' : '저장'}
                  </SaveButton>
                </EditorActions>
              </>
            ) : (
              <AdfRenderer document={issue.descriptionAdf} onLinkClick={handleAdfLinkClick} mediaUrlMap={mediaUrlMap} linkMetaMap={linkMetaMap} fileMetaMap={fileMetaMap} onFileClick={handleFileClick} />
            )}
          </Section>
        )}

        {/* 첨부 이미지 */}
        {attachments.length > 0 && (
          <Section>
            <SectionTitle>첨부 이미지 ({attachments.length})</SectionTitle>
            <AttachmentGrid>
              {attachments.map((att) => {
                const src = attachmentImages[att.id];
                return (
                  <AttachmentItem key={att.id}>
                    {src ? (
                      <AttachmentImage
                        src={src}
                        alt={att.filename}
                        onClick={() => setLightboxSrc(src)}
                      />
                    ) : (
                      <AttachmentPlaceholder>로딩 중...</AttachmentPlaceholder>
                    )}
                    <AttachmentFilename title={att.filename}>{att.filename}</AttachmentFilename>
                  </AttachmentItem>
                );
              })}
            </AttachmentGrid>
          </Section>
        )}

        {lightboxSrc && (
          <LightboxOverlay onClick={() => setLightboxSrc(null)}>
            <LightboxImage src={lightboxSrc} alt="첨부 이미지" onClick={(e) => e.stopPropagation()} />
          </LightboxOverlay>
        )}

        {/* 하위 업무 항목 */}
        <JiraChildIssues
          childIssues={childIssues}
          childIssuesLoading={childIssuesLoading}
          expandedChildren={expandedChildren}
          setExpandedChildren={setExpandedChildren}
          goToChildIssue={goToChildIssue}
          myDisplayName={myDisplayName}
          onOpenTransition={openTransitionDropdown}
          onOpenAssignee={openAssigneeDropdown}
          onOpenPriority={openPriorityDropdown}
        />

        {/* 댓글 */}
        <JiraIssueComments
          comments={comments}
          commentsExpanded={commentsExpanded}
          setCommentsExpanded={setCommentsExpanded}
          buildCommentThreads={buildCommentThreads}
          handleAdfLinkClick={handleAdfLinkClick}
          mediaUrlMap={mediaUrlMap}
          linkMetaMap={linkMetaMap}
          fileMetaMap={fileMetaMap}
          onFileClick={handleFileClick}
          accountId={activeAccount?.id}
          issueKey={issueKey}
          isSubmittingComment={isSubmittingComment}
          replyTarget={replyTarget}
          setReplyTarget={setReplyTarget}
          editTarget={editTarget}
          setEditTarget={setEditTarget}
          editEditorEmpty={editEditorEmpty}
          setEditEditorEmpty={setEditEditorEmpty}
          editorEmpty={editorEmpty}
          setEditorEmpty={setEditorEmpty}
          isDeletingComment={isDeletingComment}
          emojiPickerTarget={emojiPickerTarget}
          setEmojiPickerTarget={setEmojiPickerTarget}
          commentReactions={commentReactions}
          newCommentRef={newCommentRef}
          editCommentRef={editCommentRef}
          handleAddComment={handleAddComment}
          handleUpdateComment={handleUpdateComment}
          handleDeleteComment={handleDeleteComment}
          startReply={startReply}
          startEdit={startEdit}
          toggleReaction={toggleReaction}
        />

        {/* 연결된 업무 항목 */}
        <JiraLinkedIssues
          linkedIssues={linkedIssues}
          goToChildIssue={goToChildIssue}
          onOpenTransition={openTransitionDropdown}
        />

        {/* Confluence 콘텐츠 */}
        <JiraConfluenceLinks
          confluenceLinks={confluenceLinks}
          expandedPages={expandedPages}
          loadingPages={loadingPages}
          pageContents={pageContents}
          toggleConfluencePage={toggleConfluencePage}
          handleContentClick={handleContentClick}
          onAdfLinkClick={handleAdfLinkClick}
        />
        </>
      </Content>

      {transitionTarget && (
        <JiraTransitionDropdown
          target={transitionTarget}
          transitions={transitions}
          isLoading={isTransitionLoading}
          dropdownRef={transitionRef}
          onSelect={executeTransition}
          onClose={closeTransition}
        />
      )}
      {assigneeTarget && (
        <JiraAssigneeDropdown
          target={assigneeTarget}
          users={assigneeUsers}
          isLoading={isAssigneeLoading}
          dropdownRef={assigneeRef}
          myAccountId={myAccountId}
          myDisplayName={myDisplayName}
          myAvatarUrl={myAvatarUrl}
          onSearch={searchAssignee}
          onSelect={executeAssign}
          onClose={closeAssignee}
        />
      )}

      {priorityTarget && issue && (
        <JiraPriorityDropdown
          target={priorityTarget}
          currentPriority={issue.priorityName}
          onSelect={handlePriorityChange}
          onClose={closePriorityDropdown}
        />
      )}

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
    </Layout>
  );
};

export default JiraIssueDetail;

const Layout = styled.div`
  flex: 1;
  min-height: 0;
  background: ${jiraTheme.bg.subtle};
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
  background: ${jiraTheme.bg.default};
  border-bottom: 1px solid ${jiraTheme.border};
`;

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: 1px solid ${jiraTheme.border};
  border-radius: 20px;
  color: ${jiraTheme.text.secondary};
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ${transition};

  &:hover {
    background: ${jiraTheme.bg.hover};
    color: ${jiraTheme.text.primary};
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
  color: ${jiraTheme.text.muted};
  font-size: 0.8125rem;
  flex-shrink: 0;
`;

const BreadcrumbItem = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid ${jiraTheme.border};
  border-radius: 20px;
  color: ${jiraTheme.primary};
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ${transition};
  max-width: 280px;

  &:hover {
    background: ${jiraTheme.primaryLight};
    border-color: ${jiraTheme.primary};
  }
`;

const BreadcrumbSummary = styled.span`
  color: ${jiraTheme.text.secondary};
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const BreadcrumbCurrent = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
  background: ${jiraTheme.bg.subtle};
  border-radius: 3px;
  white-space: nowrap;
  flex-shrink: 0;
`;

const Content = styled.main<{ children?: React.ReactNode }>`
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
`;

const Section = styled.div`
  padding: 1.5rem;
  background: ${jiraTheme.bg.default};
  border-radius: 3px;
  border: 1px solid ${jiraTheme.border};
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const Loading = styled.div`
  padding: 4rem 2rem;
  text-align: center;
  color: ${jiraTheme.text.secondary};
`;

const ErrorMessage = styled.div`
  padding: 2rem;
  text-align: center;
  color: #E5493A;
`;

const AttachmentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.75rem;
`;

const AttachmentItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const AttachmentImage = styled.img`
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 3px;
  border: 1px solid ${jiraTheme.border};
  cursor: pointer;
  transition: opacity 0.15s ${transition};

  &:hover {
    opacity: 0.85;
  }
`;

const AttachmentPlaceholder = styled.div`
  width: 100%;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${jiraTheme.bg.subtle};
  border: 1px solid ${jiraTheme.border};
  border-radius: 3px;
  font-size: 0.75rem;
  color: ${jiraTheme.text.muted};
`;

const AttachmentFilename = styled.span`
  font-size: 0.75rem;
  color: ${jiraTheme.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

