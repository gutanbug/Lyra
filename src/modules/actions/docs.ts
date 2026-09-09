import { DocsState } from 'types/docs';

/*
	Lyra Docs 원본 목업은 리듀서 없이 `this.setState(partial)` 호출만으로 상태를 갱신한다.
	(각 핸들러가 최신 state를 읽어 다음 상태 조각을 계산 → setState)
	이 구조를 그대로 살리기 위해 액션은 "부분 상태 병합(PATCH)" 하나로 통일하고,
	실제 계산 로직은 modules/contexts/docs.tsx의 핸들러 함수들이 담당한다.
	(reducer는 얕은 병합만 수행 — Immer produce로 불변성 보장)
*/

export const PATCH = 'docs/PATCH' as const;
export const RESET = 'docs/RESET' as const;

export interface IPatch {
  patch: Partial<DocsState>;
}

export const patch = (data: Partial<DocsState>) => ({ type: PATCH, payload: data });
export const reset = (data: DocsState) => ({ type: RESET, payload: data });

export type ActionType =
  | ReturnType<typeof patch>
  | ReturnType<typeof reset>;
