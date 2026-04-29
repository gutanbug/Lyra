import React, { useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import styled from 'styled-components';
import { IntlProvider } from 'react-intl';
import { Editor, EditorContext, WithEditorActions, EditorActions } from '@atlaskit/editor-core';
import { useAdfEditor, AdfEditorImperativeHandle } from 'lib/hooks/useAdfEditor';
import { adfEditorBaseStyles } from 'lib/styles/adfEditorBaseStyles';

export type AdfCommentEditorHandle = AdfEditorImperativeHandle;

interface AdfCommentEditorProps {
  placeholder?: string;
  /** Cmd/Ctrl+Enter 시 호출 (ADF 전달) */
  onSave?: (adf: unknown) => void;
  /** 내용 변경 시 호출 (빈 상태 여부) */
  onChangeEmpty?: (isEmpty: boolean) => void;
  disabled?: boolean;
  /** 멘션 검색용 Jira 계정 ID */
  accountId?: string;
  /** 멘션 검색용 이슈 키 */
  issueKey?: string;
  /** 초기 ADF 문서 (수정 모드용) */
  defaultValue?: unknown;
  /** Save 버튼 숨김 (수정 모드에서 별도 저장 버튼 사용 시) */
  hideSaveButton?: boolean;
  /** Confluence 전용 / 커맨드 활성화 */
  confluenceMode?: boolean;
}

const noop = () => {};

const AdfCommentEditor = forwardRef<AdfCommentEditorHandle, AdfCommentEditorProps>(
  ({ placeholder, onSave, onChangeEmpty, disabled, accountId, issueKey, defaultValue, hideSaveButton, confluenceMode }, ref) => {
    const {
      processedDefaultValue,
      mentionProvider,
      quickInsertOpts,
      handleChange,
      imperativeHandle,
      setActions,
    } = useAdfEditor({ defaultValue, onChangeEmpty, accountId, issueKey, confluenceMode });

    useImperativeHandle(ref, () => imperativeHandle, [imperativeHandle]);

    // onSave를 ref로 관리하여 Editor에 전달되는 handleSave가 변경되지 않도록 함
    // → Editor re-render 방지 → ProseMirror DOM 충돌(removeChild) 방지
    const onSaveRef = useRef(onSave);
    onSaveRef.current = onSave;

    const actionsRef = useRef<EditorActions | null>(null);
    const handleSave = useCallback(async () => {
      if (!actionsRef.current) return;
      const adf = await actionsRef.current.getValue();
      if (adf) onSaveRef.current?.(adf);
    }, []);

    return (
      <IntlProvider locale="ko" onError={noop}>
        <EditorContext>
          <WithEditorActions
            render={(actions: EditorActions) => {
              actionsRef.current = actions;
              setActions(actions);
              return (
                <EditorWrapper $hideSaveButton={hideSaveButton}>
                  <Editor
                    appearance="comment"
                    placeholder={placeholder || '댓글 작성...'}
                    disabled={disabled}
                    onSave={handleSave}
                    onChange={handleChange}
                    mentionProvider={mentionProvider}
                    defaultValue={processedDefaultValue as any}
                    allowPanel={true}
                    allowRule={true}
                    allowDate={true}
                    allowStatus={true}
                    allowExpand={true}
                    allowTasksAndDecisions={true}
                    codeBlock={{ allowCopyToClipboard: true }}
                    quickInsert={quickInsertOpts}
                  />
                </EditorWrapper>
              );
            }}
          />
        </EditorContext>
      </IntlProvider>
    );
  }
);

AdfCommentEditor.displayName = 'AdfCommentEditor';

export default AdfCommentEditor;

// ── Styled Components ──

const EditorWrapper = styled.div<{ $hideSaveButton?: boolean }>`
  ${adfEditorBaseStyles}

  ${({ $hideSaveButton }) => $hideSaveButton && `
    [data-testid="ak-editor-secondary-toolbar"] {
      display: none !important;
    }
  `}

  .ak-editor-content-area {
    min-height: 80px;
    max-height: 300px;
    overflow-y: auto;

    .ProseMirror {
      padding: 8px 12px;
      min-height: 60px;
    }
  }
`;
