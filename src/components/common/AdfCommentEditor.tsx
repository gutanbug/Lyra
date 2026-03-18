import React, { useRef, useCallback, useImperativeHandle, forwardRef, useState, useMemo } from 'react';
import styled from 'styled-components';
import { IntlProvider } from 'react-intl';
import { Editor, EditorContext, WithEditorActions, EditorActions } from '@atlaskit/editor-core';
import { JiraMentionProvider } from 'lib/providers/JiraMentionProvider';
import { theme } from 'lib/styles/theme';

export interface AdfCommentEditorHandle {
  /** ADF JSON 반환 */
  getValue: () => Promise<unknown | undefined>;
  /** 에디터 초기화 */
  clear: () => void;
  /** 에디터 포커스 */
  focus: () => void;
}

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
}

const AdfCommentEditor = forwardRef<AdfCommentEditorHandle, AdfCommentEditorProps>(
  ({ placeholder, onSave, onChangeEmpty, disabled, accountId, issueKey, defaultValue, hideSaveButton }, ref) => {
    const actionsRef = useRef<EditorActions | null>(null);
    const isEmptyRef = useRef(!defaultValue);
    const onChangeEmptyRef = useRef(onChangeEmpty);
    onChangeEmptyRef.current = onChangeEmpty;

    // 멘션 프로바이더 (accountId + issueKey가 있을 때만 활성화)
    const mentionProvider = useMemo(() => {
      if (!accountId || !issueKey) return undefined;
      return Promise.resolve(new JiraMentionProvider({ accountId, issueKey }));
    }, [accountId, issueKey]);

    useImperativeHandle(ref, () => ({
      getValue: async () => {
        if (!actionsRef.current) return undefined;
        return actionsRef.current.getValue();
      },
      clear: () => {
        actionsRef.current?.clear();
        isEmptyRef.current = true;
        onChangeEmptyRef.current?.(true);
      },
      focus: () => {
        actionsRef.current?.focus();
      },
    }), []);

    const handleSave = useCallback(async () => {
      if (!actionsRef.current) return;
      const adf = await actionsRef.current.getValue();
      if (adf) onSave?.(adf);
    }, [onSave]);

    // ref 기반 — ProseMirror 트랜잭션 중 React 리렌더를 발생시키지 않아 DOM 충돌 방지
    const handleChange = useCallback(() => {
      if (!actionsRef.current) return;
      const view = actionsRef.current._privateGetEditorView();
      if (!view) return;
      const docSize = view.state.doc.content.size;
      const nowEmpty = docSize <= 4;
      if (nowEmpty !== isEmptyRef.current) {
        isEmptyRef.current = nowEmpty;
        queueMicrotask(() => {
          onChangeEmptyRef.current?.(nowEmpty);
        });
      }
    }, []);

    return (
      <IntlProvider locale="ko" onError={() => {}}>
        <EditorContext>
          <WithEditorActions
            render={(actions: EditorActions) => {
              actionsRef.current = actions;
              return (
                <EditorWrapper>
                  <Editor
                    appearance="comment"
                    placeholder={placeholder || '댓글 작성...'}
                    disabled={disabled}
                    saveOnEnter={!hideSaveButton}
                    onSave={hideSaveButton ? undefined : handleSave}
                    onChange={handleChange}
                    mentionProvider={mentionProvider}
                    defaultValue={defaultValue as any}
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

const EditorWrapper = styled.div`
  /* 에디터 컨테이너 스타일 오버라이드 */
  .akEditor {
    border: 1px solid ${theme.border};
    border-radius: 8px;
    overflow: hidden;

    &:focus-within {
      border-color: ${theme.blue};
    }
  }

  /* 툴바 배경 */
  [data-testid="ak-editor-main-toolbar"] {
    background: ${theme.bgSecondary};
    border-bottom: 1px solid ${theme.border};
  }

  /* 에디터 입력 영역 */
  .ak-editor-content-area {
    min-height: 80px;
    max-height: 300px;
    overflow-y: auto;

    .ProseMirror {
      padding: 8px 12px;
      min-height: 60px;
      font-size: 0.875rem;
      color: ${theme.textPrimary};

      p.is-empty::before {
        color: ${theme.textMuted};
      }
    }
  }
`;
