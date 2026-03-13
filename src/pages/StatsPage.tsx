import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useHistory } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { ArrowLeft, Loader, Settings, X } from 'lucide-react';
import { theme } from 'lib/styles/theme';
import { transition } from 'lib/styles/styles';
import { useAccount } from 'modules/contexts/account';
import { integrationController } from 'controllers/account';
import { isAtlassianAccount } from 'types/account';
import { getServiceIcon } from 'lib/icons/services';
import { useTabs } from 'modules/contexts/splitView';
import { TASK_TYPE_COLORS, TASK_TYPE_LABELS, resolveTaskType } from 'components/jira/JiraTaskIcon';

// ── 유틸리티 ──

function str(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return '';
}

function obj(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

interface StatusCount {
  name: string;
  category: string;
  count: number;
}

interface StatusIssue {
  key: string;
  summary: string;
  issueType: string;
}

interface RawJiraIssue {
  statusName: string;
  statusCategory: string;
  issueType: string;
}

interface ConfluencePageInfo {
  id: string;
  title: string;
  createdAt: string;
  spaceName: string;
}

// 상태 카테고리별 색상
const STATUS_CATEGORY_COLORS: Record<string, string> = {
  '완료': '#36B37E',
  'Done': '#36B37E',
  '진행 중': '#0052CC',
  'In Progress': '#0052CC',
  '할 일': '#42526E',
  'To Do': '#42526E',
};

function getStatusCategoryColor(category: string): string {
  return STATUS_CATEGORY_COLORS[category] || '#6B778C';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('ko-KR');
  } catch {
    return dateStr;
  }
}

function getYearOptions(): number[] {
  const years: number[] = [];
  for (let y = 2040; y >= 2020; y--) {
    years.push(y);
  }
  return years;
}

const StatsPage = () => {
  const history = useHistory();
  const { accounts, activeAccount } = useAccount();
  const { addTab } = useTabs();
  const yearOptions = useMemo(() => getYearOptions(), []);

  const hasAtlassian = accounts.some((a) => isAtlassianAccount(a.serviceType));

  // 공통 연도 필터
  const [selectedYear, setSelectedYear] = useState<number | null>(new Date().getFullYear());

  // Jira 상태
  const [rawJiraIssues, setRawJiraIssues] = useState<RawJiraIssue[]>([]);
  const [isJiraLoading, setIsJiraLoading] = useState(false);

  // 상태별 이슈 목록 확장
  const [expandedStatus, setExpandedStatus] = useState<string | null>(null);
  const [statusIssues, setStatusIssues] = useState<StatusIssue[]>([]);
  const [isStatusIssuesLoading, setIsStatusIssuesLoading] = useState(false);

  // 이슈 타입 필터
  const [showIssueTypeFilter, setShowIssueTypeFilter] = useState(false);
  const [selectedIssueTypes, setSelectedIssueTypes] = useState<Set<string>>(new Set());

  // 우클릭 컨텍스트 메뉴
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; issueKey: string; label: string } | null>(null);

  // Confluence 상태
  const [confluencePages, setConfluencePages] = useState<ConfluencePageInfo[]>([]);
  const [confluenceTotalCount, setConfluenceTotalCount] = useState(0);
  const [isConfluenceLoading, setIsConfluenceLoading] = useState(false);
  const [expandedSpace, setExpandedSpace] = useState<string | null>(null);
  const [confluenceCtx, setConfluenceCtx] = useState<{ x: number; y: number; pageId: string; title: string } | null>(null);

  // Jira 통계 로드
  const fetchJiraStats = useCallback(async () => {
    if (!activeAccount) return;
    setIsJiraLoading(true);
    try {
      let jql = 'assignee = currentUser()';
      if (selectedYear !== null) {
        const startDate = `${selectedYear}-01-01`;
        const endDate = `${selectedYear + 1}-01-01`;
        jql += ` AND created >= "${startDate}" AND created < "${endDate}"`;
      }
      jql += ' ORDER BY status ASC';

      const rawIssues: RawJiraIssue[] = [];
      let pageToken: string | undefined;

      for (let page = 0; page < 20; page++) {
        const result = await integrationController.invoke({
          accountId: activeAccount.id,
          serviceType: 'jira',
          action: 'searchIssues',
          params: {
            jql,
            maxResults: 100,
            skipCache: true,
            ...(pageToken ? { nextPageToken: pageToken } : {}),
          },
        }) as Record<string, unknown>;

        const issues = (result.issues ?? []) as Record<string, unknown>[];
        if (!Array.isArray(issues)) break;

        for (const issue of issues) {
          const status = obj(issue.status);
          const issueType = obj(issue.issue_type);
          rawIssues.push({
            statusName: str(status?.name) || '기타',
            statusCategory: str(status?.category) || '',
            issueType: str(issueType?.name) || '',
          });
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

  // 전체 이슈 타입 목록 (필터 UI용 - 원본에서 추출)
  const allIssueTypes = useMemo(() => {
    const types = new Set<string>();
    for (const issue of rawJiraIssues) {
      if (issue.issueType) types.add(issue.issueType);
    }
    return Array.from(types).sort();
  }, [rawJiraIssues]);

  // 이슈 타입 필터 적용된 이슈 목록
  const filteredJiraIssues = useMemo(() => {
    if (selectedIssueTypes.size === 0) return rawJiraIssues;
    return rawJiraIssues.filter((i) => selectedIssueTypes.has(i.issueType));
  }, [rawJiraIssues, selectedIssueTypes]);

  // 파생 통계
  const jiraStatusCounts = useMemo(() => {
    const countMap = new Map<string, StatusCount>();
    for (const issue of filteredJiraIssues) {
      const entry = countMap.get(issue.statusName);
      if (entry) {
        entry.count++;
      } else {
        countMap.set(issue.statusName, { name: issue.statusName, category: issue.statusCategory, count: 1 });
      }
    }
    const categoryOrder: Record<string, number> = {
      'In Progress': 0, '진행 중': 0,
      'To Do': 1, '할 일': 1,
      'Done': 2, '완료': 2,
    };
    return Array.from(countMap.values()).sort((a, b) => {
      const oa = categoryOrder[a.category] ?? 3;
      const ob = categoryOrder[b.category] ?? 3;
      if (oa !== ob) return oa - ob;
      return b.count - a.count;
    });
  }, [filteredJiraIssues]);

  const jiraTotalCount = filteredJiraIssues.length;

  const jiraDoneCount = useMemo(() => {
    return filteredJiraIssues.filter((i) => i.statusCategory === 'Done' || i.statusCategory === '완료').length;
  }, [filteredJiraIssues]);

  // 상태 클릭 시 이슈 목록 조회
  const toggleStatusIssues = useCallback(async (statusName: string) => {
    if (expandedStatus === statusName) {
      setExpandedStatus(null);
      setStatusIssues([]);
      return;
    }
    setExpandedStatus(statusName);
    setStatusIssues([]);
    setSelectedIssueTypes(new Set());
    setIsStatusIssuesLoading(true);
    try {
      if (!activeAccount) return;
      let jql = `assignee = currentUser() AND status = "${statusName}"`;
      if (selectedYear !== null) {
        const startDate = `${selectedYear}-01-01`;
        const endDate = `${selectedYear + 1}-01-01`;
        jql += ` AND created >= "${startDate}" AND created < "${endDate}"`;
      }
      if (selectedIssueTypes.size > 0) {
        const types = Array.from(selectedIssueTypes).map((t) => `"${t}"`).join(', ');
        jql += ` AND issuetype IN (${types})`;
      }
      jql += ' ORDER BY updated DESC';

      const allIssues: StatusIssue[] = [];
      let pageToken: string | undefined;

      for (let page = 0; page < 10; page++) {
        const result = await integrationController.invoke({
          accountId: activeAccount.id,
          serviceType: 'jira',
          action: 'searchIssues',
          params: {
            jql,
            maxResults: 100,
            skipCache: true,
            ...(pageToken ? { nextPageToken: pageToken } : {}),
          },
        }) as Record<string, unknown>;

        const issues = (result.issues ?? []) as Record<string, unknown>[];
        if (!Array.isArray(issues)) break;

        for (const issue of issues) {
          const issueType = obj(issue.issue_type);
          allIssues.push({
            key: str(issue.key),
            summary: str(issue.summary),
            issueType: str(issueType?.name),
          });
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

  const goToIssue = useCallback((issueKey: string) => {
    history.push(`/jira/issue/${issueKey}`);
  }, [history]);

  const handleIssueContextMenu = useCallback((e: React.MouseEvent, issueKey: string, label: string) => {
    e.preventDefault();
    e.stopPropagation();
    const zoom = 1.2;
    setCtxMenu({ x: e.clientX / zoom, y: e.clientY / zoom, issueKey, label });
  }, []);

  const handleOpenInNewTab = useCallback(() => {
    if (!ctxMenu) return;
    addTab('jira', `/jira/issue/${ctxMenu.issueKey}`, ctxMenu.label);
    setCtxMenu(null);
  }, [ctxMenu, addTab]);

  // Confluence 통계 로드
  const fetchConfluenceStats = useCallback(async () => {
    if (!activeAccount) return;
    setIsConfluenceLoading(true);
    try {
      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'confluence',
        action: 'getMyPages',
        params: { limit: 500 },
      }) as Record<string, unknown>;

      const results = (result.results ?? []) as Record<string, unknown>[];
      const pages: ConfluencePageInfo[] = [];

      for (const item of results) {
        const createdAt = str(item.createdAt);
        const space = obj(item.space);
        pages.push({
          id: str(item.id),
          title: str(item.title),
          createdAt,
          spaceName: str(space?.name) || str(item.spaceName) || '',
        });
      }

      // 연도 필터링
      const filtered = selectedYear === null ? pages : pages.filter((p) => {
        if (!p.createdAt) return false;
        try {
          return new Date(p.createdAt).getFullYear() === selectedYear;
        } catch {
          return false;
        }
      });

      setConfluencePages(filtered);
      setConfluenceTotalCount(filtered.length);
    } catch (err) {
      console.error('[StatsPage] Confluence stats error:', err);
      setConfluencePages([]);
      setConfluenceTotalCount(0);
    } finally {
      setIsConfluenceLoading(false);
    }
  }, [activeAccount, selectedYear]);

  useEffect(() => {
    if (hasAtlassian && activeAccount) {
      fetchJiraStats();
      setExpandedStatus(null);
      setStatusIssues([]);
      setSelectedIssueTypes(new Set());
    }
  }, [fetchJiraStats, hasAtlassian, activeAccount]);

  useEffect(() => {
    if (hasAtlassian && activeAccount) {
      fetchConfluenceStats();
    }
  }, [fetchConfluenceStats, hasAtlassian, activeAccount]);

  // Confluence 페이지를 스페이스별로 그룹핑
  const confluenceBySpace = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of confluencePages) {
      const name = p.spaceName || '(스페이스 없음)';
      map.set(name, (map.get(name) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [confluencePages]);

  // 스페이스별 페이지 목록 (확장 시 사용)
  const confluencePagesBySpace = useMemo(() => {
    const map = new Map<string, ConfluencePageInfo[]>();
    for (const p of confluencePages) {
      const name = p.spaceName || '(스페이스 없음)';
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(p);
    }
    return map;
  }, [confluencePages]);

  // 카테고리별 그룹핑
  const jiraStatusGroups = useMemo(() => {
    const categoryMap: Record<string, string> = {
      'In Progress': '진행 중',
      '진행 중': '진행 중',
      'To Do': '할 일',
      '할 일': '할 일',
      'Done': '완료',
      '완료': '완료',
    };
    const order = ['진행 중', '할 일', '완료', '기타'];
    const groups = new Map<string, StatusCount[]>();

    for (const s of jiraStatusCounts) {
      const group = categoryMap[s.category] || '기타';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(s);
    }

    return order
      .filter((g) => groups.has(g))
      .map((g) => ({
        category: g,
        color: getStatusCategoryColor(g === '진행 중' ? 'In Progress' : g === '할 일' ? 'To Do' : g === '완료' ? 'Done' : ''),
        statuses: groups.get(g)!.sort((a, b) => b.count - a.count),
        total: groups.get(g)!.reduce((sum, s) => sum + s.count, 0),
      }));
  }, [jiraStatusCounts]);

  // Jira 최대 count (차트 바 비율 계산용)
  const jiraMaxCount = useMemo(() => {
    return Math.max(...jiraStatusCounts.map((s) => s.count), 1);
  }, [jiraStatusCounts]);

  // selectedIssueTypes 가 비어있으면 전체 선택 상태로 간주
  const filteredStatusIssues = useMemo(() => {
    if (selectedIssueTypes.size === 0) return statusIssues;
    return statusIssues.filter((i) => selectedIssueTypes.has(i.issueType));
  }, [statusIssues, selectedIssueTypes]);

  // 이슈 타입 체크 토글
  const toggleIssueType = useCallback((type: string) => {
    setSelectedIssueTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  return (
    <Page>
      <Helmet>
        <title>통계 - Workspace</title>
      </Helmet>
      <Container>
        <HeaderRow>
          <BackButton onClick={() => history.push('/jira')}>
            <ArrowLeft size={16} />
          </BackButton>
          <PageTitle>사용자 통계</PageTitle>
          {hasAtlassian && (
            <YearSelect value={selectedYear ?? 'all'} onChange={(e) => setSelectedYear(e.target.value === 'all' ? null : Number(e.target.value))}>
              <option value="all">전체</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </YearSelect>
          )}
        </HeaderRow>

        {!hasAtlassian ? (
          <EmptyCard>
            <EmptyText>Atlassian 계정이 설정되어 있지 않습니다.</EmptyText>
            <EmptySubText>계정 설정에서 Atlassian을 연결하면 Jira / Confluence 통계를 확인할 수 있습니다.</EmptySubText>
          </EmptyCard>
        ) : (
          <>
            {/* ── Jira 통계 ── */}
            <SectionCard>
              <SectionHeader>
                <SectionIconWrap>{getServiceIcon('jira', 20)}</SectionIconWrap>
                <SectionTitle>Jira 이슈 통계</SectionTitle>
                {allIssueTypes.length > 0 && (
                  <HeaderFilterButton onClick={() => setShowIssueTypeFilter(true)} title="이슈 유형 필터">
                    <Settings size={16} />
                    {selectedIssueTypes.size > 0 && <FilterActiveDot />}
                  </HeaderFilterButton>
                )}
              </SectionHeader>

              {isJiraLoading ? (
                <LoadingArea>
                  <Spinner><Loader size={20} /></Spinner>
                  <LoadingText>Jira 데이터를 불러오는 중...</LoadingText>
                </LoadingArea>
              ) : jiraStatusCounts.length === 0 ? (
                <EmptySection>
                  {selectedYear !== null ? `${selectedYear}년에 ` : ''}담당된 이슈가 없습니다.
                </EmptySection>
              ) : (
                <>
                  <StatsRow>
                    <TotalBadge>
                      총 <strong>{jiraTotalCount}</strong>건
                    </TotalBadge>
                    <CompletionRate>
                      <CompletionLabel>완료율</CompletionLabel>
                      <CompletionValue>
                        {jiraTotalCount > 0 ? Math.round((jiraDoneCount / jiraTotalCount) * 100) : 0}%
                      </CompletionValue>
                      <CompletionSub>({jiraDoneCount}/{jiraTotalCount})</CompletionSub>
                    </CompletionRate>
                  </StatsRow>
                  <CompletionBarTrack>
                    <CompletionBarFill $width={jiraTotalCount > 0 ? Math.round((jiraDoneCount / jiraTotalCount) * 100) : 0} />
                  </CompletionBarTrack>
                  <StatusGroupList>
                    {jiraStatusGroups.map((group) => (
                      <StatusGroup key={group.category}>
                        <StatusGroupHeader>
                          <StatusGroupDot $color={group.color} />
                          <StatusGroupName>{group.category}</StatusGroupName>
                          <StatusGroupCount>{group.total}건</StatusGroupCount>
                        </StatusGroupHeader>
                        <StatusBarList>
                          {group.statuses.map((s) => (
                            <React.Fragment key={s.name}>
                              <StatusBarItem
                                $clickable
                                onClick={() => toggleStatusIssues(s.name)}
                              >
                                <StatusBarLabel>
                                  <StatusExpandIcon>{expandedStatus === s.name ? '▼' : '▶'}</StatusExpandIcon>
                                  <StatusName>{s.name}</StatusName>
                                  <StatusCount>{s.count}건</StatusCount>
                                </StatusBarLabel>
                                <StatusBarTrack>
                                  <StatusBarFill
                                    $color={group.color}
                                    $width={Math.round((s.count / jiraMaxCount) * 100)}
                                  />
                                </StatusBarTrack>
                              </StatusBarItem>
                              {expandedStatus === s.name && (
                                <IssueListWrap>
                                  {isStatusIssuesLoading ? (
                                    <IssueListLoading>
                                      <Spinner><Loader size={14} /></Spinner>
                                    </IssueListLoading>
                                  ) : statusIssues.length === 0 ? (
                                    <IssueListEmpty>이슈가 없습니다.</IssueListEmpty>
                                  ) : (
                                    <>
                                      <IssueListHeader>
                                        <IssueListCount>
                                          {filteredStatusIssues.length === statusIssues.length
                                            ? `${statusIssues.length}건`
                                            : `${filteredStatusIssues.length} / ${statusIssues.length}건`}
                                        </IssueListCount>
                                      </IssueListHeader>
                                      {filteredStatusIssues.length === 0 ? (
                                        <IssueListEmpty>선택된 유형의 이슈가 없습니다.</IssueListEmpty>
                                      ) : (
                                        filteredStatusIssues.map((issue) => {
                                          const taskType = resolveTaskType(issue.issueType);
                                          const typeColor = TASK_TYPE_COLORS[taskType];
                                          return (
                                            <IssueListItem
                                              key={issue.key}
                                              onClick={() => goToIssue(issue.key)}
                                              onContextMenu={(e) => handleIssueContextMenu(e, issue.key, `${issue.key} ${issue.summary}`)}
                                            >
                                              <IssueKey $color={typeColor}>{issue.key}</IssueKey>
                                              <IssueTypeLabel $color={typeColor}>{TASK_TYPE_LABELS[taskType]}</IssueTypeLabel>
                                              <IssueSummary>{issue.summary}</IssueSummary>
                                            </IssueListItem>
                                          );
                                        })
                                      )}
                                    </>
                                  )}
                                </IssueListWrap>
                              )}
                            </React.Fragment>
                          ))}
                        </StatusBarList>
                      </StatusGroup>
                    ))}
                  </StatusGroupList>
                </>
              )}
            </SectionCard>

            {/* ── Confluence 통계 ── */}
            <SectionCard>
              <SectionHeader>
                <SectionIconWrap>{getServiceIcon('confluence', 20)}</SectionIconWrap>
                <SectionTitle>Confluence 문서 통계</SectionTitle>
              </SectionHeader>

              {isConfluenceLoading ? (
                <LoadingArea>
                  <Spinner><Loader size={20} /></Spinner>
                  <LoadingText>Confluence 데이터를 불러오는 중...</LoadingText>
                </LoadingArea>
              ) : confluenceTotalCount === 0 ? (
                <EmptySection>
                  {selectedYear !== null ? `${selectedYear}년에 ` : ''}작성한 문서가 없습니다.
                </EmptySection>
              ) : (
                <>
                  <TotalBadge>
                    총 <strong>{confluenceTotalCount}</strong>건
                  </TotalBadge>
                  {confluenceBySpace.length > 0 && (
                    <SpaceList>
                      <SpaceListHeader>
                        <span>스페이스</span>
                        <span>문서 수</span>
                      </SpaceListHeader>
                      {confluenceBySpace.map((s) => (
                        <React.Fragment key={s.name}>
                          <SpaceListItem
                            $clickable
                            onClick={() => setExpandedSpace(expandedSpace === s.name ? null : s.name)}
                          >
                            <SpaceNameRow>
                              <StatusExpandIcon>{expandedSpace === s.name ? '▼' : '▶'}</StatusExpandIcon>
                              <SpaceName>{s.name}</SpaceName>
                            </SpaceNameRow>
                            <SpaceCount>{s.count}건</SpaceCount>
                          </SpaceListItem>
                          {expandedSpace === s.name && (
                            <ConfluencePageList>
                              {(confluencePagesBySpace.get(s.name) || []).map((p) => (
                                <ConfluencePageItem
                                  key={p.id}
                                  onClick={() => {
                                    addTab('confluence', `/confluence/page/${p.id}`, p.title);
                                  }}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const zoom = 1.2;
                                    setConfluenceCtx({ x: e.clientX / zoom, y: e.clientY / zoom, pageId: p.id, title: p.title });
                                  }}
                                >
                                  <ConfluencePageTitle>{p.title}</ConfluencePageTitle>
                                  <ConfluencePageDate>{formatDate(p.createdAt)}</ConfluencePageDate>
                                </ConfluencePageItem>
                              ))}
                            </ConfluencePageList>
                          )}
                        </React.Fragment>
                      ))}
                    </SpaceList>
                  )}
                </>
              )}
            </SectionCard>
          </>
        )}
      </Container>

      {ctxMenu && (
        <CtxOverlay onClick={() => setCtxMenu(null)}>
          <CtxBox style={{ left: ctxMenu.x, top: ctxMenu.y }} onClick={(e) => e.stopPropagation()}>
            <CtxMenuItem onClick={handleOpenInNewTab}>새 탭으로 열기</CtxMenuItem>
          </CtxBox>
        </CtxOverlay>
      )}

      {confluenceCtx && (
        <CtxOverlay onClick={() => setConfluenceCtx(null)}>
          <CtxBox style={{ left: confluenceCtx.x, top: confluenceCtx.y }} onClick={(e) => e.stopPropagation()}>
            <CtxMenuItem onClick={() => {
              addTab('confluence', `/confluence/page/${confluenceCtx.pageId}`, confluenceCtx.title);
              setConfluenceCtx(null);
            }}>새 탭으로 열기</CtxMenuItem>
          </CtxBox>
        </CtxOverlay>
      )}

      {showIssueTypeFilter && (
        <FilterModalOverlay onClick={() => setShowIssueTypeFilter(false)}>
          <FilterModal onClick={(e) => e.stopPropagation()}>
            <FilterModalHeader>
              <FilterModalTitle>이슈 유형 필터</FilterModalTitle>
              <FilterModalClose onClick={() => setShowIssueTypeFilter(false)}>
                <X size={16} />
              </FilterModalClose>
            </FilterModalHeader>
            <FilterModalBody>
              {allIssueTypes.length === 0 ? (
                <FilterEmptyText>이슈 유형 정보가 없습니다.</FilterEmptyText>
              ) : (
                <>
                  <FilterSelectAll>
                    <FilterCheckbox
                      type="checkbox"
                      checked={selectedIssueTypes.size === 0}
                      onChange={() => setSelectedIssueTypes(new Set())}
                    />
                    <FilterLabel>전체 선택</FilterLabel>
                  </FilterSelectAll>
                  {allIssueTypes.map((type) => (
                    <FilterItem key={type}>
                      <FilterCheckbox
                        type="checkbox"
                        checked={selectedIssueTypes.size === 0 || selectedIssueTypes.has(type)}
                        onChange={() => {
                          if (selectedIssueTypes.size === 0) {
                            // 전체 선택 → 이 항목만 해제
                            const all = new Set(allIssueTypes);
                            all.delete(type);
                            setSelectedIssueTypes(all);
                          } else {
                            toggleIssueType(type);
                          }
                        }}
                      />
                      <FilterLabel>{type}</FilterLabel>
                    </FilterItem>
                  ))}
                </>
              )}
            </FilterModalBody>
          </FilterModal>
        </FilterModalOverlay>
      )}
    </Page>
  );
};

export default StatsPage;

// ── Styled Components ──

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const Page = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: ${theme.bgSecondary};
  zoom: 1.2;
`;

const Container = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid ${theme.border};
  border-radius: 50%;
  background: ${theme.bgPrimary};
  color: ${theme.textSecondary};
  cursor: pointer;
  transition: all 0.15s ${transition};

  &:hover {
    border-color: ${theme.blue};
    color: ${theme.blue};
    background: ${theme.blueLight};
  }
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${theme.textPrimary};
`;

const EmptyCard = styled.div`
  padding: 3rem 2rem;
  background: ${theme.bgPrimary};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  text-align: center;
`;

const EmptyText = styled.div`
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${theme.textPrimary};
  margin-bottom: 0.5rem;
`;

const EmptySubText = styled.div`
  font-size: 0.8125rem;
  color: ${theme.textMuted};
`;

const SectionCard = styled.div`
  background: ${theme.bgPrimary};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1rem;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 1rem;
`;

const SectionIconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${theme.textPrimary};
  flex: 1;
`;

const HeaderFilterButton = styled.button`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${theme.textMuted};
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;

  &:hover {
    background: ${theme.bgTertiary};
    color: ${theme.textPrimary};
  }
`;

const FilterActiveDot = styled.span`
  position: absolute;
  top: 3px;
  right: 3px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${theme.blue};
`;

const YearSelect = styled.select`
  padding: 0.375rem 0.625rem;
  border: 1px solid ${theme.border};
  border-radius: 6px;
  background: ${theme.bgPrimary};
  color: ${theme.textPrimary};
  font-size: 0.8125rem;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: ${theme.blue};
  }
`;

const LoadingArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem 0;
`;

const Spinner = styled.span`
  display: inline-flex;
  color: ${theme.blue};
  animation: ${spin} 1s linear infinite;
`;

const LoadingText = styled.span`
  font-size: 0.8125rem;
  color: ${theme.textMuted};
`;

const EmptySection = styled.div`
  padding: 1.5rem 0;
  text-align: center;
  font-size: 0.8125rem;
  color: ${theme.textMuted};
`;

const StatsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

const TotalBadge = styled.div`
  font-size: 0.875rem;
  color: ${theme.textSecondary};

  strong {
    font-weight: 700;
    color: ${theme.textPrimary};
  }
`;

const CompletionRate = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;

const CompletionLabel = styled.span`
  font-size: 0.75rem;
  color: ${theme.textMuted};
`;

const CompletionValue = styled.span`
  font-size: 1.125rem;
  font-weight: 700;
  color: #36B37E;
`;

const CompletionSub = styled.span`
  font-size: 0.75rem;
  color: ${theme.textMuted};
`;

const CompletionBarTrack = styled.div`
  width: 100%;
  height: 8px;
  background: ${theme.bgTertiary};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1.25rem;
`;

const CompletionBarFill = styled.div<{ $width: number }>`
  height: 100%;
  width: ${({ $width }) => $width}%;
  background: linear-gradient(90deg, #36B37E, #57D9A3);
  border-radius: 4px;
  transition: width 0.5s ease;
`;

// ── Jira 상태 바 차트 ──

const StatusGroupList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StatusGroup = styled.div``;

const StatusGroupHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid ${theme.border};
`;

const StatusGroupDot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const StatusGroupName = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${theme.textPrimary};
  flex: 1;
`;

const StatusGroupCount = styled.span`
  font-size: 0.8125rem;
  font-weight: 700;
  color: ${theme.textSecondary};
`;

const StatusBarList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-left: 1.25rem;
`;

const StatusBarLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
`;

const StatusName = styled.span`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${theme.textPrimary};
  flex: 1;
`;

const StatusCount = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${theme.textSecondary};
`;

const StatusBarTrack = styled.div`
  width: 100%;
  height: 6px;
  background: ${theme.bgTertiary};
  border-radius: 3px;
  overflow: hidden;
`;

const StatusBarFill = styled.div<{ $color: string; $width: number }>`
  height: 100%;
  width: ${({ $width }) => $width}%;
  background: ${({ $color }) => $color};
  border-radius: 3px;
  transition: width 0.4s ease;
`;

// ── Confluence 스페이스 목록 ──

const SpaceList = styled.div`
  border: 1px solid ${theme.border};
  border-radius: 6px;
  overflow: hidden;
`;

const SpaceListHeader = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: ${theme.bgTertiary};
  font-size: 0.75rem;
  font-weight: 600;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.02em;
`;

const SpaceListItem = styled.div<{ $clickable?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.625rem 0.75rem;
  border-top: 1px solid ${theme.border};
  transition: background 0.1s;
  cursor: ${({ $clickable }) => $clickable ? 'pointer' : 'default'};
  user-select: none;

  &:hover {
    background: ${theme.bgSecondary};
  }
`;

const SpaceName = styled.span`
  font-size: 0.8125rem;
  color: ${theme.textPrimary};
`;

const SpaceCount = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${theme.textSecondary};
`;

// ── Jira 상태별 이슈 목록 ──

const StatusBarItem = styled.div<{ $clickable?: boolean }>`
  cursor: ${({ $clickable }) => $clickable ? 'pointer' : 'default'};
  border-radius: 4px;
  padding: 0.25rem 0.375rem;
  margin: -0.25rem -0.375rem;
  transition: background 0.1s;

  ${({ $clickable }) => $clickable && `
    &:hover { background: ${theme.bgTertiary}; }
  `}
`;

const StatusExpandIcon = styled.span`
  font-size: 0.625rem;
  color: ${theme.textMuted};
  width: 0.75rem;
  flex-shrink: 0;
`;

const IssueListWrap = styled.div`
  margin: 0.25rem 0 0.5rem 0.75rem;
  border: 1px solid ${theme.border};
  border-radius: 6px;
  overflow: hidden;
  max-height: 300px;
  overflow-y: auto;
`;

const IssueListLoading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  font-size: 0.8125rem;
  color: ${theme.textMuted};
`;

const IssueListEmpty = styled.div`
  padding: 1rem;
  text-align: center;
  font-size: 0.8125rem;
  color: ${theme.textMuted};
`;

const IssueListItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background 0.1s;
  border-bottom: 1px solid ${theme.border};

  &:last-child { border-bottom: none; }
  &:hover { background: ${theme.bgSecondary}; }
`;

const IssueKey = styled.span<{ $color?: string }>`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ $color }) => $color || theme.blue};
  white-space: nowrap;
  flex-shrink: 0;
`;

const IssueSummary = styled.span`
  font-size: 0.8125rem;
  color: ${theme.textPrimary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
`;

// ── 우클릭 컨텍스트 메뉴 ──

const CtxOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 500;
`;

const CtxBox = styled.div`
  position: fixed;
  background: ${theme.bgPrimary};
  border: 1px solid ${theme.border};
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  min-width: 140px;
  padding: 0.25rem;
  z-index: 501;
`;

const CtxMenuItem = styled.div`
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  color: ${theme.textPrimary};
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: ${theme.blueLight};
    color: ${theme.blue};
  }
`;

// ── Confluence 스페이스별 문서 목록 ──

const SpaceNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;

const ConfluencePageList = styled.div`
  border-top: 1px solid ${theme.border};
  background: ${theme.bgSecondary};
`;

const ConfluencePageItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem 0.5rem 2rem;
  cursor: pointer;
  transition: background 0.1s;
  border-bottom: 1px solid ${theme.border};

  &:last-child { border-bottom: none; }
  &:hover { background: ${theme.bgTertiary}; }
`;

const ConfluencePageTitle = styled.span`
  font-size: 0.8125rem;
  color: ${theme.textPrimary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
`;

const ConfluencePageDate = styled.span`
  font-size: 0.75rem;
  color: ${theme.textMuted};
  white-space: nowrap;
  flex-shrink: 0;
`;

// ── 이슈 목록 헤더 & 필터 ──

const IssueListHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 0.75rem;
  background: ${theme.bgTertiary};
  border-bottom: 1px solid ${theme.border};
`;

const IssueListCount = styled.span`
  font-size: 0.75rem;
  color: ${theme.textMuted};
  font-weight: 500;
`;


const IssueTypeLabel = styled.span<{ $color: string }>`
  font-size: 0.6875rem;
  font-weight: 700;
  color: ${({ $color }) => $color};
  white-space: nowrap;
  flex-shrink: 0;
`;

// ── 이슈 유형 필터 모달 ──

const FilterModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const FilterModal = styled.div`
  background: ${theme.bgPrimary};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  width: 320px;
  max-height: 400px;
  display: flex;
  flex-direction: column;
`;

const FilterModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid ${theme.border};
`;

const FilterModalTitle = styled.h3`
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${theme.textPrimary};
`;

const FilterModalClose = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${theme.textMuted};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: ${theme.bgTertiary};
    color: ${theme.textPrimary};
  }
`;

const FilterModalBody = styled.div`
  padding: 0.75rem 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const FilterEmptyText = styled.div`
  padding: 1rem 0;
  text-align: center;
  font-size: 0.8125rem;
  color: ${theme.textMuted};
`;

const FilterSelectAll = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.375rem;
  border-bottom: 1px solid ${theme.border};
  margin-bottom: 0.25rem;
  cursor: pointer;
`;

const FilterItem = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.375rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: ${theme.bgSecondary};
  }
`;

const FilterCheckbox = styled.input`
  width: 1rem;
  height: 1rem;
  accent-color: ${theme.blue};
  cursor: pointer;
  flex-shrink: 0;
`;

const FilterLabel = styled.span`
  font-size: 0.8125rem;
  color: ${theme.textPrimary};
`;
