/** 여러 서비스에서 공통으로 사용할 수 있는 작업 */
export interface CommonAction {
  id: string;
  label: string;
  handler: (accountId: string, params?: unknown) => Promise<unknown>;
}

/** 서비스 어댑터 인터페이스 - 새 연동 서비스 추가 시 구현 */
export interface IntegrationAdapter<TConfig = unknown> {
  readonly serviceType: string;
  readonly displayName: string;
  readonly icon?: string;

  /** 연결 테스트 (사용자 정보 포함 가능) */
  validateCredentials(credentials: TConfig): Promise<boolean | Record<string, unknown>>;

  /** 서비스별 공통 작업 (추상화된 API) */
  getCommonActions(): CommonAction[];

  /** 서비스 전용 API (IPC로 노출) - params에 credentials가 포함됨 */
  getActions(): Record<string, (params: unknown) => Promise<unknown>>;
}
