import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { jiraTheme } from 'lib/styles/jiraTheme';
import zIndex from 'lib/styles/zIndex';
import JiraFieldInput, {
  isFieldInputSupported,
  serializeFieldValue,
} from 'components/jira/JiraFieldInput';
import type { JiraProjectField, JiraTransition, JiraTransitionField } from 'types/jira';

interface Props {
  accountId: string | undefined;
  issueKey: string;
  transition: JiraTransition;
  /** Atlassian baseUrl. unsupported 필드 fallback 링크 생성용 */
  baseUrl?: string;
  onSubmit: (fields: Record<string, unknown>) => void | Promise<void>;
  onClose: () => void;
}

interface RequiredField {
  id: string;
  meta: JiraTransitionField;
  /** JiraFieldInput에 넘기기 위한 ProjectField 형태 (id 합성) */
  asProjectField: JiraProjectField;
}

const projectKeyOf = (issueKey: string) => issueKey.split('-')[0] || '';

const openInBrowser = (url: string): void => {
  const api = (window as unknown as { electronAPI?: { openExternal?: (u: string) => void } }).electronAPI;
  if (api?.openExternal) api.openExternal(url);
  else window.open(url, '_blank');
};

const JiraTransitionFieldsModal = ({ accountId, issueKey, transition, baseUrl, onSubmit, onClose }: Props) => {
  const requiredFields = useMemo<RequiredField[]>(() => {
    const map = transition.fields ?? {};
    return Object.entries(map)
      .filter(([, m]) => m?.required)
      .map(([id, meta]) => ({
        id,
        meta,
        asProjectField: {
          id,
          name: meta.name,
          required: meta.required,
          schema: meta.schema,
          allowedValues: meta.allowedValues as Array<Record<string, unknown>> | undefined,
        },
      }));
  }, [transition]);

  const unsupportedFields = useMemo(
    () => requiredFields.filter((f) => !isFieldInputSupported(f.asProjectField)),
    [requiredFields],
  );
  const hasUnsupported = unsupportedFields.length > 0;

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setValue = (id: string, value: unknown) => setValues((prev) => ({ ...prev, [id]: value }));

  const isComplete = !hasUnsupported && requiredFields.every((f) => {
    const v = values[f.id];
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== '' && v !== null;
  });

  const issueWebUrl = useMemo(() => {
    if (!baseUrl) return null;
    return `${baseUrl.replace(/\/$/, '')}/browse/${issueKey}`;
  }, [baseUrl, issueKey]);

  const handleSubmit = async () => {
    if (!isComplete || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      requiredFields.forEach((f) => {
        payload[f.id] = serializeFieldValue(f.asProjectField, values[f.id]);
      });
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  const projectKey = projectKeyOf(issueKey);

  return createPortal(
    <Overlay onMouseDown={onClose}>
      <Dialog onMouseDown={(e) => e.stopPropagation()}>
        <Header>
          <Title>
            <span>{transition.to?.name || transition.name}</span>
            <Sub>(으)로 전환</Sub>
          </Title>
          <CloseBtn type="button" onClick={onClose}>×</CloseBtn>
        </Header>
        <Body>
          <Hint>이 전환에는 다음 필드 입력이 필요합니다.</Hint>
          {hasUnsupported && (
            <UnsupportedBanner>
              <strong>앱이 처리할 수 없는 필드 타입이 포함되어 있어 Jira 웹에서 전환을 진행해야 합니다.</strong>
              <UnsupportedList>
                {unsupportedFields.map((f) => (
                  <li key={f.id}>
                    {f.meta.name}{' '}
                    <code>
                      {f.meta.schema.type}
                      {f.meta.schema.items ? `<${f.meta.schema.items}>` : ''}
                    </code>
                  </li>
                ))}
              </UnsupportedList>
            </UnsupportedBanner>
          )}
          {requiredFields.length === 0 ? (
            <Empty>표시할 필드가 없습니다.</Empty>
          ) : (
            requiredFields.map((f) => (
              <FieldRow key={f.id}>
                <Label>
                  {f.meta.name}
                  <Required> *</Required>
                </Label>
                {isFieldInputSupported(f.asProjectField) ? (
                  <JiraFieldInput
                    field={f.asProjectField}
                    value={values[f.id]}
                    onChange={(v) => setValue(f.id, v)}
                    accountId={accountId}
                    projectKey={projectKey}
                  />
                ) : (
                  <Empty>
                    이 필드 타입({f.meta.schema.type}
                    {f.meta.schema.items ? `/${f.meta.schema.items}` : ''})은 앱에서 입력할 수 없습니다.
                  </Empty>
                )}
              </FieldRow>
            ))
          )}
          {error && <ErrorMsg>{error}</ErrorMsg>}
        </Body>
        <Footer>
          <SecondaryBtn type="button" onClick={onClose} disabled={submitting}>취소</SecondaryBtn>
          {hasUnsupported ? (
            <PrimaryBtn
              type="button"
              onClick={() => { if (issueWebUrl) openInBrowser(issueWebUrl); onClose(); }}
              disabled={!issueWebUrl}
              title={issueWebUrl ?? '이슈 URL을 확인할 수 없습니다.'}
            >
              Jira에서 처리
            </PrimaryBtn>
          ) : (
            <PrimaryBtn type="button" onClick={handleSubmit} disabled={!isComplete || submitting}>
              {submitting ? '전환 중...' : '전환'}
            </PrimaryBtn>
          )}
        </Footer>
      </Dialog>
    </Overlay>,
    document.getElementById('portal-root') || document.body
  );
};

export default JiraTransitionFieldsModal;

// ── Styled ──

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(9, 30, 66, 0.54);
  z-index: ${zIndex.modal};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Dialog = styled.div`
  width: 480px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 64px);
  background: ${jiraTheme.bg.default};
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid ${jiraTheme.border};
`;

const Title = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
`;

const Sub = styled.span`
  font-size: 0.75rem;
  font-weight: 400;
  color: ${jiraTheme.text.secondary};
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: ${jiraTheme.text.muted};
  cursor: pointer;
  padding: 0 0.25rem;

  &:hover { color: ${jiraTheme.text.primary}; }
`;

const Body = styled.div`
  padding: 1rem 1.25rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
`;

const Hint = styled.div`
  font-size: 0.75rem;
  color: ${jiraTheme.text.secondary};
`;

const FieldRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const Label = styled.label`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${jiraTheme.text.primary};
`;

const Required = styled.span`
  color: ${jiraTheme.priority.high};
`;

const Empty = styled.div`
  font-size: 0.75rem;
  color: ${jiraTheme.text.muted};
`;

const ErrorMsg = styled.div`
  font-size: 0.75rem;
  color: ${jiraTheme.priority.high};
  background: #FFEBE6;
  padding: 0.5rem 0.625rem;
  border-radius: 4px;
`;

const UnsupportedBanner = styled.div`
  font-size: 0.75rem;
  color: ${jiraTheme.text.primary};
  background: #FFF7E6;
  border: 1px solid #FFE0A3;
  padding: 0.625rem 0.75rem;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;

  & strong { font-weight: 600; }
  & code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.6875rem;
    background: ${jiraTheme.bg.subtle};
    padding: 0 4px;
    border-radius: 3px;
  }
`;

const UnsupportedList = styled.ul`
  margin: 0;
  padding-left: 1rem;
  color: ${jiraTheme.text.secondary};
  & li { line-height: 1.5; }
`;

const Footer = styled.div`
  padding: 0.75rem 1.25rem;
  border-top: 1px solid ${jiraTheme.border};
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
`;

const BaseBtn = styled.button`
  height: 32px;
  border-radius: 4px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0 0.875rem;

  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const SecondaryBtn = styled(BaseBtn)`
  background: ${jiraTheme.bg.subtle};
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
