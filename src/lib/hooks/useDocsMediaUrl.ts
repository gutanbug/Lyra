import { useEffect, useState } from 'react';
import { getMedia } from 'lib/utils/docsMediaStore';

/** mediaId(IndexedDB 참조)가 있으면 blob object URL로, 없으면 fallbackUrl(외부 임베드 링크)을 그대로 반환한다. */
export const useDocsMediaUrl = (mediaId?: string, fallbackUrl?: string): string | undefined => {
  const [objUrl, setObjUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!mediaId) { setObjUrl(undefined); return undefined; }
    let revoked = false;
    let created: string | undefined;
    getMedia(mediaId).then((blob) => {
      if (revoked || !blob) return;
      created = URL.createObjectURL(blob);
      setObjUrl(created);
    }).catch(() => {});
    return () => {
      revoked = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [mediaId]);

  return mediaId ? objUrl : fallbackUrl;
};
