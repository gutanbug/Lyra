export type AgentId = 'claude';

export interface AgentStatus {
  id: AgentId;
  installed: boolean;
  binaryPath: string | null;
  version: string | null;
  authenticated: boolean;
  authMethod: 'oauth' | 'apiKey' | 'none';
  /** 인증 판정 근거 — 'cli'(CLI status 명령), 'file'(credential 파일), 'apiKey', 'none' */
  authSource: 'cli' | 'file' | 'apiKey' | 'none';
  apiKeyMasked: string | null;
  credentialPath: string | null;
  credentialMtime: string | null;
  binaryOverride: string | null;
}

export const AGENT_META: Record<AgentId, { displayName: string; installUrl: string; apiKeyEnv: string }> = {
  claude: {
    displayName: 'Claude Code',
    installUrl: 'https://docs.claude.com/en/docs/claude-code/setup',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
  },
};

export const AGENT_IDS: AgentId[] = ['claude'];
