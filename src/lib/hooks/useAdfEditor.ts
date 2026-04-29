import { useCallback, useEffect, useMemo, useRef } from 'react';
import { EditorActions } from '@atlaskit/editor-core';
import { QuickInsertProvider } from '@atlaskit/editor-common/provider-factory';
import { JiraMentionProvider } from 'lib/providers/JiraMentionProvider';
import { createConfluenceQuickInsertProvider } from 'lib/providers/ConfluenceQuickInsertProvider';
import { preprocessAdfForEditor } from 'lib/utils/adfUtils';

const EMPTY_DOC_SIZE = 4;

export interface AdfEditorImperativeHandle {
  getValue: () => Promise<unknown | undefined>;
  clear: () => void;
  focus: () => void;
}

export interface UseAdfEditorOptions {
  defaultValue?: unknown;
  onChangeEmpty?: (isEmpty: boolean) => void;
  accountId?: string;
  issueKey?: string;
  confluenceMode?: boolean;
}

export interface UseAdfEditorResult {
  processedDefaultValue: unknown;
  mentionProvider: Promise<JiraMentionProvider> | undefined;
  quickInsertOpts: { provider: Promise<QuickInsertProvider> } | true;
  handleChange: () => void;
  imperativeHandle: AdfEditorImperativeHandle;
  setActions: (actions: EditorActions | null) => void;
}

export function useAdfEditor(options: UseAdfEditorOptions): UseAdfEditorResult {
  const { defaultValue, onChangeEmpty, accountId, issueKey, confluenceMode } = options;

  const actionsRef = useRef<EditorActions | null>(null);
  const isEmptyRef = useRef(!defaultValue);

  const processedDefaultValue = useMemo(
    () => defaultValue ? preprocessAdfForEditor(defaultValue) : undefined,
    [defaultValue],
  );

  const quickInsertOpts = useMemo(
    () => confluenceMode ? { provider: createConfluenceQuickInsertProvider() } : true,
    [confluenceMode],
  );

  const onChangeEmptyRef = useRef(onChangeEmpty);
  useEffect(() => {
    onChangeEmptyRef.current = onChangeEmpty;
  }, [onChangeEmpty]);

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

  const handleChange = useCallback(() => {
    if (!actionsRef.current) return;
    const view = actionsRef.current._privateGetEditorView();
    if (!view) return;
    const docSize = view.state.doc.content.size;
    const nowEmpty = docSize <= EMPTY_DOC_SIZE;
    if (nowEmpty !== isEmptyRef.current) {
      isEmptyRef.current = nowEmpty;
      queueMicrotask(() => {
        onChangeEmptyRef.current?.(nowEmpty);
      });
    }
  }, []);

  const imperativeHandle = useMemo<AdfEditorImperativeHandle>(() => ({
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

  const setActions = useCallback((actions: EditorActions | null) => {
    actionsRef.current = actions;
  }, []);

  return {
    processedDefaultValue,
    mentionProvider,
    quickInsertOpts,
    handleChange,
    imperativeHandle,
    setActions,
  };
}
