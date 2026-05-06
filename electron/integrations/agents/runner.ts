import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { AGENT_DESCRIPTORS } from './config';
import { AgentSettingsStore } from './store';
import type { AgentDescriptor, AgentId } from './types';

// ────────────────────────────────────────────────────────────
// 헤드리스(stream) 모드로 각 AI Agent CLI를 spawn하고,
// stdout을 chunk/meta/end/error 이벤트로 변환해 emitter에 전달한다.
//
// claude   : `--output-format stream-json --include-partial-messages` (NDJSON 파싱)
// codex    : `codex exec <prompt>` (1차: stdout 텍스트 그대로 전달)
// gemini   : `gemini -p <prompt>`  (1차: stdout 텍스트 그대로 전달)
//
// codex/gemini는 공식 stream-json 포맷이 claude만큼 안정화되어 있지 않아
// 1차 구현에서는 텍스트 모드로 처리한다. 이후 단계에서 어댑터별로 확장.
// ────────────────────────────────────────────────────────────

export interface StartTurnPayload {
  turnId: string;
  agentId: AgentId;
  prompt: string;
  sessionId?: string | null;
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
  child: ChildProcess;
  agentId: AgentId;
}

interface TurnState {
  /** 지금까지 emit한 chunk 개수 — 0이면 partial stream이 도착하지 않았다는 뜻 */
  chunkCount: number;
  /** claude `assistant` 라인의 text 합본 (partial이 비활성일 때 fallback으로 사용) */
  assistantSnapshot: string;
}

const activeTurns = new Map<string, ActiveTurn>();
const turnStates = new Map<string, TurnState>();

function resolveBinary(descriptor: AgentDescriptor): string {
  const override = AgentSettingsStore.getBinaryPath(descriptor.id);
  if (override && existsSync(override)) return override;
  // PATH lookup은 spawn에 위임 (이름만 반환)
  return descriptor.defaultBinary;
}

function buildEnv(descriptor: AgentDescriptor): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  const apiKey = AgentSettingsStore.getApiKey(descriptor.id);
  if (apiKey && descriptor.apiKeyEnv) {
    env[descriptor.apiKeyEnv] = apiKey;
  }
  // ANSI 색상/TTY 이스케이프 억제 (텍스트 파싱 안정화)
  env.NO_COLOR = '1';
  env.FORCE_COLOR = '0';
  env.CLICOLOR = '0';
  return env;
}

function buildArgs(agentId: AgentId, prompt: string, sessionId?: string | null): string[] {
  if (agentId === 'claude') {
    const args = [
      '-p', prompt,
      '--output-format', 'stream-json',
      '--include-partial-messages',
      '--verbose',
    ];
    if (sessionId) args.push('--resume', sessionId);
    return args;
  }
  if (agentId === 'codex') {
    return ['exec', prompt];
  }
  if (agentId === 'gemini') {
    return ['-p', prompt];
  }
  return [prompt];
}

export function startTurn(
  payload: StartTurnPayload,
  emit: Emitter,
): { ok: boolean; message?: string } {
  const { turnId, agentId, prompt, sessionId } = payload;

  if (activeTurns.has(turnId)) {
    return { ok: false, message: '동일 turnId가 이미 실행 중입니다.' };
  }

  const descriptor = AGENT_DESCRIPTORS[agentId];
  if (!descriptor) {
    return { ok: false, message: `알 수 없는 agent: ${agentId}` };
  }

  const binary = resolveBinary(descriptor);
  const args = buildArgs(agentId, prompt, sessionId);
  const env = buildEnv(descriptor);

  let child: ChildProcess;
  try {
    child = spawn(binary, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit({ turnId, type: 'error', message: `실행 실패: ${msg}` });
    return { ok: false, message: msg };
  }

  activeTurns.set(turnId, { child, agentId });
  turnStates.set(turnId, { chunkCount: 0, assistantSnapshot: '' });

  // chunk emit 시 카운트 증가 (claude의 partial fallback 판정용)
  const wrappedEmit: Emitter = (e) => {
    if (e.type === 'chunk') {
      const s = turnStates.get(turnId);
      if (s) s.chunkCount += 1;
    }
    emit(e);
  };

  if (agentId === 'claude') {
    attachClaudeNdjsonParser(child, turnId, wrappedEmit);
  } else {
    attachTextStreamer(child, turnId, wrappedEmit);
  }

  let stderrBuf = '';
  child.stderr?.setEncoding('utf8');
  child.stderr?.on('data', (data: string) => {
    stderrBuf += data;
  });

  child.on('error', (err) => {
    activeTurns.delete(turnId);
    emit({ turnId, type: 'error', message: err.message });
  });

  child.on('close', (code, signal) => {
    activeTurns.delete(turnId);
    turnStates.delete(turnId);

    if (signal === 'SIGTERM' || signal === 'SIGKILL') {
      emit({ turnId, type: 'error', message: '사용자 취소' });
      return;
    }

    // claude는 result NDJSON 라인에서 end/error를 이미 emit 했음.
    // 그래도 비정상 종료(파싱 실패 / 인증 실패 등)에 대비해 stderr가 있으면 error로 보강.
    if (agentId === 'claude') {
      if (code !== 0 && stderrBuf.trim()) {
        emit({ turnId, type: 'error', message: stderrBuf.trim() });
      }
      return;
    }

    if (code === 0) {
      emit({ turnId, type: 'end' });
    } else {
      emit({
        turnId,
        type: 'error',
        message: stderrBuf.trim() || `프로세스가 종료 코드 ${code}로 종료되었습니다.`,
      });
    }
  });

  return { ok: true };
}

export function cancelTurn(turnId: string): boolean {
  const t = activeTurns.get(turnId);
  if (!t) return false;
  try {
    t.child.kill('SIGTERM');
  } catch {
    /* ignore */
  }
  return true;
}

// ────────────────────────────────────────────────────────────
// claude stream-json (NDJSON) 파서
// ────────────────────────────────────────────────────────────
function attachClaudeNdjsonParser(child: ChildProcess, turnId: string, emit: Emitter) {
  let buf = '';
  let endEmitted = false;

  child.stdout?.setEncoding('utf8');
  child.stdout?.on('data', (data: string) => {
    buf += data;
    let idx;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line) continue;
      try {
        const obj = JSON.parse(line);
        if (handleClaudeRecord(obj, turnId, emit)) {
          endEmitted = true;
        }
      } catch {
        // 파싱 실패 라인은 무시 (CLI 버전 차이 또는 디버그 로그)
      }
    }
  });

  child.stdout?.on('end', () => {
    if (!endEmitted) {
      emit({ turnId, type: 'end' });
    }
  });
}

/**
 * @returns end/error를 emit했으면 true
 */
function handleClaudeRecord(obj: unknown, turnId: string, emit: Emitter): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const rec = obj as Record<string, unknown>;

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

  // stream_event 분기 — content_block_start / delta / stop 모두 처리
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

  // tool_result는 별도 user 메시지로 도착: { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id, content, is_error }] } }
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

  // 단발 assistant 라인: partial이 비활성/무시된 환경에서 전체 텍스트가 한 번에 도착함.
  // text content를 합쳐 snapshot에 보관 → result 시점에 chunk가 0이면 fallback으로 emit.
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
      // partial chunk가 한 번도 오지 않았다면 assistant snapshot을 fallback으로 emit
      const s = turnStates.get(turnId);
      if (s && s.chunkCount === 0 && s.assistantSnapshot) {
        emit({ turnId, type: 'chunk', text: s.assistantSnapshot });
      }
      // 그래도 비어있고 result.result 텍스트가 있으면 그것을 fallback
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
      const msg = typeof rec.error === 'string'
        ? rec.error
        : (typeof rec.subtype === 'string' ? rec.subtype : '알 수 없는 오류');
      emit({ turnId, type: 'error', message: msg });
    }
    return true;
  }

  return false;
}

// ────────────────────────────────────────────────────────────
// codex/gemini: stdout 텍스트를 그대로 청크로 흘려보낸다.
// ────────────────────────────────────────────────────────────
function attachTextStreamer(child: ChildProcess, turnId: string, emit: Emitter) {
  child.stdout?.setEncoding('utf8');
  child.stdout?.on('data', (data: string) => {
    if (data) emit({ turnId, type: 'chunk', text: data });
  });
}
