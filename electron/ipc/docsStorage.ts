import { app, dialog, shell } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';
import { SettingsManager } from '../settings/store';

function defaultRootPath(): string {
  return path.join(app.getPath('documents'), 'Lyra Docs');
}

export function resolveRootPath(): string {
  return SettingsManager.getDocsStoragePath() || defaultRootPath();
}

function pagesDir(): string {
  return path.join(resolveRootPath(), 'pages');
}

function mediaDir(): string {
  return path.join(resolveRootPath(), 'media');
}

async function ensureDirectories(): Promise<void> {
  await fs.mkdir(pagesDir(), { recursive: true });
  await fs.mkdir(mediaDir(), { recursive: true });
}

/** 임시 파일에 쓴 뒤 rename — 쓰는 도중 크래시로 인한 파일 손상 방지 */
async function writeFileAtomic(filePath: string, data: string | Buffer): Promise<void> {
  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmpPath, data);
  await fs.rename(tmpPath, filePath);
}

async function readJsonFile(filePath: string): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}

export async function loadMeta(): Promise<unknown | null> {
  return readJsonFile(path.join(resolveRootPath(), 'meta.json'));
}

export async function saveMeta(meta: unknown): Promise<void> {
  await ensureDirectories();
  await writeFileAtomic(path.join(resolveRootPath(), 'meta.json'), JSON.stringify(meta));
}

export async function loadPage(pageId: string): Promise<unknown | null> {
  return readJsonFile(path.join(pagesDir(), `${pageId}.json`));
}

export async function savePage(pageId: string, data: unknown): Promise<void> {
  await ensureDirectories();
  await writeFileAtomic(path.join(pagesDir(), `${pageId}.json`), JSON.stringify(data));
}

export async function deletePage(pageId: string): Promise<void> {
  try {
    await fs.unlink(path.join(pagesDir(), `${pageId}.json`));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
}

export async function listPageIds(): Promise<string[]> {
  try {
    const entries = await fs.readdir(pagesDir());
    return entries.filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -'.json'.length));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
}

/** meta.json + 모든 페이지 파일을 한 번에 읽어 렌더러에 전달 */
export async function loadAll(): Promise<{ meta: unknown; pages: Record<string, unknown> } | null> {
  const meta = await loadMeta();
  if (meta === null) return null;
  const pageIds = await listPageIds();
  const pages: Record<string, unknown> = {};
  await Promise.all(
    pageIds.map(async (id) => {
      const page = await loadPage(id);
      if (page !== null) pages[id] = page;
    })
  );
  return { meta, pages };
}

export async function readMedia(mediaId: string): Promise<{ data: Buffer; mime: string } | null> {
  try {
    const [data, mimeRaw] = await Promise.all([
      fs.readFile(path.join(mediaDir(), mediaId)),
      fs.readFile(path.join(mediaDir(), `${mediaId}.mime`), 'utf-8').catch(() => 'application/octet-stream'),
    ]);
    return { data, mime: mimeRaw.trim() || 'application/octet-stream' };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}

export async function writeMedia(mediaId: string, data: Buffer, mime: string): Promise<void> {
  await ensureDirectories();
  await writeFileAtomic(path.join(mediaDir(), mediaId), data);
  await writeFileAtomic(path.join(mediaDir(), `${mediaId}.mime`), mime || 'application/octet-stream');
}

export async function deleteMedia(mediaId: string): Promise<void> {
  await Promise.all([
    fs.unlink(path.join(mediaDir(), mediaId)).catch(() => {}),
    fs.unlink(path.join(mediaDir(), `${mediaId}.mime`)).catch(() => {}),
  ]);
}

export function getStoragePath(): string {
  return resolveRootPath();
}

export async function setStoragePath(newPath: string): Promise<void> {
  SettingsManager.setDocsStoragePath(newPath);
  await ensureDirectories();
}

export function resetStoragePath(): string {
  SettingsManager.resetDocsStoragePath();
  return resolveRootPath();
}

export async function selectFolder(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: '문서 저장소 폴더 선택',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
}

export async function openFolder(): Promise<void> {
  await ensureDirectories();
  await shell.openPath(resolveRootPath());
}
