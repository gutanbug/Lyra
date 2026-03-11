import type { IntegrationAdapter } from './types';
import { JiraAdapter } from './jira/adapter';

const adapters = new Map<string, IntegrationAdapter>();

export function registerIntegration(adapter: IntegrationAdapter): void {
  adapters.set(adapter.serviceType, adapter);
}

export function getAdapter(serviceType: string): IntegrationAdapter | undefined {
  return adapters.get(serviceType);
}

export function getAvailableServices(): IntegrationAdapter[] {
  return Array.from(adapters.values());
}

// 앱 초기화 시 등록
export function initIntegrations(): void {
  registerIntegration(new JiraAdapter());
  // registerIntegration(new NotionAdapter());
  // registerIntegration(new TrelloAdapter());
}
