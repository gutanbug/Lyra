import chokidar from 'chokidar';
import path from 'path';

/** repo 변경 감지 시 외부 모듈(IPC handlers)이 broadcast하도록 주입되는 콜백. */
type ChangeListener = (repoId: string) => void;

const watchers = new Map<string, chokidar.FSWatcher>();
let changeListener: ChangeListener | null = null;

/**
 * 변경 감지 콜백 등록 — `electron/ipc/handlers.ts`가 부팅 시 한 번 호출.
 * 콜백 안에서는 `BrowserWindow.webContents.send('localGit:changed', {repoId})` 같은 broadcast 수행.
 */
export function setChangeListener(fn: ChangeListener | null): void {
  changeListener = fn;
}

/**
 * 절대 경로 repo의 `.git/HEAD`, `.git/refs/**`, `.git/index`를 chokidar로 감시.
 * 변경 감지 시 `setChangeListener`로 등록된 콜백을 호출 (debounce는 renderer 측에서).
 *
 * 같은 repoId로 이미 watcher가 있으면 no-op.
 */
export function watchRepo(repoId: string, absPath: string): void {
  if (watchers.has(repoId)) return;
  const gitDir = path.join(absPath, '.git');
  const watcher = chokidar.watch(
    [
      path.join(gitDir, 'HEAD'),
      path.join(gitDir, 'refs'),
      path.join(gitDir, 'index'),
    ],
    {
      ignoreInitial: true,
      // refs/heads, refs/remotes, refs/tags 까지 들어가도록 충분한 depth 확보.
      depth: 5,
      // 대용량 monorepo에서 초기 add scan 비용 절감 (위 두 옵션과 별개).
      awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 30 },
    },
  );
  watcher.on('all', () => changeListener?.(repoId));
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
