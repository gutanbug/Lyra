/**
 * 한글·일본어·중국어 IME가 글자를 조합하는 동안 발생한 키 이벤트인지 판별한다.
 *
 * 최신 브라우저는 isComposing을 제공하지만 일부 Chromium/WebKit 조합에서는
 * 조합 확정 Enter에 legacy keyCode 229만 남기므로 두 신호를 함께 확인한다.
 */
type ImeKeyboardEvent = {
  isComposing?: boolean;
  keyCode?: number;
  nativeEvent?: {
    isComposing?: boolean;
    keyCode?: number;
  };
};

export const isImeComposing = (event: ImeKeyboardEvent) => (
  event.isComposing === true
  || event.nativeEvent?.isComposing === true
  || event.keyCode === 229
  || event.nativeEvent?.keyCode === 229
);
