/// <reference lib="dom" />
import { existsSync } from 'fs';
import { join } from 'path';
import { AGENT_DESCRIPTORS } from './config';
import { AgentSettingsStore } from './store';
import { permissionBridge } from './permission-bridge';
import { atlassianBridge } from './atlassian-bridge';
import { AccountManager } from '../../account/manager';
import type { AgentDescriptor, AgentId } from './types';

// ────────────────────────────────────────────────────────────
// Claude Code 공식 SDK(@anthropic-ai/claude-agent-sdk)의 query()를
// 사용해 헤드리스 턴을 실행한다. SDK는 내부적으로 `claude` 바이너리를
// stream-json 모드로 spawn하고 메시지를 typed async iterator로 노출한다.
//
// SDK가 ESM 전용이므로 CJS Electron 빌드에서는 native dynamic import로 로드한다.
// (TS의 module: commonjs는 import()를 require()로 변환하므로 Function 우회 필요.)
// ────────────────────────────────────────────────────────────

// SDK는 ESM 전용이고 zod v4 .d.ts가 최신 TS 문법을 사용하므로 정적 type-import는 회피한다.
// 런타임 모듈은 native dynamic import로 로드하고, 사용 면(query, AbortController option)만
// 로컬 인터페이스로 좁혀 선언한다.
interface SdkQueryParams {
  prompt: string;
  options?: Record<string, unknown>;
}
interface SdkModuleShape {
  query: (params: SdkQueryParams) => AsyncIterable<unknown>;
}
const importSdk: () => Promise<SdkModuleShape> = new Function(
  'return import("@anthropic-ai/claude-agent-sdk")',
) as () => Promise<SdkModuleShape>;

export type ClaudePermissionMode = 'default' | 'acceptEdits' | 'plan' | 'bypassPermissions';

export interface StartTurnPayload {
  turnId: string;
  agentId: AgentId;
  prompt: string;
  sessionId?: string | null;
  /** claude `--permission-mode` 값. 'default'는 인자 미전달과 동치. */
  permissionMode?: ClaudePermissionMode;
}

export type TurnEventType =
  | 'chunk'
  | 'meta'
  | 'end'
  | 'error'
  | 'block_start'
  | 'block_delta'
  | 'block_stop'
  | 'tool_result';

export type BlockKind = 'text' | 'thinking' | 'tool_use';

export interface TurnEvent {
  turnId: string;
  type: TurnEventType;
  /** chunk 시 텍스트 조각 (호환 — text_delta는 block_delta로도 함께 emit됨) */
  text?: string;
  /** meta/end 시 sessionId */
  sessionId?: string;
  /** meta 시 모델명 */
  model?: string;
  /** error 시 사람이 읽을 메시지 */
  message?: string;
  /** end 시 누적 비용 (USD) */
  costUsd?: number;
  /** block 이벤트 — 0부터 시작하는 content block index */
  index?: number;
  /** block_start 시 블록 종류 */
  blockKind?: BlockKind;
  /** tool_use 블록의 도구 이름 */
  toolName?: string;
  /** tool_use 블록의 ID (tool_result 매칭용) */
  toolUseId?: string;
  /** block_delta — 텍스트 누적 조각 */
  textDelta?: string;
  /** block_delta — thinking 누적 조각 */
  thinkingDelta?: string;
  /** block_delta — tool_use 입력 partial JSON 조각 */
  jsonDelta?: string;
  /** tool_result — 결과 텍스트 */
  resultText?: string;
  /** tool_result — is_error 플래그 */
  isError?: boolean;
}

type Emitter = (event: TurnEvent) => void;

interface ActiveTurn {
  abort: AbortController;
  agentId: AgentId;
  /** 사용자 취소 후 후속 이벤트를 drop 하기 위한 플래그 */
  cancelled: boolean;
  /** wrappedEmit 우회용 원본 emitter — 취소 알림을 즉시 전송할 때 사용 */
  rawEmit: Emitter;
}

interface TurnState {
  /** 지금까지 emit한 chunk 개수 — 0이면 partial stream이 도착하지 않았다는 뜻 */
  chunkCount: number;
  /** assistant 라인의 text 합본 (partial이 비활성일 때 fallback) */
  assistantSnapshot: string;
}

const activeTurns = new Map<string, ActiveTurn>();
const turnStates = new Map<string, TurnState>();

function resolveBinary(descriptor: AgentDescriptor): string | undefined {
  const override = AgentSettingsStore.getBinaryPath(descriptor.id);
  if (override && existsSync(override)) return override;
  return undefined; // SDK 내장 경로 또는 PATH lookup에 위임
}

/**
 * Lyra의 활성 Atlassian 계정에서 자격을 가져온다.
 * MCP-atlassian / Anthropic Atlassian connector 등이 사용하는 표준 환경변수에 매핑하기 위함.
 */
function getAtlassianCredentials(): { baseUrl: string; email: string; apiToken: string } | null {
  const isAtlassian = (t: string) => t === 'atlassian' || t === 'jira' || t === 'confluence';
  const pick = (acc: { credentials: unknown } | null) => {
    if (!acc) return null;
    const c = acc.credentials as { baseUrl?: string; email?: string; apiToken?: string };
    if (c?.baseUrl && c?.email && c?.apiToken) {
      return { baseUrl: c.baseUrl, email: c.email, apiToken: c.apiToken };
    }
    return null;
  };

  const active = AccountManager.getActive();
  if (active && isAtlassian(active.serviceType)) {
    const c = pick(active);
    if (c) return c;
  }
  for (const t of ['atlassian', 'jira', 'confluence']) {
    const accounts = AccountManager.getByService(t);
    for (const acc of accounts) {
      const c = pick(acc);
      if (c) return c;
    }
  }
  return null;
}

function buildEnv(descriptor: AgentDescriptor): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string') env[k] = v;
  }
  const apiKey = AgentSettingsStore.getApiKey(descriptor.id);
  if (apiKey && descriptor.apiKeyEnv) {
    env[descriptor.apiKeyEnv] = apiKey;
  }

  const atlas = getAtlassianCredentials();
  if (atlas) {
    env.JIRA_URL = atlas.baseUrl;
    env.JIRA_USERNAME = atlas.email;
    env.JIRA_API_TOKEN = atlas.apiToken;
    env.CONFLUENCE_URL = atlas.baseUrl;
    env.CONFLUENCE_USERNAME = atlas.email;
    env.CONFLUENCE_API_TOKEN = atlas.apiToken;
    env.ATLASSIAN_INSTANCE_URL = atlas.baseUrl;
    env.ATLASSIAN_USER_EMAIL = atlas.email;
    env.ATLASSIAN_API_TOKEN = atlas.apiToken;
  }

  // Lyra가 SDK 사용처임을 알릴 User-Agent identifier
  env.CLAUDE_AGENT_SDK_CLIENT_APP = 'lyra/1.0';

  // ANSI 색상/TTY 이스케이프 억제
  env.NO_COLOR = '1';
  env.FORCE_COLOR = '0';
  env.CLICOLOR = '0';
  return env;
}

interface StdioMcpConfig {
  type: 'stdio';
  command: string;
  args: string[];
  env: Record<string, string>;
}

/**
 * Lyra가 호스팅하는 MCP 서버 설정을 빌드한다.
 *  - lyra-permission: 도구 호출 권한 프롬프트 라우팅
 *  - lyra-atlassian: controllers/jira·confluence 도구 노출
 */
function buildLyraMcpServers(turnId: string, env: Record<string, string>): {
  servers: Record<string, StdioMcpConfig>;
  permissionPromptToolName: string | undefined;
} {
  const servers: Record<string, StdioMcpConfig> = {};
  let permissionPromptToolName: string | undefined;

  const permissionSocket = permissionBridge.getSocketPath();
  const permissionServer = join(__dirname, 'permission-mcp-server.js');
  if (permissionSocket && existsSync(permissionServer)) {
    servers['lyra-permission'] = {
      type: 'stdio',
      command: process.execPath,
      args: [permissionServer],
      env: {
        ELECTRON_RUN_AS_NODE: '1',
        LYRA_PERMISSION_SOCKET: permissionSocket,
        LYRA_TURN_ID: turnId,
        PATH: env.PATH ?? '',
      },
    };
    permissionPromptToolName = 'mcp__lyra-permission__prompt_user';
  }

  const atlassianSocket = atlassianBridge.getSocketPath();
  const atlassianServer = join(__dirname, 'atlassian-mcp-server.js');
  if (atlassianSocket && existsSync(atlassianServer)) {
    servers['lyra-atlassian'] = {
      type: 'stdio',
      command: process.execPath,
      args: [atlassianServer],
      env: {
        ELECTRON_RUN_AS_NODE: '1',
        LYRA_ATLASSIAN_SOCKET: atlassianSocket,
        PATH: env.PATH ?? '',
      },
    };
  }

  return { servers, permissionPromptToolName };
}

export function startTurn(
  payload: StartTurnPayload,
  emit: Emitter,
): { ok: boolean; message?: string } {
  const { turnId, agentId, prompt, sessionId, permissionMode } = payload;

  if (activeTurns.has(turnId)) {
    return { ok: false, message: '동일 turnId가 이미 실행 중입니다.' };
  }
  if (agentId !== 'claude') {
    return { ok: false, message: `지원하지 않는 agent: ${agentId}` };
  }

  const descriptor = AGENT_DESCRIPTORS[agentId];
  const env = buildEnv(descriptor);
  const binaryOverride = resolveBinary(descriptor);
  const abort = new AbortController();

  const wrappedEmit: Emitter = (e) => {
    const turn = activeTurns.get(turnId);
    if (turn?.cancelled) return; // 취소 이후 SDK가 남은 메시지를 흘려도 무시
    if (e.type === 'chunk') {
      const s = turnStates.get(turnId);
      if (s) s.chunkCount += 1;
    }
    emit(e);
  };

  activeTurns.set(turnId, { abort, agentId, cancelled: false, rawEmit: emit });
  turnStates.set(turnId, { chunkCount: 0, assistantSnapshot: '' });

  void runQuery(
    {
      turnId,
      prompt,
      sessionId: sessionId ?? null,
      permissionMode,
      env,
      binaryOverride,
      abort,
    },
    wrappedEmit,
  ).catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (abort.signal.aborted) {
      wrappedEmit({ turnId, type: 'error', message: '사용자 취소' });
    } else {
      wrappedEmit({ turnId, type: 'error', message: msg });
    }
  }).finally(() => {
    activeTurns.delete(turnId);
    turnStates.delete(turnId);
  });

  return { ok: true };
}

interface RunQueryArgs {
  turnId: string;
  prompt: string;
  sessionId: string | null;
  permissionMode: ClaudePermissionMode | undefined;
  env: Record<string, string>;
  binaryOverride: string | undefined;
  abort: AbortController;
}

async function runQuery(args: RunQueryArgs, emit: Emitter): Promise<void> {
  const { turnId, prompt, sessionId, permissionMode, env, binaryOverride, abort } = args;

  const sdk = await importSdk();
  const { servers, permissionPromptToolName } = buildLyraMcpServers(turnId, env);

  const options: Record<string, unknown> = {
    abortController: abort,
    env,
    includePartialMessages: true,
    mcpServers: servers,
  };
  if (sessionId) options.resume = sessionId;
  if (permissionMode && permissionMode !== 'default') options.permissionMode = permissionMode;
  // Bypass 모드에서는 prompt tool을 거치지 않고 SDK가 자체적으로 모든 도구를 허용하도록 한다.
  // SDK 사양상 bypassPermissions는 allowDangerouslySkipPermissions=true가 필수.
  if (permissionMode === 'bypassPermissions') {
    options.allowDangerouslySkipPermissions = true;
  } else if (permissionPromptToolName) {
    options.permissionPromptToolName = permissionPromptToolName;
  }
  if (binaryOverride) options.pathToClaudeCodeExecutable = binaryOverride;

  // Lyra의 read-only Atlassian MCP 도구를 모델이 "Lyra가 직접 데이터 줄게" 라고 인식하도록
  // 명시적으로 안내한다. 별도 prompt 없이는 WebFetch/Bash 등 기본 도구로 우회하려는 경향이 있다.
  if (servers['lyra-atlassian']) {
    const lyraToolGuide = [
      '당신은 Lyra 데스크톱 앱에 내장된 한국어 AI 어시스턴트입니다.',
      '사용자는 Atlassian(Jira / Confluence) 계정을 Lyra에 이미 연결해 두었으며, 별도 URL이나 본문을 붙여넣지 않습니다.',
      '',
      'Jira·Confluence 데이터를 조회해야 할 때는 반드시 아래의 Lyra MCP 도구를 우선 사용하세요. WebFetch·Bash·HTTP 직접 호출은 사용하지 마세요.',
      '  • mcp__lyra-atlassian__lyra_jira_get_issue(issue_key)  — Jira 이슈 단건 조회',
      '  • mcp__lyra-atlassian__lyra_jira_search_issues(jql, max_results?) — JQL 검색',
      '  • mcp__lyra-atlassian__lyra_confluence_get_page(page_id) — Confluence 페이지 조회',
      '',
      '도구 호출은 Lyra의 활성 계정 자격증명으로 인증되므로, 사용자에게 토큰/이메일/도메인을 다시 묻지 마세요. 인증 오류가 반환되면 사용자에게 환경설정에서 계정을 확인하라고 안내하세요.',
      '답변은 한국어로 작성하고, Markdown 형식으로 핵심을 간결하게 정리하세요.',
    ].join('\n');
    options.systemPrompt = {
      type: 'preset',
      preset: 'claude_code',
      append: lyraToolGuide,
    };
    // read-only 조회 도구는 매번 권한 prompt를 띄울 필요가 없도록 자동 허용 목록에 추가한다.
    // (bypass 모드에서는 어차피 모두 허용이고, default 모드에서도 Lyra 자신의 도구라 안전.)
    options.allowedTools = [
      'mcp__lyra-atlassian__lyra_jira_get_issue',
      'mcp__lyra-atlassian__lyra_jira_search_issues',
      'mcp__lyra-atlassian__lyra_confluence_get_page',
    ];
  }

  const iter = sdk.query({ prompt, options });

  let endEmitted = false;
  try {
    for await (const message of iter) {
      const handled = handleSdkMessage(message, turnId, emit);
      if (handled) endEmitted = true;
    }
  } catch (err) {
    if (abort.signal.aborted) {
      emit({ turnId, type: 'error', message: '사용자 취소' });
      endEmitted = true;
      return;
    }
    throw err;
  }

  if (!endEmitted) {
    emit({ turnId, type: 'end' });
  }
}

export function cancelTurn(turnId: string): boolean {
  const t = activeTurns.get(turnId);
  if (!t || t.cancelled) return false;
  t.cancelled = true;
  // SDK iterator/MCP 서버가 abort를 인식하기 전이라도 사용자에게 즉시 종료 신호를 보낸다.
  // wrappedEmit은 cancelled 플래그를 보면 drop 하므로 rawEmit으로 직접 전달.
  try {
    t.rawEmit({ turnId, type: 'error', message: '사용자 취소' });
  } catch {
    /* ignore */
  }
  try {
    t.abort.abort();
  } catch {
    /* ignore */
  }
  return true;
}

// ────────────────────────────────────────────────────────────
// SDK 메시지 → TurnEvent 매핑
// SDK가 내보내는 메시지 shape는 CLI stream-json과 동일한 키를 사용한다
// (system/init, stream_event, user, assistant, result).
// ────────────────────────────────────────────────────────────
/**
 * @returns end/error를 emit했으면 true
 */
function handleSdkMessage(message: unknown, turnId: string, emit: Emitter): boolean {
  if (!message || typeof message !== 'object') return false;
  const rec = message as Record<string, unknown>;

  // 세션 init: { type: 'system', subtype: 'init', session_id, model, ... }
  if (rec.type === 'system' && rec.subtype === 'init') {
    emit({
      turnId,
      type: 'meta',
      sessionId: typeof rec.session_id === 'string' ? rec.session_id : undefined,
      model: typeof rec.model === 'string' ? rec.model : undefined,
    });
    return false;
  }

  // partial stream — content block start/delta/stop
  if (rec.type === 'stream_event' && rec.event && typeof rec.event === 'object') {
    const ev = rec.event as Record<string, unknown>;
    const evType = ev.type;

    if (evType === 'content_block_start') {
      const idx = typeof ev.index === 'number' ? ev.index : -1;
      const cb = (ev.content_block as Record<string, unknown> | undefined) ?? undefined;
      const cbType = typeof cb?.type === 'string' ? cb.type : undefined;
      let blockKind: BlockKind | undefined;
      let toolName: string | undefined;
      let toolUseId: string | undefined;
      if (cbType === 'text') blockKind = 'text';
      else if (cbType === 'thinking') blockKind = 'thinking';
      else if (cbType === 'tool_use') {
        blockKind = 'tool_use';
        toolName = typeof cb?.name === 'string' ? cb.name : undefined;
        toolUseId = typeof cb?.id === 'string' ? cb.id : undefined;
      }
      if (blockKind && idx >= 0) {
        emit({ turnId, type: 'block_start', index: idx, blockKind, toolName, toolUseId });
      }
      return false;
    }

    if (evType === 'content_block_delta') {
      const idx = typeof ev.index === 'number' ? ev.index : -1;
      const delta = ev.delta as Record<string, unknown> | undefined;
      const deltaType = typeof delta?.type === 'string' ? delta.type : undefined;
      if (idx >= 0 && delta) {
        if (deltaType === 'text_delta' && typeof delta.text === 'string') {
          emit({ turnId, type: 'block_delta', index: idx, textDelta: delta.text });
          // 호환 chunk(전체 누적 fallback 판정용)
          emit({ turnId, type: 'chunk', text: delta.text });
        } else if (deltaType === 'thinking_delta' && typeof delta.thinking === 'string') {
          emit({ turnId, type: 'block_delta', index: idx, thinkingDelta: delta.thinking });
        } else if (deltaType === 'input_json_delta' && typeof delta.partial_json === 'string') {
          emit({ turnId, type: 'block_delta', index: idx, jsonDelta: delta.partial_json });
        }
      }
      return false;
    }

    if (evType === 'content_block_stop') {
      const idx = typeof ev.index === 'number' ? ev.index : -1;
      if (idx >= 0) {
        emit({ turnId, type: 'block_stop', index: idx });
      }
      return false;
    }

    return false;
  }

  // tool_result: { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id, content, is_error }] } }
  if (rec.type === 'user' && rec.message && typeof rec.message === 'object') {
    const msg = rec.message as Record<string, unknown>;
    if (Array.isArray(msg.content)) {
      for (const item of msg.content) {
        if (!item || typeof item !== 'object') continue;
        const block = item as Record<string, unknown>;
        if (block.type !== 'tool_result') continue;
        const toolUseId = typeof block.tool_use_id === 'string' ? block.tool_use_id : undefined;
        const isError = !!block.is_error;
        let resultText = '';
        if (typeof block.content === 'string') {
          resultText = block.content;
        } else if (Array.isArray(block.content)) {
          for (const piece of block.content) {
            if (piece && typeof piece === 'object') {
              const p = piece as Record<string, unknown>;
              if (p.type === 'text' && typeof p.text === 'string') resultText += p.text;
            }
          }
        }
        if (toolUseId) {
          emit({ turnId, type: 'tool_result', toolUseId, resultText, isError });
        }
      }
    }
    return false;
  }

  // 단발 assistant 라인 — partial이 비활성/누락된 환경의 fallback
  if (rec.type === 'assistant' && rec.message && typeof rec.message === 'object') {
    const message = rec.message as Record<string, unknown>;
    if (Array.isArray(message.content)) {
      let buf = '';
      for (const block of message.content) {
        if (block && typeof block === 'object') {
          const b = block as Record<string, unknown>;
          if (b.type === 'text' && typeof b.text === 'string') {
            buf += b.text;
          }
        }
      }
      if (buf) {
        const s = turnStates.get(turnId);
        if (s) s.assistantSnapshot = buf;
      }
    }
    return false;
  }

  // 완료: { type: 'result', subtype: 'success' | 'error_*', session_id, total_cost_usd, ... }
  if (rec.type === 'result') {
    if (rec.subtype === 'success') {
      const s = turnStates.get(turnId);
      if (s && s.chunkCount === 0 && s.assistantSnapshot) {
        emit({ turnId, type: 'chunk', text: s.assistantSnapshot });
      }
      const fallback = typeof rec.result === 'string' ? rec.result : '';
      if (s && s.chunkCount === 0 && !s.assistantSnapshot && fallback) {
        emit({ turnId, type: 'chunk', text: fallback });
      }
      emit({
        turnId,
        type: 'end',
        sessionId: typeof rec.session_id === 'string' ? rec.session_id : undefined,
        costUsd: typeof rec.total_cost_usd === 'number' ? rec.total_cost_usd : undefined,
      });
    } else {
      const errors = Array.isArray(rec.errors) ? rec.errors.filter((x): x is string => typeof x === 'string') : [];
      const msg = errors.length > 0
        ? errors.join('\n')
        : (typeof rec.subtype === 'string' ? rec.subtype : '알 수 없는 오류');
      emit({ turnId, type: 'error', message: msg });
    }
    return true;
  }

  return false;
}
