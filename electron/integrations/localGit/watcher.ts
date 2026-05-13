import chokidar from 'chokidar';
import path from 'path';

type WatcherCallback = (event: 'changed') => void;

const watchers = new Map<string, chokidar.FSWatcher>();

/**
 * .git/HEAD, .git/refs/**, .git/index 만 감시.
 * 변경 감지 시 콜백 호출 (debounce는 Renderer 측에서).
 */
export function watchRepo(repoId: string, absPath: string, callback: WatcherCallback): void {
  if (watchers.has(repoId)) return;
  const gitDir = path.join(absPath, '.git');
  const watcher = chokidar.watch(
    [
      path.join(gitDir, 'HEAD'),
      path.join(gitDir, 'refs'),
      path.join(gitDir, 'index'),
    ],
    { ignoreInitial: true, depth: 5 },
  );
  watcher.on('all', () => callback('changed'));
  watchers.set(repoId, watcher);
}

export async function unwatchRepo(repoId: string): Promise<void> {
  const watcher = watchers.get(repoId);
  if (!watcher) return;
  await watcher.close();
  watchers.delete(repoId);
}

export async function unwatchAll(): Promise<void> {
  for (const repoId of Array.from(watchers.keys())) {
    await unwatchRepo(repoId);
  }
}
