import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { beginDeviceFlow, pollAccessToken } from '../oauth';

describe('gitlab/oauth — Device Flow', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    (globalThis as any).fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('beginDeviceFlow', () => {
    it('POST /oauth/authorize_device with client_id and scope, returns camelCased response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          device_code: 'GLDC',
          user_code: 'ABCD-WXYZ',
          verification_uri: 'https://gitlab.com/oauth/device',
          expires_in: 600,
          interval: 5,
        }),
      });

      const result = await beginDeviceFlow('https://gitlab.com', 'CLIENT_ID', ['api', 'read_user']);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://gitlab.com/oauth/authorize_device');
      expect((init as RequestInit).method).toBe('POST');
      expect((init as any).headers.Accept).toBe('application/json');
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body).toEqual({ client_id: 'CLIENT_ID', scope: 'api read_user' });

      expect(result).toEqual({
        deviceCode: 'GLDC',
        userCode: 'ABCD-WXYZ',
        verificationUri: 'https://gitlab.com/oauth/device',
        expiresIn: 600,
        interval: 5,
      });
    });

    it('throws NETWORK on non-2xx HTTP', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Service Unavailable', json: async () => ({}) });
      await expect(beginDeviceFlow('https://gitlab.com', 'CID', ['api']))
        .rejects.toMatchObject({ code: 'NETWORK' });
    });
  });

  describe('pollAccessToken', () => {
    it('returns accessToken + refreshToken + expiresIn on success', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'glat-abc',
          refresh_token: 'glrt-xyz',
          scope: 'api read_user',
          token_type: 'Bearer',
          expires_in: 7200,
        }),
      });

      const result = await pollAccessToken('https://gitlab.com', 'CID', 'GLDC');

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body).toEqual({
        client_id: 'CID',
        device_code: 'GLDC',
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      });

      expect(result).toEqual({
        status: 'success',
        accessToken: 'glat-abc',
        refreshToken: 'glrt-xyz',
        scope: 'api read_user',
        tokenType: 'Bearer',
        expiresIn: 7200,
      });
    });

    it('returns pending on authorization_pending', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ error: 'authorization_pending' }) });
      const r = await pollAccessToken('https://gitlab.com', 'CID', 'GLDC');
      expect(r).toEqual({ status: 'pending' });
    });

    it('returns slow_down with intervalIncrease=5', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ error: 'slow_down' }) });
      const r = await pollAccessToken('https://gitlab.com', 'CID', 'GLDC');
      expect(r).toEqual({ status: 'slow_down', intervalIncrease: 5 });
    });

    it('throws OAUTH_EXPIRED on expired_token', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ error: 'expired_token' }) });
      await expect(pollAccessToken('https://gitlab.com', 'CID', 'GLDC'))
        .rejects.toMatchObject({ code: 'OAUTH_EXPIRED' });
    });

    it('throws OAUTH_DENIED on access_denied', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ error: 'access_denied' }) });
      await expect(pollAccessToken('https://gitlab.com', 'CID', 'GLDC'))
        .rejects.toMatchObject({ code: 'OAUTH_DENIED' });
    });
  });
});
