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
  padding: 28px 32px;
  background: ${jiraTheme.bg.default};
  border-radius: ${jiraTheme.radius.card};
  border: 1px solid ${jiraTheme.border};
  box-shadow: ${jiraTheme.shadow.card};
  margin-bottom: 18px;
`;

const HeaderTopRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
`;

const IssueKeyRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
`;

const IssueKeyLink = styled.span`
  font-family: ${jiraTheme.font.brand};
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 0;
  color: ${jiraTheme.text.muted};
`;

const TopRowActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`;

const CopyLinkBtn = styled.button<{ $copied: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  background: ${({ $copied }) => ($copied ? jiraTheme.primaryLight : 'transparent')};
  border: 1px solid ${({ $copied }) => ($copied ? jiraTheme.primary : jiraTheme.borderStrong)};
  border-radius: ${jiraTheme.radius.ctl};
  color: ${({ $copied }) => ($copied ? jiraTheme.primary : jiraTheme.text.muted)};
  cursor: pointer;
  transition: background ${jiraTheme.motion.fast}, border-color ${jiraTheme.motion.fast}, color ${jiraTheme.motion.fast};

  &:not(:disabled):hover {
    background: ${jiraTheme.primaryLight};
    border-color: ${jiraTheme.primary};
    color: ${jiraTheme.primary};
  }

  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const OpenInBrowserBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  background: transparent;
  border: 1px solid ${jiraTheme.borderStrong};
  border-radius: ${jiraTheme.radius.ctl};
  color: ${jiraTheme.text.muted};
  cursor: pointer;
  transition: background ${jiraTheme.motion.fast}, border-color ${jiraTheme.motion.fast}, color ${jiraTheme.motion.fast};

  &:hover {
    background: ${jiraTheme.primaryLight};
    border-color: ${jiraTheme.primary};
    color: ${jiraTheme.primary};
  }
`;

const Title = styled.h1`
  margin: 6px 0 14px 0;
  font-family: ${jiraTheme.font.body};
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${jiraTheme.text.primary};
  line-height: 1.3;
`;

const Badges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
`;

const PriorityBadgeBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  font-family: ${jiraTheme.font.body};
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  border-radius: ${jiraTheme.radius.chip};
  border: 1px solid ${jiraTheme.borderStrong};
  background: ${jiraTheme.bg.default};
  color: ${jiraTheme.text.primary};
  cursor: pointer;
  transition: background ${jiraTheme.motion.fast}, border-color ${jiraTheme.motion.fast};

  &:hover {
    background: ${jiraTheme.hairline};
    border-color: ${jiraTheme.text.muted};
  }
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 18px;
  padding-top: 18px;
  border-top: 1px solid ${jiraTheme.hairline};
`;

const MetaItem = styled.div`
  font-family: ${jiraTheme.font.body};
  font-size: 13.5px;
`;

const MetaLabel = styled.span`
  display: block;
  color: ${jiraTheme.text.muted};
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const MetaValueRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &:hover button { opacity: 1; }
`;

const EditTrigger = styled.button`
  opacity: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: ${jiraTheme.text.muted};
  cursor: pointer;
  transition: opacity ${jiraTheme.motion.fast}, background ${jiraTheme.motion.fast}, color ${jiraTheme.motion.fast};

  &:hover { background: ${jiraTheme.hairline}; color: ${jiraTheme.text.primary}; opacity: 1; }
`;

const MetaValue = styled.span<{ $isMe?: boolean; $clickable?: boolean }>`
  font-size: 14px;
  font-weight: ${({ $isMe }) => ($isMe ? 600 : 500)};
  color: ${({ $isMe }) => ($isMe ? jiraTheme.primary : jiraTheme.text.primary)};
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  border-radius: 6px;
  padding: 2px 6px;
  transition: background ${jiraTheme.motion.fast};

  &:hover {
    ${({ $clickable }) => $clickable && `background: ${jiraTheme.hairline};`}
  }
`;
