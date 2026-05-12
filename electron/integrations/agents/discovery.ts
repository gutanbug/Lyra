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

/**
 * 주어진 root 아래에서 'commands' 디렉터리들을 재귀적으로 찾는다.
 * 깊이 제한으로 무한 루프/심볼릭 폭주를 방지.
 */
async function findCommandDirs(root: string, depth: number, found: string[]): Promise<void> {
  if (depth < 0) return;
  if (!(await pathExists(root))) return;
  let entries: import('fs').Dirent[];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    if (ent.name.startsWith('.')) continue; // 숨김 디렉터리 스킵
    const sub = path.join(root, ent.name);
    if (ent.name === 'commands') {
      found.push(sub);
      // commands 내부는 readDirCommands가 처리 — 더 재귀하지 않음
      continue;
    }
    await findCommandDirs(sub, depth - 1, found);
  }
}

const PSEUDO_SEGMENT = /^(skills|plugins|cache|marketplaces|repos|data)$/;
const SEMVER = /^\d+\.\d+\.\d+(?:[-+].+)?$/;
const HASH_LIKE = /^[a-f0-9]{6,}$/;

/**
 * commands 디렉터리의 상위 segments에서 의미 있는 plugin name을 추출.
 * 알려진 layout 패턴을 먼저 매칭하고, 안 맞으면 휴리스틱 fallback.
 */
function pluginNameFromDir(commandsDir: string, base: string): string {
  const rel = path.relative(base, commandsDir).split(path.sep).join('/');

  // cache/<mp>/<plugin>/<version>/(skills/<skill>/)?commands
  const m1 = rel.match(/^cache\/[^/]+\/([^/]+)\/[^/]+(?:\/skills\/([^/]+))?\/commands$/);
  if (m1) return m1[2] ?? m1[1];

  // marketplaces/<mp>/(plugins/<plugin>/|skills/<skill>/)?commands
  const m2 = rel.match(/^marketplaces\/([^/]+)(?:\/plugins\/([^/]+)|\/skills\/([^/]+))?\/commands$/);
  if (m2) return m2[2] ?? m2[3] ?? m2[1];

  // fallback — pseudo/version/hash skip 후 마지막 의미 있는 segment
  const segments = rel.split('/').slice(0, -1);
  for (let i = segments.length - 1; i >= 0; i--) {
    const s = segments[i];
    if (PSEUDO_SEGMENT.test(s)) continue;
    if (SEMVER.test(s)) continue;
    if (HASH_LIKE.test(s)) continue;
    return s;
  }
  return segments[segments.length - 1] ?? 'plugin';
}

async function discoverClaude(): Promise<DiscoveredCommand[]> {
  const out: DiscoveredCommand[] = [];

  // 1) 사용자 커맨드 (~/.claude/commands)
  out.push(...(await readDirCommands(path.join(HOME, '.claude', 'commands'), 'user')));

  // 2) plugin/marketplace — 어떤 깊이의 commands 디렉터리든 모두 디스커버
  // 실제 layout 예시:
  //   cache/<mp>/<plugin>/<version>/commands/*.md
  //   cache/<mp>/<plugin>/<version>/skills/<skill>/commands/*.md
  //   marketplaces/<mp>/commands/*.md
  //   marketplaces/<mp>/plugins/<plugin>/commands/*.md
  //   marketplaces/<mp>/skills/<skill>/commands/*.md
  const pluginsRoot = path.join(HOME, '.claude', 'plugins');
  const cmdDirs: string[] = [];
  await findCommandDirs(pluginsRoot, 6, cmdDirs);
  for (const dir of cmdDirs) {
    const pluginName = pluginNameFromDir(dir, pluginsRoot);
    // claude 컨벤션상 plugin commands는 `/<plugin>:<command>` 네임스페이스 형식.
    // prefix를 plugin name으로 시작해 readDirCommands가 슬래시 이름을 그렇게 구성하도록 한다.
    out.push(...(await readDirCommands(dir, `plugin:${pluginName}`, pluginName)));
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
  if (agentId !== 'claude') return [];
  const raw = await discoverClaude();
  return dedupe(raw);
}
