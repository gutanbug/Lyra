import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { theme } from 'lib/styles/theme';
import { useAccount } from 'modules/contexts/account';
import { integrationController } from 'controllers/account';
import { isAtlassianAccount } from 'types/account';
import { useTabs } from 'modules/contexts/splitView';
import { str, obj } from 'lib/utils/typeHelpers';
import { getStatusCategoryColor } from 'lib/utils/jiraUtils';
import StatsFilters from 'components/stats/StatsFilters';
import StatsJiraSection from 'components/stats/StatsJiraSection';
import StatsConfluenceSection from 'components/stats/StatsConfluenceSection';
import { getYearOptions } from 'components/stats/types';
import type { StatusCount, StatusIssue, RawJiraIssue, ConfluencePageInfo, JiraCtxMenu, ConfluenceCtxMenu } from 'components/stats/types';

const StatsPage = () => {
  const history = useHistory();
  const { accounts, activeAccount } = useAccount();
  const { addTab } = useTabs();
  const yearOptions = useMemo(() => getYearOptions(), []);
  const hasAtlassian = accounts.some((a) => isAtlassianAccount(a.serviceType));

  const [selectedYear, setSelectedYear] = useState<number | null>(new Date().getFullYear());
  const [rawJiraIssues, setRawJiraIssues] = useState<RawJiraIssue[]>([]);
  const [isJiraLoading, setIsJiraLoading] = useState(false);
  const [expandedStatus, setExpandedStatus] = useState<string | null>(null);
  const [statusIssues, setStatusIssues] = useState<StatusIssue[]>([]);
  const [isStatusIssuesLoading, setIsStatusIssuesLoading] = useState(false);
  const [showIssueTypeFilter, setShowIssueTypeFilter] = useState(false);
  const [selectedIssueTypes, setSelectedIssueTypes] = useState<Set<string>>(new Set());
  const [ctxMenu, setCtxMenu] = useState<JiraCtxMenu | null>(null);
  const [confluencePages, setConfluencePages] = useState<ConfluencePageInfo[]>([]);
  const [confluenceTotalCount, setConfluenceTotalCount] = useState(0);
  const [isConfluenceLoading, setIsConfluenceLoading] = useState(false);
  const [expandedSpace, setExpandedSpace] = useState<string | null>(null);
  const [confluenceCtx, setConfluenceCtx] = useState<ConfluenceCtxMenu | null>(null);

  // ── Jira 통계 로드 ──
  const fetchJiraStats = useCallback(async () => {
    if (!activeAccount) return;
    setIsJiraLoading(true);
    try {
      let jql = 'assignee = currentUser()';
      if (selectedYear !== null) {
        jql += ` AND created >= "${selectedYear}-01-01" AND created < "${selectedYear + 1}-01-01"`;
      }
      jql += ' ORDER BY status ASC';

      const rawIssues: RawJiraIssue[] = [];
      let pageToken: string | undefined;
      for (let page = 0; page < 20; page++) {
        const result = await integrationController.invoke({
          accountId: activeAccount.id, serviceType: 'jira', action: 'searchIssues',
          params: { jql, maxResults: 100, skipCache: true, ...(pageToken ? { nextPageToken: pageToken } : {}) },
        }) as Record<string, unknown>;
        const issues = (result.issues ?? []) as Record<string, unknown>[];
        if (!Array.isArray(issues)) break;
        for (const issue of issues) {
          const status = obj(issue.status);
          const issueType = obj(issue.issue_type);
          rawIssues.push({ statusName: str(status?.name) || '기타', statusCategory: str(status?.category) || '', issueType: str(issueType?.name) || '' });
        }
        pageToken = result.nextPageToken as string | undefined;
        if (!pageToken || issues.length < 100) break;
      }
      setRawJiraIssues(rawIssues);
    } catch (err) {
      console.error('[StatsPage] Jira stats error:', err);
      setRawJiraIssues([]);
    } finally {
      setIsJiraLoading(false);
    }
  }, [activeAccount, selectedYear]);

  // ── 상태 클릭 시 이슈 목록 조회 ──
  const toggleStatusIssues = useCallback(async (statusName: string) => {
    if (expandedStatus === statusName) { setExpandedStatus(null); setStatusIssues([]); return; }
    setExpandedStatus(statusName); setStatusIssues([]); setSelectedIssueTypes(new Set()); setIsStatusIssuesLoading(true);
    try {
      if (!activeAccount) return;
      let jql = `assignee = currentUser() AND status = "${statusName}"`;
      if (selectedYear !== null) {
        jql += ` AND created >= "${selectedYear}-01-01" AND created < "${selectedYear + 1}-01-01"`;
      }
      if (selectedIssueTypes.size > 0) {
        jql += ` AND issuetype IN (${Array.from(selectedIssueTypes).map((t) => `"${t}"`).join(', ')})`;
      }
      jql += ' ORDER BY updated DESC';

      const allIssues: StatusIssue[] = [];
      let pageToken: string | undefined;
      for (let page = 0; page < 10; page++) {
        const result = await integrationController.invoke({
          accountId: activeAccount.id, serviceType: 'jira', action: 'searchIssues',
          params: { jql, maxResults: 100, skipCache: true, ...(pageToken ? { nextPageToken: pageToken } : {}) },
        }) as Record<string, unknown>;
        const issues = (result.issues ?? []) as Record<string, unknown>[];
        if (!Array.isArray(issues)) break;
        for (const issue of issues) {
          const issueType = obj(issue.issue_type);
          allIssues.push({ key: str(issue.key), summary: str(issue.summary), issueType: str(issueType?.name) });
        }
        pageToken = result.nextPageToken as string | undefined;
        if (!pageToken || issues.length < 100) break;
      }
      setStatusIssues(allIssues);
    } catch (err) {
      console.error('[StatsPage] fetch status issues error:', err);
    } finally {
      setIsStatusIssuesLoading(false);
    }
  }, [activeAccount, selectedYear, expandedStatus, selectedIssueTypes]);

  // ── Confluence 통계 로드 ──
  const fetchConfluenceStats = useCallback(async () => {
    if (!activeAccount) return;
    setIsConfluenceLoading(true);
    try {
      const result = await integrationController.invoke({
        accountId: activeAccount.id, serviceType: 'confluence', action: 'getMyPages', params: { limit: 500 },
      }) as Record<string, unknown>;
      const results = (result.results ?? []) as Record<string, unknown>[];
      const pages: ConfluencePageInfo[] = [];
      for (const item of results) {
        const space = obj(item.space);
        pages.push({ id: str(item.id), title: str(item.title), createdAt: str(item.createdAt), spaceName: str(space?.name) || str(item.spaceName) || '' });
      }
      const filtered = selectedYear === null ? pages : pages.filter((p) => {
        if (!p.createdAt) return false;
        try { return new Date(p.createdAt).getFullYear() === selectedYear; } catch { return false; }
      });
      setConfluencePages(filtered);
      setConfluenceTotalCount(filtered.length);
    } catch (err) {
      console.error('[StatsPage] Confluence stats error:', err);
      setConfluencePages([]); setConfluenceTotalCount(0);
    } finally {
      setIsConfluenceLoading(false);
    }
  }, [activeAccount, selectedYear]);

  useEffect(() => {
    if (hasAtlassian && activeAccount) { fetchJiraStats(); setExpandedStatus(null); setStatusIssues([]); setSelectedIssueTypes(new Set()); }
  }, [fetchJiraStats, hasAtlassian, activeAccount]);

  useEffect(() => {
    if (hasAtlassian && activeAccount) fetchConfluenceStats();
  }, [fetchConfluenceStats, hasAtlassian, activeAccount]);

  // ── 파생 데이터 ──
  const allIssueTypes = useMemo(() => {
    const types = new Set<string>();
    for (const issue of rawJiraIssues) { if (issue.issueType) types.add(issue.issueType); }
    return Array.from(types).sort();
  }, [rawJiraIssues]);

  const filteredJiraIssues = useMemo(() => {
    if (selectedIssueTypes.size === 0) return rawJiraIssues;
    return rawJiraIssues.filter((i) => selectedIssueTypes.has(i.issueType));
  }, [rawJiraIssues, selectedIssueTypes]);

  const jiraStatusCounts = useMemo(() => {
    const countMap = new Map<string, StatusCount>();
    for (const issue of filteredJiraIssues) {
      const entry = countMap.get(issue.statusName);
      if (entry) { entry.count++; } else { countMap.set(issue.statusName, { name: issue.statusName, category: issue.statusCategory, count: 1 }); }
    }
    const categoryOrder: Record<string, number> = { 'In Progress': 0, '진행 중': 0, 'To Do': 1, '할 일': 1, 'Done': 2, '완료': 2 };
    return Array.from(countMap.values()).sort((a, b) => {
      const oa = categoryOrder[a.category] ?? 3; const ob = categoryOrder[b.category] ?? 3;
      return oa !== ob ? oa - ob : b.count - a.count;
    });
  }, [filteredJiraIssues]);

  const jiraTotalCount = filteredJiraIssues.length;
  const jiraDoneCount = useMemo(() => filteredJiraIssues.filter((i) => i.statusCategory === 'Done' || i.statusCategory === '완료').length, [filteredJiraIssues]);
  const jiraMaxCount = useMemo(() => Math.max(...jiraStatusCounts.map((s) => s.count), 1), [jiraStatusCounts]);

  const jiraStatusGroups = useMemo(() => {
    const categoryMap: Record<string, string> = { 'In Progress': '진행 중', '진행 중': '진행 중', 'To Do': '할 일', '할 일': '할 일', 'Done': '완료', '완료': '완료' };
    const order = ['진행 중', '할 일', '완료', '기타'];
    const groups = new Map<string, StatusCount[]>();
    for (const s of jiraStatusCounts) { const group = categoryMap[s.category] || '기타'; if (!groups.has(group)) groups.set(group, []); groups.get(group)!.push(s); }
    return order.filter((g) => groups.has(g)).map((g) => ({
      category: g,
      color: getStatusCategoryColor(g === '진행 중' ? 'In Progress' : g === '할 일' ? 'To Do' : g === '완료' ? 'Done' : ''),
      statuses: groups.get(g)!.sort((a, b) => b.count - a.count),
      total: groups.get(g)!.reduce((sum, s) => sum + s.count, 0),
    }));
  }, [jiraStatusCounts]);

  const filteredStatusIssues = useMemo(() => {
    if (selectedIssueTypes.size === 0) return statusIssues;
    return statusIssues.filter((i) => selectedIssueTypes.has(i.issueType));
  }, [statusIssues, selectedIssueTypes]);

  const confluenceBySpace = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of confluencePages) { const name = p.spaceName || '(스페이스 없음)'; map.set(name, (map.get(name) || 0) + 1); }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [confluencePages]);

  const confluencePagesBySpace = useMemo(() => {
    const map = new Map<string, ConfluencePageInfo[]>();
    for (const p of confluencePages) { const name = p.spaceName || '(스페이스 없음)'; if (!map.has(name)) map.set(name, []); map.get(name)!.push(p); }
    return map;
  }, [confluencePages]);

  // ── 이벤트 핸들러 ──
  const toggleIssueType = useCallback((type: string) => {
    setSelectedIssueTypes((prev) => { const next = new Set(prev); if (next.has(type)) next.delete(type); else next.add(type); return next; });
  }, []);

  const handleIssueContextMenu = useCallback((e: React.MouseEvent, issueKey: string, label: string) => {
    e.preventDefault(); e.stopPropagation();
    setCtxMenu({ x: e.clientX / 1.2, y: e.clientY / 1.2, issueKey, label });
  }, []);

  const handleOpenInNewTab = useCallback(() => {
    if (!ctxMenu) return;
    addTab('jira', `/jira/issue/${ctxMenu.issueKey}`, ctxMenu.label); setCtxMenu(null);
  }, [ctxMenu, addTab]);

  const handleConfluenceCtxMenu = useCallback((e: React.MouseEvent, pageId: string, title: string) => {
    e.preventDefault(); e.stopPropagation();
    setConfluenceCtx({ x: e.clientX / 1.2, y: e.clientY / 1.2, pageId, title });
  }, []);

  const handleConfluenceOpenInNewTab = useCallback((pageId: string, title: string) => {
    addTab('confluence', `/confluence/page/${pageId}`, title); setConfluenceCtx(null);
  }, [addTab]);

  return (
    <Page>
      <Helmet><title>통계 - Workspace</title></Helmet>
      <Container>
        <StatsFilters selectedYear={selectedYear} yearOptions={yearOptions} onChangeYear={setSelectedYear} hasAtlassian={hasAtlassian} onBack={() => history.push('/jira')} />
        {!hasAtlassian ? (
          <EmptyCard>
            <EmptyText>Atlassian 계정이 설정되어 있지 않습니다.</EmptyText>
            <EmptySubText>계정 설정에서 Atlassian을 연결하면 Jira / Confluence 통계를 확인할 수 있습니다.</EmptySubText>
          </EmptyCard>
        ) : (
          <>
            <StatsJiraSection
              rawJiraIssues={rawJiraIssues} isJiraLoading={isJiraLoading} expandedStatus={expandedStatus}
              statusIssues={statusIssues} filteredStatusIssues={filteredStatusIssues} isStatusIssuesLoading={isStatusIssuesLoading}
              showIssueTypeFilter={showIssueTypeFilter} selectedIssueTypes={selectedIssueTypes} allIssueTypes={allIssueTypes}
              ctxMenu={ctxMenu} selectedYear={selectedYear} jiraStatusGroups={jiraStatusGroups}
              jiraStatusCounts={jiraStatusCounts} jiraTotalCount={jiraTotalCount} jiraDoneCount={jiraDoneCount} jiraMaxCount={jiraMaxCount}
              onExpandStatus={toggleStatusIssues} onToggleIssueType={toggleIssueType}
              onToggleIssueTypeFilter={setShowIssueTypeFilter} onSetSelectedIssueTypes={setSelectedIssueTypes}
              onCtxMenu={handleIssueContextMenu} onCloseCtxMenu={() => setCtxMenu(null)}
              onOpenInNewTab={handleOpenInNewTab} onGoToIssue={(key) => history.push(`/jira/issue/${key}`)}
            />
            <StatsConfluenceSection
              confluencePages={confluencePages} confluenceTotalCount={confluenceTotalCount}
              isConfluenceLoading={isConfluenceLoading} expandedSpace={expandedSpace} confluenceCtx={confluenceCtx}
              selectedYear={selectedYear} confluenceBySpace={confluenceBySpace} confluencePagesBySpace={confluencePagesBySpace}
              onExpandSpace={setExpandedSpace} onCtxMenu={handleConfluenceCtxMenu}
              onCloseCtxMenu={() => setConfluenceCtx(null)} onOpenInNewTab={handleConfluenceOpenInNewTab}
            />
          </>
        )}
      </Container>
    </Page>
  );
};

export default StatsPage;

// ── Styled Components ──

const Page = styled.div`
  flex: 1; min-height: 0; overflow-y: auto; background: ${theme.bgSecondary}; zoom: 1.2;
`;

const Container = styled.div`
  max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem;
`;

const EmptyCard = styled.div`
  padding: 3rem 2rem; background: ${theme.bgPrimary}; border: 1px solid ${theme.border}; border-radius: 8px; text-align: center;
`;

const EmptyText = styled.div`
  font-size: 0.9375rem; font-weight: 600; color: ${theme.textPrimary}; margin-bottom: 0.5rem;
`;

const EmptySubText = styled.div`
  font-size: 0.8125rem; color: ${theme.textMuted};
`;
