import { createServer, Server, Socket } from 'net';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';
import { JiraClient } from '../jira/client';
import { ConfluenceClient } from '../confluence/client';
import { AccountManager } from '../../account/manager';
import type { JiraCredentials } from '../jira/types';

// ────────────────────────────────────────────────────────────
// Lyra Atlassian MCP bridge.
// claude가 spawn한 stdio MCP 서버(atlassian-mcp-server.ts)와 unix socket으로 통신하며,
// jira/confluence 도구 호출을 우리 controllers로 라우팅한다.
// 활성 Atlassian 계정의 자격을 매 호출마다 사용 — 토큰 별도 전달 없이 동작.
// ────────────────────────────────────────────────────────────

interface RpcRequest {
  type: 'request';
  requestId: string;
  action: string;
  params: Record<string, unknown>;
}

interface RpcResponse {
  type: 'response';
  requestId: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

function getActiveAtlassianCreds(): JiraCredentials | null {
  const isAtlassian = (t: string) => t === 'atlassian' || t === 'jira' || t === 'confluence';
  const pick = (acc: { credentials: unknown } | null): JiraCredentials | null => {
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
    for (const acc of AccountManager.getByService(t)) {
      const c = pick(acc);
      if (c) return c;
    }
  }
  return null;
}

class AtlassianBridge {
  private server: Server | null = null;
  private socketPath = '';

  start(): string {
    if (this.server) return this.socketPath;

    const path = process.platform === 'win32'
      ? `\\\\.\\pipe\\lyra-atlassian-${process.pid}`
      : join(tmpdir(), `lyra-atlassian-${process.pid}.sock`);

    if (process.platform !== 'win32' && existsSync(path)) {
      try { unlinkSync(path); } catch { /* ignore */ }
    }

    this.socketPath = path;
    this.server = createServer((socket) => this.onClient(socket));
    this.server.listen(path);
    return path;
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    if (process.platform !== 'win32' && this.socketPath && existsSync(this.socketPath)) {
      try { unlinkSync(this.socketPath); } catch { /* ignore */ }
    }
  }

  getSocketPath(): string {
    return this.socketPath;
  }

  private onClient(socket: Socket): void {
    let buf = '';
    socket.setEncoding('utf8');
    socket.on('data', (data: string) => {
      buf += data;
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line) as RpcRequest;
          if (msg.type === 'request') {
            void this.handle(msg, socket);
          }
        } catch {
          // 파싱 실패 라인 무시
        }
      }
    });
    socket.on('error', () => { /* ignore */ });
  }

  private async handle(req: RpcRequest, socket: Socket): Promise<void> {
    const send = (resp: RpcResponse) => {
      try { socket.write(JSON.stringify(resp) + '\n'); } catch { /* ignore */ }
    };

    const creds = getActiveAtlassianCreds();
    if (!creds) {
      send({
        type: 'response',
        requestId: req.requestId,
        ok: false,
        error: 'Lyra에 등록된 Atlassian 계정이 없습니다. 환경설정 → 계정에서 추가하세요.',
      });
      return;
    }

    try {
      const data = await this.invoke(req.action, req.params, creds);
      send({ type: 'response', requestId: req.requestId, ok: true, data });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      send({ type: 'response', requestId: req.requestId, ok: false, error: message });
    }
  }

  private async invoke(action: string, params: Record<string, unknown>, creds: JiraCredentials): Promise<unknown> {
    if (action === 'jira_get_issue') {
      const issueKey = String(params.issue_key ?? '');
      if (!issueKey) throw new Error('issue_key가 필요합니다.');
      const client = new JiraClient(creds);
      return client.getIssue(issueKey);
    }
    if (action === 'jira_search_issues') {
      const jql = String(params.jql ?? '');
      if (!jql) throw new Error('jql이 필요합니다.');
      const maxResults = typeof params.max_results === 'number' ? params.max_results : 25;
      const client = new JiraClient(creds);
      return client.searchIssues(jql, maxResults);
    }
    if (action === 'confluence_get_page') {
      const pageId = String(params.page_id ?? '');
      if (!pageId) throw new Error('page_id가 필요합니다.');
      const client = new ConfluenceClient(creds);
      return client.getPageContent(pageId);
    }
    throw new Error(`알 수 없는 action: ${action}`);
  }
}

export const atlassianBridge = new AtlassianBridge();
