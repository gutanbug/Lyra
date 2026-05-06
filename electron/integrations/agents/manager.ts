import { spawn, execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AGENT_DESCRIPTORS, AGENT_IDS } from './config';
import { AgentSettingsStore } from './store';
import type { AgentDescriptor, AgentId, AgentLoginResult, AgentStatus } from './types';

const HOME = os.homedir();

/** PATH에서 바이너리 탐색 (which/where) */
function resolveBinary(name: string): Promise<string | null> {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    execFile(cmd, [name], { env: process.env }, (err, stdout) => {
      if (err) return resolve(null);
      const first = stdout.split(/\r?\n/).map((s) => s.trim()).find(Boolean);
      resolve(first || null);
    });
  });
}

/** `<binary> --version` 실행 */
function readVersion(binary: string, args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(binary, args, { timeout: 4000, env: process.env }, (err, stdout, stderr) => {
      if (err) return resolve(null);
      const out = (stdout || stderr || '').trim();
      const firstLine = out.split(/\r?\n/)[0]?.trim() || null;
      resolve(firstLine);
    });
  });
}

type CliAuthResult = 'authenticated' | 'unauthenticated' | 'unknown';

/**
 * OS-네이티브 크리덴셜 스토어에 항목이 존재하는지 확인.
 * - darwin: `security find-generic-password -s <service>` (exit 0 → 존재)
 * - win32: `cmdkey /list:<target>` (출력에 target 포함 → 존재)
 * - linux/기타: 지원하지 않으므로 'unknown' 반환 (파일 fallback 유도)
 */
function checkNativeCredential(
  spec: { darwin?: string; win32?: string } | undefined,
): Promise<CliAuthResult> {
  if (!spec) return Promise.resolve('unknown');

  if (process.platform === 'darwin' && spec.darwin) {
    return new Promise((resolve) => {
      execFile(
        'security',
        ['find-generic-password', '-s', spec.darwin!],
        { timeout: 3000 },
        (err) => {
          if (!err) return resolve('authenticated');
          const code = (err as NodeJS.ErrnoException).code;
          if (code === 'ENOENT' || code === 'EACCES') return resolve('unknown');
          // security 명령은 항목 없을 때 exit 44를 반환 → unauthenticated로 확정.
          return resolve('unauthenticated');
        },
      );
    });
  }

  if (process.platform === 'win32' && spec.win32) {
    return new Promise((resolve) => {
      execFile('cmdkey', [`/list:${spec.win32}`], { timeout: 3000 }, (err, stdout) => {
        if (err) {
          const code = (err as NodeJS.ErrnoException).code;
          if (code === 'ENOENT' || code === 'EACCES') return resolve('unknown');
          return resolve('unauthenticated');
        }
        // cmdkey는 매칭 없어도 exit 0 — 출력 텍스트로 판별.
        const output = (stdout || '').toString();
        if (output.includes(spec.win32!)) return resolve('authenticated');
        return resolve('unauthenticated');
      });
    });
  }

  return Promise.resolve('unknown');
}

/** CLI status 명령으로 인증 여부 확인. 결정 불가 시 'unknown' → 호출부에서 파일 fallback */
function runAuthCheck(
  binary: string,
  args: string[],
  unauthenticatedPattern?: string,
): Promise<CliAuthResult> {
  return new Promise((resolve) => {
    execFile(binary, args, { timeout: 4000, env: process.env }, (err, stdout, stderr) => {
      const output = `${stdout || ''}\n${stderr || ''}`;
      const pattern = unauthenticatedPattern ? new RegExp(unauthenticatedPattern, 'i') : null;
      const matchedUnauth = pattern ? pattern.test(output.trim()) : false;

      if (err) {
        // 바이너리 실행 자체가 실패한 경우(미설치/권한 문제 등)만 판정 보류.
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOENT' || code === 'EACCES') return resolve('unknown');
        // 그 외 non-zero exit은 CLI가 직접 "미인증"을 알린 것으로 신뢰 → 파일 fallback 차단.
        return resolve('unauthenticated');
      }
      if (matchedUnauth) return resolve('unauthenticated');
      return resolve('authenticated');
    });
  });
}

/** credential 파일 탐색 → 인증 여부 + mtime */
function detectCredential(descriptor: AgentDescriptor): { path: string | null; mtime: string | null } {
  const dir = path.join(HOME, descriptor.credentialDir);
  if (!fs.existsSync(dir)) return { path: null, mtime: null };
  for (const fname of descriptor.credentialFiles) {
    const full = path.join(dir, fname);
    try {
      const stat = fs.statSync(full);
      if (stat.isFile()) {
        return { path: full, mtime: stat.mtime.toISOString() };
      }
    } catch {
      /* skip */
    }
  }
  return { path: null, mtime: null };
}

function maskApiKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

async function resolveBinaryPath(descriptor: AgentDescriptor): Promise<string | null> {
  const override = AgentSettingsStore.getBinaryPath(descriptor.id);
  if (override) {
    return fs.existsSync(override) ? override : null;
  }
  return resolveBinary(descriptor.defaultBinary);
}

export const AgentManager = {
  async getStatus(id: AgentId): Promise<AgentStatus> {
    const descriptor = AGENT_DESCRIPTORS[id];
    const binaryPath = await resolveBinaryPath(descriptor);
    const installed = !!binaryPath;
    const version = installed && binaryPath
      ? await readVersion(binaryPath, descriptor.versionArgs)
      : null;
    const apiKey = AgentSettingsStore.getApiKey(id);
    const binaryOverride = AgentSettingsStore.getBinaryPath(id);

    // 1차: OS 네이티브 크리덴셜 스토어 (macOS Keychain / Windows Credential Manager)
    const nativeResult = await checkNativeCredential(descriptor.nativeCredential);

    // 2차: CLI status 명령 (네이티브가 결정 불가일 때만)
    let cliResult: CliAuthResult = 'unknown';
    if (nativeResult === 'unknown' && installed && binaryPath && descriptor.statusArgs) {
      cliResult = await runAuthCheck(
        binaryPath,
        descriptor.statusArgs,
        descriptor.unauthenticatedPattern,
      );
    }

    // 3차: credential 파일 탐지 (위 두 단계 모두 결정 불가일 때만)
    const cred = detectCredential(descriptor);

    let authMethod: AgentStatus['authMethod'] = 'none';
    let authSource: AgentStatus['authSource'] = 'none';

    if (nativeResult === 'authenticated') {
      authMethod = 'oauth';
      authSource = 'cli';
    } else if (nativeResult === 'unauthenticated') {
      // 네이티브 스토어가 명시적으로 비어있다고 알려준 경우 → 파일/CLI 결과는 무시
      if (apiKey) {
        authMethod = 'apiKey';
        authSource = 'apiKey';
      }
    } else if (cliResult === 'authenticated') {
      authMethod = 'oauth';
      authSource = 'cli';
    } else if (cliResult === 'unauthenticated') {
      if (apiKey) {
        authMethod = 'apiKey';
        authSource = 'apiKey';
      }
    } else if (cred.path) {
      authMethod = 'oauth';
      authSource = 'file';
    } else if (apiKey) {
      authMethod = 'apiKey';
      authSource = 'apiKey';
    }

    return {
      id,
      installed,
      binaryPath,
      version,
      authenticated: authMethod !== 'none',
      authMethod,
      authSource,
      apiKeyMasked: maskApiKey(apiKey),
      credentialPath: cred.path,
      credentialMtime: cred.mtime,
      binaryOverride,
    };
  },

  async getAllStatus(): Promise<AgentStatus[]> {
    return Promise.all(AGENT_IDS.map((id) => this.getStatus(id)));
  },

  /** 로그인 트리거 — 터미널 창을 열어 사용자가 OAuth 플로우를 완료하도록 함 */
  async login(id: AgentId): Promise<AgentLoginResult> {
    const descriptor = AGENT_DESCRIPTORS[id];
    const binaryPath = await resolveBinaryPath(descriptor);
    if (!binaryPath) {
      return { ok: false, pid: null, message: `${descriptor.displayName} 바이너리를 찾을 수 없습니다.` };
    }
    const args = descriptor.loginArgs ?? [];

    try {
      const child = openInTerminal(binaryPath, args);
      return {
        ok: true,
        pid: child.pid ?? null,
        message: '터미널에서 로그인을 진행하세요. 완료 후 [상태 새로고침]을 누르세요.',
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, pid: null, message: `로그인 실행 실패: ${msg}` };
    }
  },

  /** 로그아웃 — CLI logout 명령 또는 credential 파일 제거 */
  async logout(id: AgentId): Promise<{ ok: boolean; message: string }> {
    const descriptor = AGENT_DESCRIPTORS[id];

    if (descriptor.logoutArgs) {
      const binaryPath = await resolveBinaryPath(descriptor);
      if (binaryPath) {
        const ok = await new Promise<boolean>((resolve) => {
          execFile(binaryPath, descriptor.logoutArgs!, { timeout: 6000 }, (err) => resolve(!err));
        });
        if (ok) return { ok: true, message: '로그아웃되었습니다.' };
      }
    }

    // 폴백: credential 파일 직접 제거
    const cred = detectCredential(descriptor);
    if (cred.path) {
      try {
        fs.unlinkSync(cred.path);
        return { ok: true, message: 'credential 파일을 제거했습니다.' };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, message: `credential 파일 제거 실패: ${msg}` };
      }
    }
    return { ok: true, message: '이미 로그아웃 상태입니다.' };
  },

  setApiKey(id: AgentId, key: string | null): void {
    AgentSettingsStore.setApiKey(id, key);
  },

  setBinaryPath(id: AgentId, binaryPath: string | null): void {
    AgentSettingsStore.setBinaryPath(id, binaryPath);
  },
};

/** OS별 터미널에서 명령 실행 */
function openInTerminal(binary: string, args: string[]) {
  const cmdLine = [binary, ...args].map(quoteArg).join(' ');

  if (process.platform === 'darwin') {
    const script = `tell application "Terminal" to do script "${cmdLine.replace(/"/g, '\\"')}"\nactivate application "Terminal"`;
    return spawn('osascript', ['-e', script], { detached: true, stdio: 'ignore' });
  }

  if (process.platform === 'win32') {
    return spawn('cmd.exe', ['/c', 'start', '""', 'cmd.exe', '/k', cmdLine], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
  }

  // Linux: 일반적인 터미널 후보 시도
  const candidates: Array<[string, string[]]> = [
    ['x-terminal-emulator', ['-e', 'sh', '-c', `${cmdLine}; exec sh`]],
    ['gnome-terminal', ['--', 'sh', '-c', `${cmdLine}; exec sh`]],
    ['konsole', ['-e', 'sh', '-c', `${cmdLine}; exec sh`]],
    ['xterm', ['-e', 'sh', '-c', `${cmdLine}; exec sh`]],
  ];
  for (const [bin, a] of candidates) {
    try {
      return spawn(bin, a, { detached: true, stdio: 'ignore' });
    } catch {
      /* try next */
    }
  }
  throw new Error('사용 가능한 터미널 에뮬레이터를 찾지 못했습니다.');
}

function quoteArg(s: string): string {
  if (!/[\s"'\\$`]/.test(s)) return s;
  return `'${s.replace(/'/g, "'\\''")}'`;
}
