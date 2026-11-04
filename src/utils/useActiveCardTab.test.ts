import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import useActiveCardTab from './useActiveCardTab';

const STORAGE_KEY = 'mtg-funset:ActiveCardTab:v1';

describe('useActiveCardTab', () => {
  beforeEach(() => localStorage.clear());

  it('keeps a tab saved under its older title-case name', () => {
    localStorage.setItem(STORAGE_KEY, 'tab-key-Approved Cards');
    const { result } = renderHook(() => useActiveCardTab());
    expect(result.current[0]).toBe('tab-key-Approved cards');
  });

  it('falls back to the drafts tab for an unknown saved tab', () => {
    localStorage.setItem(STORAGE_KEY, 'tab-key-Nonsense');
    const { result } = renderHook(() => useActiveCardTab());
    expect(result.current[0]).toBe('tab-key-Card drafts / idea dump');
  });

  it('saves a newly selected tab', () => {
    const { result } = renderHook(() => useActiveCardTab());
    act(() => result.current[1]('tab-key-All'));
    expect(result.current[0]).toBe('tab-key-All');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('tab-key-All');
  });
});
