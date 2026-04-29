import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { integrationController } from 'controllers/account';
import {
  loadSelectedSpaces,
  loadSelectedSpacesAsync,
  saveSelectedSpaces,
} from 'lib/utils/storageHelpers';
import { parseSpaces } from 'lib/utils/confluenceNormalizers';
import type { ConfluenceSpace } from 'types/confluence';

export interface UseConfluenceSpacesOptions {
  accountId: string;
  activeAccount: { id: string } | null | undefined;
  cached?: {
    spaces?: ConfluenceSpace[];
    selectedSpaces?: string[];
  };
}

export interface UseConfluenceSpacesResult {
  spaces: ConfluenceSpace[];
  setSpaces: React.Dispatch<React.SetStateAction<ConfluenceSpace[]>>;
  selectedSpaces: string[];
  setSelectedSpaces: React.Dispatch<React.SetStateAction<string[]>>;
  showSpaceSettings: boolean;
  setShowSpaceSettings: React.Dispatch<React.SetStateAction<boolean>>;
  spaceFilter: string;
  setSpaceFilter: React.Dispatch<React.SetStateAction<string>>;
  filteredSpaces: ConfluenceSpace[];
  spaceSettingsLoaded: boolean;
  setSpaceSettingsLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  fetchSpaces: () => Promise<void>;
  handleSaveSpaceSettings: () => void;
}

/**
 * Confluence Dashboard 스페이스 상태 + 조회 + localStorage 영속(계정별).
 * handleSaveSpaceSettings는 저장 + 이벤트 디스패치만 담당하며,
 * composer에서 fetchMyPages 등 후속 동작을 합성한다.
 */
export function useConfluenceSpaces({
  accountId,
  activeAccount,
  cached,
}: UseConfluenceSpacesOptions): UseConfluenceSpacesResult {
  const isCacheValid = Boolean(cached && cached.spaces);

  const [spaces, setSpaces] = useState<ConfluenceSpace[]>(cached?.spaces ?? []);
  const [selectedSpaces, setSelectedSpaces] = useState<string[]>(
    cached?.selectedSpaces ?? loadSelectedSpaces(accountId),
  );
  const [showSpaceSettings, setShowSpaceSettings] = useState(false);
  const [spaceFilter, setSpaceFilter] = useState('');
  const [spaceSettingsLoaded, setSpaceSettingsLoaded] = useState(isCacheValid);

  // 최초 마운트 시 비동기 스페이스 설정 로드
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (initialLoadDone.current || !accountId || isCacheValid) return;
    initialLoadDone.current = true;
    loadSelectedSpacesAsync(accountId).then((keys) => {
      if (keys.length > 0) setSelectedSpaces(keys);
      setSpaceSettingsLoaded(true);
    });
  }, [accountId, isCacheValid]);

  // 계정 변경 시 화면 리셋 + localStorage/async 재로드
  const prevAccountIdRef = useRef(accountId);
  useEffect(() => {
    if (prevAccountIdRef.current === accountId) return;
    prevAccountIdRef.current = accountId;

    setSpaces([]);
    setSelectedSpaces([]);
    setSpaceSettingsLoaded(false);

    if (!accountId) return;

    loadSelectedSpacesAsync(accountId).then((keys) => {
      if (keys.length > 0) setSelectedSpaces(keys);
      setSpaceSettingsLoaded(true);
    });
  }, [accountId]);

  const fetchSpaces = useCallback(async () => {
    if (!activeAccount) return;
    try {
      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'confluence',
        action: 'getSpaces',
        params: { limit: 250 },
      });
      const list = parseSpaces(result);
      list.sort((a, b) => a.name.localeCompare(b.name));
      setSpaces(list);
    } catch {
      setSpaces([]);
    }
  }, [activeAccount]);

  const filteredSpaces = useMemo(() => {
    const q = spaceFilter.trim().toLowerCase();
    if (!q) return spaces;
    return spaces.filter(
      (s) => s.name.toLowerCase().includes(q) || s.key.toLowerCase().includes(q),
    );
  }, [spaces, spaceFilter]);

  const handleSaveSpaceSettings = useCallback(() => {
    saveSelectedSpaces(accountId, selectedSpaces);
    setShowSpaceSettings(false);
    window.dispatchEvent(new CustomEvent('lyra:confluence-space-settings-changed'));
  }, [accountId, selectedSpaces]);

  return {
    spaces,
    setSpaces,
    selectedSpaces,
    setSelectedSpaces,
    showSpaceSettings,
    setShowSpaceSettings,
    spaceFilter,
    setSpaceFilter,
    filteredSpaces,
    spaceSettingsLoaded,
    setSpaceSettingsLoaded,
    fetchSpaces,
    handleSaveSpaceSettings,
  };
}
