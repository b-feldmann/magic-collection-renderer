import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('logrocket', () => ({
  default: { identify: vi.fn(), log: vi.fn() },
}));

vi.mock('axios', () => ({
  default: { get: vi.fn(), put: vi.fn() },
}));

import axios from 'axios';
import { Action, UserActionType } from '../reducer';
import UserInterface from '../interfaces/UserInterface';
import { UNKNOWN_CREATOR } from '../utils/constants';
import { getUser, hasStoredUser, setCurrentUser, shouldShowUserSelect } from './userActions';

const STORAGE_KEY = 'mtg-funset:currentUser';

const mockUser = (uuid: string, name: string): UserInterface => ({
  uuid,
  name,
  seenCards: [],
  lastSeenVersion: -1,
});

const makeDispatch = () => {
  const actions: Action[] = [];
  return {
    actions,
    dispatch: (value: Action) => actions.push(value),
  };
};

describe('setCurrentUser', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(axios.put).mockReset();
  });

  it('stores the chosen user uuid in localStorage', () => {
    setCurrentUser(makeDispatch().dispatch, mockUser('uuid-1', 'Alice'));
    expect(localStorage.getItem(STORAGE_KEY)).toBe('uuid-1');
  });

  it('removes the stored user when reset to UNKNOWN_CREATOR', () => {
    localStorage.setItem(STORAGE_KEY, 'uuid-1');
    setCurrentUser(makeDispatch().dispatch, UNKNOWN_CREATOR);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('dispatches SetCurrentUser with the given user', () => {
    const { actions, dispatch } = makeDispatch();
    const user = mockUser('uuid-1', 'Alice');
    setCurrentUser(dispatch, user);
    expect(actions).toContainEqual({
      type: UserActionType.SetCurrentUser,
      payload: { user },
    });
  });
});

describe('hasStoredUser', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is false when nothing is stored', () => {
    expect(hasStoredUser()).toBe(false);
  });

  it('is true when a uuid is stored', () => {
    localStorage.setItem(STORAGE_KEY, 'uuid-1');
    expect(hasStoredUser()).toBe(true);
  });
});

describe('shouldShowUserSelect', () => {
  const alice = mockUser('uuid-1', 'Alice');

  it('hides the chooser while the stored user is still being restored', () => {
    // Users not fetched yet, but a user was persisted last session.
    expect(shouldShowUserSelect(UNKNOWN_CREATOR, [], true)).toBe(false);
  });

  it('shows the chooser on a fresh visit with no stored user', () => {
    expect(shouldShowUserSelect(UNKNOWN_CREATOR, [], false)).toBe(true);
  });

  it('shows the chooser once users loaded but the stored user could not be restored', () => {
    expect(shouldShowUserSelect(UNKNOWN_CREATOR, [alice], true)).toBe(true);
  });

  it('never shows the chooser when a real user is selected', () => {
    expect(shouldShowUserSelect(alice, [], true)).toBe(false);
    expect(shouldShowUserSelect(alice, [alice], false)).toBe(false);
  });
});

describe('getUser restores the stored user', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(axios.get).mockReset();
  });

  it('auto-selects the stored user when it exists in the fetched list', async () => {
    const alice = mockUser('uuid-1', 'Alice');
    const bob = mockUser('uuid-2', 'Bob');
    vi.mocked(axios.get).mockResolvedValue({ data: { user: [alice, bob] } });
    localStorage.setItem(STORAGE_KEY, 'uuid-2');

    const { actions, dispatch } = makeDispatch();
    getUser(dispatch);

    await vi.waitFor(() => {
      expect(actions).toContainEqual({
        type: UserActionType.SetCurrentUser,
        payload: { user: bob },
      });
    });
  });

  it('does not auto-select when nothing is stored', async () => {
    const alice = mockUser('uuid-1', 'Alice');
    vi.mocked(axios.get).mockResolvedValue({ data: { user: [alice] } });

    const { actions, dispatch } = makeDispatch();
    getUser(dispatch);

    await vi.waitFor(() => {
      expect(actions).toContainEqual({ type: UserActionType.GetUser, payload: { user: [alice] } });
    });
    expect(actions.filter(a => a.type === UserActionType.SetCurrentUser)).toHaveLength(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('clears the stored uuid when it no longer exists in the user list', async () => {
    const alice = mockUser('uuid-1', 'Alice');
    vi.mocked(axios.get).mockResolvedValue({ data: { user: [alice] } });
    localStorage.setItem(STORAGE_KEY, 'gone-user');

    const { actions, dispatch } = makeDispatch();
    getUser(dispatch);

    await vi.waitFor(() => {
      expect(actions).toContainEqual({ type: UserActionType.GetUser, payload: { user: [alice] } });
    });
    expect(actions.filter(a => a.type === UserActionType.SetCurrentUser)).toHaveLength(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
