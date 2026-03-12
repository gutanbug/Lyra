import React, { useState } from 'react';
import styled from 'styled-components';
import type { AccountInput, JiraCredentials } from 'types/account';
import { accountController, integrationController } from 'controllers/account';
import { newSnackbar } from 'modules/actions/snackbar';
import { snackbarContext } from 'modules/contexts/snackbar';
import { theme } from 'lib/styles/theme';
import { transition } from 'lib/styles/styles';
import { getServiceIcon, hasServiceIcon } from 'lib/icons/services';

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  padding: 1.5rem;
  box-sizing: border-box;
`;

const Label = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${theme.textPrimary};
`;

const Input = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${theme.border};
  border-radius: 4px;
  font-size: 0.875rem;
  background: ${theme.bgPrimary};

  &:focus {
    outline: none;
    border-color: ${theme.borderFocus};
  }
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  background: ${theme.blue};
  color: white;
  border: none;
  border-radius: 20px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ${transition};

  &:hover {
    background: ${theme.blueDark};
  }

  &:disabled {
    background: ${theme.textMuted};
    cursor: not-allowed;
  }
`;


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

interface AddAccountFormProps {
  onSuccess: () => void;
  /** 수정 모드일 때 기존 계정 데이터 */
  editAccount?: import('types/account').Account;
}

const AddAccountForm = ({ onSuccess, editAccount }: AddAccountFormProps) => {
  const isEdit = !!editAccount;
  const { dispatch: snackbarDispatch } = React.useContext(snackbarContext);
  const [services, setServices] = useState<{ type: string; displayName: string; icon?: string }[]>([]);
  const [serviceType, setServiceType] = useState(editAccount?.serviceType || 'jira');
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  React.useEffect(() => {
    integrationController.getAvailable().then(setServices);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      newSnackbar(snackbarDispatch, '표시 이름을 입력해주세요.', 'WARNING');
      return;
    }

    if (serviceType === 'jira') {
      if (!baseUrl.trim() || !email.trim() || (!isEdit && !apiToken.trim())) {
        newSnackbar(snackbarDispatch, '모든 필드를 입력해주세요.', 'WARNING');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const credentials: JiraCredentials = {
        baseUrl: baseUrl.trim().replace(/\/$/, ''),
        email: email.trim(),
        apiToken: apiToken.trim() || (editCreds as any)?.apiToken || '',
      };

      // API 토큰이 변경되었거나 신규 추가일 때만 검증
      if (apiToken.trim() || !isEdit) {
        const isValid = await integrationController.validate(serviceType, credentials);
        if (!isValid) {
          newSnackbar(snackbarDispatch, '연결 실패. URL, 이메일, API 토큰을 확인해주세요.', 'ERROR');
          setIsSubmitting(false);
          return;
        }
      }

      if (isEdit && editAccount) {
        await accountController.update(editAccount.id, {
          serviceType,
          displayName: displayName.trim(),
          credentials,
        });
        newSnackbar(snackbarDispatch, '계정이 수정되었습니다.', 'SUCCESS');
      } else {
        const account: AccountInput = {
          serviceType,
          displayName: displayName.trim(),
          credentials,
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
    if (serviceType !== 'jira' || !baseUrl.trim() || !email.trim() || !apiToken.trim()) {
      newSnackbar(snackbarDispatch, '모든 필드를 입력해주세요.', 'WARNING');
      return;
    }

    setIsValidating(true);
    try {
      const credentials: JiraCredentials = {
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
          placeholder="예: 회사 Jira"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </Label>

      {serviceType === 'jira' && (
        <>
          <Label>
            Jira URL
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

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (isEdit ? '수정 중...' : '추가 중...') : (isEdit ? '수정' : '추가')}
        </Button>
        {serviceType === 'jira' && (
          <Button type="button" onClick={handleValidate} disabled={isValidating}>
            {isValidating ? '확인 중...' : '연결 확인'}
          </Button>
        )}
      </div>
    </Form>
  );
};

export default AddAccountForm;
