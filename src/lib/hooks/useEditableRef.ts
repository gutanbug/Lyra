import { useCallback, useRef } from 'react';

/**
 * contentEditable 요소를 "제어되지 않는" 방식으로 외부 저장소(state 밖의 값)와 동기화한다.
 * React state에 본문을 두고 매 키 입력마다 리렌더하면 contentEditable 커서 위치가 유실되므로,
 * 포커스 중이 아니고 값이 실제로 다를 때만 DOM을 갱신한다.
 * Source: Lyra Docs.dc.html의 `this._els`/`this._text` ref 동기화 패턴 이식.
 */
export const useEditableRef = (
  getValue: () => string,
  onChange: (value: string) => void,
  renderValue?: (el: HTMLElement, value: string) => void,
) => {
  const elRef = useRef<HTMLElement | null>(null);

  const sync = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const value = getValue();
    if (document.activeElement === el) return;
    if (renderValue) {
      renderValue(el, value);
      return;
    }
    if (el.textContent !== value) el.textContent = value;
  }, [getValue, renderValue]);

  const setRef = useCallback((el: HTMLElement | null) => {
    elRef.current = el;
    sync(el);
  }, [sync]);

  const onInput = useCallback((e: React.FormEvent<HTMLElement>) => {
    onChange((e.currentTarget.textContent || ''));
  }, [onChange]);

  return { elRef, setRef, onInput, resync: () => sync(elRef.current) };
};
