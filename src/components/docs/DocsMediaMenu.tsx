import { useRef, useState } from 'react';
import styled from 'styled-components';
import { Upload, Link2 } from 'lucide-react';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { DocsPopup } from 'lib/styles/docsCommon';
import { putMedia } from 'lib/utils/docsMediaStore';
import { isImeComposing } from 'lib/utils/keyboard';

type Tab = 'upload' | 'embed';

const DocsMediaMenu = () => {
  const { state, setBlockMedia, nextId } = useDocs();
  const [tab, setTab] = useState<Tab>('upload');
  const [embedUrl, setEmbedUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mediaMenu } = state;
  if (!mediaMenu) return null;

  const uploadFile = async (file: File) => {
    const id = nextId('m');
    await putMedia(id, file);
    setBlockMedia(mediaMenu.blockId, { mediaId: id, title: file.name });
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const submitEmbed = () => {
    if (embedUrl.trim()) setBlockMedia(mediaMenu.blockId, { url: embedUrl.trim() });
  };

  return (
    <DocsPopup data-docs-menu style={{ left: mediaMenu.x, top: mediaMenu.y, width: 320, padding: 0 }}>
      <TabRow>
        <TabBtn $active={tab === 'upload'} onClick={() => setTab('upload')}><Upload size={13} />업로드</TabBtn>
        <TabBtn $active={tab === 'embed'} onClick={() => setTab('embed')}><Link2 size={13} />링크 삽입</TabBtn>
      </TabRow>

      {tab === 'upload' ? (
        <Dropzone
          $active={dragOver}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" hidden onChange={onFileInput} />
          <Upload size={22} color={docsTheme.faint} />
          <DropText>
            파일을 드래그하거나 <UploadLink>클릭하여 업로드</UploadLink>
          </DropText>
        </Dropzone>
      ) : (
        <EmbedForm>
          <EmbedInput
            autoFocus
            value={embedUrl}
            onChange={(e) => setEmbedUrl(e.target.value)}
            placeholder="https://…"
            onKeyDown={(e) => {
              if (isImeComposing(e)) return;
              if (e.key === 'Enter') { e.preventDefault(); submitEmbed(); }
            }}
          />
          <EmbedSubmitBtn onClick={submitEmbed}>삽입</EmbedSubmitBtn>
        </EmbedForm>
      )}
    </DocsPopup>
  );
};

export default DocsMediaMenu;

const TabRow = styled.div`
  display: flex;
  border-bottom: 1px solid ${docsTheme.border};
`;

const TabBtn = styled.button<{ $active: boolean }>`
  flex: 1;
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  padding: 10px 0;
  color: ${({ $active }) => ($active ? docsTheme.text : docsTheme.muted)};
  border-bottom: 2px solid ${({ $active }) => ($active ? docsTheme.accent : 'transparent')};
  margin-bottom: -1px;
  &:hover { color: ${docsTheme.text}; }
`;

const Dropzone = styled.div<{ $active: boolean }>`
  margin: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border: 1.5px dashed ${({ $active }) => ($active ? docsTheme.accent : docsTheme.borderStrong)};
  border-radius: 10px;
  background: ${({ $active }) => ($active ? docsTheme.accentSoft : docsTheme.surfaceSoft)};
  cursor: pointer;
  text-align: center;
`;

const DropText = styled.div`
  font-size: 12.5px;
  color: ${docsTheme.muted};
`;

const UploadLink = styled.span`
  color: ${docsTheme.accent};
  font-weight: 600;
`;

const EmbedForm = styled.div`
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const EmbedInput = styled.input`
  font-family: inherit;
  font-size: 12.5px;
  color: ${docsTheme.text};
  background: ${docsTheme.surfaceSoft};
  border: 1px solid ${docsTheme.border};
  border-radius: 8px;
  padding: 8px 9px;
  outline: none;
  &:focus { border-color: ${docsTheme.accent}; }
`;

const EmbedSubmitBtn = styled.button`
  appearance: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: #fff;
  background: ${docsTheme.accent};
  border-radius: 7px;
  padding: 7px 0;
  &:hover { opacity: .92; }
`;
