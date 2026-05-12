export type AgentId = 'claude';

export interface AgentDescriptor {
  id: AgentId;
  displayName: string;
  /** 기본 바이너리 이름 (PATH에서 탐색) */
  defaultBinary: string;
  /** 로그인 서브커맨드 (없으면 첫 실행 시 OAuth 트리거) */
  loginArgs: string[] | null;
  /** 로그아웃 서브커맨드 (없으면 credential 파일 삭제) */
  logoutArgs: string[] | null;
  /** 버전 출력 인자 */
  versionArgs: string[];
  /**
   * 인증 상태 확인용 CLI 인자 (예: ['auth', 'status']).
   * exit 0 → 인증됨, exit 0이지만 unauthenticatedPattern 매칭 → 미인증, 그 외 → unknown(파일 fallback).
   * null이면 곧바로 파일 fallback을 사용한다.
   */
  statusArgs: string[] | null;
  /** stdout/stderr에서 "미인증"을 의미하는 정규식 소스 (선택) */
  unauthenticatedPattern?: string;
  /**
   * OS-네이티브 크리덴셜 스토어 식별자 (선택).
   * - darwin: macOS Keychain의 service name (예: 'Claude Code-credentials')
   * - win32: Windows Credential Manager target name (예: 'Claude Code')
   * 설정 시 CLI status보다 우선 평가된다. Linux는 무시.
   */
  nativeCredential?: { darwin?: string; win32?: string };
  /** API 키 환경변수 이름 (대체 인증) */
  apiKeyEnv: string;
  /** credential 디렉토리 (홈 디렉토리 기준 상대경로) */
  credentialDir: string;
  /** credential 파일 후보 (하나라도 존재하면 인증된 것으로 간주) */
  credentialFiles: string[];
  /** 설치 가이드 URL */
  installUrl: string;
}

export interface AgentStatus {
  id: AgentId;
  installed: boolean;
  binaryPath: string | null;
  version: string | null;
  authenticated: boolean;
  /** 'oauth' | 'apiKey' | 'none' */
  authMethod: 'oauth' | 'apiKey' | 'none';
  /** 인증 판정 근거 — 'cli'(CLI status 명령), 'file'(credential 파일), 'apiKey', 'none' */
  authSource: 'cli' | 'file' | 'apiKey' | 'none';
  /** API 키 마스킹 표시 (sk-...XXXX) */
  apiKeyMasked: string | null;
  credentialPath: string | null;
  credentialMtime: string | null;
  binaryOverride: string | null;
}

export interface AgentLoginResult {
  ok: boolean;
  pid: number | null;
  message: string;
}
