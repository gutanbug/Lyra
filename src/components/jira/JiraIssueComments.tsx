import styled, { keyframes } from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { formatDate } from 'lib/utils/jiraUtils';
import { Send, Edit2, Trash2, CornerDownRight, X, Smile, Plus } from 'lucide-react';
import EmojiPickerPanel from 'components/common/EmojiPicker';
import AdfCommentEditor from 'components/common/AdfCommentEditor';
import AdfRenderer from 'components/common/AdfRenderer';
import type { NormalizedComment, CommentThread } from 'types/jira';
import type { LinkMeta, FileMeta } from 'components/common/AdfRenderer';
import type { UseJiraCommentsReturn } from 'lib/hooks/useJiraComments';

interface JiraIssueCommentsProps {
  commentState: UseJiraCommentsReturn;
  buildCommentThreads: (comments: NormalizedComment[]) => CommentThread[];
  handleAdfLinkClick: (href: string, text?: string) => void;
  mediaUrlMap: Record<string, string>;
  linkMetaMap: Record<string, LinkMeta>;
  fileMetaMap?: Record<string, FileMeta>;
  onFileClick?: (fileMeta: FileMeta) => void;
  accountId: string | undefined;
  issueKey: string;
}

const JiraIssueComments = ({
  commentState,
  buildCommentThreads,
  handleAdfLinkClick,
  mediaUrlMap,
  linkMetaMap,
  fileMetaMap,
  onFileClick,
  accountId,
  issueKey,
}: JiraIssueCommentsProps) => {
  const {
    comments,
    commentsExpanded, setCommentsExpanded,
    isSubmitting: isSubmittingComment,
    replyTarget, setReplyTarget,
    editTarget, setEditTarget,
    editEditorEmpty, setEditEditorEmpty,
    editorEmpty, setEditorEmpty,
    isDeletingComment,
    emojiPickerTarget, setEmojiPickerTarget,
    commentReactions,
    newCommentRef, editCommentRef,
    handleAddComment, handleUpdateComment, handleDeleteComment,
    startReply, startEdit, toggleReaction,
  } = commentState;

  const renderCommentActions = (comment: NormalizedComment) => (
    <CommentActions>
      <CommentActionBtn title="답글" onClick={() => startReply(comment)}>
        <CornerDownRight size={13} />
      </CommentActionBtn>
      <CommentActionBtn title="수정" onClick={() => startEdit(comment)}>
        <Edit2 size={13} />
      </CommentActionBtn>
      <CommentActionBtn
        title="삭제"
        $danger
        onClick={() => { if (window.confirm('댓글을 삭제하시겠습니까?')) handleDeleteComment(comment.id); }}
      >
        {isDeletingComment === comment.id ? <CommentSpinner /> : <Trash2 size={13} />}
      </CommentActionBtn>
      <EmojiPickerWrapper>
        <CommentActionBtn title="반응" onClick={() => setEmojiPickerTarget((v) => v === comment.id ? null : comment.id)}>
          <Smile size={13} />
        </CommentActionBtn>
        {emojiPickerTarget === comment.id && (
          <EmojiPickerPanel
            onSelect={(emoji) => toggleReaction(comment.id, emoji)}
            onClose={() => setEmojiPickerTarget(() => null)}
          />
        )}
      </EmojiPickerWrapper>
    </CommentActions>
  );

  const renderEditArea = (comment: NormalizedComment) => (
    <CommentEditArea>
      <CommentEditorRow>
        <AdfCommentEditor
          ref={editCommentRef}
          defaultValue={comment.rawBody}
          placeholder="댓글 수정..."
          onSave={handleUpdateComment}
          onChangeEmpty={setEditEditorEmpty}
          disabled={isSubmittingComment}
          accountId={accountId}
          issueKey={issueKey}
          hideSaveButton
        />
      </CommentEditorRow>
      <CommentEditActions>
        <CancelBtn onClick={() => setEditTarget(null)}>취소</CancelBtn>
        <SubmitBtn onClick={handleUpdateComment} disabled={isSubmittingComment || editEditorEmpty}>
          {isSubmittingComment ? <CommentSpinner /> : '저장'}
        </SubmitBtn>
      </CommentEditActions>
    </CommentEditArea>
  );

  const renderReactions = (commentId: string) => {
    if ((commentReactions[commentId]?.length ?? 0) === 0) return null;
    return (
      <ReactionBar>
        {commentReactions[commentId].map((emoji) => (
          <ReactionChip key={emoji} onClick={() => toggleReaction(commentId, emoji)}>
            {emoji} <ReactionCount>1</ReactionCount>
          </ReactionChip>
        ))}
        <EmojiPickerWrapper>
          <AddReactionChip onClick={() => setEmojiPickerTarget((v) => v === `${commentId}-bar` ? null : `${commentId}-bar`)}>
            <Plus size={12} />
          </AddReactionChip>
          {emojiPickerTarget === `${commentId}-bar` && (
            <EmojiPickerPanel
              onSelect={(emoji) => toggleReaction(commentId, emoji)}
              onClose={() => setEmojiPickerTarget(() => null)}
            />
          )}
        </EmojiPickerWrapper>
      </ReactionBar>
    );
  };

  return (
    <Section>
      <SectionToggleHeader onClick={() => setCommentsExpanded((v) => !v)}>
        <SectionToggleArrow>{commentsExpanded ? '▼' : '▶'}</SectionToggleArrow>
        <CommentSectionTitle>댓글 ({comments.length})</CommentSectionTitle>
      </SectionToggleHeader>
      {commentsExpanded && (
        <>
          {comments.length === 0 ? (
            <EmptyComments>댓글이 없습니다.</EmptyComments>
          ) : (
            <CommentList>
              {buildCommentThreads(comments).map(({ comment, replies }) => (
                <ThreadGroup key={comment.id}>
                  <CommentItem>
                    <CommentHeader>
                      <CommentAuthorRow>
                        <CommentAuthor>{comment.author}</CommentAuthor>
                        <CommentDate>{formatDate(comment.created)}</CommentDate>
                      </CommentAuthorRow>
                      {renderCommentActions(comment)}
                    </CommentHeader>
                    {editTarget?.id === comment.id ? (
                      renderEditArea(comment)
                    ) : (
                      <CommentAdfBody document={comment.rawBody} onLinkClick={handleAdfLinkClick} mediaUrlMap={mediaUrlMap} linkMetaMap={linkMetaMap} fileMetaMap={fileMetaMap} onFileClick={onFileClick} />
                    )}
                    {renderReactions(comment.id)}
                  </CommentItem>
                  {replies.length > 0 && (
                    <ReplyList>
                      {replies.map((reply) => (
                        <ReplyItem key={reply.id}>
                          <CommentHeader>
                            <CommentAuthorRow>
                              <CommentAuthor>
                                {reply.author}
                                {reply.replyToName && (
                                  <ReplyTarget>
                                    &rarr; {reply.replyToName}
                                  </ReplyTarget>
                                )}
                              </CommentAuthor>
                              <CommentDate>{formatDate(reply.created)}</CommentDate>
                            </CommentAuthorRow>
                            {renderCommentActions(reply)}
                          </CommentHeader>
                          {editTarget?.id === reply.id ? (
                            renderEditArea(reply)
                          ) : (
                            <CommentAdfBody document={reply.rawBody} onLinkClick={handleAdfLinkClick} mediaUrlMap={mediaUrlMap} linkMetaMap={linkMetaMap} />
                          )}
                          {renderReactions(reply.id)}
                        </ReplyItem>
                      ))}
                    </ReplyList>
                  )}
                </ThreadGroup>
              ))}
            </CommentList>
          )}

          {/* 댓글 입력 */}
          <CommentInputArea>
            {replyTarget && (
              <ReplyIndicator>
                <CornerDownRight size={14} />
                <span><strong>{replyTarget.authorName}</strong>에게 답글</span>
                <ReplyIndicatorClose onClick={() => setReplyTarget(null)}><X size={14} /></ReplyIndicatorClose>
              </ReplyIndicator>
            )}
            <CommentEditorRow>
              <AdfCommentEditor
                ref={newCommentRef}
                placeholder={replyTarget ? `${replyTarget.authorName}에게 답글 작성...` : '댓글 작성... (⌘+Enter로 전송)'}
                onSave={handleAddComment}
                onChangeEmpty={setEditorEmpty}
                disabled={isSubmittingComment}
                accountId={accountId}
                issueKey={issueKey}
                hideSaveButton
              />
              <SendBtn
                onClick={handleAddComment}
                disabled={isSubmittingComment || editorEmpty}
                title="댓글 전송 (⌘+Enter)"
              >
                {isSubmittingComment ? <CommentSpinner /> : <Send size={16} />}
              </SendBtn>
            </CommentEditorRow>
          </CommentInputArea>
        </>
      )}
    </Section>
  );
};

export default JiraIssueComments;

const Section = styled.div`
  padding: 1.5rem;
  background: ${jiraTheme.bg.default};
  border-radius: 3px;
  border: 1px solid ${jiraTheme.border};
  margin-bottom: 1rem;
`;

const CommentSectionTitle = styled.h2`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
`;

const SectionToggleHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;

  &:hover ${CommentSectionTitle} {
    color: ${jiraTheme.primary};
  }
`;

const SectionToggleArrow = styled.span`
  font-size: 0.7rem;
  color: ${jiraTheme.text.muted};
  width: 1rem;
  flex-shrink: 0;
`;

const CommentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const ThreadGroup = styled.div``;

const CommentItem = styled.div`
  padding: 0.75rem;
  background: ${jiraTheme.bg.subtle};
  border-radius: 3px;
  border: 1px solid ${jiraTheme.border};
`;

const ReplyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
  margin-left: 1.5rem;
  padding-left: 0.75rem;
  border-left: 2px solid ${jiraTheme.border};
`;

const ReplyItem = styled.div`
  padding: 0.625rem 0.75rem;
  background: ${jiraTheme.bg.default};
  border-radius: 3px;
  border: 1px solid ${jiraTheme.border};
`;

const CommentHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const CommentAuthorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
`;

const CommentAuthor = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
`;

const CommentActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.125rem;
  opacity: 0;
  transition: opacity 0.15s;

  ${CommentItem}:hover &,
  ${ReplyItem}:hover & {
    opacity: 1;
  }
`;

const CommentActionBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 3px;
  color: ${({ $danger }) => $danger ? '#E5493A' : jiraTheme.text.muted};
  cursor: pointer;
  transition: all 0.12s;

  &:hover {
    background: ${({ $danger }) => $danger ? '#FFEBE6' : jiraTheme.bg.hover};
    color: ${({ $danger }) => $danger ? '#BF2600' : jiraTheme.text.primary};
  }
`;

const ReplyTarget = styled.span`
  font-weight: 400;
  font-size: 0.75rem;
  color: ${jiraTheme.text.muted};
`;

const CommentDate = styled.span`
  font-size: 0.75rem;
  color: ${jiraTheme.text.muted};
  flex-shrink: 0;
`;

const CommentAdfBody = styled(AdfRenderer)`
  font-size: 0.8125rem;
`;

const EmptyComments = styled.div`
  font-size: 0.8125rem;
  color: ${jiraTheme.text.muted};
  margin-top: 1rem;
`;

const CommentInputArea = styled.div`
  margin-top: 1rem;
  margin-bottom: -0.5rem;
  padding-top: 1rem;
  border-top: 1px solid ${jiraTheme.border};
`;

const CommentEditorRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;

  & > div:first-child {
    flex: 1;
    min-width: 0;
  }
`;

const SendBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  background: ${jiraTheme.primary};
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  flex-shrink: 0;
  box-shadow: 0 2px 6px ${jiraTheme.primary}40;

  &:hover:not(:disabled) {
    background: ${jiraTheme.primaryHover};
    transform: scale(1.05);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const ReplyIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding: 0.375rem 0.625rem;
  background: ${jiraTheme.primaryLight};
  border-radius: 3px;
  font-size: 0.8125rem;
  color: ${jiraTheme.primary};

  strong { font-weight: 600; }
`;

const ReplyIndicatorClose = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  padding: 0;
  background: transparent;
  border: none;
  color: ${jiraTheme.text.muted};
  cursor: pointer;

  &:hover { color: ${jiraTheme.text.primary}; }
`;

const CommentEditArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const CommentEditActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
`;

const CancelBtn = styled.button`
  padding: 0.3rem 0.75rem;
  font-size: 0.8125rem;
  background: transparent;
  border: 1px solid ${jiraTheme.border};
  border-radius: 3px;
  color: ${jiraTheme.text.secondary};
  cursor: pointer;
  transition: all 0.12s;

  &:hover {
    background: ${jiraTheme.bg.hover};
  }
`;

const SubmitBtn = styled.button`
  padding: 0.3rem 0.75rem;
  font-size: 0.8125rem;
  background: ${jiraTheme.primary};
  border: none;
  border-radius: 3px;
  color: white;
  cursor: pointer;
  transition: background 0.15s;

  &:hover:not(:disabled) {
    background: ${jiraTheme.primaryHover};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const EmojiPickerWrapper = styled.div`
  position: relative;
`;

const ReactionBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.5rem;
`;

const ReactionChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  font-size: 0.875rem;
  background: ${jiraTheme.primaryLight};
  border: 1px solid ${jiraTheme.primary}33;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.12s;

  &:hover {
    background: ${jiraTheme.primary}22;
    border-color: ${jiraTheme.primary};
  }
`;

const ReactionCount = styled.span`
  font-size: 0.75rem;
  color: ${jiraTheme.text.secondary};
  font-weight: 500;
`;

const AddReactionChip = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 24px;
  padding: 0;
  background: ${jiraTheme.bg.hover};
  border: 1px solid ${jiraTheme.border};
  border-radius: 12px;
  cursor: pointer;
  color: ${jiraTheme.text.secondary};
  transition: all 0.12s;

  &:hover {
    background: ${jiraTheme.primary}15;
    border-color: ${jiraTheme.primary}44;
    color: ${jiraTheme.primary};
  }
`;

const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const CommentSpinner = styled.div`
  width: 14px;
  height: 14px;
  border: 2px solid ${jiraTheme.border};
  border-top-color: ${jiraTheme.primary};
  border-radius: 50%;
  animation: ${spinAnimation} 0.6s linear infinite;
`;
