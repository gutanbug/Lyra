import React, { useRef, useCallback, useImperativeHandle, forwardRef, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { IntlProvider } from 'react-intl';
import { Editor, EditorContext, WithEditorActions, EditorActions } from '@atlaskit/editor-core';
import { JiraMentionProvider } from 'lib/providers/JiraMentionProvider';
import { theme } from 'lib/styles/theme';

export interface AdfBodyEditorHandle {
  /** ADF JSON 반환 */
  getValue: () => Promise<unknown | undefined>;
  /** 에디터 초기화 */
  clear: () => void;
  /** 에디터 포커스 */
  focus: () => void;
}

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
}

const noop = () => {};

const AdfBodyEditor = forwardRef<AdfBodyEditorHandle, AdfBodyEditorProps>(
  ({ defaultValue, onChangeEmpty, onSave, disabled, accountId, issueKey }, ref) => {
    const actionsRef = useRef<EditorActions | null>(null);
    const isEmptyRef = useRef(!defaultValue);
    const onChangeEmptyRef = useRef(onChangeEmpty);
    onChangeEmptyRef.current = onChangeEmpty;
    const onSaveRef = useRef(onSave);
    onSaveRef.current = onSave;

    // 멘션 프로바이더
    const mentionProviderRef = useRef<JiraMentionProvider | null>(null);
    const mentionProvider = useMemo(() => {
      if (mentionProviderRef.current) {
        mentionProviderRef.current.destroy();
        mentionProviderRef.current = null;
      }
      if (!accountId || !issueKey) return undefined;
      const provider = new JiraMentionProvider({ accountId, issueKey });
      mentionProviderRef.current = provider;
      return Promise.resolve(provider);
    }, [accountId, issueKey]);

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

    // Cmd/Ctrl+S 단축키 처리
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSaveRef.current?.();
      }
    }, []);

    // ref 기반 — ProseMirror 트랜잭션 중 React 리렌더 방지
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
                <BodyEditorWrapper onKeyDown={handleKeyDown}>
                  <Editor
                    appearance="full-page"
                    disabled={disabled}
                    onChange={handleChange}
                    mentionProvider={mentionProvider}
                    defaultValue={defaultValue as any}
                    allowTables={{ advanced: true }}
                    allowPanel={true}
                    allowRule={true}
                    allowDate={true}
                    allowStatus={true}
                    codeBlock={{ allowCopyToClipboard: true }}
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
    position: sticky;
    top: 0;
    z-index: 10;
  }

  /* 내장 Save 버튼 숨김 */
  [data-testid="ak-editor-secondary-toolbar"] {
    display: none !important;
  }

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

  /* 에디터 입력 영역 — 본문 편집용으로 넓게 */
  .ak-editor-content-area {
    min-height: 300px;
    overflow-y: auto;

    .ProseMirror {
      padding: 16px 20px;
      min-height: 280px;
      font-size: 0.875rem;
      color: ${theme.textPrimary};

      p.is-empty::before {
        color: ${theme.textMuted};
      }
    }
  }
`;
