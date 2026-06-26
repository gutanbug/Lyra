import React from 'react';
import styled from 'styled-components';
import { confluenceTheme } from 'lib/styles/confluenceTheme';
import { formatDate } from 'lib/utils/typeHelpers';
import { resolveConfluenceAttachments } from 'lib/utils/confluenceToHtml';
import AdfRenderer from 'components/common/AdfRenderer';
import type { LinkMeta } from 'components/common/AdfRenderer';
import type { ConfluenceComment } from 'types/confluence';

interface ConfluenceCommentsProps {
  comments: ConfluenceComment[];
  commentsExpanded: boolean;
  onToggleExpanded: () => void;
  attachmentUrlMap: Record<string, string>;
  linkMetaMap: Record<string, LinkMeta>;
  onAdfLinkClick: (url: string) => void;
  onContentClick: (e: React.MouseEvent<HTMLElement>) => void;
}

const ConfluenceComments = ({
  comments,
  commentsExpanded,
  onToggleExpanded,
  attachmentUrlMap,
  linkMetaMap,
  onAdfLinkClick,
  onContentClick,
}: ConfluenceCommentsProps) => {
  return (
    <Section>
      <SectionToggleHeader onClick={onToggleExpanded}>
        <SectionToggleArrow>{commentsExpanded ? '▼' : '▶'}</SectionToggleArrow>
        <SectionTitle>댓글 ({comments.length})</SectionTitle>
      </SectionToggleHeader>
      {commentsExpanded && (
        comments.length === 0 ? (
          <EmptyComments>댓글이 없습니다.</EmptyComments>
        ) : (
          <CommentList>
            {comments.map((comment) => (
              <CommentItem key={comment.id}>
                <CommentHeader>
                  <CommentAuthor>{comment.author}</CommentAuthor>
                  <CommentDate>{formatDate(comment.created)}</CommentDate>
                </CommentHeader>
                {comment.bodyAdf ? (
                  <AdfRenderer document={comment.bodyAdf} appearance="comment" mediaUrlMap={attachmentUrlMap} linkMetaMap={linkMetaMap} onLinkClick={onAdfLinkClick} />
                ) : (
                  <CommentBody onClick={onContentClick} dangerouslySetInnerHTML={{ __html: resolveConfluenceAttachments(comment.bodyHtml, attachmentUrlMap) }} />
                )}
              </CommentItem>
            ))}
          </CommentList>
        )
      )}
    </Section>
  );
};

export default ConfluenceComments;

// ── Styled Components ──

const Section = styled.div`
  padding: 26px 28px;
  background: ${confluenceTheme.bg.default};
  border-radius: ${confluenceTheme.radius.card};
  border: 1px solid ${confluenceTheme.border};
  box-shadow: ${confluenceTheme.shadow.card};
  margin-bottom: 18px;
`;

const SectionTitle = styled.h2`
  margin: 0 0 16px 0;
  font-family: ${confluenceTheme.font.body};
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${confluenceTheme.text.primary};
`;

const SectionToggleHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;

  &:hover ${SectionTitle} {
    color: ${confluenceTheme.primary};
  }

  ${SectionTitle} {
    margin-bottom: 0;
  }
`;

const SectionToggleArrow = styled.span`
  font-size: 10px;
  color: ${confluenceTheme.text.muted};
  width: 16px;
  flex-shrink: 0;
`;

const CommentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 16px;
`;

const CommentItem = styled.div`
  padding: 18px 20px;
  background: ${confluenceTheme.bg.default};
  border-radius: ${confluenceTheme.radius.ctl};
  border: 1px solid ${confluenceTheme.border};
`;

const CommentHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const CommentAuthor = styled.span`
  font-family: ${confluenceTheme.font.body};
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${confluenceTheme.text.primary};
`;

const CommentDate = styled.span`
  font-family: ${confluenceTheme.font.body};
  font-size: 12px;
  color: ${confluenceTheme.text.muted};
  flex-shrink: 0;
`;

const CommentBody = styled.div`
  font-family: ${confluenceTheme.font.body};
  font-size: 14px;
  color: ${confluenceTheme.text.primary};
  line-height: 1.6;

  p { margin: 0 0 8px 0; }
  p:last-child { margin-bottom: 0; }

  a {
    color: ${confluenceTheme.primary};
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }

  img {
    max-width: 100%;
    border-radius: 12px;
  }
`;

const EmptyComments = styled.div`
  font-family: ${confluenceTheme.font.body};
  font-size: 13.5px;
  color: ${confluenceTheme.text.muted};
  margin-top: 16px;
`;
