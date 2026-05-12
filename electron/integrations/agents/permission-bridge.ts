import { createServer, Server, Socket } from 'net';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';
import { EventEmitter } from 'events';

// ────────────────────────────────────────────────────────────
// 메인 프로세스의 permission bridge.
// claude가 spawn한 MCP 서버(permission-mcp-server.ts)와 unix socket / named pipe로
// 통신하며, 도구 호출 권한 요청을 메인으로 받아 IPC로 렌더러에 전달하고,
// 렌더러의 사용자 응답을 다시 MCP 서버로 돌려보낸다.
// ────────────────────────────────────────────────────────────

export interface PermissionRequest {
  requestId: string;
  turnId: string;
  toolName: string;
  input: unknown;
}

export interface PermissionResponse {
  requestId: string;
  behavior: 'allow' | 'deny';
  updatedInput?: unknown;
  message?: string;
}

class PermissionBridge extends EventEmitter {
  private server: Server | null = null;
  private socketPath = '';
  private pending = new Map<string, Socket>();

  start(): string {
    if (this.server) return this.socketPath;

    const path = process.platform === 'win32'
      ? `\\\\.\\pipe\\lyra-permission-${process.pid}`
      : join(tmpdir(), `lyra-permission-${process.pid}.sock`);

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
    this.pending.clear();
  }

  getSocketPath(): string {
    return this.socketPath;
  }

  /** 렌더러 응답을 MCP 서버로 전달. 매칭되는 pending request가 없으면 false. */
  respond(response: PermissionResponse): boolean {
    const socket = this.pending.get(response.requestId);
    if (!socket) return false;
    this.pending.delete(response.requestId);
    try {
      socket.write(JSON.stringify({
        type: 'permission_response',
        requestId: response.requestId,
        behavior: response.behavior,
        updatedInput: response.updatedInput,
        message: response.message,
      }) + '\n');
      return true;
    } catch {
      return false;
    }
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
          const msg = JSON.parse(line) as { type?: string } & Partial<PermissionRequest>;
          if (msg.type === 'permission_request' && msg.requestId && msg.toolName) {
            this.pending.set(msg.requestId, socket);
            this.emit('permission_request', {
              requestId: msg.requestId,
              turnId: msg.turnId ?? '',
              toolName: msg.toolName,
              input: msg.input ?? {},
            } satisfies PermissionRequest);
          }
        } catch {
          // 파싱 실패 라인은 무시
        }
      }
    });

    socket.on('close', () => {
      for (const [k, v] of this.pending.entries()) {
        if (v === socket) this.pending.delete(k);
      }
    });
    socket.on('error', () => { /* ignore */ });
  }
}

export const permissionBridge = new PermissionBridge();
