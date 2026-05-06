import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { theme } from 'lib/styles/theme';
import { transition } from 'lib/styles/styles';
import { SectionToggleHeader, SectionToggleArrow } from 'lib/styles/commonStyles';
import { AGENT_META } from 'types/agent';
import type { AgentStatus } from 'types/agent';

interface Props {
  status: AgentStatus;
  busy: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onRefresh: () => void;
  onSaveApiKey: (key: string | null) => void;
  onSaveBinaryPath: (path: string | null) => void;
  onOpenInstall: () => void;
}

const AgentCard = ({
  status, busy, onLogin, onLogout, onRefresh, onSaveApiKey, onSaveBinaryPath, onOpenInstall,
}: Props) => {
  const meta = AGENT_META[status.id];
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [binaryDraft, setBinaryDraft] = useState(status.binaryOverride ?? '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const userToggledRef = useRef(false);

  // 저장된 고급 설정(API Key / CLI 경로)이 도착하면 자동으로 펼친다.
  // 단, 사용자가 한 번이라도 수동 토글했다면 의사결정을 존중하고 덮어쓰지 않는다.
  useEffect(() => {
    if (userToggledRef.current) return;
    if (status.apiKeyMasked || status.binaryOverride) {
      setAdvancedOpen(true);
    }
  }, [status.apiKeyMasked, status.binaryOverride]);

  const toggleAdvanced = () => {
    userToggledRef.current = true;
    setAdvancedOpen((v) => !v);
  };

  const badge = (() => {
    if (!status.installed) return { label: '미설치', tone: 'muted' as const };
    if (!status.authenticated) return { label: '미인증', tone: 'warn' as const };
    if (status.authMethod === 'oauth') return { label: 'OAuth 연결됨', tone: 'ok' as const };
    return { label: 'API Key 연결됨', tone: 'ok' as const };
  })();

  return (
    <Card>
      <CardHeader>
        <HeaderLeft>
          <Title>{meta.displayName}</Title>
          {status.version && <VersionTag>{status.version}</VersionTag>}
        </HeaderLeft>
        <Badge $tone={badge.tone}>{badge.label}</Badge>
      </CardHeader>

      <Row>
        <Label>바이너리</Label>
        <Value>
          {status.binaryPath ? (
            <Mono title={status.binaryPath}>{status.binaryPath}</Mono>
          ) : (
            <Muted>
              PATH에서 찾을 수 없습니다.{' '}
              <LinkBtn onClick={onOpenInstall}>설치 가이드 열기</LinkBtn>
            </Muted>
          )}
        </Value>
      </Row>

      {status.credentialPath && (
        <Row>
          <Label>Credential</Label>
          <Value>
            <Mono>{status.credentialPath}</Mono>
            {status.credentialMtime && (
              <Sub>업데이트: {new Date(status.credentialMtime).toLocaleString('ko-KR')}</Sub>
            )}
          </Value>
        </Row>
      )}

      <Row>
        <Label>인증 방식</Label>
        <Value>
          <AuthLine>
            {status.authMethod === 'oauth' && 'OAuth (CLI 로그인)'}
            {status.authMethod === 'apiKey' && (
              <>
                API Key {status.apiKeyMasked && <Mono>{status.apiKeyMasked}</Mono>}
              </>
            )}
            {status.authMethod === 'none' && <Muted>인증되지 않음</Muted>}
          </AuthLine>
        </Value>
      </Row>

      <ButtonRow>
        <PrimaryBtn onClick={onLogin} disabled={!status.installed || busy}>
          {status.authMethod === 'oauth' ? '재로그인' : 'CLI 로그인'}
        </PrimaryBtn>
        <SecondaryBtn onClick={onLogout} disabled={!status.authenticated || busy}>
          로그아웃
        </SecondaryBtn>
        <GhostBtn onClick={onRefresh} disabled={busy}>
          상태 새로고침
        </GhostBtn>
      </ButtonRow>

      <Divider />

      <SectionToggleHeader onClick={toggleAdvanced}>
        <SectionToggleArrow>{advancedOpen ? '▼' : '▶'}</SectionToggleArrow>
        <AdvancedLabel>고급</AdvancedLabel>
      </SectionToggleHeader>

      {advancedOpen && (
        <AdvancedBody>
          <SectionLabel>API Key 직접 입력 (env: {meta.apiKeyEnv})</SectionLabel>
          <InlineRow>
            <Input
              type={showApiKey ? 'text' : 'password'}
              value={apiKeyDraft}
              placeholder={status.apiKeyMasked ?? '키를 입력하세요'}
              onChange={(e) => setApiKeyDraft(e.target.value)}
            />
            <ToggleBtn type="button" onClick={() => setShowApiKey((v) => !v)}>
              {showApiKey ? '숨김' : '표시'}
            </ToggleBtn>
            <SecondaryBtn
              type="button"
              onClick={() => {
                onSaveApiKey(apiKeyDraft || null);
                setApiKeyDraft('');
              }}
              disabled={busy || !apiKeyDraft.trim()}
            >
              저장
            </SecondaryBtn>
            {status.apiKeyMasked && (
              <GhostBtn type="button" onClick={() => onSaveApiKey(null)} disabled={busy}>
                제거
              </GhostBtn>
            )}
          </InlineRow>

          <SectionLabel>CLI 경로 오버라이드</SectionLabel>
          <InlineRow>
            <Input
              type="text"
              value={binaryDraft}
              placeholder="비워두면 PATH에서 자동 탐색"
              onChange={(e) => setBinaryDraft(e.target.value)}
            />
            <SecondaryBtn
              type="button"
              onClick={() => onSaveBinaryPath(binaryDraft.trim() || null)}
              disabled={busy}
            >
              저장
            </SecondaryBtn>
          </InlineRow>
        </AdvancedBody>
      )}
    </Card>
  );
};

export default AgentCard;

// ─── Styled Components ─────────────────────────

const Card = styled.div`
  border: 1px solid ${theme.border};
  border-radius: 10px;
  background: ${theme.bgPrimary};
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${theme.textPrimary};
`;

const VersionTag = styled.span`
  font-size: 0.6875rem;
  color: ${theme.textMuted};
  background: ${theme.bgTertiary};
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
`;

const Badge = styled.span<{ $tone: 'ok' | 'warn' | 'muted' }>`
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  ${({ $tone }) => {
    if ($tone === 'ok') return `background: #e6f4ea; color: #137333;`;
    if ($tone === 'warn') return `background: #fef7e0; color: #b06000;`;
    return `background: #f1f3f4; color: #5f6368;`;
  }}
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 0.75rem;
  font-size: 0.8125rem;
  align-items: start;
`;

const Label = styled.span`
  color: ${theme.textMuted};
  font-weight: 500;
`;

const Value = styled.div`
  color: ${theme.textPrimary};
  min-width: 0;
`;

const Mono = styled.span`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
  background: ${theme.bgTertiary};
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  word-break: break-all;
`;

const Muted = styled.span`
  color: ${theme.textMuted};
`;

const Sub = styled.div`
  font-size: 0.6875rem;
  color: ${theme.textMuted};
  margin-top: 0.2rem;
`;

const AuthLine = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
  flex-wrap: wrap;
`;

const baseBtn = `
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 0.4rem 0.85rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PrimaryBtn = styled.button`
  ${baseBtn}
  background: ${theme.blue};
  color: #fff;
  &:hover:not(:disabled) { background: ${theme.blueDark}; }
`;

const SecondaryBtn = styled.button`
  ${baseBtn}
  background: ${theme.bgSecondary};
  color: ${theme.textPrimary};
  border-color: ${theme.border};
  &:hover:not(:disabled) { background: ${theme.bgTertiary}; }
`;

const GhostBtn = styled.button`
  ${baseBtn}
  background: transparent;
  color: ${theme.textSecondary};
  &:hover:not(:disabled) { color: ${theme.blue}; }
`;

const ToggleBtn = styled.button`
  ${baseBtn}
  background: transparent;
  color: ${theme.textMuted};
  border-color: ${theme.border};
  font-size: 0.75rem;
  padding: 0.35rem 0.6rem;
`;

const LinkBtn = styled.button`
  background: none;
  border: none;
  color: ${theme.blue};
  cursor: pointer;
  padding: 0;
  font-size: inherit;
  text-decoration: underline;
  transition: color 0.15s ${transition};

  &:hover { color: ${theme.blueDark}; }
`;

const Divider = styled.div`
  height: 1px;
  background: ${theme.border};
  margin: 0.5rem 0 0.25rem;
`;

const AdvancedLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${theme.textSecondary};
`;

const AdvancedBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SectionLabel = styled.div`
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 0.25rem;
`;

const InlineRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const Input = styled.input`
  flex: 1;
  min-width: 0;
  padding: 0.4rem 0.6rem;
  border: 1px solid ${theme.border};
  border-radius: 6px;
  background: ${theme.bgPrimary};
  color: ${theme.textPrimary};
  font-size: 0.8125rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;

  &:focus {
    outline: none;
    border-color: ${theme.blue};
  }
`;
