/**
 * integrationController.invoke 호출에서 발생한 에러를 외부로 publish하는 단일 채널.
 *
 * 모듈 스코프 pub/sub. React 트리 외부(`controllers/`)에서 발생하는 에러를
 * 트리 내부(스낵바 컨텍스트)로 흘려보내기 위한 어댑터 역할.
 */

export interface ApiErrorEvent {
  serviceType: string;
  action: string;
  error: unknown;
}

type Listener = (e: ApiErrorEvent) => void;

const listeners = new Set<Listener>();

export const subscribeApiError = (l: Listener): (() => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};

export const publishApiError = (e: ApiErrorEvent): void => {
  // forEach 중 listener에서 throw해도 다른 listener는 영향 없도록 try
  listeners.forEach((l) => {
    try { l(e); } catch { /* ignore */ }
  });
};

/**
 * 에러 메시지를 사용자에게 보일 형태로 정제.
 *  1) Electron IPC 래핑 접두어 제거
 *  2) Jira API 에러 본문(JSON)에서 첫 번째 errorMessages 추출
 *  3) Confluence/Atlassian 응답의 흔한 키도 같이 처리
 *  4) 길이 제한
 */
export const formatApiErrorMessage = (err: unknown): string => {
  let msg = err instanceof Error ? err.message : String(err);

  // 1) IPC wrapping 제거: "Error invoking remote method 'integration:invoke': Error: ..."
  msg = msg.replace(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/, '');

  // 2) Jira API 응답 본문 파싱 시도: "Jira API NNN METHOD /path :: {json}"
  const jiraMatch = msg.match(/^Jira API \d+ \w+ [^\s]+ ::\s*(\{.*\})$/);
  if (jiraMatch) {
    try {
      const body = JSON.parse(jiraMatch[1]) as Record<string, unknown>;
      const messages = body.errorMessages as unknown[] | undefined;
      if (Array.isArray(messages) && messages.length > 0) {
        msg = `Jira: ${messages.map(String).join(' / ')}`;
      } else {
        const errors = body.errors as Record<string, string> | undefined;
        if (errors && typeof errors === 'object') {
          const fieldErrors = Object.entries(errors).map(([k, v]) => `${k}: ${v}`).join(' / ');
          if (fieldErrors) msg = `Jira: ${fieldErrors}`;
        }
      }
    } catch { /* keep original */ }
  }

  // 3) 길이 제한
  if (msg.length > 240) msg = `${msg.slice(0, 237)}…`;
  return msg;
};
