import React, { useRef, useCallback, useImperativeHandle, forwardRef, useEffect, useMemo } from 'react';
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

// IntlProvider의 onError를 안정적인 참조로 유지하여 re-render 방지
const noop = () => {};

const AdfCommentEditor = forwardRef<AdfCommentEditorHandle, AdfCommentEditorProps>(
  ({ placeholder, onSave, onChangeEmpty, disabled, accountId, issueKey, defaultValue, hideSaveButton }, ref) => {
    const actionsRef = useRef<EditorActions | null>(null);
    const isEmptyRef = useRef(!defaultValue);
    const onChangeEmptyRef = useRef(onChangeEmpty);
    onChangeEmptyRef.current = onChangeEmpty;

    // onSave를 ref로 관리하여 Editor에 전달되는 handleSave가 변경되지 않도록 함
    // → Editor re-render 방지 → ProseMirror DOM 충돌(removeChild) 방지
    const onSaveRef = useRef(onSave);
    onSaveRef.current = onSave;

    // 멘션 프로바이더 (accountId + issueKey가 있을 때만 활성화)
    const mentionProviderRef = useRef<JiraMentionProvider | null>(null);
    const mentionProvider = useMemo(() => {
      // 이전 프로바이더 정리
      if (mentionProviderRef.current) {
        mentionProviderRef.current.destroy();
        mentionProviderRef.current = null;
      }
      if (!accountId || !issueKey) return undefined;
      const provider = new JiraMentionProvider({ accountId, issueKey });
      mentionProviderRef.current = provider;
      return Promise.resolve(provider);
    }, [accountId, issueKey]);

    // 언마운트 시 프로바이더 정리
    useEffect(() => {
      return () => {
        if (mentionProviderRef.current) {
          mentionProviderRef.current.destroy();
          mentionProviderRef.current = null;
        }
      };
    }, []);

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

    // ref 기반 — onSave가 변경되어도 handleSave 참조가 안정적이므로 Editor가 re-render되지 않음
    const handleSave = useCallback(async () => {
      if (!actionsRef.current) return;
      const adf = await actionsRef.current.getValue();
      if (adf) onSaveRef.current?.(adf);
    }, []);

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
      <IntlProvider locale="ko" onError={noop}>
        <EditorContext>
          <WithEditorActions
            render={(actions: EditorActions) => {
              actionsRef.current = actions;
              return (
                <EditorWrapper $hideSaveButton={hideSaveButton}>
                  <Editor
                    appearance="comment"
                    placeholder={placeholder || '댓글 작성...'}
                    disabled={disabled}
                    onSave={handleSave}
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

const EditorWrapper = styled.div<{ $hideSaveButton?: boolean }>`
  /* 에디터 컨테이너 스타일 오버라이드 */
  .akEditor {
    border: 1px solid ${theme.border};
    border-radius: 8px;

    &:focus-within {
      border-color: ${theme.blue};
    }
  }

  /* 툴바 배경 */
  [data-testid="ak-editor-main-toolbar"] {
    background: ${theme.bgSecondary};
    border-bottom: 1px solid ${theme.border};
  }

  /* Atlaskit 내장 Save 버튼 숨김 */
  ${({ $hideSaveButton }) => $hideSaveButton && `
    [data-testid="ak-editor-secondary-toolbar"] {
      display: none !important;
    }
  `}

  /* Atlaskit 접근성 announcer 시각적 숨김 */
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
