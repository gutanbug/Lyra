import React, { useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import styled from 'styled-components';
import { IntlProvider } from 'react-intl';
import { Editor, EditorContext, WithEditorActions, EditorActions } from '@atlaskit/editor-core';
import { useAdfEditor, AdfEditorImperativeHandle } from 'lib/hooks/useAdfEditor';
import { adfEditorBaseStyles } from 'lib/styles/adfEditorBaseStyles';

export type AdfBodyEditorHandle = AdfEditorImperativeHandle;

interface AdfBodyEditorProps {
  /** 초기 ADF 문서 */
  defaultValue?: unknown;
  /** 내용 변경 시 호출 (빈 상태 여부) */
  onChangeEmpty?: (isEmpty: boolean) => void;
  /** Cmd/Ctrl+S 시 호출 */
  onSave?: () => void;
  disabled?: boolean;
  /** 멘션 검색용 Jira 계정 ID */
  accountId?: string;
  /** 멘션 검색용 이슈 키 */
  issueKey?: string;
  /** Confluence 전용 / 커맨드 활성화 (기본 false) */
  confluenceMode?: boolean;
}

const noop = () => {};

const AdfBodyEditor = forwardRef<AdfBodyEditorHandle, AdfBodyEditorProps>(
  ({ defaultValue, onChangeEmpty, onSave, disabled, accountId, issueKey, confluenceMode }, ref) => {
    const {
      processedDefaultValue,
      mentionProvider,
      quickInsertOpts,
      handleChange,
      imperativeHandle,
      setActions,
    } = useAdfEditor({ defaultValue, onChangeEmpty, accountId, issueKey, confluenceMode });

    useImperativeHandle(ref, () => imperativeHandle, [imperativeHandle]);

    const onSaveRef = useRef(onSave);
    onSaveRef.current = onSave;

    // Cmd/Ctrl+S 단축키 처리
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSaveRef.current?.();
      }
    }, []);

    return (
      <IntlProvider locale="ko" onError={noop}>
        <EditorContext>
          <WithEditorActions
            render={(actions: EditorActions) => {
              setActions(actions);
              return (
                <BodyEditorWrapper onKeyDown={handleKeyDown}>
                  <Editor
                    appearance="full-page"
                    disabled={disabled}
                    onChange={handleChange}
                    mentionProvider={mentionProvider}
                    defaultValue={processedDefaultValue as any}
                    allowTables={{ advanced: true }}
                    allowPanel={true}
                    allowRule={true}
                    allowDate={true}
                    allowStatus={true}
                    allowExpand={true}
                    allowTasksAndDecisions={true}
                    allowLayouts={true}
                    codeBlock={{ allowCopyToClipboard: true }}
                    quickInsert={quickInsertOpts}
                  />
                </BodyEditorWrapper>
              );
            }}
          />
        </EditorContext>
      </IntlProvider>
    );
  }
);

AdfBodyEditor.displayName = 'AdfBodyEditor';

export default AdfBodyEditor;

// ── Styled Components ──

const BodyEditorWrapper = styled.div`
  ${adfEditorBaseStyles}

  [data-testid="ak-editor-main-toolbar"] {
    position: sticky;
    top: 0;
    z-index: 10;
  }

  [data-testid="ak-editor-secondary-toolbar"] {
    display: none !important;
  }

  .ak-editor-content-area {
    min-height: 300px;
    overflow-y: auto;

    .ProseMirror {
      padding: 16px 20px;
      min-height: 280px;
    }
  }
`;
