import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { theme } from 'lib/styles/theme';
import { transition } from 'lib/styles/styles';
import { useGitHostOAuth } from 'lib/hooks/useGitHostOAuth';

interface Props {
  host: 'github' | 'gitlab';
  /** 사용자가 입력 가능한 self-hosted 옵션 (선택). 비어 있으면 .com 기본값. */
  initialBaseUrl?: string;
  initialClientId?: string;
  /** OAuth 성공 시 부모에게 토큰 + 메타 전달 */
  onSuccess: (payload: {
    accessToken: string;
    grantedScopes: string[];
    baseUrl: string;
    clientId: string;
    refreshToken?: string;
    expiresInSec?: number;
  }) => void;
}

const GitHostDeviceFlow = ({ host, initialBaseUrl = '', initialClientId = '', onSuccess }: Props) => {
  const { state, start, cancel, reset } = useGitHostOAuth({ host });
  const [advanced, setAdvanced] = useState(!!initialBaseUrl);
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [clientId, setClientId] = useState(initialClientId);
  const [copied, setCopied] = useState(false);
  /**
   * onSuccess는 OAuth 한 흐름당 정확히 1회만 호출되어야 한다.
   * 부모가 inline arrow를 onSuccess로 넘기면 effect deps의 identity가 매 렌더 변하므로,
   * status가 success를 유지하는 동안 effect가 재실행되어 onSuccess가 반복 호출 → 계정 중복 생성.
   * 흐름 식별을 ref로 박아 두고, reset/idle 복귀 시 해제한다.
   */
  const deliveredRef = useRef(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hostLabel = host === 'github' ? 'GitHub' : 'GitLab';
  const advancedToggleLabel = host === 'github' ? 'self-hosted (GHES) 사용' : 'self-hosted GitLab 사용';
  const advancedBasePlaceholder = host === 'github'
    ? 'https://ghe.example.com/api/v3'
    : 'https://gitlab.example.com';

  useEffect(() => {
    if (state.status === 'idle') deliveredRef.current = false;
    if (state.status === 'success' && state.accessToken && !deliveredRef.current) {
      deliveredRef.current = true;
      onSuccess({
        accessToken: state.accessToken,
        grantedScopes: state.grantedScopes || [],
        baseUrl: baseUrl.trim(),
        clientId: clientId.trim(),
        refreshToken: state.refreshToken,
        expiresInSec: state.expiresInSec,
      });
    }
  }, [state.status, state.accessToken, state.grantedScopes, state.refreshToken, state.expiresInSec, onSuccess, baseUrl, clientId]);

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  const handleCopy = async () => {
    if (!state.userCode) return;
    try {
      await navigator.clipboard.writeText(state.userCode);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        copyTimerRef.current = null;
        setCopied(false);
      }, 1500);
    } catch {
      /* ignore clipboard failures (permissions, focus loss) */
    }
  };

  const handleOpenBrowser = () => {
    if (!state.verificationUri) return;
    if (window.electronAPI?.openExternal) window.electronAPI.openExternal(state.verificationUri);
  };

  if (state.status === 'idle' || state.status === 'error') {
    return (
      <Container>
        {state.status === 'error' && (
          <ErrorBox>
            {state.errorMessage || 'OAuth failed.'}
            {state.errorCode && state.errorCode !== 'UNKNOWN' ? ` (${state.errorCode})` : ''}
          </ErrorBox>
        )}
        <AdvancedToggle type="button" onClick={() => setAdvanced((v) => !v)}>
          {advanced ? '▾' : '▸'} {advancedToggleLabel}
        </AdvancedToggle>
        {advanced && (
          <>
            <Label>
              API base URL
              <Input
                type="url"
                placeholder={advancedBasePlaceholder}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </Label>
            <Label>
              OAuth Client ID
              <Input
                type="text"
                placeholder="self-hosted OAuth App client_id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </Label>
          </>
        )}
        <PrimaryButton
          type="button"
          onClick={() => {
            reset();
            start({
              baseUrl: baseUrl.trim() || undefined,
              clientId: clientId.trim() || undefined,
            });
          }}
        >
          {hostLabel} 연결
        </PrimaryButton>
      </Container>
    );
  }

  if (state.status === 'awaiting_user') {
    return (
      <Container>
        <CodeBlock>
          <CodeLabel>다음 코드를 {hostLabel}에 입력하세요</CodeLabel>
          <UserCode>{state.userCode}</UserCode>
          <CopyButton type="button" onClick={handleCopy}>
            {copied ? '복사됨' : '코드 복사'}
          </CopyButton>
        </CodeBlock>
        <Hint>
          브라우저가 열리지 않았다면{' '}
          <LinkBtn type="button" onClick={handleOpenBrowser}>
            {state.verificationUri}
          </LinkBtn>{' '}
          를 직접 열어 코드를 입력하세요.
        </Hint>
        <SecondaryButton type="button" onClick={cancel}>
          취소
        </SecondaryButton>
      </Container>
    );
  }

  // success: 부모에서 onSuccess를 받으면 사라질 것이므로 잠시 spinner만
  return (
    <Container>
      <Hint>인증 완료. 계정을 저장하는 중…</Hint>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;
const Label = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: ${theme.textPrimary};
`;
const Input = styled.input`
  padding: 13px 14px;
  border: 1.5px solid ${theme.color.borderStrong};
  border-radius: ${theme.radius.ctl};
  font-family: ${theme.font.body};
  font-size: 14px;
  background: ${theme.color.surface};
  transition: border-color ${theme.motion.fast}, box-shadow ${theme.motion.fast};
  &:focus { outline: none; border-color: ${theme.color.accent}; box-shadow: ${theme.shadow.focusRing}; }
`;
const PrimaryButton = styled.button`
  padding: 13px 22px;
  background: ${theme.color.accent};
  color: white;
  border: none;
  border-radius: ${theme.radius.ctl};
  font-family: ${theme.font.body};
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  box-shadow: ${theme.shadow.btnAccent};
  transition: filter ${theme.motion.fast}, transform ${theme.motion.fast};
  &:hover:not(:disabled) { filter: brightness(1.07); transform: translateY(-1px); }
  &:active:not(:disabled) { transform: scale(0.98); }
  &:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
`;
const SecondaryButton = styled.button`
  align-self: flex-start;
  padding: 10px 18px;
  background: ${theme.color.hairline};
  color: ${theme.color.gray7};
  border: 1px solid ${theme.color.borderStrong};
  border-radius: ${theme.radius.ctl};
  font-family: ${theme.font.body};
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background ${theme.motion.fast};
  &:hover { background: ${theme.color.gray1}; }
`;
const AdvancedToggle = styled.button`
  align-self: flex-start;
  background: transparent;
  border: none;
  color: ${theme.textMuted};
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0;
`;
const CodeBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: ${theme.bgSecondary};
  border-radius: 8px;
`;
const CodeLabel = styled.div`
  font-size: 0.8rem;
  color: ${theme.textMuted};
`;
const UserCode = styled.div`
  font-family: 'SFMono-Regular', Menlo, monospace;
  font-size: 2rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  color: ${theme.textPrimary};
`;
const CopyButton = styled.button`
  padding: 0.25rem 0.75rem;
  background: ${theme.bgPrimary};
  border: 1px solid ${theme.border};
  border-radius: 12px;
  font-size: 0.8rem;
  cursor: pointer;
`;
const Hint = styled.div`
  font-size: 0.85rem;
  color: ${theme.textMuted};
`;
const LinkBtn = styled.button`
  background: none;
  border: none;
  color: ${theme.blue};
  text-decoration: underline;
  padding: 0;
  cursor: pointer;
  font: inherit;
`;
const ErrorBox = styled.div`
  padding: 0.5rem 0.75rem;
  background: ${theme.bgSecondary};
  border-left: 3px solid #d92d20;
  color: ${theme.textPrimary};
  font-size: 0.85rem;
`;

export default GitHostDeviceFlow;
