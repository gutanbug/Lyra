import { useEffect, useState } from 'react';
import { integrationController } from 'controllers/account';
import type { JiraProjectField } from 'types/jira';

/**
 * (accountId, projectKey) → 스키마 맵 캐시.
 * 모듈 스코프에 두어 같은 세션 내 다른 컴포넌트에서 재사용 (프로젝트당 1회 페치).
 */
const schemaCache = new Map<string, Promise<Record<string, JiraProjectField>>>();

const cacheKey = (accountId: string, projectKey: string) => `${accountId}::${projectKey}`;

const fetchProjectFields = (accountId: string, projectKey: string) => {
  const key = cacheKey(accountId, projectKey);
  let p = schemaCache.get(key);
  if (p) return p;
  p = integrationController
    .invoke({
      accountId,
      serviceType: 'jira',
      action: 'getProjectFields',
      params: { projectKey },
    })
    .then((result) => {
      const list = Array.isArray(result) ? (result as JiraProjectField[]) : [];
      const map: Record<string, JiraProjectField> = {};
      list.forEach((f) => { map[f.id] = f; });
      return map;
    })
    .catch(() => ({} as Record<string, JiraProjectField>));
  schemaCache.set(key, p);
  return p;
};

/**
 * 프로젝트 필드 schema 맵을 로드/구독.
 * 캐시 적중 시 즉시 반환. 미적중 시 1회만 IPC 호출하고 결과를 캐시.
 */
export function useProjectFieldSchemas(
  accountId: string | undefined,
  projectKey: string | undefined,
): Record<string, JiraProjectField> {
  const [schemas, setSchemas] = useState<Record<string, JiraProjectField>>({});

  useEffect(() => {
    if (!accountId || !projectKey) {
      setSchemas({});
      return;
    }
    let cancelled = false;
    fetchProjectFields(accountId, projectKey).then((map) => {
      if (cancelled) return;
      setSchemas(map);
    });
    return () => { cancelled = true; };
  }, [accountId, projectKey]);

  return schemas;
}
