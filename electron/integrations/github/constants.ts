// electron/integrations/github/constants.ts
/**
 * GitHub.com 기본값.
 * - DEFAULT_API_BASE_URL: 어댑터/클라이언트가 baseUrl 미지정 시 사용
 * - DEFAULT_OAUTH_BASE_URL: OAuth 엔드포인트(/login/device/code, /login/oauth/access_token)는
 *     API 도메인과 별도(github.com). GHES는 https://ghe.example.com.
 * - DEFAULT_CLIENT_ID: Lyra가 GitHub에 등록한 .com용 OAuth App client_id.
 *     OAuth App의 client_id는 PKCE/Device Flow에서 공개 식별자로 취급되므로 코드 커밋 가능.
 *     해당 OAuth App에서 Device Flow 옵션이 활성화되어 있어야 한다.
 * - DEFAULT_SCOPES: MVP는 'repo'(private repo 메타) + 'read:user'(/user 검증).
 *     'read:org'는 향후 PR/MR 단계에서 추가.
 */
export const DEFAULT_API_BASE_URL = 'https://api.github.com';
export const DEFAULT_OAUTH_BASE_URL = 'https://github.com';
export const DEFAULT_CLIENT_ID = 'Ov23liX6SdTUxWjHw8k5';
export const DEFAULT_SCOPES = ['repo', 'read:user'];

/**
 * GHES는 OAuth가 `${baseUrl}/login/...` 형태로 인스턴스 도메인을 그대로 쓴다.
 * API baseUrl이 https://ghe.example.com/api/v3 라면 OAuth는 https://ghe.example.com.
 */
export function deriveOAuthBaseUrl(apiBaseUrl: string): string {
  if (!apiBaseUrl || apiBaseUrl === DEFAULT_API_BASE_URL) return DEFAULT_OAUTH_BASE_URL;
  // GHES: strip trailing /api/v3 (또는 /api/v3/) 후 호스트만 유지
  return apiBaseUrl.replace(/\/api\/v3\/?$/, '');
}
