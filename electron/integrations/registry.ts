import type { IntegrationAdapter } from './types';
import { JiraAdapter } from './jira/adapter';
import { ConfluenceAdapter } from './confluence/adapter';

const adapters = new Map<string, IntegrationAdapter>();

export function registerIntegration(adapter: IntegrationAdapter): void {
  adapters.set(adapter.serviceType, adapter);
}

export function getAdapter(serviceType: string): IntegrationAdapter | undefined {
  const adapter = adapters.get(serviceType);
  if (adapter) return adapter;
  // atlassian 계열은 jira 어댑터로 폴백 (동일 credentials 사용)
  if (serviceType === 'atlassian' || serviceType === 'confluence') {
    return adapters.get('jira');
  }
  return undefined;
}

export function getAvailableServices(): IntegrationAdapter[] {
  return Array.from(adapters.values());
}

// 앱 초기화 시 등록
export function initIntegrations(): void {
  registerIntegration(new JiraAdapter());
  registerIntegration(new ConfluenceAdapter());
  // registerIntegration(new NotionAdapter());
  // registerIntegration(new TrelloAdapter());
}
