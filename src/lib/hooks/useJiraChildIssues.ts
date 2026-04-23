/**
 * Jira 하위 이슈(자식 + 손자) 조회 훅
 * 3단계 폴백(parent 필드 → Epic Link → subTaskIssueTypes 제외) + 손자 이슈 조회
 */
import { useState, useEffect, useCallback } from 'react';
import { integrationController } from 'controllers/account';
import { isEpicType } from 'lib/utils/jiraUtils';
import { parseChildIssues } from 'lib/utils/jiraNormalizers';
import type { ChildIssue } from 'types/jira';
import type { Account } from 'types/account';

export interface ChildWithGrandchildren extends ChildIssue {
  grandchildren: ChildIssue[];
}

export interface UseJiraChildIssuesOptions {
  activeAccount: Account | null;
  issueKey?: string;
  issueTypeName?: string;
  enabled?: boolean;
}

export interface UseJiraChildIssuesResult {
  childIssues: ChildWithGrandchildren[];
  childIssuesLoading: boolean;
  expandedChildren: Set<string>;
  setExpandedChildren: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleTransitionedForChildren: (targetKey: string, toName: string, toCategory: string) => void;
  handleAssignedForChildren: (targetKey: string, displayName: string) => void;
}

function useJiraChildIssues({
  activeAccount,
  issueKey,
  issueTypeName,
  enabled = true,
}: UseJiraChildIssuesOptions): UseJiraChildIssuesResult {
  const [childIssues, setChildIssues] = useState<ChildWithGrandchildren[]>([]);
  const [childIssuesLoading, setChildIssuesLoading] = useState(false);
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!activeAccount || !issueKey || !enabled) {
      setChildIssues([]);
      return;
    }

    let cancelled = false;
    setChildIssuesLoading(true);
    setChildIssues([]);

    const run = async () => {
      try {
        const directChildren: ChildIssue[] = [];
        const seenKeys = new Set<string>();

        // 1) parent 필드 기반 — 직접 하위만
        try {
          const childResult = await integrationController.invoke({
            accountId: activeAccount.id,
            serviceType: 'jira',
            action: 'searchIssues',
            params: {
              jql: `parent = ${issueKey} ORDER BY created ASC`,
              maxResults: 100,
              skipCache: true,
            },
          });
          for (const ci of parseChildIssues(childResult)) {
            if (!seenKeys.has(ci.key)) {
              directChildren.push(ci);
              seenKeys.add(ci.key);
            }
          }
        } catch { /* ignore */ }

        // 2) Epic Link 폴백 (classic Jira 프로젝트) — 서브태스크 제외
        if (isEpicType(issueTypeName || '')) {
          try {
            const epicLinkResult = await integrationController.invoke({
              accountId: activeAccount.id,
              serviceType: 'jira',
              action: 'searchIssues',
              params: {
                jql: `"Epic Link" = ${issueKey} AND issuetype not in subTaskIssueTypes() ORDER BY created ASC`,
                maxResults: 100,
                skipCache: true,
              },
            });
            for (const ci of parseChildIssues(epicLinkResult)) {
              if (!seenKeys.has(ci.key)) {
                directChildren.push(ci);
                seenKeys.add(ci.key);
              }
            }
          } catch {
            // subTaskIssueTypes() 미지원 시 parentKey 필터링으로 폴백
            try {
              const epicLinkResult = await integrationController.invoke({
                accountId: activeAccount.id,
                serviceType: 'jira',
                action: 'searchIssues',
                params: {
                  jql: `"Epic Link" = ${issueKey} ORDER BY created ASC`,
                  maxResults: 100,
                  skipCache: true,
                },
              });
              for (const ci of parseChildIssues(epicLinkResult)) {
                if (!seenKeys.has(ci.key) && (!ci.parentKey || ci.parentKey === issueKey)) {
                  directChildren.push(ci);
                  seenKeys.add(ci.key);
                }
              }
            } catch { /* Epic Link 미지원 인스턴스 무시 */ }
          }
        }

        // parent/Epic Link 쿼리 결과에서 실제 parent가 현재 이슈가 아닌 항목 제거
        const trueDirectChildren = directChildren.filter(
          (c) => !c.parentKey || c.parentKey === issueKey
        );

        if (cancelled) return;
        // 직접 하위 이슈를 먼저 표시 (손자 이슈 로딩 전)
        setChildIssues(trueDirectChildren.map((c) => ({ ...c, grandchildren: [] })));

        // 3) 각 직접 하위 이슈의 손자 이슈 조회
        const childrenWithGc = await Promise.all(
          trueDirectChildren.map(async (child) => {
            let grandchildren: ChildIssue[] = [];
            try {
              const gcResult = await integrationController.invoke({
                accountId: activeAccount.id,
                serviceType: 'jira',
                action: 'searchIssues',
                params: {
                  jql: `parent = ${child.key} ORDER BY created ASC`,
                  maxResults: 50,
                },
              });
              grandchildren = parseChildIssues(gcResult);
            } catch { /* ignore */ }
            return { ...child, grandchildren };
          })
        );

        if (cancelled) return;
        setChildIssues(childrenWithGc);
      } finally {
        if (!cancelled) setChildIssuesLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [activeAccount, issueKey, issueTypeName, enabled]);

  const handleTransitionedForChildren = useCallback(
    (targetKey: string, toName: string, toCategory: string) => {
      setChildIssues((prev) =>
        prev.map((ci) => {
          if (ci.key === targetKey) return { ...ci, statusName: toName, statusCategory: toCategory };
          const updatedGc = ci.grandchildren.map((gc) =>
            gc.key === targetKey ? { ...gc, statusName: toName, statusCategory: toCategory } : gc
          );
          return { ...ci, grandchildren: updatedGc };
        })
      );
    },
    []
  );

  const handleAssignedForChildren = useCallback(
    (targetKey: string, displayName: string) => {
      setChildIssues((prev) =>
        prev.map((ci) => {
          if (ci.key === targetKey) return { ...ci, assigneeName: displayName };
          const updatedGc = ci.grandchildren.map((gc) =>
            gc.key === targetKey ? { ...gc, assigneeName: displayName } : gc
          );
          return { ...ci, grandchildren: updatedGc };
        })
      );
    },
    []
  );

  return {
    childIssues,
    childIssuesLoading,
    expandedChildren,
    setExpandedChildren,
    handleTransitionedForChildren,
    handleAssignedForChildren,
  };
}

export default useJiraChildIssues;
