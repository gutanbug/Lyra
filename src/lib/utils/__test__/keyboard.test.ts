import { describe, expect, it } from 'vitest';
import { isImeComposing } from 'lib/utils/keyboard';

describe('isImeComposing', () => {
  it('detects native composition events', () => {
    expect(isImeComposing({ isComposing: true })).toBe(true);
  });

  it('detects React synthetic composition events', () => {
    expect(isImeComposing({ nativeEvent: { isComposing: true } })).toBe(true);
  });

  it('supports the legacy IME keyCode fallback', () => {
    expect(isImeComposing({ keyCode: 229 })).toBe(true);
    expect(isImeComposing({ nativeEvent: { keyCode: 229 } })).toBe(true);
  });

  it('does not block an ordinary Enter event', () => {
    expect(isImeComposing({ keyCode: 13, nativeEvent: { isComposing: false } })).toBe(false);
  });
});
