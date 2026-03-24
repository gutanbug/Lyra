import { useState, useCallback } from 'react';
import { integrationController } from 'controllers/account';

interface PriorityTarget {
  issueKey: string;
  top: number;
  left: number;
  currentPriority: string;
}

interface UsePriorityDropdownOptions {
  accountId: string | undefined;
  serviceType: 'jira' | 'confluence';
  onPriorityChanged?: (issueKey: string, priorityName: string) => void;
}

export function usePriorityDropdown({ accountId, serviceType, onPriorityChanged }: UsePriorityDropdownOptions) {
  const [priorityTarget, setPriorityTarget] = useState<PriorityTarget | null>(null);

  const openPriorityDropdown = useCallback((issueKey: string, priorityName: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPriorityTarget({ issueKey, top: rect.bottom + 4, left: rect.left + rect.width / 2, currentPriority: priorityName });
  }, []);

  const handlePriorityChange = useCallback(async (issueKey: string, priorityName: string) => {
    if (!accountId) return;
    try {
      await integrationController.invoke({
        accountId,
        serviceType,
        action: 'updateIssuePriority',
        params: { issueKey, priorityName },
      });
      onPriorityChanged?.(issueKey, priorityName);
    } catch (err) {
      console.error(`[usePriorityDropdown] priority change error:`, err);
    }
    setPriorityTarget(null);
  }, [accountId, serviceType, onPriorityChanged]);

  const closePriorityDropdown = useCallback(() => setPriorityTarget(null), []);

  return { priorityTarget, openPriorityDropdown, handlePriorityChange, closePriorityDropdown };
}
