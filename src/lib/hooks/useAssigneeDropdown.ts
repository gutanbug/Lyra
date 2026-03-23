import { useState, useCallback, useEffect, useRef } from 'react';
import { integrationController } from 'controllers/account';
import type { JiraAssignableUser } from 'types/jira';

interface AssigneePosition {
  issueKey: string;
  top: number;
  left: number;
}

interface UseAssigneeDropdownOptions {
  accountId: string | undefined;
  serviceType: string;
  onAssigned?: (issueKey: string, displayName: string) => void;
}

export function useAssigneeDropdown({ accountId, serviceType, onAssigned }: UseAssigneeDropdownOptions) {
  const [target, setTarget] = useState<AssigneePosition | null>(null);
  const [users, setUsers] = useState<JiraAssignableUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const open = useCallback(async (issueKey: string, e: React.MouseEvent) => {
    if (!accountId) return;
    if (target?.issueKey === issueKey) {
      setTarget(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTarget({ issueKey, top: rect.bottom + 4, left: rect.left + rect.width / 2 });
    setUsers([]);
    setIsLoading(true);
    try {
      const result = await integrationController.invoke({
        accountId,
        serviceType,
        action: 'searchAssignableUsers',
        params: { issueKey, query: '' },
      });
      setUsers((result || []) as JiraAssignableUser[]);
    } catch (err) {
      console.error('[useAssigneeDropdown] searchAssignableUsers error:', err);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, serviceType, target]);

  const search = useCallback(async (query: string) => {
    if (!accountId || !target) return;
    setIsLoading(true);
    try {
      const result = await integrationController.invoke({
        accountId,
        serviceType,
        action: 'searchAssignableUsers',
        params: { issueKey: target.issueKey, query },
      });
      setUsers((result || []) as JiraAssignableUser[]);
    } catch (err) {
      console.error('[useAssigneeDropdown] search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, serviceType, target]);

  const assign = useCallback(async (issueKey: string, accountIdToAssign: string | null, displayName: string) => {
    if (!accountId) return;
    try {
      await integrationController.invoke({
        accountId,
        serviceType,
        action: 'assignIssue',
        params: { issueKey, assigneeAccountId: accountIdToAssign },
      });
      onAssigned?.(issueKey, displayName);
    } catch (err) {
      console.error('[useAssigneeDropdown] assignIssue error:', err);
    } finally {
      setTarget(null);
    }
  }, [accountId, serviceType, onAssigned]);

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

  return { target, users, isLoading, dropdownRef, open, search, assign, close };
}
