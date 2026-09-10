import styled from 'styled-components';
import { useDocs } from 'modules/contexts/docs';
import { docsTheme } from 'lib/styles/docsTheme';
import { DocsPopup } from 'lib/styles/docsCommon';

const DocsDateMenu = () => {
  const { state, setChipDate } = useDocs();
  const { dateMenu } = state;
  if (!dateMenu) return null;

  return (
    <DocsPopup data-docs-menu style={{ left: dateMenu.x, top: dateMenu.y, width: 200, padding: 12 }}>
      <DateInput
        autoFocus
        type="date"
        value={dateMenu.iso}
        onChange={(e) => e.target.value && setChipDate(e.target.value)}
      />
    </DocsPopup>
  );
};

export default DocsDateMenu;

const DateInput = styled.input`
  width: 100%;
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
