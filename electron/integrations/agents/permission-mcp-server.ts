// Lyra permission prompt — minimal stdio MCP server.
//
// claude(`--permission-prompt-tool mcp__lyra-permission__prompt_user`)가 도구 호출 직전
// 이 서버의 `prompt_user` 도구를 호출한다. 우리는 그 호출을 unix socket / named pipe로
// 메인 프로세스에 전달하고, 사용자 응답이 돌아오면 stdio로 claude에게 반환한다.
//
// stdio: line-delimited JSON-RPC 2.0
// socket: line-delimited JSON {type, requestId, ...}
//
// 이 파일은 별도 Node 프로세스로 실행된다(Electron의 process.execPath +
// ELECTRON_RUN_AS_NODE=1). 따라서 electron API에 의존해서는 안 된다.

import { connect, Socket } from 'net';

const socketPath = process.env.LYRA_PERMISSION_SOCKET;
const turnId = process.env.LYRA_TURN_ID || '';

if (!socketPath) {
  process.stderr.write('LYRA_PERMISSION_SOCKET not set\n');
  process.exit(1);
}

let socket: Socket | null = null;
let socketReady = false;
const pending = new Map<string, (responseText: string) => void>();
let nextSeq = 1;

function connectSocket(): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = connect(socketPath as string);
    s.setEncoding('utf8');
    let buf = '';
    s.once('connect', () => {
      socket = s;
      socketReady = true;
      resolve();
    });
    s.once('error', (err) => reject(err));
    s.on('data', (data: string) => {
      buf += data;
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line);
          if (msg && msg.type === 'permission_response' && typeof msg.requestId === 'string') {
            const cb = pending.get(msg.requestId);
            if (cb) {
              pending.delete(msg.requestId);
              const inner: Record<string, unknown> = { behavior: msg.behavior === 'allow' ? 'allow' : 'deny' };
              if (msg.behavior === 'allow' && msg.updatedInput !== undefined) {
                inner.updatedInput = msg.updatedInput;
              }
              if (msg.behavior === 'deny' && typeof msg.message === 'string') {
                inner.message = msg.message;
              }
              cb(JSON.stringify(inner));
            }
          }
        } catch {
          /* ignore parse error */
        }
      }
    });
    s.on('close', () => {
      for (const [k, cb] of pending.entries()) {
        pending.delete(k);
        cb(JSON.stringify({ behavior: 'deny', message: '사용자 응답 채널이 종료되었습니다.' }));
      }
      socketReady = false;
    });
  });
}

function askMain(toolName: string, input: unknown): Promise<string> {
  return new Promise((resolve) => {
    const requestId = `${turnId || 'tn'}-${process.pid}-${nextSeq++}`;
    pending.set(requestId, resolve);
    socket!.write(JSON.stringify({
      type: 'permission_request',
      requestId,
      turnId,
      toolName,
      input,
    }) + '\n');
  });
}

let stdinBuf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk: string) => {
  stdinBuf += chunk;
  let idx;
  while ((idx = stdinBuf.indexOf('\n')) >= 0) {
    const line = stdinBuf.slice(0, idx).trim();
    stdinBuf = stdinBuf.slice(idx + 1);
    if (!line) continue;
    void handleRpc(line);
  }
});

async function handleRpc(line: string): Promise<void> {
  let req: { id?: unknown; method?: string; params?: unknown };
  try {
    req = JSON.parse(line);
  } catch {
    return;
  }
  const { id, method, params } = req;

  if (method === 'initialize') {
    if (!socketReady) {
      try {
        await connectSocket();
      } catch (err) {
        replyError(id, -32000, `socket connect failed: ${(err as Error).message}`);
        return;
      }
    }
    reply(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'lyra-permission', version: '0.1.0' },
    });
    return;
  }

  if (method === 'notifications/initialized' || method === 'initialized') {
    return;
  }

  if (method === 'tools/list') {
    reply(id, {
      tools: [
        {
          name: 'prompt_user',
          description: 'Lyra 사용자에게 도구 호출 권한을 묻고 결과를 반환합니다.',
          inputSchema: {
            type: 'object',
            properties: {
              tool_name: { type: 'string' },
              input: { type: 'object' },
            },
            required: ['tool_name'],
            additionalProperties: true,
          },
        },
      ],
    });
    return;
  }

  if (method === 'tools/call') {
    const p = (params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
    if (p.name !== 'prompt_user') {
      replyError(id, -32601, `unknown tool: ${p.name}`);
      return;
    }
    const args = p.arguments ?? {};
    const toolName = typeof args.tool_name === 'string' ? args.tool_name : 'unknown';
    const input = args.input ?? {};
    if (!socketReady) {
      try {
        await connectSocket();
      } catch (err) {
        replyError(id, -32000, `socket connect failed: ${(err as Error).message}`);
        return;
      }
    }
    const responseText = await askMain(toolName, input);
    reply(id, { content: [{ type: 'text', text: responseText }] });
    return;
  }

  replyError(id, -32601, `method not found: ${method}`);
}

function reply(id: unknown, result: unknown): void {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}

function replyError(id: unknown, code: number, message: string): void {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
}

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
