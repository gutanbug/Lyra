// Lyra Atlassian — minimal stdio MCP server.
//
// claude가 spawn한다. 노출 도구:
//   - lyra_jira_get_issue(issue_key)
//   - lyra_jira_search_issues(jql, max_results?)
//   - lyra_confluence_get_page(page_id)
//
// 도구 호출은 unix socket으로 메인 프로세스(atlassian-bridge)에 forward되어
// JiraClient/ConfluenceClient를 통해 실제 API 호출 후 결과 반환.
//
// 별도 Node 프로세스(Electron의 process.execPath + ELECTRON_RUN_AS_NODE=1)로
// 실행되므로 electron API에 의존해서는 안 된다.

import { connect, Socket } from 'net';

const socketPath = process.env.LYRA_ATLASSIAN_SOCKET;

if (!socketPath) {
  process.stderr.write('LYRA_ATLASSIAN_SOCKET not set\n');
  process.exit(1);
}

let socket: Socket | null = null;
let socketReady = false;
const pending = new Map<string, (payload: { ok: boolean; data?: unknown; error?: string }) => void>();
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
          if (msg && msg.type === 'response' && typeof msg.requestId === 'string') {
            const cb = pending.get(msg.requestId);
            if (cb) {
              pending.delete(msg.requestId);
              cb({
                ok: !!msg.ok,
                data: msg.data,
                error: typeof msg.error === 'string' ? msg.error : undefined,
              });
            }
          }
        } catch {
          /* ignore */
        }
      }
    });
    s.on('close', () => {
      for (const [k, cb] of pending.entries()) {
        pending.delete(k);
        cb({ ok: false, error: 'Lyra와의 연결이 종료되었습니다.' });
      }
      socketReady = false;
    });
  });
}

function callBridge(
  action: string,
  params: Record<string, unknown>,
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  return new Promise((resolve) => {
    const requestId = `at-${process.pid}-${nextSeq++}`;
    pending.set(requestId, resolve);
    socket!.write(JSON.stringify({ type: 'request', requestId, action, params }) + '\n');
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

const TOOLS = [
  {
    name: 'lyra_jira_get_issue',
    description: 'Lyra에 등록된 Atlassian 계정으로 Jira 이슈 단건을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        issue_key: { type: 'string', description: 'Jira 이슈 키 (예: CMPTEAM-1234)' },
      },
      required: ['issue_key'],
    },
  },
  {
    name: 'lyra_jira_search_issues',
    description: 'JQL로 Jira 이슈를 검색합니다. Lyra의 활성 Atlassian 계정을 사용합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        jql: { type: 'string', description: 'JQL 쿼리 문자열' },
        max_results: { type: 'number', description: '최대 결과 수 (기본 25)' },
      },
      required: ['jql'],
    },
  },
  {
    name: 'lyra_confluence_get_page',
    description: 'Confluence 페이지 본문(ADF)을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        page_id: { type: 'string', description: 'Confluence 페이지 ID' },
      },
      required: ['page_id'],
    },
  },
];

const TOOL_TO_ACTION: Record<string, string> = {
  lyra_jira_get_issue: 'jira_get_issue',
  lyra_jira_search_issues: 'jira_search_issues',
  lyra_confluence_get_page: 'confluence_get_page',
};

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
      serverInfo: { name: 'lyra-atlassian', version: '0.1.0' },
    });
    return;
  }

  if (method === 'notifications/initialized' || method === 'initialized') {
    return;
  }

  if (method === 'tools/list') {
    reply(id, { tools: TOOLS });
    return;
  }

  if (method === 'tools/call') {
    const p = (params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
    const action = p.name ? TOOL_TO_ACTION[p.name] : undefined;
    if (!action) {
      replyError(id, -32601, `unknown tool: ${p.name}`);
      return;
    }
    if (!socketReady) {
      try {
        await connectSocket();
      } catch (err) {
        replyError(id, -32000, `socket connect failed: ${(err as Error).message}`);
        return;
      }
    }
    const result = await callBridge(action, p.arguments ?? {});
    if (result.ok) {
      reply(id, {
        content: [{ type: 'text', text: JSON.stringify(result.data ?? null, null, 2) }],
      });
    } else {
      reply(id, {
        content: [{ type: 'text', text: result.error || '알 수 없는 오류' }],
        isError: true,
      });
    }
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
