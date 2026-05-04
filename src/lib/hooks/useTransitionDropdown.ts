import { useState, useCallback, useEffect, useRef } from 'react';
import { integrationController } from 'controllers/account';
import type { JiraTransition } from 'types/jira';

interface TransitionPosition {
  issueKey: string;
  top: number;
  left: number;
}

interface PendingTransition {
  issueKey: string;
  transition: JiraTransition;
  toName: string;
  toCategory: string;
}

interface UseTransitionDropdownOptions {
  accountId: string | undefined;
  serviceType: string;
  onTransitioned?: (issueKey: string, toName: string, toCategory: string) => void;
}

const hasRequiredFields = (transition: JiraTransition): boolean => {
  const fields = transition.fields ?? {};
  return Object.values(fields).some((f) => f?.required);
};

export function useTransitionDropdown({ accountId, serviceType, onTransitioned }: UseTransitionDropdownOptions) {
  const [target, setTarget] = useState<TransitionPosition | null>(null);
  const [transitions, setTransitions] = useState<JiraTransition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pending, setPending] = useState<PendingTransition | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const open = useCallback(async (issueKey: string, currentStatusName: string, e: React.MouseEvent) => {
    if (!accountId) return;
    if (target?.issueKey === issueKey) {
      setTarget(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTarget({ issueKey, top: rect.bottom + 4, left: rect.left + rect.width / 2 });
    setTransitions([]);
    setIsLoading(true);
    try {
      const result = await integrationController.invoke({
        accountId,
        serviceType,
        action: 'getTransitions',
        params: { issueKey },
      });
      const r = result as Record<string, unknown>;
      const list = (r.transitions ?? []) as JiraTransition[];
      const unique = (Array.isArray(list) ? list : [])
        .filter((t) => t.to?.name !== currentStatusName)
        .filter((t, i, arr) => arr.findIndex((o) => o.to?.name === t.to?.name) === i);
      setTransitions(unique);
    } catch (err) {
      console.error('[useTransitionDropdown] getTransitions error:', err);
      setTransitions([]);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, serviceType, target]);

  const performTransition = useCallback(async (
    issueKey: string,
    transitionId: string,
    toName: string,
    toCategory: string,
    fields?: Record<string, unknown>,
  ) => {
    if (!accountId) return;
    await integrationController.invoke({
      accountId,
      serviceType,
      action: 'transitionIssue',
      params: { issueKey, transitionId, ...(fields ? { fields } : {}) },
    });
    onTransitioned?.(issueKey, toName, toCategory);
  }, [accountId, serviceType, onTransitioned]);

  const execute = useCallback(async (issueKey: string, transitionId: string, toName: string, toCategory: string) => {
    if (!accountId) return;
    const transition = transitions.find((t) => t.id === transitionId);
    if (transition && hasRequiredFields(transition)) {
      // 필수 필드가 있는 전환 → 모달로 위임
      setPending({ issueKey, transition, toName, toCategory });
      setTarget(null);
      return;
    }
    try {
      await performTransition(issueKey, transitionId, toName, toCategory);
    } catch (err) {
      console.error('[useTransitionDropdown] transitionIssue error:', err);
    } finally {
      setTarget(null);
    }
  }, [accountId, transitions, performTransition]);

  const submitPending = useCallback(async (fields: Record<string, unknown>) => {
    if (!pending) return;
    await performTransition(pending.issueKey, pending.transition.id, pending.toName, pending.toCategory, fields);
    setPending(null);
  }, [pending, performTransition]);

  const cancelPending = useCallback(() => setPending(null), []);

  const close = useCallback(() => setTarget(null), []);

  useEffect(() => {
    if (!target) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTarget(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [target]);

  return {
    target,
    transitions,
    isLoading,
    dropdownRef,
    open,
    execute,
    close,
    pending,
    submitPending,
    cancelPending,
  };
}
