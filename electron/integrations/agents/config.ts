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
};

export const AGENT_IDS: AgentId[] = ['claude'];
