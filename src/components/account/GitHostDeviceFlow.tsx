import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { theme } from 'lib/styles/theme';
import { transition } from 'lib/styles/styles';
import { useGitHostOAuth } from 'lib/hooks/useGitHostOAuth';

interface Props {
  host: 'github';
  /** 사용자가 입력 가능한 self-hosted 옵션 (선택). 비어 있으면 .com 기본값. */
  initialBaseUrl?: string;
  initialClientId?: string;
  /** OAuth 성공 시 부모에게 토큰 + 메타 전달 */
  onSuccess: (payload: {
    accessToken: string;
    grantedScopes: string[];
    baseUrl: string;
    clientId: string;
  }) => void;
}

const GitHostDeviceFlow = ({ host, initialBaseUrl = '', initialClientId = '', onSuccess }: Props) => {
  const { state, start, cancel, reset } = useGitHostOAuth({ host });
  const [advanced, setAdvanced] = useState(!!initialBaseUrl);
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [clientId, setClientId] = useState(initialClientId);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state.status === 'success' && state.accessToken) {
      onSuccess({
        accessToken: state.accessToken,
        grantedScopes: state.grantedScopes || [],
        baseUrl: baseUrl.trim(),
        clientId: clientId.trim(),
      });
    }
  }, [state.status, state.accessToken, state.grantedScopes, onSuccess, baseUrl, clientId]);

  const handleCopy = async () => {
    if (!state.userCode) return;
    try {
      await navigator.clipboard.writeText(state.userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore clipboard failures (permissions, focus loss) */
    }
  };

  const handleOpenBrowser = () => {
    if (!state.verificationUri) return;
    const api = (window as unknown as { electronAPI?: { openExternal?: (url: string) => void } }).electronAPI;
    if (api?.openExternal) api.openExternal(state.verificationUri);
  };

  if (state.status === 'idle' || state.status === 'error') {
    return (
      <Container>
        {state.status === 'error' && (
          <ErrorBox>
            {state.errorMessage || 'OAuth failed.'} ({state.errorCode})
          </ErrorBox>
        )}
        <AdvancedToggle type="button" onClick={() => setAdvanced((v) => !v)}>
          {advanced ? '▾' : '▸'} self-hosted (GHES) 사용
        </AdvancedToggle>
        {advanced && (
          <>
            <Label>
              API base URL
              <Input
                type="url"
                placeholder="https://ghe.example.com/api/v3"
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
          GitHub 연결
        </PrimaryButton>
      </Container>
    );
  }

  if (state.status === 'awaiting_user') {
    return (
      <Container>
        <CodeBlock>
          <CodeLabel>다음 코드를 GitHub에 입력하세요</CodeLabel>
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
  padding: 0.5rem 0.75rem;
  border: 1px solid ${theme.border};
  border-radius: 4px;
  font-size: 0.875rem;
  background: ${theme.bgPrimary};
  &:focus { outline: none; border-color: ${theme.borderFocus}; }
`;
const PrimaryButton = styled.button`
  padding: 0.5rem 1rem;
  background: ${theme.blue};
  color: white;
  border: none;
  border-radius: 20px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ${transition};
  &:hover { background: ${theme.blueDark}; }
`;
const SecondaryButton = styled.button`
  align-self: flex-start;
  padding: 0.4rem 0.9rem;
  background: transparent;
  color: ${theme.textPrimary};
  border: 1px solid ${theme.border};
  border-radius: 20px;
  font-size: 0.85rem;
  cursor: pointer;
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
