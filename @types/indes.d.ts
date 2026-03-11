/*
	Extending the existing object interface
	
	e.g. Window, String, Number, ...
*/
declare global {
	interface Window {
		electronAPI?: {
			versions: {
				node: string;
				chrome: string;
				electron: string;
			};
		};
		workspaceAPI?: {
			settings: {
				getSelectedProjects: (accountId: string) => Promise<string[]>;
				setSelectedProjects: (accountId: string, keys: string[]) => Promise<void>;
			};
			account: {
				getAll: () => Promise<import('../src/types/account').Account[]>;
				getByService: (type: string) => Promise<import('../src/types/account').Account[]>;
				add: (account: import('../src/types/account').AccountInput) => Promise<import('../src/types/account').Account>;
				update: (id: string, updates: Partial<import('../src/types/account').AccountInput>) => Promise<import('../src/types/account').Account | null>;
				remove: (id: string) => Promise<boolean>;
				setActive: (id: string | null) => Promise<void>;
				getActive: () => Promise<import('../src/types/account').Account | null>;
			};
			integration: {
				getAvailable: () => Promise<{ type: string; displayName: string; icon?: string }[]>;
				validate: (payload: { serviceType: string; credentials: unknown }) => Promise<boolean>;
				invoke: (payload: {
					accountId: string;
					serviceType: string;
					action: string;
					params?: Record<string, unknown>;
				}) => Promise<unknown>;
			};
		};
	}
}