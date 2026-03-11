import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as os from 'os';
import Store from 'electron-store';
import { app } from 'electron';
import type { Account, AccountInput, ServiceType } from '../types/account';

interface AccountStore {
  accounts: Account[];
  activeAccountId: string | null;
}

/** 머신 고유 정보 기반 암호화 키 생성 (코드에 키가 노출되지 않음) */
function deriveEncryptionKey(): string {
  const machineId = [os.hostname(), os.homedir(), os.userInfo().username].join(':');
  return crypto.createHash('sha256').update(machineId).digest('hex');
}

function createStore(): Store<AccountStore> {
  const opts = {
    name: 'workspace-accounts',
    encryptionKey: process.env.WORKSPACE_STORE_KEY || deriveEncryptionKey(),
  };
  try {
    const s = new Store<AccountStore>(opts);
    // 읽기 시도하여 복호화 가능 여부 확인
    s.get('accounts');
    return s;
  } catch {
    // 키 변경 등으로 기존 데이터 복호화 실패 시 초기화
    const s = new Store<AccountStore>({ ...opts, clearInvalidConfig: true } as any);
    s.clear();
    return s;
  }
}

const store = createStore();

export const AccountManager = {
  getAll(): Account[] {
    return store.get('accounts', []);
  },

  getByService(serviceType: ServiceType): Account[] {
    return this.getAll().filter((a) => a.serviceType === serviceType);
  },

  getById(id: string): Account | undefined {
    return this.getAll().find((a) => a.id === id);
  },

  add(account: AccountInput): Account {
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

  update(id: string, updates: Partial<AccountInput>): Account | null {
    const accounts = this.getAll();
    const idx = accounts.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    accounts[idx] = {
      ...accounts[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    store.set('accounts', accounts);
    return accounts[idx];
  },

  remove(id: string): boolean {
    const accounts = this.getAll().filter((a) => a.id !== id);
    store.set('accounts', accounts);
    if (store.get('activeAccountId') === id) {
      store.delete('activeAccountId');
    }
    return true;
  },

  setActive(id: string | null): void {
    store.set('activeAccountId', id);
  },

  getActive(): Account | null {
    const id = store.get('activeAccountId');
    return id ? (this.getById(id) ?? null) : null;
  },
};
