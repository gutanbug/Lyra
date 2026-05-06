import { useContext, useEffect, useRef } from 'react';
import { snackbarContext } from 'modules/contexts/snackbar';
import { newSnackbar } from 'modules/actions/snackbar';
import { subscribeApiError, formatApiErrorMessage } from 'lib/utils/apiErrorBus';

/**
 * apiErrorBus 구독자 — `integrationController.invoke` 실패를 전역 스낵바로 노출.
 *
 * 같은 메시지가 짧은 시간(2초) 내에 반복되면 dedupe (poll/retry 등으로 인한 스팸 방지).
 *
 * 화면 출력만 담당하므로 렌더링 결과 없음. LayoutPage에서 `<Snackbar />`와 함께 마운트.
 */
const DEDUPE_WINDOW_MS = 2000;

const ApiErrorSnackbar = () => {
  const { dispatch } = useContext(snackbarContext);
  const lastRef = useRef<{ msg: string; t: number } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeApiError(({ error }) => {
      const msg = formatApiErrorMessage(error);
      if (!msg) return;
      const now = Date.now();
      const last = lastRef.current;
      if (last && last.msg === msg && now - last.t < DEDUPE_WINDOW_MS) return;
      lastRef.current = { msg, t: now };
      newSnackbar(dispatch, msg, 'ERROR');
    });
    return unsubscribe;
  }, [dispatch]);

  return null;
};

export default ApiErrorSnackbar;
