import React from 'react';
import { act, renderHook } from '@testing-library/react';
import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

import UserInterface from '../interfaces/UserInterface';
import { Store, StoreType } from '../store';
import { UNKNOWN_CREATOR } from './constants';
import { staticAntd } from './staticAntd';
import { useTrollMode } from './useTrollMode';

vi.mock('axios');

const makeUser = (uuid: string, trollMode?: boolean): UserInterface => ({
  name: uuid,
  uuid,
  seenCards: [],
  lastSeenVersion: 1,
  trollMode,
});

const renderTrollMode = (initialUser: UserInterface) => {
  const current = { user: initialUser };
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Store.Provider
      value={{ currentUser: current.user, dispatch: () => {} } as unknown as StoreType}
    >
      {children}
    </Store.Provider>
  );
  const hook = renderHook(() => useTrollMode(), { wrapper });
  return {
    ...hook,
    switchUser: (user: UserInterface) => {
      current.user = user;
      hook.rerender();
    },
  };
};

const { message } = staticAntd;

afterEach(() => {
  vi.mocked(axios.patch).mockReset();
  staticAntd.message = message;
});

describe('useTrollMode', () => {
  it('follows what is stored on the current user', () => {
    const { result, switchUser } = renderTrollMode(makeUser('stored', true));
    expect(result.current[0]).toBe(true);
    switchUser(makeUser('undecided'));
    expect(result.current[0]).toBe(false);
  });

  it.each([true, false])('applies %s at once and stores only that', async enabled => {
    const user = makeUser(`toggles-${enabled}`, !enabled);
    vi.mocked(axios.patch).mockResolvedValue({ data: { user: { ...user, trollMode: enabled } } });
    const { result, switchUser } = renderTrollMode(user);

    act(() => result.current[1](enabled));

    expect(result.current[0]).toBe(enabled);
    await vi.waitFor(() => expect(axios.patch).toHaveBeenCalledOnce());
    const [url, body] = vi.mocked(axios.patch).mock.calls[0];
    expect(url).toContain(`/user/${user.uuid}`);
    expect(body).toEqual({ trollMode: enabled, accessKey: expect.any(String) });

    switchUser(makeUser('someone-else', !enabled));
    expect(result.current[0]).toBe(!enabled);
  });

  it('keeps the choice and reports when it could not be stored', async () => {
    const error = vi.fn();
    staticAntd.message = { ...message, error };
    vi.mocked(axios.patch).mockRejectedValue(new Error('400'));
    const { result } = renderTrollMode(makeUser('offline'));

    act(() => result.current[1](true));

    await vi.waitFor(() => expect(error).toHaveBeenCalledOnce());
    expect(result.current[0]).toBe(true);
  });

  it('does not store it without a chosen user', async () => {
    const { result } = renderTrollMode(UNKNOWN_CREATOR);
    act(() => result.current[1](true));
    await new Promise(resolve => setTimeout(resolve));
    expect(result.current[0]).toBe(true);
    expect(axios.patch).not.toHaveBeenCalled();
  });
});
