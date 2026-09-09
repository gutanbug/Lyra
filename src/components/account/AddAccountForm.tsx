import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import type { AccountInput, AtlassianCredentials, GitHostCredentials } from 'types/account';
import { isAtlassianAccount, isGitHostAccount } from 'types/account';
import { accountController, integrationController } from 'controllers/account';
import { newSnackbar } from 'modules/actions/snackbar';
import { snackbarContext } from 'modules/contexts/snackbar';
import { theme } from 'lib/styles/theme';
import { PrimaryButton } from 'lib/styles/primitives';
import { transition } from 'lib/styles/styles';
import { getServiceIcon, hasServiceIcon } from 'lib/icons/services';
import GitHostDeviceFlow from './GitHostDeviceFlow';

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  padding: 24px;
  box-sizing: border-box;
`;

const Label = styled.label`
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-family: ${theme.font.body};
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${theme.color.gray7};
`;

const Input = styled.input`
  padding: 13px 14px;
  border: 1.5px solid ${theme.color.borderStrong};
  border-radius: ${theme.radius.ctl};
  font-family: ${theme.font.body};
  font-size: 14px;
  color: ${theme.color.gray8};
  background: ${theme.color.surface};
  transition: border-color ${theme.motion.fast}, box-shadow ${theme.motion.fast};

  &::placeholder { color: ${theme.color.gray5}; }
  &:focus {
    outline: none;
    border-color: ${theme.color.accent};
    box-shadow: ${theme.shadow.focusRing};
  }
`;

// 공유 프리미티브 채택: 기존 로컬 정의는 PrimaryButton(M 사이즈)과 동일했다.
const Button = PrimaryButton;


const ServiceSelectWrapper = styled.div`
  position: relative;
`;

const ServiceSelectTrigger = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid ${theme.border};
  border-radius: 20px;
  font-size: 0.875rem;
  background: ${theme.bgPrimary};
  text-align: left;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${theme.borderFocus};
  }
`;

const TriggerLabel = styled.span`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ChevronIcon = styled.svg<{ $open: boolean }>`
  width: 0.75rem;
  height: 0.75rem;
  flex-shrink: 0;
  color: ${theme.textMuted};
  transition: transform 0.15s ease;
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
`;

const ServiceOptionIconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;

  & > svg { width: 100%; height: 100%; }
`;

const ServiceDropdown = styled.ul<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'block' : 'none')};
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin: 0.25rem 0 0 0;
  padding: 0.25rem 0;
  list-style: none;
  background: ${theme.bgPrimary};
  border: 1px solid ${theme.border};
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
`;

const ServiceDropdownItem = styled.li`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;

  &:hover {
    background: ${theme.blueLight};
  }
`;

const AuthMethodRow = styled.div`
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
`;

const AuthMethodOption = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
  color: ${theme.textPrimary};
`;

interface AddAccountFormProps {
  onSuccess: () => void;
  /** 수정 모드일 때 기존 계정 데이터 */
  editAccount?: import('types/account').Account;
}

const AddAccountForm = ({ onSuccess, editAccount }: AddAccountFormProps) => {
  const isEdit = !!editAccount;
  const { dispatch: snackbarDispatch } = React.useContext(snackbarContext);
  const [services, setServices] = useState<{ type: string; displayName: string; icon?: string }[]>([]);
  const [serviceType, setServiceType] = useState(editAccount?.serviceType || 'atlassian');
  const [serviceSelectOpen, setServiceSelectOpen] = useState(false);
  const selectRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
        setServiceSelectOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const editCreds = editAccount?.credentials as { baseUrl?: string; email?: string } | undefined;
  const [displayName, setDisplayName] = useState(editAccount?.displayName || '');
  const [baseUrl, setBaseUrl] = useState(editCreds?.baseUrl || '');
  const [email, setEmail] = useState(editCreds?.email || '');
  const [apiToken, setApiToken] = useState('');
  /** Git host 전용: 인증 방식. */
  const [authMethod, setAuthMethod] = useState<'oauth' | 'pat'>('oauth');
  /** Git host PAT 모드에서 사용자가 입력한 Personal Access Token. */
  const [patToken, setPatToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  React.useEffect(() => {
    integrationController.getAvailable().then((raw) => {
      const hasAtlassian = raw.some((s) => isAtlassianAccount(s.type));
      if (hasAtlassian) {
        const merged: typeof raw = [
          { type: 'atlassian', displayName: 'Atlassian', icon: 'atlassian' },
        ];
        for (const s of raw) {
          if (!isAtlassianAccount(s.type)) merged.push(s);
        }
        setServices(merged);
      } else {
        setServices(raw);
      }
    });
  }, []);

  const handleOAuthSuccess = useCallback(
    async (payload: {
      accessToken: string;
      grantedScopes: string[];
      baseUrl: string;
      clientId: string;
      refreshToken?: string;
      expiresInSec?: number;
    }) => {
      if (!displayName.trim()) {
        newSnackbar(snackbarDispatch, '표시 이름을 입력해주세요.', 'WARNING');
        return;
      }

      setIsSubmitting(true);
      try {
        const defaultBaseUrl =
          serviceType === 'github' ? 'https://api.github.com' :
          serviceType === 'gitlab' ? 'https://gitlab.com' :
          '';
        const credentials: GitHostCredentials = {
          baseUrl: payload.baseUrl.trim() || defaultBaseUrl,
          oauthClientId: payload.clientId,
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
          tokenExpiresAt: payload.expiresInSec
            ? new Date(Date.now() + payload.expiresInSec * 1000).toISOString()
            : undefined,
          scopes: payload.grantedScopes,
        };

        const result = await integrationController.validate(serviceType, credentials);
        if (!result || (typeof result === 'object' && !(result as any).valid)) {
          newSnackbar(snackbarDispatch, '연결 실패. OAuth 권한을 확인해주세요.', 'ERROR');
          setIsSubmitting(false);
          return;
        }

        let userMeta: Record<string, unknown> = {};
        if (typeof result === 'object') {
          const r = result as Record<string, unknown>;
          userMeta = {
            userDisplayName: r.userDisplayName,
            userAccountId: r.userAccountId,
            userAvatarUrl: r.userAvatarUrl || '',
          };
        }

        const account: AccountInput = {
          serviceType,
          displayName: displayName.trim(),
          credentials,
          metadata: userMeta,
        };
        await accountController.add(account);
        newSnackbar(snackbarDispatch, '계정이 추가되었습니다.', 'SUCCESS');
        onSuccess();
      } catch (err) {
        newSnackbar(snackbarDispatch, '계정 추가에 실패했습니다.', 'ERROR');
        console.error(err);
        setIsSubmitting(false);
      }
    },
    [displayName, serviceType, snackbarDispatch, onSuccess]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // === Git host PAT 흐름 ===
    if (isGitHostAccount(serviceType) && !isEdit && authMethod === 'pat') {
      if (!displayName.trim()) {
        newSnackbar(snackbarDispatch, '표시 이름을 입력해주세요.', 'WARNING');
        return;
      }
      if (!patToken.trim()) {
        newSnackbar(snackbarDispatch, 'Personal Access Token을 입력해주세요.', 'WARNING');
        return;
      }
      setIsSubmitting(true);
      try {
        const defaultBaseUrl =
          serviceType === 'github' ? 'https://api.github.com' :
          serviceType === 'gitlab' ? 'https://gitlab.com' :
          '';
        const credentials: GitHostCredentials = {
          authMethod: 'pat',
          baseUrl: baseUrl.trim().replace(/\/+$/, '') || defaultBaseUrl,
          accessToken: patToken.trim(),
          scopes: [],
        };
        const result = await integrationController.validate(serviceType, credentials);
        if (!result || (typeof result === 'object' && !(result as any).valid)) {
          newSnackbar(snackbarDispatch, '연결 실패. URL/PAT를 확인해주세요.', 'ERROR');
          setIsSubmitting(false);
          return;
        }
        let userMeta: Record<string, unknown> = {};
        if (typeof result === 'object') {
          const r = result as Record<string, unknown>;
          userMeta = {
            userDisplayName: r.userDisplayName,
            userAccountId: r.userAccountId,
            userAvatarUrl: r.userAvatarUrl || '',
          };
        }
        const account: AccountInput = {
          serviceType,
          displayName: displayName.trim(),
          credentials,
          metadata: userMeta,
        };
        await accountController.add(account);
        newSnackbar(snackbarDispatch, '계정이 추가되었습니다.', 'SUCCESS');
        onSuccess();
      } catch (err) {
        newSnackbar(snackbarDispatch, '계정 추가에 실패했습니다.', 'ERROR');
        console.error(err);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // === Git host OAuth 흐름은 GitHostDeviceFlow가 처리. Submit 버튼은 안 보이는 게 정상. ===
    if (isGitHostAccount(serviceType)) {
      newSnackbar(snackbarDispatch, 'GitHub/GitLab 연결을 먼저 완료해주세요.', 'WARNING');
      return;
    }

    if (!displayName.trim()) {
      newSnackbar(snackbarDispatch, '표시 이름을 입력해주세요.', 'WARNING');
      return;
    }

    if (isAtlassianAccount(serviceType)) {
      if (!baseUrl.trim() || !email.trim() || (!isEdit && !apiToken.trim())) {
        newSnackbar(snackbarDispatch, '모든 필드를 입력해주세요.', 'WARNING');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const credentials: AtlassianCredentials = {
        baseUrl: baseUrl.trim().replace(/\/$/, ''),
        email: email.trim(),
        apiToken: apiToken.trim() || (editCreds as any)?.apiToken || '',
      };

      // API 토큰이 변경되었거나 신규 추가일 때만 검증
      let userMeta: Record<string, unknown> = editAccount?.metadata || {};
      if (apiToken.trim() || !isEdit) {
        const result = await integrationController.validate(serviceType, credentials);
        if (!result || (typeof result === 'object' && !(result as any).valid)) {
          newSnackbar(snackbarDispatch, '연결 실패. URL, 이메일, API 토큰을 확인해주세요.', 'ERROR');
          setIsSubmitting(false);
          return;
        }
        // 검증 성공 시 사용자 정보 저장
        if (typeof result === 'object') {
          const r = result as Record<string, unknown>;
          userMeta = { ...userMeta, userDisplayName: r.userDisplayName, userAccountId: r.userAccountId, userAvatarUrl: r.userAvatarUrl || '' };
        }
      }

      if (isEdit && editAccount) {
        await accountController.update(editAccount.id, {
          serviceType,
          displayName: displayName.trim(),
          credentials,
          metadata: userMeta,
        });
        newSnackbar(snackbarDispatch, '계정이 수정되었습니다.', 'SUCCESS');
      } else {
        const account: AccountInput = {
          serviceType,
          displayName: displayName.trim(),
          credentials,
          metadata: userMeta,
        };
        await accountController.add(account);
        newSnackbar(snackbarDispatch, '계정이 추가되었습니다.', 'SUCCESS');
      }

      onSuccess();
    } catch (err) {
      newSnackbar(snackbarDispatch, isEdit ? '계정 수정에 실패했습니다.' : '계정 추가에 실패했습니다.', 'ERROR');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidate = async () => {
    if (!isAtlassianAccount(serviceType) || !baseUrl.trim() || !email.trim() || !apiToken.trim()) {
      newSnackbar(snackbarDispatch, '모든 필드를 입력해주세요.', 'WARNING');
      return;
    }

    setIsValidating(true);
    try {
      const credentials: AtlassianCredentials = {
        baseUrl: baseUrl.trim().replace(/\/$/, ''),
        email: email.trim(),
        apiToken: apiToken.trim(),
      };

      const isValid = await integrationController.validate(serviceType, credentials);
      newSnackbar(
        snackbarDispatch,
        isValid ? '연결 확인되었습니다.' : '연결 실패. 정보를 확인해주세요.',
        isValid ? 'SUCCESS' : 'ERROR'
      );
    } catch (err) {
      newSnackbar(snackbarDispatch, '연결 확인에 실패했습니다.', 'ERROR');
      console.error(err);
    } finally {
      setIsValidating(false);
    }
  };

  const selectedService = services.find((s) => s.type === serviceType);

  return (
    <Form onSubmit={handleSubmit}>
      <Label>
        서비스
        <ServiceSelectWrapper ref={selectRef}>
          <ServiceSelectTrigger
            type="button"
            onClick={() => !isEdit && setServiceSelectOpen(!serviceSelectOpen)}
            style={isEdit ? { opacity: 0.6, cursor: 'default' } : undefined}
          >
            <TriggerLabel>
              {hasServiceIcon(serviceType) ? (
                <ServiceOptionIconWrap>{getServiceIcon(serviceType, 20)}</ServiceOptionIconWrap>
              ) : null}
              {selectedService?.displayName ?? serviceType}
            </TriggerLabel>
            <ChevronIcon $open={serviceSelectOpen} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2,4 6,8 10,4" />
            </ChevronIcon>
          </ServiceSelectTrigger>
          <ServiceDropdown $open={serviceSelectOpen}>
            {services.map((s) => (
              <ServiceDropdownItem
                key={s.type}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setServiceType(s.type);
                  setServiceSelectOpen(false);
                }}
              >
                {hasServiceIcon(s.type) ? (
                  <ServiceOptionIconWrap>{getServiceIcon(s.type, 20)}</ServiceOptionIconWrap>
                ) : null}
                {s.displayName}
              </ServiceDropdownItem>
            ))}
          </ServiceDropdown>
        </ServiceSelectWrapper>
      </Label>

      <Label>
        표시 이름
        <Input
          type="text"
          placeholder="예: 회사 Atlassian"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </Label>

      {isAtlassianAccount(serviceType) && (
        <>
          <Label>
            Atlassian URL
            <Input
              type="url"
              placeholder="https://your-domain.atlassian.net"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </Label>
          <Label>
            이메일
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Label>
          <Label>
            API 토큰
            <Input
              type="password"
              placeholder={isEdit ? '변경 시에만 입력' : 'Atlassian API 토큰'}
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
            />
          </Label>
        </>
      )}

      {isGitHostAccount(serviceType) && !isEdit && (
        <Label>
          인증 방식
          <AuthMethodRow>
            <AuthMethodOption>
              <input
                type="radio"
                name="authMethod"
                checked={authMethod === 'oauth'}
                onChange={() => setAuthMethod('oauth')}
              />
              OAuth (권장)
            </AuthMethodOption>
            <AuthMethodOption>
              <input
                type="radio"
                name="authMethod"
                checked={authMethod === 'pat'}
                onChange={() => setAuthMethod('pat')}
              />
              Personal Access Token
            </AuthMethodOption>
          </AuthMethodRow>
        </Label>
      )}

      {isGitHostAccount(serviceType) && !isEdit && !displayName.trim() && (
        <div style={{ fontSize: '0.875rem', color: theme.textMuted }}>
          표시 이름을 입력하면 {serviceType === 'github' ? 'GitHub' : 'GitLab'} 연결이 활성화됩니다.
        </div>
      )}

      {isGitHostAccount(serviceType) && !isEdit && !!displayName.trim() && authMethod === 'oauth' && (
        <GitHostDeviceFlow
          host={serviceType as 'github' | 'gitlab'}
          onSuccess={handleOAuthSuccess}
        />
      )}

      {isGitHostAccount(serviceType) && !isEdit && !!displayName.trim() && authMethod === 'pat' && (
        <>
          <Label>
            {serviceType === 'github' ? 'GitHub' : 'GitLab'} URL (선택)
            <Input
              type="url"
              placeholder={
                serviceType === 'github'
                  ? 'https://api.github.com 또는 GHES URL'
                  : 'https://gitlab.com 또는 self-hosted URL'
              }
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </Label>
          <Label>
            Personal Access Token
            <Input
              type="password"
              placeholder={
                serviceType === 'github'
                  ? 'classic PAT 또는 fine-grained PAT'
                  : 'PAT (scopes: api, read_user)'
              }
              value={patToken}
              onChange={(e) => setPatToken(e.target.value)}
            />
          </Label>
          <div style={{ fontSize: '0.8rem', color: theme.textMuted }}>
            {serviceType === 'github'
              ? '발급: github.com/settings/tokens → scopes: repo, read:user'
              : '발급: gitlab.com/-/user_settings/personal_access_tokens → scopes: api, read_user'}
          </div>
        </>
      )}

      {isGitHostAccount(serviceType) && isEdit && (
        <div style={{ fontSize: '0.875rem', color: theme.textMuted }}>
          GitHub/GitLab 계정 수정은 추후 지원됩니다. 계정 삭제 후 재등록하세요.
        </div>
      )}

      {(!isGitHostAccount(serviceType) ||
        (isGitHostAccount(serviceType) && !isEdit && authMethod === 'pat')) && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (isEdit ? '수정 중...' : '추가 중...') : (isEdit ? '수정' : '추가')}
          </Button>
          {isAtlassianAccount(serviceType) && (
            <Button type="button" onClick={handleValidate} disabled={isValidating}>
              {isValidating ? '확인 중...' : '연결 확인'}
            </Button>
          )}
        </div>
      )}
    </Form>
  );
};

export default AddAccountForm;
