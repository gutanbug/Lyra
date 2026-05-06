import type { AgentDescriptor, AgentId } from './types';

export const AGENT_DESCRIPTORS: Record<AgentId, AgentDescriptor> = {
  claude: {
    id: 'claude',
    displayName: 'Claude Code',
    defaultBinary: 'claude',
    loginArgs: ['login'],
    logoutArgs: ['logout'],
    versionArgs: ['--version'],
    // Claude Code는 신뢰할 수 있는 status 서브커맨드가 없음. macOS는 Keychain, Windows는 Credential Manager,
    // Linux는 ~/.claude/.credentials.json fallback으로 판정.
    statusArgs: null,
    nativeCredential: {
      darwin: 'Claude Code-credentials',
      win32: 'Claude Code-credentials',
    },
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    credentialDir: '.claude',
    credentialFiles: ['.credentials.json', 'credentials.json', '.session.json'],
    installUrl: 'https://docs.claude.com/en/docs/claude-code/setup',
  },
  codex: {
    id: 'codex',
    displayName: 'Codex CLI',
    defaultBinary: 'codex',
    loginArgs: ['login'],
    logoutArgs: ['logout'],
    versionArgs: ['--version'],
    // `codex login status` — 인증 시 exit 0, 미인증 시 non-zero (CLI 버전에 따라 상이).
    statusArgs: ['login', 'status'],
    unauthenticatedPattern: 'not\\s+logged\\s+in|signed\\s+out|no\\s+account',
    apiKeyEnv: 'OPENAI_API_KEY',
    credentialDir: '.codex',
    credentialFiles: ['auth.json', 'config.json'],
    installUrl: 'https://github.com/openai/codex',
  },
  gemini: {
    id: 'gemini',
    displayName: 'Gemini CLI',
    defaultBinary: 'gemini',
    loginArgs: null,
    logoutArgs: null,
    versionArgs: ['--version'],
    // gemini-cli는 별도 status 서브커맨드가 없어 파일 fallback 사용.
    statusArgs: null,
    apiKeyEnv: 'GEMINI_API_KEY',
    credentialDir: '.gemini',
    credentialFiles: ['oauth_creds.json', 'credentials.json'],
    installUrl: 'https://github.com/google-gemini/gemini-cli',
  },
};

export const AGENT_IDS: AgentId[] = ['claude', 'codex', 'gemini'];
