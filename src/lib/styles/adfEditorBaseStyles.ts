import { css } from 'styled-components';
import { theme } from 'lib/styles/theme';

export const adfEditorBaseStyles = css`
  .akEditor {
    border: 1px solid ${theme.border};
    border-radius: 8px;

    &:focus-within {
      border-color: ${theme.blue};
    }
  }

  [data-testid="ak-editor-main-toolbar"] {
    background: ${theme.bgSecondary};
    border-bottom: 1px solid ${theme.border};
  }

  .assistive {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .ak-editor-content-area .ProseMirror {
    font-size: 0.875rem;
    color: ${theme.textPrimary};

    p.is-empty::before {
      color: ${theme.textMuted};
    }
  }
`;
