# 통합 워크스페이스 데스크톱 앱 구현 가이드

다중 계정 지원 및 Jira, Notion, Trello 등 다양한 서비스 연동이 가능한 확장형 데스크톱 앱 구현 가이드입니다.

---

## 1. 아키텍처 개요

### 1.1 핵심 설계 원칙

- **다중 계정**: 서비스별 여러 계정 등록 및 전환
- **확장성**: 플러그인 형태로 새 서비스 추가
- **통합 인터페이스**: 서비스별 공통 추상화 레이어

### 1.2 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Electron Main Process                                  │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Integration Registry                               │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │    │
│  │  │  Jira   │ │ Notion  │ │ Trello  │ │Confluence│ │  Slack  │  ...   │    │
│  │  │Adapter  │ │ Adapter  │ │ Adapter  │ │ Adapter  │ │ Adapter  │       │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │  Account Manager  │  │  Credential Store │  │   Unified IPC Handlers   │  │
│  │  (다중 계정 관리)  │  │  (암호화 저장)     │  │  (accountId + action)   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                        ↕ IPC
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Renderer (React)                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Account      │  │ Service      │  │ Unified      │  │ Service-specific │  │
│  │ Switcher     │  │ Selector     │  │ Dashboard    │  │ Views (Jira 등)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 데이터 모델

### 2.1 계정 (Account)

```typescript
// types/account.ts
export type ServiceType = 'jira' | 'notion' | 'trello' | 'confluence' | 'slack' | string;

export interface Account {
  id: string;                    // UUID
  serviceType: ServiceType;      // 연동 서비스 종류
  displayName: string;            // 사용자 지정 이름 (예: "회사 Jira", "개인 Notion")
  credentials: ServiceCredentials; // 서비스별 인증 정보 (암호화 저장)
  metadata?: Record<string, unknown>; // 서비스별 추가 메타데이터
  createdAt: string;              // ISO 8601
  updatedAt: string;
}

export type ServiceCredentials = 
  | JiraCredentials 
  | NotionCredentials 
  | TrelloCredentials 
  | Record<string, unknown>;

export interface JiraCredentials {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export interface NotionCredentials {
  integrationToken: string;
  workspaceId?: string;
}

export interface TrelloCredentials {
  apiKey: string;
  apiToken: string;
}
```

### 2.2 서비스 어댑터 인터페이스

```typescript
// electron/integrations/types.ts
export interface IntegrationAdapter<TConfig = unknown, TResult = unknown> {
  readonly serviceType: string;
  readonly displayName: string;
  readonly icon?: string;  // 아이콘 경로 또는 emoji
  
  /** 연결 테스트 */
  validateCredentials(credentials: TConfig): Promise<boolean>;
  
  /** 서비스별 공통 작업 (추상화된 API) */
  getCommonActions(): CommonAction[];
  
  /** 서비스 전용 API (IPC로 노출) */
  getActions(): Record<string, (params: unknown) => Promise<unknown>>;
}

/** 여러 서비스에서 공통으로 사용할 수 있는 작업 */
export interface CommonAction {
  id: string;
  label: string;
  handler: (accountId: string, params?: unknown) => Promise<unknown>;
}

/** 예: "검색", "목록 조회", "상세 조회" 등 */
export type CommonActionType = 'search' | 'list' | 'detail' | 'create' | 'update' | 'delete';
```

---

## 3. 디렉토리 구조

```
electron/
├── main.ts
├── preload.ts
├── integrations/                 # 연동 서비스 플러그인
│   ├── types.ts                  # IntegrationAdapter 인터페이스
│   ├── registry.ts               # 어댑터 등록/조회
│   ├── jira/
│   │   ├── adapter.ts
│   │   ├── client.ts
│   │   └── types.ts
│   ├── notion/
│   │   ├── adapter.ts
│   │   └── types.ts
│   └── trello/
│       ├── adapter.ts
│       └── types.ts
├── account/
│   ├── manager.ts                # 계정 CRUD, 활성 계정 관리
│   └── store.ts                  # electron-store 래퍼
└── ipc/
    ├── handlers.ts               # 통합 IPC 핸들러
    └── channels.ts               # IPC 채널 상수

src/
├── controllers/
│   ├── account.ts                # 계정 API (IPC 래퍼)
│   └── integrations/             # 서비스별 API 래퍼
│       ├── jira.ts
│       ├── notion.ts
│       └── index.ts
├── modules/
│   ├── contexts/
│   │   └── account.tsx           # 현재 선택된 계정/서비스 Context
│   └── ...
├── pages/
│   ├── AccountSettings.tsx       # 계정 추가/편집/삭제
│   ├── Dashboard.tsx             # 통합 대시보드
│   └── integrations/             # 서비스별 전용 화면
│       ├── jira/
│       │   ├── JiraDashboard.tsx
│       │   ├── JiraIssues.tsx
│       │   └── JiraIssueDetail.tsx
│       ├── notion/
│       │   └── ...
│       └── ...
└── types/
    ├── account.ts
    └── integrations/
        ├── jira.ts
        └── ...
```

---

## 4. 핵심 구현

### 4.1 Integration Registry (확장 포인트)

```typescript
// electron/integrations/registry.ts
import { IntegrationAdapter } from './types';
import { JiraAdapter } from './jira/adapter';
// import { NotionAdapter } from './notion/adapter';
// import { TrelloAdapter } from './trello/adapter';

const adapters = new Map<string, IntegrationAdapter>();

export function registerIntegration(adapter: IntegrationAdapter) {
  adapters.set(adapter.serviceType, adapter);
}

export function getAdapter(serviceType: string): IntegrationAdapter | undefined {
  return adapters.get(serviceType);
}

export function getAvailableServices(): IntegrationAdapter[] {
  return Array.from(adapters.values());
}

// 앱 초기화 시 등록
export function initIntegrations() {
  registerIntegration(new JiraAdapter());
  // registerIntegration(new NotionAdapter());
  // registerIntegration(new TrelloAdapter());
}
```

### 4.2 Account Manager (다중 계정)

```typescript
// electron/account/manager.ts
import { v4 as uuidv4 } from 'uuid';
import Store from 'electron-store';
import { Account, ServiceType } from '../types/account';
import { getAdapter } from '../integrations/registry';

const store = new Store<{ accounts: Account[]; activeAccountId: string | null }>({
  name: 'accounts',
  encryptionKey: 'your-encryption-key', // 환경변수로 주입 권장
});

export const AccountManager = {
  getAll(): Account[] {
    return store.get('accounts', []);
  },

  getByService(serviceType: ServiceType): Account[] {
    return this.getAll().filter(a => a.serviceType === serviceType);
  },

  getById(id: string): Account | undefined {
    return this.getAll().find(a => a.id === id);
  },

  add(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Account {
    const now = new Date().toISOString();
    const newAccount: Account = {
      ...account,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    const accounts = [...this.getAll(), newAccount];
    store.set('accounts', accounts);
    return newAccount;
  },

  update(id: string, updates: Partial<Account>): Account | null {
    const accounts = this.getAll();
    const idx = accounts.findIndex(a => a.id === id);
    if (idx === -1) return null;
    accounts[idx] = { ...accounts[idx], ...updates, updatedAt: new Date().toISOString() };
    store.set('accounts', accounts);
    return accounts[idx];
  },

  remove(id: string): boolean {
    const accounts = this.getAll().filter(a => a.id !== id);
    store.set('accounts', accounts);
    if (store.get('activeAccountId') === id) store.delete('activeAccountId');
    return true;
  },

  setActive(id: string | null): void {
    store.set('activeAccountId', id);
  },

  getActive(): Account | null {
    const id = store.get('activeAccountId');
    return id ? this.getById(id) ?? null : null;
  },
};
```

### 4.3 통합 IPC 핸들러

```typescript
// electron/ipc/handlers.ts
import { ipcMain } from 'electron';
import { AccountManager } from '../account/manager';
import { getAdapter } from '../integrations/registry';

export function registerIpcHandlers() {
  // === 계정 관리 ===
  ipcMain.handle('account:getAll', () => AccountManager.getAll());
  ipcMain.handle('account:getByService', (_, serviceType) => AccountManager.getByService(serviceType));
  ipcMain.handle('account:add', (_, account) => AccountManager.add(account));
  ipcMain.handle('account:update', (_, id, updates) => AccountManager.update(id, updates));
  ipcMain.handle('account:remove', (_, id) => AccountManager.remove(id));
  ipcMain.handle('account:setActive', (_, id) => AccountManager.setActive(id));
  ipcMain.handle('account:getActive', () => AccountManager.getActive());

  // === 사용 가능한 서비스 목록 ===
  ipcMain.handle('integration:getAvailable', () => 
    getAvailableServices().map(a => ({ type: a.serviceType, displayName: a.displayName, icon: a.icon }))
  );

  // === 서비스별 액션 (accountId + action + params) ===
  ipcMain.handle('integration:invoke', async (_, { accountId, serviceType, action, params }) => {
    const account = AccountManager.getById(accountId);
    if (!account) throw new Error('Account not found');
    const adapter = getAdapter(serviceType);
    if (!adapter) throw new Error('Integration not found');
    const actions = adapter.getActions();
    const handler = actions[action];
    if (!handler) throw new Error(`Action ${action} not found`);
    return handler({ credentials: account.credentials, ...params });
  });
}
```

### 4.4 Jira Adapter 예시 (확장 패턴)

```typescript
// electron/integrations/jira/adapter.ts
import { IntegrationAdapter } from '../types';
import { JiraClient } from './client';
import type { JiraCredentials } from './types';

export class JiraAdapter implements IntegrationAdapter<JiraCredentials> {
  readonly serviceType = 'jira';
  readonly displayName = 'Jira';
  readonly icon = '📋';

  async validateCredentials(credentials: JiraCredentials): Promise<boolean> {
    const client = new JiraClient(credentials);
    try {
      await client.getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }

  getCommonActions() {
    return [
      { id: 'search', label: '이슈 검색', handler: (accountId, params) => this.searchIssues(accountId, params) },
      { id: 'list', label: '프로젝트 목록', handler: (accountId) => this.getProjects(accountId) },
    ];
  }

  getActions() {
    return {
      searchIssues: (p) => this.searchIssues(p.accountId, p),
      getProjects: (p) => this.getProjects(p.accountId),
      getIssue: (p) => this.getIssue(p.accountId, p.issueKey),
      createIssue: (p) => this.createIssue(p.accountId, p.data),
    };
  }

  private async searchIssues(accountId: string, params?: { jql?: string; maxResults?: number }) {
    // AccountManager에서 credentials 조회 후 JiraClient 호출
    // ...
  }
  // ...
}
```

---

## 5. Preload (다중 계정 + 확장 지원)

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('workspaceAPI', {
  // 계정
  account: {
    getAll: () => ipcRenderer.invoke('account:getAll'),
    getByService: (type: string) => ipcRenderer.invoke('account:getByService', type),
    add: (account) => ipcRenderer.invoke('account:add', account),
    update: (id, updates) => ipcRenderer.invoke('account:update', id, updates),
    remove: (id) => ipcRenderer.invoke('account:remove', id),
    setActive: (id) => ipcRenderer.invoke('account:setActive', id),
    getActive: () => ipcRenderer.invoke('account:getActive'),
  },
  // 연동 서비스
  integration: {
    getAvailable: () => ipcRenderer.invoke('integration:getAvailable'),
    invoke: (payload: { accountId: string; serviceType: string; action: string; params?: unknown }) =>
      ipcRenderer.invoke('integration:invoke', payload),
  },
});
```

---

## 6. 서비스별 연동 가이드

### 6.1 Jira

| 항목 | 내용 |
|------|------|
| 인증 | 이메일 + API 토큰 (Basic Auth) |
| 토큰 발급 | [Atlassian API 토큰](https://id.atlassian.com/manage-profile/security/api-tokens) |
| 주요 API | `/rest/api/3/search/jql`, `/rest/api/3/project`, `/rest/api/3/issue/{key}` |

### 6.2 Notion

| 항목 | 내용 |
|------|------|
| 인증 | Integration Token (Bearer) |
| 토큰 발급 | Notion 설정 > Connections > Develop or publish integrations |
| 주요 API | `https://api.notion.com/v1/databases`, `https://api.notion.com/v1/pages` |

### 6.3 Trello

| 항목 | 내용 |
|------|------|
| 인증 | API Key + API Token (OAuth 1.0 또는 Token) |
| 토큰 발급 | [Trello Power-Up](https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/) |
| 주요 API | `/1/boards`, `/1/lists`, `/1/cards` |

### 6.4 새 서비스 추가 절차

1. `electron/integrations/{service}/` 폴더 생성
2. `IntegrationAdapter` 구현
3. `registry.ts`의 `initIntegrations()`에 등록
4. `src/pages/integrations/{service}/` UI 추가
5. `Account` 타입에 해당 `Credentials` 유니온 추가

---

## 7. UI 플로우

```
[앱 시작]
    │
    ├─ 계정 없음 → AccountSettings (계정 추가 유도)
    │
    └─ 계정 있음 → Dashboard
                      │
                      ├─ [계정 전환] → 사이드바에서 계정 선택
                      ├─ [서비스 선택] → Jira / Notion / Trello ...
                      └─ [서비스별 화면] → 이슈 목록, 검색, 상세 등
```

---

## 8. 보안 고려사항

1. **Credentials 저장**: `electron-store` + `encryptionKey` (환경변수 권장)
2. **IPC 검증**: `accountId`로 계정 소유권 확인 후에만 액션 수행
3. **Context Isolation**: Preload를 통해서만 Renderer ↔ Main 통신

---

## 9. 패키지 의존성

```bash
pnpm add axios electron-store uuid
pnpm add -D @types/uuid
```

---

## 10. 다음 단계

1. **Phase 1**: Account Manager, Integration Registry, IPC 핸들러 구현 ✅ 완료
2. **Phase 2**: Jira Adapter 구현 및 계정 CRUD UI ✅ 완료
3. **Phase 3**: 대시보드, 계정 전환, Jira 전용 화면
4. **Phase 4**: Notion/Trello 등 추가 어댑터 구현

원하시면 특정 Phase부터 구체적인 코드와 함께 단계별로 구현해 드리겠습니다.

---

## 11. Phase 1 완료 내역 (구현됨)

- `electron/types/account.ts` - Account, ServiceCredentials 타입
- `electron/integrations/types.ts` - IntegrationAdapter 인터페이스
- `electron/integrations/registry.ts` - 어댑터 등록/조회
- `electron/integrations/jira/` - JiraAdapter, JiraClient (searchIssues, getProjects, getIssue)
- `electron/account/manager.ts` - AccountManager (CRUD, activeAccountId)
- `electron/ipc/handlers.ts` - IPC 핸들러 (account:*, integration:*)
- `electron/preload.ts` - workspaceAPI 노출
- `src/types/account.ts` - Renderer용 타입
- `src/controllers/account.ts` - accountController, integrationController

---

## 12. Phase 2 완료 내역 (구현됨)

- `src/modules/contexts/account.tsx` - AccountContext, useAccount
- `src/components/layout/Header.tsx` - Home / 계정 설정 네비게이션
- `src/components/account/AddAccountForm.tsx` - Jira 계정 추가 폼, 연결 확인
- `src/components/account/AccountList.tsx` - 계정 목록, 활성화, 삭제
- `src/pages/AccountSettings.tsx` - 계정 설정 페이지
- `src/pages/LayoutPage.tsx` - Header + 라우팅 레이아웃
