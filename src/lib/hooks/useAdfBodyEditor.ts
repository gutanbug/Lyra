import { useCallback, useRef, useState } from 'react';
import { integrationController } from 'controllers/account';
import type { AdfBodyEditorHandle } from 'components/common/AdfBodyEditor';

export interface UseAdfBodyEditorParams {
  accountId?: string;
  serviceType: 'jira' | 'confluence';
  action: string;
  buildParams: (adf: unknown) => Record<string, unknown>;
  onSaved: (adf: unknown, result?: unknown) => void;
  onConflict?: (err: unknown) => void;
}

export interface UseAdfBodyEditorResult {
  isEditing: boolean;
  isSaving: boolean;
  editorRef: React.MutableRefObject<AdfBodyEditorHandle | null>;
  startEdit: () => void;
  cancelEdit: () => void;
  save: () => Promise<void>;
}

export function useAdfBodyEditor(params: UseAdfBodyEditorParams): UseAdfBodyEditorResult {
  const { accountId, serviceType, action, buildParams, onSaved, onConflict } = params;
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<AdfBodyEditorHandle | null>(null);

  const startEdit = useCallback(() => setIsEditing(true), []);
  const cancelEdit = useCallback(() => setIsEditing(false), []);

  const save = useCallback(async () => {
    const adf = await editorRef.current?.getValue();
    if (!adf || !accountId) return;
    setIsSaving(true);
    try {
      const result = await integrationController.invoke({
        accountId,
        serviceType,
        action,
        params: buildParams(adf),
      });
      onSaved(adf, result);
      setIsEditing(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (onConflict && (msg.includes('409') || msg.includes('conflict'))) {
        onConflict(err);
        setIsEditing(false);
      } else {
        console.error(`[useAdfBodyEditor] ${serviceType}/${action} error:`, err);
      }
    } finally {
      setIsSaving(false);
    }
  }, [accountId, serviceType, action, buildParams, onSaved, onConflict]);

  return { isEditing, isSaving, editorRef, startEdit, cancelEdit, save };
}
