/**
 * GitLab OAuth는 인스턴스 버전에 따라 Device Flow 지원이 다르다.
 * 어댑터는 Device Flow 시도 후 실패하면 PKCE Loopback으로 fallback. (M3)
 */

export interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

export interface AccessTokenResponse {
  accessToken: string;
  refreshToken?: string;
  scope: string;
  tokenType: string;
  expiresIn?: number;
}

export async function tryDeviceFlow(
  _baseUrl: string,
  _clientId: string,
  _scopes: string[],
): Promise<DeviceCodeResponse> {
  throw new Error('tryDeviceFlow not yet implemented (M3)');
}

export async function pollAccessToken(
  _baseUrl: string,
  _clientId: string,
  _deviceCode: string,
  _interval: number,
): Promise<AccessTokenResponse> {
  throw new Error('pollAccessToken not yet implemented (M3)');
}

/** PKCE + Loopback fallback (Device Flow 미지원 인스턴스용) */
export async function pkceLoopback(
  _baseUrl: string,
  _clientId: string,
  _scopes: string[],
): Promise<AccessTokenResponse> {
  throw new Error('pkceLoopback not yet implemented (M3)');
}
