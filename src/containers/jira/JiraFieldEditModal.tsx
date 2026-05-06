import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

import { jiraTheme } from 'lib/styles/jiraTheme';
import zIndex from 'lib/styles/zIndex';
import { integrationController } from 'controllers/account';
import JiraFieldInput, {
  isFieldInputSupported,
  serializeFieldValue,
} from 'components/jira/JiraFieldInput';
import type { JiraProjectField } from 'types/jira';

interface Props {
  accountId: string;
  issueKey: string;
  projectKey: string;
  field: JiraProjectField;
  /** 현재 raw 값 (Jira API 응답 형태). 입력값 초기화에 사용. */
  currentValue: unknown;
  /** baseUrl - 미지원 타입 fallback 시 Jira 웹으로 이동 */
  baseUrl?: string;
  /** 저장 성공 시 호출. 두 번째 인자는 저장에 사용한 raw 값(낙관적 갱신용). */
  onSaved: (fieldId: string, rawValue: unknown) => void;
  onClose: () => void;
}

/**
 * UI value를 "표시용 raw 값"으로 변환.
 * API에 보낼 직렬화(`serializeFieldValue`)와 달리, formatFieldValue가 사람 읽을
 * 문자열을 만들 수 있도록 가능한 메타(value/name)를 함께 채운다.
 *
 * - option/array<option>: field.allowedValues에서 매칭해 풍부한 객체 사용
 * - 그 외 타입(version/component/user 등): 직렬화 결과 그대로 — 모달 부모가
 *   뒤이어 refetchIssue로 권위값을 가져와 자동 보정한다.
 */
const buildOptimisticRaw = (field: JiraProjectField, uiValue: unknown): unknown => {
  const { type, items } = field.schema;
  const av = field.allowedValues ?? [];

  const findOpt = (id: string) =>
    av.find((v) => String(v.id ?? v.value ?? v.name) === id);

  if (type === 'option') {
    if (uiValue === undefined || uiValue === null || uiValue === '') return null;
    const id = String(uiValue);
    return findOpt(id) ?? { id };
  }
  if (type === 'array' && items === 'option' && Array.isArray(uiValue)) {
    return (uiValue as string[]).map((id) => findOpt(id) ?? { id });
  }
  // 그 외는 일반 직렬화 결과 — refetch가 곧 권위값으로 덮어씀
  return undefined; // 호출자에 위임 (= serializeFieldValue 결과 사용)
};

/** raw API 값을 JiraFieldInput이 다루는 단순 UI value로 변환. */
const rawToUiValue = (field: JiraProjectField, raw: unknown): unknown => {
  if (raw === null || raw === undefined) return undefined;
  const { type, items } = field.schema;

  if (type === 'string' || type === 'date' || type === 'datetime') return raw;
  if (type === 'number') return String(raw);
  if (type === 'option') {
    const o = raw as Record<string, unknown>;
    return String(o.id ?? o.value ?? o.name ?? '');
  }
  if (type === 'user') {
    const o = raw as Record<string, unknown>;
    return String(o.accountId ?? '');
  }
  if (type === 'array' && Array.isArray(raw)) {
    if (items === 'option' || items === 'version' || items === 'component') {
      return raw.map((v) => {
        const o = v as Record<string, unknown>;
        return String(o.id ?? o.value ?? o.name ?? '');
      }).filter(Boolean);
    }
    if (items === 'user') {
      return raw.map((v) => {
        const o = v as Record<string, unknown>;
        return String(o.accountId ?? '');
      }).filter(Boolean);
    }
  }
  return raw;
};

const openInBrowser = (url: string): void => {
  const api = (window as unknown as { electronAPI?: { openExternal?: (u: string) => void } }).electronAPI;
  if (api?.openExternal) api.openExternal(url);
  else window.open(url, '_blank');
};

const JiraFieldEditModal = ({
  accountId,
  issueKey,
  projectKey,
  field,
  currentValue,
  baseUrl,
  onSaved,
  onClose,
}: Props) => {
  const supported = isFieldInputSupported(field);
  const [uiValue, setUiValue] = useState<unknown>(() => rawToUiValue(field, currentValue));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const issueWebUrl = useMemo(() => {
    if (!baseUrl) return null;
    return `${baseUrl.replace(/\/$/, '')}/browse/${issueKey}`;
  }, [baseUrl, issueKey]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const serialized = serializeFieldValue(field, uiValue);
    try {
      await integrationController.invoke({
        accountId,
        serviceType: 'jira',
        action: 'updateIssueField',
        params: { issueKey, fieldId: field.id, fieldValue: serialized },
      });
      // optimistic 표시용 raw 값. allowedValues로 풍부화 가능한 타입은 그것을, 아니면 직렬화 결과.
      const optimistic = buildOptimisticRaw(field, uiValue);
      onSaved(field.id, optimistic !== undefined ? optimistic : serialized);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  };

  return createPortal(
    <Overlay onMouseDown={onClose}>
      <Dialog onMouseDown={(e) => e.stopPropagation()}>
        <Header>
          <TitleArea>
            <Title>{field.name}</Title>
            <Sub>편집 · {field.schema.type}{field.schema.items ? `<${field.schema.items}>` : ''}</Sub>
          </TitleArea>
          <CloseBtn type="button" onClick={onClose} aria-label="닫기">×</CloseBtn>
        </Header>
        <Body>
          {supported ? (
            <>
              <JiraFieldInput
                field={field}
                value={uiValue}
                onChange={setUiValue}
                accountId={accountId}
                projectKey={projectKey}
              />
              {error && <ErrorMsg>{error}</ErrorMsg>}
            </>
          ) : (
            <UnsupportedBanner>
              <strong>이 필드 타입은 앱에서 직접 편집할 수 없습니다.</strong>
              <p>Jira 웹에서 처리해주세요.</p>
            </UnsupportedBanner>
          )}
        </Body>
        <Footer>
          <SecondaryBtn type="button" onClick={onClose} disabled={saving}>취소</SecondaryBtn>
          {supported ? (
            <PrimaryBtn type="button" onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </PrimaryBtn>
          ) : (
            <PrimaryBtn
              type="button"
              onClick={() => { if (issueWebUrl) openInBrowser(issueWebUrl); onClose(); }}
              disabled={!issueWebUrl}
              title={issueWebUrl ?? '이슈 URL을 확인할 수 없습니다.'}
            >
              Jira에서 처리
            </PrimaryBtn>
          )}
        </Footer>
      </Dialog>
    </Overlay>,
    document.getElementById('portal-root') || document.body,
  );
};

export default JiraFieldEditModal;

// ── Styled ──

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: ${zIndex.modal};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Dialog = styled.div`
  background: ${jiraTheme.bg.default};
  border-radius: 6px;
  border: 1px solid ${jiraTheme.border};
  width: 460px;
  max-width: calc(100vw - 32px);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid ${jiraTheme.border};
`;

const TitleArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
`;

const Sub = styled.span`
  font-size: 0.6875rem;
  color: ${jiraTheme.text.muted};
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  font-size: 1.25rem;
  color: ${jiraTheme.text.muted};
  cursor: pointer;
  padding: 0.25rem;
  &:hover { color: ${jiraTheme.text.primary}; }
`;

const Body = styled.div`
  padding: 1rem 1.25rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
`;

const ErrorMsg = styled.div`
  font-size: 0.75rem;
  color: ${jiraTheme.priority.high};
  background: #FFEBE6;
  padding: 0.5rem 0.625rem;
  border-radius: 4px;
`;

const UnsupportedBanner = styled.div`
  font-size: 0.8125rem;
  color: ${jiraTheme.text.primary};
  background: #FFF7E6;
  border: 1px solid #FFE0A3;
  padding: 0.625rem 0.75rem;
  border-radius: 4px;

  & p { margin: 0.25rem 0 0 0; color: ${jiraTheme.text.secondary}; }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid ${jiraTheme.border};
`;

const BaseBtn = styled.button`
  height: 32px;
  border-radius: 20px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0 1rem;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const SecondaryBtn = styled(BaseBtn)`
  background: transparent;
  border: 1px solid ${jiraTheme.border};
  color: ${jiraTheme.text.primary};
  &:not(:disabled):hover { background: ${jiraTheme.bg.hover}; }
`;

const PrimaryBtn = styled(BaseBtn)`
  background: ${jiraTheme.primary};
  border: 1px solid ${jiraTheme.primary};
  color: #fff;
  &:not(:disabled):hover { background: ${jiraTheme.primaryHover}; }
`;
