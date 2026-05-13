// electron/integrations/gitlab/constants.ts
/**
 * GitLab.com 기본값.
 * - DEFAULT_API_BASE_URL: 어댑터/클라이언트가 baseUrl 미지정 시 사용. GitLab은 API+OAuth가 같은 도메인.
 * - DEFAULT_OAUTH_BASE_URL: OAuth 엔드포인트(/oauth/authorize_device, /oauth/token) 도메인.
 *     GitLab.com과 self-hosted 모두 `${host}/oauth/...` 형태이므로 API baseUrl과 사실상 동일.
 * - DEFAULT_CLIENT_ID: Lyra가 GitLab.com에 등록한 OAuth App client_id.
 *     OAuth App의 client_id는 PKCE/Device Flow에서 공개 식별자로 취급되므로 코드 커밋 가능.
 *     해당 OAuth App에서 "Device Authorization grant" 옵션이 활성화되어 있어야 한다.
 *     교체 절차: https://gitlab.com/-/user_settings/applications → New application →
 *     scopes (api, read_user) + "Device Authorization grant" 체크 → Application ID 복사.
 * - DEFAULT_SCOPES: MVP는 'api'(리포 메타·MR 등 향후) + 'read_user'(/user 검증).
 */
export const DEFAULT_API_BASE_URL = 'https://gitlab.com';
export const DEFAULT_OAUTH_BASE_URL = 'https://gitlab.com';
export const DEFAULT_CLIENT_ID = 'gitlab-placeholder';
export const DEFAULT_SCOPES = ['api', 'read_user'];

/**
 * GitLab의 OAuth base URL은 API base URL과 동일하므로, 입력을 그대로 정규화(trailing slash 제거)해서 돌려준다.
 * self-hosted 인스턴스도 같은 규칙. self-hosted는 사용자가 직접 `https://gitlab.example.com` 입력.
 */
export function deriveOAuthBaseUrl(apiBaseUrl: string): string {
  if (!apiBaseUrl) return DEFAULT_OAUTH_BASE_URL;
  return apiBaseUrl.replace(/\/+$/, '');
}
