import { useEffect, useState } from 'react';
import {
  loadProjectFieldConfigAsync,
  projectFieldConfigStorageKey,
  type ProjectFieldConfig,
} from 'lib/utils/storageHelpers';

interface ConfigEventDetail {
  accountId: string;
  projectKey: string;
}

/**
 * 계정·프로젝트 단위 필드 설정을 구독.
 *
 * 동기화 채널 두 가지:
 *  - 같은 윈도우: `saveProjectFieldConfig`가 dispatch하는
 *    `lyra:project-field-config-changed` CustomEvent.
 *  - 다른 윈도우(Electron BrowserWindow / 다른 탭): localStorage 변경 시
 *    브라우저가 자동 발생시키는 `storage` 이벤트. 같은 origin·partition을
 *    공유하는 모든 윈도우에서 발생한다(originating 윈도우 제외).
 *
 * 둘 다 청취하므로 어느 쪽에서 저장하든 모든 화면이 갱신된다.
 */
export function useProjectFieldConfig(
  accountId: string | undefined,
  projectKey: string | undefined,
): { config: ProjectFieldConfig | null; isLoaded: boolean } {
  const [config, setConfig] = useState<ProjectFieldConfig | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!accountId || !projectKey) {
      setConfig(null);
      setIsLoaded(true);
      return;
    }
    let cancelled = false;
    setIsLoaded(false);

    const refresh = () => {
      loadProjectFieldConfigAsync(accountId, projectKey).then((cfg) => {
        if (cancelled) return;
        setConfig(cfg);
        setIsLoaded(true);
      });
    };

    refresh();

    const targetKey = projectFieldConfigStorageKey(accountId, projectKey);

    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<ConfigEventDetail>).detail;
      if (!detail) return;
      if (detail.accountId !== accountId || detail.projectKey !== projectKey) return;
      refresh();
    };

    const onStorage = (e: StorageEvent) => {
      // 다른 윈도우에서 localStorage가 변경됐을 때 트리거됨.
      // e.key는 변경된 키. clear() 시 null로 전달되므로 그것도 처리.
      if (e.key !== null && e.key !== targetKey) return;
      refresh();
    };

    window.addEventListener('lyra:project-field-config-changed', onCustom);
    window.addEventListener('storage', onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener('lyra:project-field-config-changed', onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, [accountId, projectKey]);

  return { config, isLoaded };
}
