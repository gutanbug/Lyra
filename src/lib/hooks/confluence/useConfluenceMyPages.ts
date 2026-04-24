import { useCallback, useState } from 'react';
import { integrationController } from 'controllers/account';
import { parsePages } from 'lib/utils/confluenceNormalizers';
import type { NormalizedConfluencePage } from 'types/confluence';

export interface UseConfluenceMyPagesOptions {
  accountId: string;
  activeAccount: { id: string } | null | undefined;
  selectedSpaces: string[];
  cached?: {
    myPages?: NormalizedConfluencePage[];
  };
}

export interface UseConfluenceMyPagesResult {
  myPages: NormalizedConfluencePage[];
  setMyPages: React.Dispatch<React.SetStateAction<NormalizedConfluencePage[]>>;
  isLoading: boolean;
  fetchMyPages: () => Promise<void>;
}

/**
 * Confluence Dashboard 내 페이지(기여자 = 현재 사용자) 조회 훅.
 */
export function useConfluenceMyPages({
  activeAccount,
  selectedSpaces,
  cached,
}: UseConfluenceMyPagesOptions): UseConfluenceMyPagesResult {
  const [myPages, setMyPages] = useState<NormalizedConfluencePage[]>(cached?.myPages ?? []);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMyPages = useCallback(async () => {
    if (!activeAccount) return;
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = {
        limit: 100,
        sort: '-modified-date',
        status: 'current',
        contributor: 'currentUser()',
      };
      if (selectedSpaces.length > 0) {
        params.spaceKeys = selectedSpaces;
      }
      const result = await integrationController.invoke({
        accountId: activeAccount.id,
        serviceType: 'confluence',
        action: 'getMyPages',
        params,
      });
      const pages = parsePages(result);
      setMyPages(pages);
    } catch (err) {
      console.error('[ConfluenceDashboard] fetchMyPages error:', err);
      setMyPages([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeAccount, selectedSpaces]);

  return {
    myPages,
    setMyPages,
    isLoading,
    fetchMyPages,
  };
}
