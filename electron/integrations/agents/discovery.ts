import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { AgentId } from './types';

// ────────────────────────────────────────────────────────────
// B단계 — 사용자/플러그인/확장이 추가한 슬래시 커맨드 디스커버리.
// 각 agent의 표준 위치를 스캔하고 frontmatter `description`을 추출한다.
// 실패(권한·미존재)는 조용히 무시 — 디스커버리는 best-effort.
// ────────────────────────────────────────────────────────────

export interface DiscoveredCommand {
  /** '/foo' 또는 '/namespace:cmd' 형태 (슬래시 포함) */
  name: string;
  description: string;
  /** 'user' | 'plugin:<name>' | 'extension:<name>' 등 */
  source: string;
}

const HOME = os.homedir();

async function pathExists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

function extractDescription(content: string): string {
  // YAML frontmatter: ---\n...\n---
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fm) {
    const desc = fm[1].match(/^description:\s*(.+)$/m);
    if (desc) {
      return desc[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  // frontmatter 없으면 헤딩이 아닌 첫 줄에서 80자
  const firstLine = content
    .split(/\r?\n/)
    .find((l) => l.trim() && !l.startsWith('#') && !l.startsWith('---'));
  return firstLine?.trim().slice(0, 80) ?? '';
}

async function readMdMeta(filePath: string): Promise<{ description: string }> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return { description: extractDescription(content) };
  } catch {
    return { description: '' };
  }
}

/**
 * 한 디렉터리(필요하면 하위 디렉터리까지) 스캔.
 * 하위 디렉터리는 namespace로 사용 → 'sub/file.md' → 'sub:file'.
 */
async function readDirCommands(
  dir: string,
  source: string,
  prefix = '',
): Promise<DiscoveredCommand[]> {
  if (!(await pathExists(dir))) return [];
  let entries: import('fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: DiscoveredCommand[] = [];
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      const next = prefix ? `${prefix}:${ent.name}` : ent.name;
      out.push(...(await readDirCommands(full, source, next)));
    } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.md')) {
      const base = ent.name.replace(/\.md$/i, '');
      const cmdName = prefix ? `${prefix}:${base}` : base;
      const meta = await readMdMeta(full);
      out.push({
        name: `/${cmdName}`,
        description: meta.description || `(${source})`,
        source,
      });
    }
  }
  return out;
}

async function discoverClaude(): Promise<DiscoveredCommand[]> {
  const out: DiscoveredCommand[] = [];

  // 1) 사용자 커맨드 (~/.claude/commands)
  out.push(...(await readDirCommands(path.join(HOME, '.claude', 'commands'), 'user')));

  // 2) plugin 커맨드 (~/.claude/plugins/cache/<owner>/<plugin>/commands)
  const pluginsRoot = path.join(HOME, '.claude', 'plugins', 'cache');
  if (await pathExists(pluginsRoot)) {
    let owners: import('fs').Dirent[] = [];
    try {
      owners = await fs.readdir(pluginsRoot, { withFileTypes: true });
    } catch { /* ignore */ }
    for (const owner of owners) {
      if (!owner.isDirectory()) continue;
      const ownerDir = path.join(pluginsRoot, owner.name);
      let plugins: import('fs').Dirent[] = [];
      try {
        plugins = await fs.readdir(ownerDir, { withFileTypes: true });
      } catch { continue; }
      for (const plugin of plugins) {
        if (!plugin.isDirectory()) continue;
        const cmdsDir = path.join(ownerDir, plugin.name, 'commands');
        out.push(...(await readDirCommands(cmdsDir, `plugin:${plugin.name}`)));
      }
    }
  }

  return out;
}

async function discoverCodex(): Promise<DiscoveredCommand[]> {
  const out: DiscoveredCommand[] = [];
  out.push(...(await readDirCommands(path.join(HOME, '.codex', 'commands'), 'user')));
  out.push(...(await readDirCommands(path.join(HOME, '.codex', 'prompts'), 'user')));
  return out;
}

async function discoverGemini(): Promise<DiscoveredCommand[]> {
  const out: DiscoveredCommand[] = [];
  out.push(...(await readDirCommands(path.join(HOME, '.gemini', 'commands'), 'user')));

  const extRoot = path.join(HOME, '.gemini', 'extensions');
  if (await pathExists(extRoot)) {
    let exts: import('fs').Dirent[] = [];
    try {
      exts = await fs.readdir(extRoot, { withFileTypes: true });
    } catch { /* ignore */ }
    for (const ext of exts) {
      if (!ext.isDirectory()) continue;
      const cmdsDir = path.join(extRoot, ext.name, 'commands');
      out.push(...(await readDirCommands(cmdsDir, `extension:${ext.name}`)));
    }
  }
  return out;
}

function dedupe(list: DiscoveredCommand[]): DiscoveredCommand[] {
  const seen = new Set<string>();
  const out: DiscoveredCommand[] = [];
  for (const c of list) {
    const key = c.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  // 이름 알파벳순으로 정렬(자동완성 일관성)
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export async function discoverCommands(agentId: AgentId): Promise<DiscoveredCommand[]> {
  let raw: DiscoveredCommand[] = [];
  if (agentId === 'claude') raw = await discoverClaude();
  else if (agentId === 'codex') raw = await discoverCodex();
  else if (agentId === 'gemini') raw = await discoverGemini();
  return dedupe(raw);
}
