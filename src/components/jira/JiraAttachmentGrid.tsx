import styled from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { transition } from 'lib/styles/styles';
import type { JiraAttachment } from 'types/jira';

interface Props {
  attachments: JiraAttachment[];
  attachmentImages: Record<string, string>;
  onImageClick: (src: string) => void;
  onFileClick?: (attachment: JiraAttachment) => void;
}

const JiraAttachmentGrid = ({ attachments, attachmentImages, onImageClick, onFileClick }: Props) => {
  return (
    <AttachmentGrid>
      {attachments.map((att) => {
        const src = attachmentImages[att.id];
        return (
          <AttachmentItem key={att.id}>
            {src ? (
              <AttachmentImage
                src={src}
                alt={att.filename}
                onClick={() => onImageClick(src)}
              />
            ) : (
              <AttachmentPlaceholder onClick={() => onFileClick?.(att)}>로딩 중...</AttachmentPlaceholder>
            )}
            <AttachmentFilename title={att.filename}>{att.filename}</AttachmentFilename>
          </AttachmentItem>
        );
      })}
    </AttachmentGrid>
  );
};

export default JiraAttachmentGrid;

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
