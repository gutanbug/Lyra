/**
 * GitHub OAuth Device Flow.
 * 실제 구현은 M2에서. 여기서는 시그니처만 잡아 둔다.
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
  scope: string;
  tokenType: string;
}

export async function beginDeviceFlow(
  _baseUrl: string,
  _clientId: string,
  _scopes: string[],
): Promise<DeviceCodeResponse> {
  throw new Error('beginDeviceFlow not yet implemented (M2)');
}

export async function pollAccessToken(
  _baseUrl: string,
  _clientId: string,
  _deviceCode: string,
  _interval: number,
): Promise<AccessTokenResponse> {
  throw new Error('pollAccessToken not yet implemented (M2)');
}
