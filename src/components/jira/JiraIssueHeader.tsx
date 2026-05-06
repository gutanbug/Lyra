import React, { useContext, useState } from 'react';
import styled from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';
import { transition } from 'lib/styles/styles';
import { getStatusColor, formatDate } from 'lib/utils/jiraUtils';
import JiraTaskIcon, { resolveTaskType } from 'components/jira/JiraTaskIcon';
import JiraPriorityIcon from 'components/jira/JiraPriorityIcon';
import { StatusBadgeBtn, ChevronIcon } from 'components/jira/jiraIssueStyles';
import { ExternalLink, Edit2, Link2, Check } from 'lucide-react';
import { snackbarContext } from 'modules/contexts/snackbar';
import { newSnackbar } from 'modules/actions/snackbar';
import type { NormalizedDetail } from 'types/jira';
import type { JiraCredentials } from 'types/account';

export interface MetaFieldDescriptor {
  id: string;
  label: string;
  value: string;
  isMe?: boolean;
  clickable?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  /** true면 hover 시 편집 아이콘 노출. onEdit prop이 함께 제공돼야 동작. */
  editable?: boolean;
}

export type FieldVisibility = {
  summary: boolean;
  issuetype: boolean;
  status: boolean;
  priority: boolean;
};

const DEFAULT_VISIBILITY: FieldVisibility = {
  summary: true,
  issuetype: true,
  status: true,
  priority: true,
};

interface JiraIssueHeaderProps {
  issue: NormalizedDetail;
  myDisplayName: string | undefined;
  activeAccount: { credentials: unknown };
  onOpenTransition: (issueKey: string, statusName: string, e: React.MouseEvent) => void;
  onOpenAssignee: (issueKey: string, e: React.MouseEvent) => void;
  onOpenPriority?: (issueKey: string, priorityName: string, e: React.MouseEvent) => void;
  /**
   * MetaGrid 항목 (순서·라벨·표시 가시성 적용된 결과). 미지정 시 기본 5종 노출.
   */
  metaFields?: MetaFieldDescriptor[];
  /** 헤더 코어 필드(summary/issuetype/status/priority)의 표시 여부. 미지정 시 모두 표시. */
  visibility?: Partial<FieldVisibility>;
  /** editable=true인 MetaItem 클릭 시 호출. 부모가 편집 모달 오픈 담당. */
  onEditField?: (fieldId: string) => void;
}

/** 설정이 없을 때의 기본 메타 필드 구성. */
const buildDefaultMetaFields = (
  issue: NormalizedDetail,
  myDisplayName: string | undefined,
  onOpenAssignee: (issueKey: string, e: React.MouseEvent) => void,
): MetaFieldDescriptor[] => {
  const fields: MetaFieldDescriptor[] = [
    {
      id: 'assignee',
      label: '담당자',
      value: issue.assigneeName || '미지정',
      isMe: issue.assigneeName === myDisplayName,
      clickable: true,
      onClick: (e) => onOpenAssignee(issue.key, e),
    },
    { id: 'reporter', label: '보고자', value: issue.reporterName || '-' },
    { id: 'created', label: '생성일', value: formatDate(issue.created) },
    { id: 'updated', label: '수정일', value: formatDate(issue.updated) },
  ];
  if (issue.duedate) {
    fields.push({ id: 'duedate', label: '마감일', value: issue.duedate.slice(0, 10) });
  }
  return fields;
};

const JiraIssueHeader = ({
  issue,
  myDisplayName,
  activeAccount,
  onOpenTransition,
  onOpenAssignee,
  onOpenPriority,
  metaFields,
  visibility,
  onEditField,
}: JiraIssueHeaderProps) => {
  const v: FieldVisibility = { ...DEFAULT_VISIBILITY, ...(visibility ?? {}) };
  const meta = metaFields ?? buildDefaultMetaFields(issue, myDisplayName, onOpenAssignee);
  const showBadges = (v.status && issue.statusName) || (v.priority && issue.priorityName);

  const { dispatch: snackbarDispatch } = useContext(snackbarContext);
  const [copied, setCopied] = useState(false);
  const issueUrl = (() => {
    const baseUrl = (activeAccount.credentials as JiraCredentials).baseUrl?.replace(/\/$/, '') || '';
    return baseUrl ? `${baseUrl}/browse/${issue.key}` : '';
  })();
  const handleCopyLink = async () => {
    if (!issueUrl) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(issueUrl);
      ok = true;
    } catch {
      // 클립보드 권한 실패 시 textarea fallback
      const ta = document.createElement('textarea');
      ta.value = issueUrl;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand('copy');
      } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      newSnackbar(snackbarDispatch, '이슈 링크가 복사되었습니다.', 'SUCCESS');
    } else {
      newSnackbar(snackbarDispatch, '링크 복사에 실패했습니다.', 'ERROR');
    }
  };

  return (
    <HeaderCard>
      <HeaderTopRow>
        <IssueKeyRow>
          {v.issuetype && <JiraTaskIcon type={resolveTaskType(issue.issueTypeName)} size={24} />}
          <IssueKeyLink>{issue.key}</IssueKeyLink>
        </IssueKeyRow>
        <TopRowActions>
          <CopyLinkBtn
            type="button"
            title={copied ? '복사됨' : '링크 복사'}
            onClick={handleCopyLink}
            disabled={!issueUrl}
            $copied={copied}
          >
            {copied ? <Check size={16} /> : <Link2 size={16} />}
          </CopyLinkBtn>
          <OpenInBrowserBtn
            type="button"
            title="Jira에서 열기"
            onClick={() => {
              if (!issueUrl) return;
              const api = (window as any).electronAPI;
              if (api?.openExternal) api.openExternal(issueUrl);
              else window.open(issueUrl, '_blank');
            }}
          >
            <ExternalLink size={16} />
          </OpenInBrowserBtn>
        </TopRowActions>
      </HeaderTopRow>
      {showBadges && (
        <Badges>
          {v.status && issue.statusName && (
            <StatusBadgeBtn
              $color={getStatusColor(issue.statusName, issue.statusCategory)}
              onClick={(e) => onOpenTransition(issue.key, issue.statusName, e)}
            >
              {issue.statusName}
              <ChevronIcon>▾</ChevronIcon>
            </StatusBadgeBtn>
          )}
          {v.priority && issue.priorityName && (
            <PriorityBadgeBtn onClick={(e) => onOpenPriority?.(issue.key, issue.priorityName, e)} title={issue.priorityName}>
              <JiraPriorityIcon priority={issue.priorityName} size={18} />
            </PriorityBadgeBtn>
          )}
        </Badges>
      )}
      {v.summary && <Title>{issue.summary || '(제목 없음)'}</Title>}

      {meta.length > 0 && (
        <MetaGrid>
          {meta.map((f) => {
            const supportsEdit = Boolean(f.editable && onEditField);
            return (
              <MetaItem key={f.id}>
                <MetaLabel>{f.label}</MetaLabel>
                <MetaValueRow>
                  <MetaValue
                    $isMe={f.isMe}
                    $clickable={Boolean(f.clickable && f.onClick)}
                    onClick={f.onClick}
                  >
                    {f.value}
                  </MetaValue>
                  {supportsEdit && (
                    <EditTrigger
                      type="button"
                      title={`${f.label} 편집`}
                      onClick={() => onEditField?.(f.id)}
                    >
                      <Edit2 size={12} />
                    </EditTrigger>
                  )}
                </MetaValueRow>
              </MetaItem>
            );
          })}
        </MetaGrid>
      )}
    </HeaderCard>
  );
};

export default JiraIssueHeader;

const HeaderCard = styled.div`
  padding: 1.5rem;
  background: ${jiraTheme.bg.default};
  border-radius: 3px;
  border: 1px solid ${jiraTheme.border};
  margin-bottom: 1rem;
`;

const HeaderTopRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
`;

const IssueKeyRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  min-width: 0;
`;

const IssueKeyLink = styled.span`
  font-weight: 700;
  font-size: 1.125rem;
  color: ${jiraTheme.primary};
`;

const TopRowActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
`;

const CopyLinkBtn = styled.button<{ $copied: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: ${({ $copied }) => ($copied ? jiraTheme.primaryLight : 'transparent')};
  border: 1px solid ${({ $copied }) => ($copied ? jiraTheme.primary : jiraTheme.border)};
  border-radius: 50%;
  color: ${({ $copied }) => ($copied ? jiraTheme.primary : jiraTheme.text.muted)};
  cursor: pointer;
  transition: all 0.15s ${transition};

  &:not(:disabled):hover {
    background: ${jiraTheme.primaryLight};
    border-color: ${jiraTheme.primary};
    color: ${jiraTheme.primary};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const OpenInBrowserBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: 1px solid ${jiraTheme.border};
  border-radius: 50%;
  color: ${jiraTheme.text.muted};
  cursor: pointer;
  transition: all 0.15s ${transition};

  &:hover {
    background: ${jiraTheme.primaryLight};
    border-color: ${jiraTheme.primary};
    color: ${jiraTheme.primary};
  }
`;

const Title = styled.h1`
  margin: 0.5rem 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
  line-height: 1.4;
`;

const Badges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const PriorityBadgeBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: 3px;
  border: 1px solid ${jiraTheme.border};
  background: ${jiraTheme.bg.subtle};
  color: ${jiraTheme.text.primary};
  cursor: pointer;
  transition: all 0.15s ${transition};

  &:hover {
    background: ${jiraTheme.bg.hover};
    border-color: ${jiraTheme.text.muted};
  }
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${jiraTheme.border};
`;

const MetaItem = styled.div`
  font-size: 0.8125rem;
`;

const MetaLabel = styled.span`
  display: block;
  color: ${jiraTheme.text.muted};
  margin-bottom: 0.25rem;
`;

const MetaValueRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;

  /* hover 시에만 편집 트리거 노출 */
  &:hover button { opacity: 1; }
`;

const EditTrigger = styled.button`
  opacity: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 3px;
  color: ${jiraTheme.text.muted};
  cursor: pointer;
  transition: opacity 0.15s ${transition}, background 0.15s ${transition};
  &:hover { background: ${jiraTheme.bg.hover}; color: ${jiraTheme.text.primary}; opacity: 1; }
`;

const MetaValue = styled.span<{ $isMe?: boolean; $clickable?: boolean }>`
  color: ${({ $isMe }) => ($isMe ? jiraTheme.primary : jiraTheme.text.primary)};
  font-weight: ${({ $isMe }) => ($isMe ? 600 : 400)};
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  border-radius: 3px;
  padding: 0.125rem 0.25rem;

  &:hover {
    ${({ $clickable }) => $clickable && `background: ${jiraTheme.bg.hover};`}
  }
`;
