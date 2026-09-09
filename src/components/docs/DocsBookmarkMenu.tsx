import { useState } from 'react';
import styled from 'styled-components';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { DocsPopup } from 'lib/styles/docsCommon';
import { isImeComposing } from 'lib/utils/keyboard';

const DocsBookmarkMenu = () => {
  const { state, setBlockBookmark } = useDocs();
  const [url, setUrl] = useState('');
  const { bookmarkMenu } = state;
  if (!bookmarkMenu) return null;

  const submit = () => {
    if (url.trim()) setBlockBookmark(bookmarkMenu.blockId, url.trim());
  };

  return (
    <DocsPopup data-docs-menu style={{ left: bookmarkMenu.x, top: bookmarkMenu.y, width: 320, padding: 12 }}>
      <Form>
        <UrlInput
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          onKeyDown={(e) => {
            if (isImeComposing(e)) return;
            if (e.key === 'Enter') { e.preventDefault(); submit(); }
          }}
        />
        <SubmitBtn onClick={submit}>삽입</SubmitBtn>
      </Form>
    </DocsPopup>
  );
};

export default DocsBookmarkMenu;

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const UrlInput = styled.input`
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

const SubmitBtn = styled.button`
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
