import { useCallback, useEffect, useRef, useState } from 'react';
import { gitHostOAuthController } from 'controllers/account';

export type GitHostOAuthStatus = 'idle' | 'awaiting_user' | 'success' | 'error';

export interface GitHostOAuthState {
  status: GitHostOAuthStatus;
  /** awaiting_user 상태에서 사용자가 입력해야 하는 코드 */
  userCode?: string;
  /** 브라우저에서 열 URL */
  verificationUri?: string;
  /** success 시 accessToken (이후 account 저장에만 사용, UI에 표시 금지) */
  accessToken?: string;
  /** success 시 실제 부여된 scope 목록 */
  grantedScopes?: string[];
  /** error 시 코드 */
  errorCode?: string;
  errorMessage?: string;
}

interface StartParams {
  baseUrl?: string;
  clientId?: string;
  scopes?: string[];
}

interface UseGitHostOAuthOptions {
  /** 'github' | 'gitlab' — 현재는 github만 구현 */
  host: 'github';
}

export interface UseGitHostOAuthResult {
  state: GitHostOAuthState;
  start: (params?: StartParams) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

const INITIAL: GitHostOAuthState = { status: 'idle' };

export function useGitHostOAuth(options: UseGitHostOAuthOptions): UseGitHostOAuthResult {
  const [state, setState] = useState<GitHostOAuthState>(INITIAL);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Epoch carries the identity of the currently-active OAuth flow. Each `start()`
   * (and each `cancel()`/`reset()`) bumps this counter. All async callbacks capture
   * the epoch they were scheduled under and abort if it no longer matches —
   * preventing stale `begin()` responses and stale `expiry`/`poll` timers from
   * landing after the user cancels or restarts.
   */
  const epochRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    epochRef.current += 1;
    clearTimers();
    setState((prev) => (prev.status === 'awaiting_user' ? INITIAL : prev));
  }, [clearTimers]);

  const reset = useCallback(() => {
    epochRef.current += 1;
    clearTimers();
    setState(INITIAL);
  }, [clearTimers]);

  useEffect(() => () => {
    epochRef.current += 1;
    clearTimers();
  }, [clearTimers]);

  const schedulePoll = useCallback(
    (
      myEpoch: number,
      baseUrl: string | undefined,
      clientId: string | undefined,
      deviceCode: string,
      intervalSec: number,
    ) => {
      pollTimerRef.current = setTimeout(async () => {
        pollTimerRef.current = null;
        if (myEpoch !== epochRef.current) return;
        try {
          const r = await gitHostOAuthController.github.poll({ baseUrl, clientId, deviceCode });
          if (myEpoch !== epochRef.current) return;
          if (r.status === 'pending') {
            schedulePoll(myEpoch, baseUrl, clientId, deviceCode, intervalSec);
          } else if (r.status === 'slow_down') {
            schedulePoll(myEpoch, baseUrl, clientId, deviceCode, intervalSec + r.intervalIncrease);
          } else if (r.status === 'success') {
            clearTimers();
            setState({
              status: 'success',
              accessToken: r.accessToken,
              grantedScopes: r.scope ? r.scope.split(/[\s,]+/).filter(Boolean) : [],
            });
          }
        } catch (e) {
          if (myEpoch !== epochRef.current) return;
          clearTimers();
          const err = e as { code?: string; message?: string };
          setState({
            status: 'error',
            errorCode: err.code || 'UNKNOWN',
            errorMessage: err.message || 'OAuth failed',
          });
        }
      }, intervalSec * 1000);
    },
    [clearTimers],
  );

  const start = useCallback(
    async (params: StartParams = {}) => {
      if (options.host !== 'github') {
        setState({
          status: 'error',
          errorCode: 'UNSUPPORTED_HOST',
          errorMessage: `Host '${options.host}' not yet supported`,
        });
        return;
      }
      const myEpoch = ++epochRef.current;
      clearTimers();
      setState(INITIAL);
      try {
        const r = await gitHostOAuthController.github.begin(params);
        if (myEpoch !== epochRef.current) return;

        // 브라우저 자동 open
        const electronApi = (window as unknown as { electronAPI?: { openExternal?: (url: string) => void } }).electronAPI;
        if (electronApi?.openExternal) {
          electronApi.openExternal(r.verificationUri);
        }

        setState({
          status: 'awaiting_user',
          userCode: r.userCode,
          verificationUri: r.verificationUri,
        });

        expiryTimerRef.current = setTimeout(() => {
          expiryTimerRef.current = null;
          if (myEpoch !== epochRef.current) return;
          epochRef.current += 1;
          clearTimers();
          setState({
            status: 'error',
            errorCode: 'OAUTH_EXPIRED',
            errorMessage: 'Device code expired. Please restart.',
          });
        }, r.expiresIn * 1000);

        schedulePoll(myEpoch, params.baseUrl, params.clientId, r.deviceCode, r.interval);
      } catch (e) {
        if (myEpoch !== epochRef.current) return;
        const err = e as { code?: string; message?: string };
        setState({
          status: 'error',
          errorCode: err.code || 'UNKNOWN',
          errorMessage: err.message || 'Failed to start OAuth',
        });
      }
    },
    [options.host, clearTimers, schedulePoll],
  );

  return { state, start, cancel, reset };
}
