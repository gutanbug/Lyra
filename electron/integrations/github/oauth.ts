// electron/integrations/github/oauth.ts
/**
 * GitHub OAuth Device Flow.
 * https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
 *
 * 호출 규약:
 * - baseUrl은 OAuth 엔드포인트 도메인(github.com 또는 GHES 호스트). API base가 아님.
 * - 모든 응답은 `Accept: application/json`로 강제 JSON.
 * - 네트워크/HTTP 5xx → throw { code: 'NETWORK' }
 * - device_code 만료 → throw { code: 'OAUTH_EXPIRED' }
 * - 사용자 거부 → throw { code: 'OAUTH_DENIED' }
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
  | { status: 'success'; accessToken: string; scope: string; tokenType: string };

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
  const url = `${baseUrl}/login/device/code`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, scope: scopes.join(' ') }),
    });
  } catch (e) {
    throw new OAuthFlowError('NETWORK', 'GitHub OAuth network error', e);
  }
  if (!res.ok) {
    throw new OAuthFlowError('NETWORK', `GitHub OAuth ${res.status} ${res.statusText}`);
  }
  let data: {
    device_code: string;
    user_code: string;
    verification_uri: string;
    expires_in: number;
    interval: number;
  };
  try {
    data = (await res.json()) as {
      device_code: string;
      user_code: string;
      verification_uri: string;
      expires_in: number;
      interval: number;
    };
  } catch (e) {
    throw new OAuthFlowError('NETWORK', 'GitHub OAuth invalid JSON', e);
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
  const url = `${baseUrl}/login/oauth/access_token`;
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
    throw new OAuthFlowError('NETWORK', 'GitHub OAuth poll network error', e);
  }
  if (!res.ok) {
    throw new OAuthFlowError('NETWORK', `GitHub OAuth poll ${res.status} ${res.statusText}`);
  }
  let data: {
    access_token?: string;
    scope?: string;
    token_type?: string;
    error?: string;
  };
  try {
    data = (await res.json()) as {
      access_token?: string;
      scope?: string;
      token_type?: string;
      error?: string;
    };
  } catch (e) {
    throw new OAuthFlowError('NETWORK', 'GitHub OAuth invalid JSON', e);
  }
  if (data.access_token) {
    return {
      status: 'success',
      accessToken: data.access_token,
      scope: data.scope || '',
      tokenType: data.token_type || 'bearer',
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
