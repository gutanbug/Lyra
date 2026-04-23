/**
 * 인라인 카드/링크의 linkMetaMap 상태와 URL 일괄 해석 로직을 캡슐화한 훅.
 * Jira 이슈/Confluence 페이지/tiny link를 resolveLinkMetaMap으로 해석해 병합한다.
 */
import { useState, useCallback, useEffect } from 'react';
import { resolveLinkMetaMap } from 'lib/utils/linkMetaResolver';
import type { Account } from 'types/account';
import type { LinkMeta } from 'components/common/AdfRenderer';

export interface UseJiraCardMetaMapOptions {
  activeAccount: Account | null;
  resolveCardTitlesRef?: React.MutableRefObject<((urls: string[]) => Promise<void>) | undefined>;
}

export interface UseJiraCardMetaMapResult {
  linkMetaMap: Record<string, LinkMeta>;
  ingestUrls: (urls: string[]) => Promise<void>;
}

function useJiraCardMetaMap({
  activeAccount,
  resolveCardTitlesRef,
}: UseJiraCardMetaMapOptions): UseJiraCardMetaMapResult {
  const [linkMetaMap, setLinkMetaMap] = useState<Record<string, LinkMeta>>({});

  const ingestUrls = useCallback(async (urls: string[]) => {
    if (!activeAccount || urls.length === 0) return;
    const metaMap = await resolveLinkMetaMap(urls, activeAccount.id);
    if (Object.keys(metaMap).length > 0) {
      setLinkMetaMap((prev) => ({ ...prev, ...metaMap }));
    }
  }, [activeAccount]);

  useEffect(() => {
    if (resolveCardTitlesRef) {
      resolveCardTitlesRef.current = ingestUrls;
    }
  }, [ingestUrls, resolveCardTitlesRef]);

  return { linkMetaMap, ingestUrls };
}

export default useJiraCardMetaMap;
