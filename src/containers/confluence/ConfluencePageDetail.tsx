import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { useAccount } from 'modules/contexts/account';
import { integrationController } from 'controllers/account';
import { confluenceTheme } from 'lib/styles/confluenceTheme';
import { confluenceToHtml, resolveConfluenceAttachments } from 'lib/utils/confluenceToHtml';
import { transition } from 'lib/styles/styles';
import { ExternalLink } from 'lucide-react';
import { isAtlassianAccount } from 'types/account';
import type { JiraCredentials } from 'types/account';
import type { ConfluencePageDetail as PageDetailType, ConfluenceComment, ConfluenceAncestor } from 'types/confluence';

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function obj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString('ko-KR');
  } catch {
    return dateStr;
  }
}

function normalizePageDetail(raw: Record<string, unknown>): PageDetailType {
  const id = str(raw.id);
  const title = str(raw.title);

  // body.storage.value
  const body = obj(raw.body);
  const storage = obj(body?.storage);
  const bodyHtml = confluenceToHtml(str(storage?.value));

  // space
  const space = obj(raw.space);
  const spaceKey = str(space?.key);
  const spaceName = str(space?.name);

  // version
  const version = obj(raw.version);
  const versionNumber = typeof version?.number === 'number' ? version.number : 1;
  const updatedAt = str(version?.when);

  // history
  const history = obj(raw.history);
  const createdBy = obj(history?.createdBy);
  const authorName = str(createdBy?.displayName) || str(createdBy?.publicName) || '';
  const createdAt = str(history?.createdDate);

  // ancestors (페이지 계층 구조)
  const rawAncestors = Array.isArray(raw.ancestors) ? raw.ancestors : [];
  const ancestors: ConfluenceAncestor[] = rawAncestors.map((a: unknown) => {
    const ao = a as Record<string, unknown>;
    return { id: str(ao.id), title: str(ao.title) };
  }).filter((a: ConfluenceAncestor) => a.id && a.title);

  return {
    id,
    title,
    bodyHtml,
    spaceKey,
    spaceName,
    authorName,
    createdAt,
    updatedAt,
    version: versionNumber as number,
    ancestors,
  };
}

function normalizeComment(raw: Record<string, unknown>): ConfluenceComment {
  const id = str(raw.id);

  const history = obj(raw.history);
  const createdBy = obj(history?.createdBy);
  const author = str(createdBy?.displayName) || str(createdBy?.publicName) || '';
  const created = str(history?.createdDate) || str(raw.created) || '';

  const body = obj(raw.body);
  const storage = obj(body?.storage);
  const bodyHtml = confluenceToHtml(str(storage?.value));

  return { id, author, bodyHtml, created };
}

/** 가장 가까운 스크롤 가능한 부모 요소를 찾아 scrollTop을 0으로 설정 */
function scrollToTop(el: HTMLElement | null) {
  let current = el?.parentElement;
  while (current) {
    if (current.scrollHeight > current.clientHeight) {
      current.scrollTop = 0;
      return;
    }
    current = current.parentElement;
  }
  window.scrollTo(0, 0);
}

const ConfluencePageDetailView = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const history = useHistory();
  const { activeAccount } = useAccount();
  const layoutRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState<PageDetailType | null>(null);
  const [comments, setComments] = useState<ConfluenceComment[]>([]);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attachmentUrlMap, setAttachmentUrlMap] = useState<Record<string, string>>({});

  const goToList = useCallback(() => history.push('/confluence'), [history]);

  const goToPage = useCallback((targetPageId: string) => {
    history.push(`/confluence/page/${targetPageId}`);
  }, [history]);

  const goBack = useCallback(() => {
    // ancestors가 있으면 바로 상위 페이지로, 없으면 목록으로
    if (page && page.ancestors.length > 0) {
      const parent = page.ancestors[page.ancestors.length - 1];
      goToPage(parent.id);
    } else {
      goToList();
    }
  }, [page, goToPage, goToList]);

  const fetchPage = useCallback(async () => {
    if (!activeAccount || !pageId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'confluence',
        action: 'getPageContent',
        params: { pageId },
      });
      const detail = normalizePageDetail(result as Record<string, unknown>);
      setPage(detail);
    } catch (err) {
      console.error('[ConfluencePageDetail] fetch error:', err);
      setError('페이지를 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [activeAccount, pageId]);

  const fetchComments = useCallback(async () => {
    if (!activeAccount || !pageId) return;
    try {
      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'confluence',
        action: 'getPageComments',
        params: { pageId },
      });
      const raw = Array.isArray(result) ? result : [];
      setComments(raw.map((c) => normalizeComment(c as Record<string, unknown>)));
    } catch (err) {
      console.error('[ConfluencePageDetail] comments error:', err);
      setComments([]);
    }
  }, [activeAccount, pageId]);

  const fetchAttachments = useCallback(async () => {
    if (!activeAccount || !pageId) return;
    try {
      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'confluence',
        action: 'getPageAttachments',
        params: { pageId },
      });
      const raw = Array.isArray(result) ? result : [];
      // 이미지 첨부파일만 필터링 후 콘텐츠 로드
      for (const item of raw) {
        const att = item as Record<string, unknown>;
        const title = str(att.title);
        const mediaType = str(att.mediaType);
        if (!title || !mediaType.startsWith('image/')) continue;

        const links = obj(att._links);
        const downloadUrl = str(links?.download);
        if (!downloadUrl) continue;

        integrationController.invoke({
          accountId: activeAccount.id,
          serviceType: 'confluence',
          action: 'getAttachmentContent',
          params: { downloadUrl },
        }).then((dataUrl) => {
          if (typeof dataUrl === 'string') {
            setAttachmentUrlMap((prev) => ({ ...prev, [title]: dataUrl }));
          }
        }).catch(() => { /* ignore */ });
      }
    } catch {
      // 첨부파일 로드 실패해도 페이지 조회에는 영향 없음
    }
  }, [activeAccount, pageId]);

  // 페이지 전환 시 스크롤 최상단으로
  useEffect(() => {
    scrollToTop(layoutRef.current);
  }, [pageId]);

  useEffect(() => {
    fetchPage();
    fetchComments();
    fetchAttachments();
  }, [fetchPage, fetchComments, fetchAttachments]);

  if (!activeAccount || !isAtlassianAccount(activeAccount.serviceType)) {
    return (
      <Layout ref={layoutRef}>
        <ToolbarArea>
          <BackButton onClick={goToList}>&larr; 목록으로</BackButton>
        </ToolbarArea>
        <ContentArea>
          <EmptyMsg>연결된 Atlassian 계정이 없습니다.</EmptyMsg>
        </ContentArea>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout ref={layoutRef}>
        <ToolbarArea>
          <BackButton onClick={goToList}>&larr; 목록으로</BackButton>
        </ToolbarArea>
        <ContentArea>
          <EmptyMsg>로딩 중...</EmptyMsg>
        </ContentArea>
      </Layout>
    );
  }

  if (error || !page) {
    return (
      <Layout ref={layoutRef}>
        <ToolbarArea>
          <BackButton onClick={goBack}>&larr; 뒤로</BackButton>
        </ToolbarArea>
        <ContentArea>
          <EmptyMsg>{error || '페이지를 찾을 수 없습니다.'}</EmptyMsg>
        </ContentArea>
      </Layout>
    );
  }

  return (
    <Layout ref={layoutRef}>
      <ToolbarArea>
        <BackButton onClick={goBack}>
          &larr; {page.ancestors.length > 0 ? '상위 페이지' : '목록으로'}
        </BackButton>
        <Breadcrumbs>
          {/* 스페이스 */}
          {page.spaceName && (
            <>
              <BreadcrumbLabel>{page.spaceKey || page.spaceName}</BreadcrumbLabel>
              <BreadcrumbSep>/</BreadcrumbSep>
            </>
          )}
          {/* 상위 페이지 계층 */}
          {page.ancestors.map((ancestor) => (
            <React.Fragment key={ancestor.id}>
              <BreadcrumbLink onClick={() => goToPage(ancestor.id)}>
                {ancestor.title}
              </BreadcrumbLink>
              <BreadcrumbSep>/</BreadcrumbSep>
            </React.Fragment>
          ))}
          {/* 현재 페이지 */}
          <BreadcrumbCurrent>{page.title}</BreadcrumbCurrent>
        </Breadcrumbs>
      </ToolbarArea>

      <ContentArea>
        {/* 헤더 */}
        <HeaderCard>
          <HeaderTopRow>
            <PageIcon>C</PageIcon>
            <Title>{page.title || '(제목 없음)'}</Title>
            <OpenInBrowserBtn
              title="Confluence에서 열기"
              onClick={() => {
                const creds = activeAccount.credentials as JiraCredentials;
                const baseUrl = creds.baseUrl?.replace(/\/$/, '') || '';
                if (baseUrl) {
                  const url = `${baseUrl}/wiki/spaces/${page.spaceKey}/pages/${page.id}`;
                  const api = (window as any).electronAPI;
                  if (api?.openExternal) {
                    api.openExternal(url);
                  } else {
                    window.open(url, '_blank');
                  }
                }
              }}
            >
              <ExternalLink size={16} />
            </OpenInBrowserBtn>
          </HeaderTopRow>

          <MetaGrid>
            <MetaItem>
              <MetaLabel>스페이스</MetaLabel>
              <MetaValue>{page.spaceName || page.spaceKey || '-'}</MetaValue>
            </MetaItem>
            <MetaItem>
              <MetaLabel>작성자</MetaLabel>
              <MetaValue>{page.authorName || '-'}</MetaValue>
            </MetaItem>
            <MetaItem>
              <MetaLabel>생성일</MetaLabel>
              <MetaValue>{formatDate(page.createdAt)}</MetaValue>
            </MetaItem>
            <MetaItem>
              <MetaLabel>수정일</MetaLabel>
              <MetaValue>{formatDate(page.updatedAt)}</MetaValue>
            </MetaItem>
            <MetaItem>
              <MetaLabel>버전</MetaLabel>
              <MetaValue>v{page.version}</MetaValue>
            </MetaItem>
          </MetaGrid>
        </HeaderCard>

        {/* 본문 */}
        {page.bodyHtml && (
          <Section>
            <RichContent dangerouslySetInnerHTML={{ __html: resolveConfluenceAttachments(page.bodyHtml, attachmentUrlMap) }} />
          </Section>
        )}

        {/* 댓글 */}
        <Section>
          <SectionToggleHeader onClick={() => setCommentsExpanded((v) => !v)}>
            <SectionToggleArrow>{commentsExpanded ? '▼' : '▶'}</SectionToggleArrow>
            <SectionTitle>댓글 ({comments.length})</SectionTitle>
          </SectionToggleHeader>
          {commentsExpanded && (
            comments.length === 0 ? (
              <EmptyComments>댓글이 없습니다.</EmptyComments>
            ) : (
              <CommentList>
                {comments.map((comment) => (
                  <CommentItem key={comment.id}>
                    <CommentHeader>
                      <CommentAuthor>{comment.author}</CommentAuthor>
                      <CommentDate>{formatDate(comment.created)}</CommentDate>
                    </CommentHeader>
                    <CommentBody dangerouslySetInnerHTML={{ __html: resolveConfluenceAttachments(comment.bodyHtml, attachmentUrlMap) }} />
                  </CommentItem>
                ))}
              </CommentList>
            )
          )}
        </Section>
      </ContentArea>
    </Layout>
  );
};

export default ConfluencePageDetailView;

// ── Styled Components ──

const Layout = styled.div`
  flex: 1;
  min-height: 100%;
  background: ${confluenceTheme.bg.subtle};
  zoom: 1.2;
`;

const ToolbarArea = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: ${confluenceTheme.bg.default};
  border-bottom: 1px solid ${confluenceTheme.border};
`;

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: 1px solid ${confluenceTheme.border};
  border-radius: 20px;
  color: ${confluenceTheme.text.secondary};
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ${transition};
  flex-shrink: 0;

  &:hover {
    background: ${confluenceTheme.bg.hover};
    color: ${confluenceTheme.text.primary};
  }
`;

const Breadcrumbs = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  overflow: hidden;
  flex-wrap: wrap;
`;

const BreadcrumbSep = styled.span`
  color: ${confluenceTheme.text.muted};
  font-size: 0.8125rem;
  flex-shrink: 0;
`;

const BreadcrumbLabel = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid ${confluenceTheme.border};
  border-radius: 20px;
  color: ${confluenceTheme.text.secondary};
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
`;

const BreadcrumbLink = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid ${confluenceTheme.border};
  border-radius: 20px;
  color: ${confluenceTheme.primary};
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.15s ${transition};

  &:hover {
    background: ${confluenceTheme.primaryLight};
    border-color: ${confluenceTheme.primary};
  }
`;

const BreadcrumbCurrent = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${confluenceTheme.text.primary};
  background: ${confluenceTheme.bg.subtle};
  border-radius: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ContentArea = styled.main`
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
`;

const HeaderCard = styled.div`
  padding: 1.5rem;
  background: ${confluenceTheme.bg.default};
  border-radius: 3px;
  border: 1px solid ${confluenceTheme.border};
  margin-bottom: 1rem;
`;

const HeaderTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const PageIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 3px;
  background: ${confluenceTheme.primary};
  color: white;
  font-size: 0.875rem;
  font-weight: 700;
  flex-shrink: 0;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: ${confluenceTheme.text.primary};
  line-height: 1.4;
  flex: 1;
  min-width: 0;
`;

const OpenInBrowserBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: 1px solid ${confluenceTheme.border};
  border-radius: 50%;
  color: ${confluenceTheme.text.muted};
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ${transition};

  &:hover {
    background: ${confluenceTheme.primaryLight};
    border-color: ${confluenceTheme.primary};
    color: ${confluenceTheme.primary};
  }
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${confluenceTheme.border};
`;

const MetaItem = styled.div`
  font-size: 0.8125rem;
`;

const MetaLabel = styled.span`
  display: block;
  color: ${confluenceTheme.text.muted};
  margin-bottom: 0.25rem;
`;

const MetaValue = styled.span`
  color: ${confluenceTheme.text.primary};
`;

const Section = styled.div`
  padding: 1.5rem;
  background: ${confluenceTheme.bg.default};
  border-radius: 3px;
  border: 1px solid ${confluenceTheme.border};
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h2`
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${confluenceTheme.text.primary};
`;

const SectionToggleHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;

  &:hover ${SectionTitle} {
    color: ${confluenceTheme.primary};
  }

  ${SectionTitle} {
    margin-bottom: 0;
  }
`;

const SectionToggleArrow = styled.span`
  font-size: 0.7rem;
  color: ${confluenceTheme.text.muted};
  width: 1rem;
  flex-shrink: 0;
`;

const RichContent = styled.div`
  font-size: 0.875rem;
  color: ${confluenceTheme.text.primary};
  line-height: 1.6;

  p { margin: 0 0 0.5rem 0; }
  p:last-child { margin-bottom: 0; }

  h1, h2, h3, h4, h5, h6 {
    margin: 1rem 0 0.5rem 0;
    color: ${confluenceTheme.text.primary};
    line-height: 1.3;
  }
  h1 { font-size: 1.25rem; }
  h2 { font-size: 1.125rem; }
  h3 { font-size: 1rem; }
  h4, h5, h6 { font-size: 0.875rem; }
  h1:first-child, h2:first-child, h3:first-child { margin-top: 0; }

  ul, ol {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }
  li { margin-bottom: 0.25rem; }

  a {
    color: ${confluenceTheme.primary};
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }

  code {
    background: ${confluenceTheme.bg.subtle};
    border: 1px solid ${confluenceTheme.border};
    border-radius: 3px;
    padding: 0.125rem 0.375rem;
    font-size: 0.8125rem;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  }

  pre {
    background: #263238;
    color: #EEFFFF;
    border-radius: 3px;
    padding: 0.75rem 1rem;
    margin: 0.5rem 0;
    overflow-x: auto;

    code {
      background: none;
      border: none;
      padding: 0;
      color: inherit;
      font-size: 0.8125rem;
    }
  }

  blockquote {
    margin: 0.5rem 0;
    padding: 0.5rem 1rem;
    border-left: 3px solid ${confluenceTheme.primary};
    background: ${confluenceTheme.primaryLight};
    color: ${confluenceTheme.text.secondary};
  }

  hr {
    border: none;
    border-top: 1px solid ${confluenceTheme.border};
    margin: 1rem 0;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5rem 0;
  }
  th, td {
    border: 1px solid ${confluenceTheme.border};
    padding: 0.5rem 0.625rem;
    font-size: 0.8125rem;
    text-align: left;
  }
  th {
    background: ${confluenceTheme.bg.subtle};
    font-weight: 600;
  }

  img {
    max-width: 100%;
    border-radius: 3px;
  }

  .confluence-panel {
    margin: 0.5rem 0;
    padding: 0.75rem 1rem;
    border-radius: 3px;
    border-left: 3px solid;
  }
  .confluence-panel-info { border-color: ${confluenceTheme.primary}; background: ${confluenceTheme.primaryLight}; }
  .confluence-panel-note { border-color: #6554C0; background: #EAE6FF; }
  .confluence-panel-tip { border-color: #36B37E; background: #E3FCEF; }
  .confluence-panel-warning { border-color: #FF991F; background: #FFFAE6; }

  .adf-media-placeholder {
    color: ${confluenceTheme.text.muted};
    font-style: italic;
  }

  details {
    margin: 0.5rem 0;
    border: 1px solid ${confluenceTheme.border};
    border-radius: 3px;

    summary {
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      font-weight: 500;
      background: ${confluenceTheme.bg.subtle};
      &:hover { background: ${confluenceTheme.bg.hover}; }
    }

    > *:not(summary) {
      padding: 0 0.75rem;
    }
  }
`;

const CommentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const CommentItem = styled.div`
  padding: 0.75rem;
  background: ${confluenceTheme.bg.subtle};
  border-radius: 3px;
  border: 1px solid ${confluenceTheme.border};
`;

const CommentHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const CommentAuthor = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${confluenceTheme.text.primary};
`;

const CommentDate = styled.span`
  font-size: 0.75rem;
  color: ${confluenceTheme.text.muted};
  flex-shrink: 0;
`;

const CommentBody = styled(RichContent)`
  font-size: 0.8125rem;
`;

const EmptyComments = styled.div`
  font-size: 0.8125rem;
  color: ${confluenceTheme.text.muted};
  margin-top: 1rem;
`;

const EmptyMsg = styled.div`
  padding: 4rem 2rem;
  text-align: center;
  color: ${confluenceTheme.text.secondary};
`;
