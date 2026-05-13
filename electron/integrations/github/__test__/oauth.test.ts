import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { beginDeviceFlow, pollAccessToken } from '../oauth';

describe('github/oauth — Device Flow', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    (globalThis as any).fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('beginDeviceFlow', () => {
    it('POST /login/device/code with client_id and scope, returns camelCased response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          device_code: 'DC123',
          user_code: 'WDJB-MJHT',
          verification_uri: 'https://github.com/login/device',
          expires_in: 900,
          interval: 5,
        }),
      });

      const result = await beginDeviceFlow('https://github.com', 'CLIENT_ID', ['repo', 'read:user']);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://github.com/login/device/code');
      expect((init as RequestInit).method).toBe('POST');
      expect((init as any).headers.Accept).toBe('application/json');
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body).toEqual({ client_id: 'CLIENT_ID', scope: 'repo read:user' });

      expect(result).toEqual({
        deviceCode: 'DC123',
        userCode: 'WDJB-MJHT',
        verificationUri: 'https://github.com/login/device',
        expiresIn: 900,
        interval: 5,
      });
    });

    it('throws NETWORK on non-2xx HTTP', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Error', json: async () => ({}) });
      await expect(beginDeviceFlow('https://github.com', 'CID', ['repo']))
        .rejects.toMatchObject({ code: 'NETWORK' });
    });
  });

  describe('pollAccessToken', () => {
    it('returns accessToken on success', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'gho_abc', scope: 'repo,read:user', token_type: 'bearer' }),
      });

      const result = await pollAccessToken('https://github.com', 'CID', 'DC123');

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body).toEqual({
        client_id: 'CID',
        device_code: 'DC123',
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      });

      expect(result).toEqual({ status: 'success', accessToken: 'gho_abc', scope: 'repo,read:user', tokenType: 'bearer' });
    });

    it('returns pending on authorization_pending', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ error: 'authorization_pending' }),
      });
      const r = await pollAccessToken('https://github.com', 'CID', 'DC');
      expect(r).toEqual({ status: 'pending' });
    });

    it('returns slow_down with intervalIncrease=5', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ error: 'slow_down' }),
      });
      const r = await pollAccessToken('https://github.com', 'CID', 'DC');
      expect(r).toEqual({ status: 'slow_down', intervalIncrease: 5 });
    });

    it('throws OAUTH_EXPIRED on expired_token', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ error: 'expired_token' }) });
      await expect(pollAccessToken('https://github.com', 'CID', 'DC'))
        .rejects.toMatchObject({ code: 'OAUTH_EXPIRED' });
    });

    it('throws OAUTH_DENIED on access_denied', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ error: 'access_denied' }) });
      await expect(pollAccessToken('https://github.com', 'CID', 'DC'))
        .rejects.toMatchObject({ code: 'OAUTH_DENIED' });
    });
  });
});
