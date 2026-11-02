import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import usePhoneLayout, { PHONE_LAYOUT_MEDIA_QUERY } from './usePhoneLayout';

type ChangeListener = (event: Partial<MediaQueryListEvent>) => void;

describe('usePhoneLayout', () => {
  it('reports the phone breakpoint and follows live changes until unmount', () => {
    const changeListeners = new Set<ChangeListener>();
    let matches = true;
    const matchMedia = vi.fn((media: string) => ({
      matches,
      media,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener(_: string, listener: ChangeListener) {
        changeListeners.add(listener);
      },
      removeEventListener(_: string, listener: ChangeListener) {
        changeListeners.delete(listener);
      },
      dispatchEvent: () => false,
    }));
    vi.stubGlobal('matchMedia', matchMedia);

    const { result, unmount } = renderHook(() => usePhoneLayout());
    expect(result.current).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith(PHONE_LAYOUT_MEDIA_QUERY);

    act(() => {
      matches = false;
      changeListeners.forEach(listener => listener({ matches: false }));
    });
    expect(result.current).toBe(false);

    unmount();
    expect(changeListeners.size).toBe(0);
    vi.unstubAllGlobals();
  });
});
