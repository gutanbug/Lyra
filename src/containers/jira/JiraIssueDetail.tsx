import React, { useRef, useCallback, useMemo, useState } from 'react';
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
  DetailLayout, Toolbar, Section as CommonSection, SectionTitle as CommonSectionTitle, EmptyState,
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
import { useAdfBodyEditor } from 'lib/hooks/useAdfBodyEditor';
import JiraTransitionDropdown from 'components/jira/JiraTransitionDropdown';
import JiraTransitionFieldsModal from 'containers/jira/JiraTransitionFieldsModal';
import JiraAssigneeDropdown from 'components/jira/JiraAssigneeDropdown';
import AdfRenderer from 'components/common/AdfRenderer';
import AdfBodyEditor from 'components/common/AdfBodyEditor';
import JiraPriorityDropdown from 'components/jira/JiraPriorityDropdown';
import { Edit2 } from 'lucide-react';
import JiraIssueHeader from 'components/jira/JiraIssueHeader';
import JiraIssueComments from 'components/jira/JiraIssueComments';
import JiraChildIssues from 'components/jira/JiraChildIssues';
import JiraLinkedIssues from 'components/jira/JiraLinkedIssues';
import JiraConfluenceLinks from 'components/jira/JiraConfluenceLinks';
import JiraBreadcrumbs from 'components/jira/JiraBreadcrumbs';
import JiraAttachmentGrid from 'components/jira/JiraAttachmentGrid';
import { useProjectFieldConfig } from 'lib/hooks/useProjectFieldConfig';
import { useProjectFieldSchemas } from 'lib/hooks/useProjectFieldSchemas';
import { resolveDetailFieldLayout, type SectionFieldId } from 'lib/utils/jiraDetailFieldConfig';
import JiraFieldEditModal from 'containers/jira/JiraFieldEditModal';
import type { JiraProjectField } from 'types/jira';

/** duedate 등 메타 필드 ID에 대한 가상 ProjectField. schema가 별도 IPC 응답에 없으므로 합성. */
const SYNTHETIC_SCHEMAS: Record<string, JiraProjectField> = {
  duedate: { id: 'duedate', name: '마감일', required: false, schema: { type: 'date' } },
  summary: { id: 'summary', name: '요약', required: false, schema: { type: 'string' } },
};

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
  const commentState = useJiraComments({
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
    updateRawField,
    refetchIssue,
    rawFields,
  } = useJiraIssueDetail({
    issueKey,
    activeAccount,
    layoutRef,
    setComments: commentState.setComments,
    resolveCardTitlesRef,
  });

  const handleContentClick = useRichContentLinkHandler();
  const handleAdfLinkClick = useAdfLinkHandler(linkMetaMap);

  const { target: transitionTarget, transitions, isLoading: isTransitionLoading, dropdownRef: transitionRef, open: openTransitionDropdown, execute: executeTransition, close: closeTransition, pending: pendingTransition, submitPending: submitPendingTransition, cancelPending: cancelPendingTransition } = useTransitionDropdown({
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

  // 설명 편집 상태 (공통 훅)
  const buildDescParams = useCallback((adf: unknown) => ({ issueKey, description: adf }), [issueKey]);
  const handleDescSaved = useCallback((adf: unknown) => updateDescriptionAdf(adf), [updateDescriptionAdf]);
  const {
    isEditing: isEditingDesc,
    isSaving: isSavingDesc,
    editorRef: descEditorRef,
    startEdit: startEditDesc,
    cancelEdit: cancelEditDesc,
    save: handleSaveDescription,
  } = useAdfBodyEditor({
    accountId: activeAccount?.id,
    serviceType: 'jira',
    action: 'updateIssueDescription',
    buildParams: buildDescParams,
    onSaved: handleDescSaved,
  });

  // 우선순위 드롭다운 (공통 훅)
  const { priorityTarget, openPriorityDropdown, handlePriorityChange, closePriorityDropdown } = usePriorityDropdown({
    accountId: activeAccount?.id,
    serviceType: 'jira',
    onPriorityChanged: (_key, name) => updatePriority(name),
  });

  // 프로젝트 필드 설정 → 상세 페이지 layout (섹션 순서/표시, 헤더 메타 그리드, 헤더 코어 가시성)
  const projectKey = useMemo(() => (issueKey?.split('-')[0] ?? ''), [issueKey]);
  const { config: fieldConfig } = useProjectFieldConfig(activeAccount?.id, projectKey);
  const fieldSchemas = useProjectFieldSchemas(activeAccount?.id, projectKey);

  // 편집 모달 (커스텀 필드 + duedate 등)
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const editingField: JiraProjectField | null = useMemo(() => {
    if (!editingFieldId) return null;
    return fieldSchemas[editingFieldId] ?? SYNTHETIC_SCHEMAS[editingFieldId] ?? null;
  }, [editingFieldId, fieldSchemas]);
  const editingCurrentValue = useMemo(() => {
    if (!editingFieldId) return undefined;
    // duedate는 NormalizedDetail에서, 그 외는 rawFields에서 읽음
    if (editingFieldId === 'duedate') return issue?.duedate || null;
    if (editingFieldId === 'summary') return issue?.summary || '';
    return rawFields[editingFieldId];
  }, [editingFieldId, issue, rawFields]);
  const detailLayout = useMemo(() => {
    if (!issue) return null;
    return resolveDetailFieldLayout(fieldConfig, {
      issue,
      myDisplayName,
      onOpenAssignee: openAssigneeDropdown,
      rawFields,
      schemas: fieldSchemas,
    });
  }, [fieldConfig, issue, myDisplayName, openAssigneeDropdown, rawFields, fieldSchemas]);

  // 섹션 ID → 렌더러 매핑. label은 설정 오버라이드(또는 기본값)가 전달됨.
  const sectionRenderers = useMemo<Record<SectionFieldId, (label: string) => React.ReactNode>>(
    () => ({
      description: (label) =>
        (issue?.descriptionAdf || isEditingDesc) && issue && activeAccount ? (
          <Section $theme={jiraTheme}>
            <SectionHeader>
              <SectionTitle $theme={jiraTheme}>{label}</SectionTitle>
              {!isEditingDesc && (
                <EditIconButton $theme={jiraTheme} onClick={startEditDesc} title={`${label} 편집`}>
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
                  <CancelButton $theme={jiraTheme} onClick={cancelEditDesc} disabled={isSavingDesc}>취소</CancelButton>
                  <SaveButton $theme={jiraTheme} onClick={handleSaveDescription} disabled={isSavingDesc}>
                    {isSavingDesc ? '저장 중...' : '저장'}
                  </SaveButton>
                </EditorActions>
              </>
            ) : (
              <AdfRenderer document={issue.descriptionAdf} onLinkClick={handleAdfLinkClick} mediaUrlMap={mediaUrlMap} linkMetaMap={linkMetaMap} fileMetaMap={fileMetaMap} onFileClick={handleFileClick} />
            )}
          </Section>
        ) : null,
      attachment: (label) =>
        attachments.length > 0 ? (
          <Section $theme={jiraTheme}>
            <SectionTitle $theme={jiraTheme}>{label} ({attachments.length})</SectionTitle>
            <JiraAttachmentGrid
              attachments={attachments}
              attachmentImages={attachmentImages}
              onImageClick={setLightboxSrc}
            />
          </Section>
        ) : null,
      subtasks: () => (
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
      ),
      comment: () => (
        <JiraIssueComments
          commentState={commentState}
          buildCommentThreads={buildCommentThreads}
          handleAdfLinkClick={handleAdfLinkClick}
          mediaUrlMap={mediaUrlMap}
          linkMetaMap={linkMetaMap}
          fileMetaMap={fileMetaMap}
          onFileClick={handleFileClick}
          accountId={activeAccount?.id}
          issueKey={issueKey!}
        />
      ),
      issuelinks: () => (
        <JiraLinkedIssues
          linkedIssues={linkedIssues}
          goToChildIssue={goToChildIssue}
          onOpenTransition={openTransitionDropdown}
        />
      ),
    }),
    [
      issue, isEditingDesc, descEditorRef, activeAccount, issueKey,
      handleSaveDescription, cancelEditDesc, isSavingDesc, startEditDesc,
      handleAdfLinkClick, mediaUrlMap, linkMetaMap, fileMetaMap, handleFileClick,
      attachments, attachmentImages, setLightboxSrc,
      childIssues, childIssuesLoading, expandedChildren, setExpandedChildren,
      goToChildIssue, myDisplayName, openTransitionDropdown, openAssigneeDropdown, openPriorityDropdown,
      commentState, linkedIssues,
    ],
  );

  if (!activeAccount) {
    return (
      <Layout ref={layoutRef} $theme={jiraTheme}>
        <Content>
          <ErrorMessage>계정을 먼저 설정해주세요.</ErrorMessage>
        </Content>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout ref={layoutRef} $theme={jiraTheme}>
        <Content>
          <Loading $theme={jiraTheme}>로딩 중...</Loading>
        </Content>
      </Layout>
    );
  }

  if (error || !issue) {
    return (
      <Layout ref={layoutRef} $theme={jiraTheme}>
        <ToolbarArea $theme={jiraTheme}>
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
    <Layout ref={layoutRef} $theme={jiraTheme}>
      <ToolbarArea $theme={jiraTheme}>
        <BackButton onClick={goBack}>
          &larr; 뒤로가기
        </BackButton>
        <JiraBreadcrumbs
          breadcrumbs={breadcrumbs}
          currentIssue={{ key: issue.key, summary: issue.summary, issueTypeName: issue.issueTypeName }}
          onNavigate={goToBreadcrumb}
        />
      </ToolbarArea>

      <Content>
        <>
        {/* 헤더 — 코어(요약/타입/상태/우선순위) 가시성 + MetaGrid 순서 모두 설정 반영 */}
        <JiraIssueHeader
          issue={issue}
          myDisplayName={myDisplayName}
          activeAccount={activeAccount}
          onOpenTransition={openTransitionDropdown}
          onOpenAssignee={openAssigneeDropdown}
          onOpenPriority={openPriorityDropdown}
          metaFields={detailLayout?.metaFields}
          visibility={detailLayout?.visibility}
          onEditField={setEditingFieldId}
        />

        {/* 본문 섹션 — 설정에서 활성화된 필드만, 저장된 순서대로 렌더 */}
        {(detailLayout?.sections ?? []).map((s) => {
          const renderer = sectionRenderers[s.id];
          if (!renderer) return null;
          return <React.Fragment key={s.id}>{renderer(s.label)}</React.Fragment>;
        })}

        {lightboxSrc && (
          <LightboxOverlay onClick={() => setLightboxSrc(null)}>
            <LightboxImage src={lightboxSrc} alt="첨부 이미지" onClick={(e) => e.stopPropagation()} />
          </LightboxOverlay>
        )}

        {/* Confluence 콘텐츠 — Jira 필드 아님, 항상 끝에 노출 */}
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
      {pendingTransition && (
        <JiraTransitionFieldsModal
          accountId={activeAccount?.id}
          issueKey={pendingTransition.issueKey}
          transition={pendingTransition.transition}
          baseUrl={(activeAccount?.credentials as { baseUrl?: string } | undefined)?.baseUrl}
          onSubmit={submitPendingTransition}
          onClose={cancelPendingTransition}
        />
      )}
      {editingFieldId && editingField && activeAccount && (
        <JiraFieldEditModal
          accountId={activeAccount.id}
          issueKey={issueKey}
          projectKey={projectKey}
          field={editingField}
          currentValue={editingCurrentValue}
          baseUrl={(activeAccount.credentials as { baseUrl?: string }).baseUrl}
          onSaved={(fieldId, rawValue) => {
            // 1) 즉시 표시 갱신 (optimistic)
            updateRawField(fieldId, rawValue);
            // 2) 서버 권위값으로 보정 — version/component/user 등 클라이언트에서
            //    풍부화하지 못한 타입의 표시 오류를 자동 교정
            refetchIssue();
          }}
          onClose={() => setEditingFieldId(null)}
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

const Content = styled.main<{ children?: React.ReactNode }>`
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
`;

const Section = styled(CommonSection)`
  margin-bottom: 1rem;
`;

const SectionTitle = styled(CommonSectionTitle)`
  margin: 0;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const Loading = styled(EmptyState)`
  padding: 4rem 2rem;
`;

const ErrorMessage = styled.div`
  padding: 2rem;
  text-align: center;
  color: #E5493A;
`;

