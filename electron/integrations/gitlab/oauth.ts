// electron/integrations/gitlab/oauth.ts
/**
 * GitLab OAuth Device Authorization Grant.
 * https://docs.gitlab.com/ee/api/oauth2.html#device-authorization-grant-flow
 *
 * 호출 규약:
 * - baseUrl은 OAuth 엔드포인트 도메인(gitlab.com 또는 self-hosted 호스트). API와 동일.
 * - 모든 요청/응답은 JSON.
 * - 네트워크/HTTP 5xx → throw OAuthFlowError{ code: 'NETWORK' }
 * - device_code 만료 → throw OAuthFlowError{ code: 'OAUTH_EXPIRED' }
 * - 사용자 거부 → throw OAuthFlowError{ code: 'OAUTH_DENIED' }
 * - pending/slow_down은 정상 흐름이므로 throw 하지 않고 status로 반환.
 */

export interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

export type AccessTokenResult =
  | { status: 'pending' }
  | { status: 'slow_down'; intervalIncrease: number }
  | {
      status: 'success';
      accessToken: string;
      /** GitLab은 refresh_token 발급 (기본 활성) */
      refreshToken?: string;
      scope: string;
      tokenType: string;
      /** 초 단위 만료 (보통 7200초) */
      expiresIn?: number;
    };

export class OAuthFlowError extends Error {
  constructor(
    public readonly code: 'OAUTH_EXPIRED' | 'OAUTH_DENIED' | 'NETWORK' | 'UNKNOWN',
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'OAuthFlowError';
  }
}

export async function beginDeviceFlow(
  baseUrl: string,
  clientId: string,
  scopes: string[],
): Promise<DeviceCodeResponse> {
  const url = `${baseUrl}/oauth/authorize_device`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, scope: scopes.join(' ') }),
    });
  } catch (e) {
    throw new OAuthFlowError('NETWORK', 'GitLab OAuth network error', e);
  }
  if (!res.ok) {
    throw new OAuthFlowError('NETWORK', `GitLab OAuth ${res.status} ${res.statusText}`);
  }
  let data: {
    device_code: string;
    user_code: string;
    verification_uri: string;
    expires_in: number;
    interval: number;
  };
  try {
    data = (await res.json()) as typeof data;
  } catch (e) {
    throw new OAuthFlowError('NETWORK', 'GitLab OAuth invalid JSON', e);
  }
  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    expiresIn: data.expires_in,
    interval: data.interval,
  };
}

export async function pollAccessToken(
  baseUrl: string,
  clientId: string,
  deviceCode: string,
): Promise<AccessTokenResult> {
  const url = `${baseUrl}/oauth/token`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });
  } catch (e) {
    throw new OAuthFlowError('NETWORK', 'GitLab OAuth poll network error', e);
  }
  if (!res.ok && res.status >= 500) {
    throw new OAuthFlowError('NETWORK', `GitLab OAuth poll ${res.status} ${res.statusText}`);
  }
  // GitLab은 4xx로 OAuth 에러를 돌려주는 경우가 있다(authorization_pending 등). status 무시하고 body 파싱.
  let data: {
    access_token?: string;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
    expires_in?: number;
    error?: string;
  };
  try {
    data = (await res.json()) as typeof data;
  } catch (e) {
    throw new OAuthFlowError('NETWORK', 'GitLab OAuth invalid JSON', e);
  }
  if (data.access_token) {
    return {
      status: 'success',
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      scope: data.scope || '',
      tokenType: data.token_type || 'Bearer',
      expiresIn: data.expires_in,
    };
  }
  switch (data.error) {
    case 'authorization_pending':
      return { status: 'pending' };
    case 'slow_down':
      return { status: 'slow_down', intervalIncrease: 5 };
    case 'expired_token':
      throw new OAuthFlowError('OAUTH_EXPIRED', 'Device code expired');
    case 'access_denied':
      throw new OAuthFlowError('OAUTH_DENIED', 'User denied authorization');
    default:
      throw new OAuthFlowError('UNKNOWN', `Unknown OAuth response: ${JSON.stringify(data)}`);
  }
}

/**
 * M3 Phase 2에서 구현 예정 — Device Flow 미지원 인스턴스용 PKCE Loopback.
 * 시그니처는 잡아두기만.
 */
export async function pkceLoopback(
  _baseUrl: string,
  _clientId: string,
  _scopes: string[],
): Promise<AccessTokenResult> {
  throw new Error('pkceLoopback not yet implemented (M3 Phase 2)');
}
