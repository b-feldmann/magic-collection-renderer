import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { addLastSeenVersion, addSeenCard, addSeenComments } from './userActions';
import reducer, { Action, UserActionType } from '../reducer';
import UserInterface from '../interfaces/UserInterface';
import { UNKNOWN_CREATOR } from '../utils/constants';

vi.mock('axios', () => ({ default: { patch: vi.fn(), put: vi.fn(), get: vi.fn() } }));

const reader: UserInterface = {
  uuid: 'reader',
  name: 'Reader',
  seenCards: [],
  lastSeenVersion: 1,
};

type PatchBody = Pick<UserInterface, 'seenCards' | 'seenComments'> & { lastSeenVersion?: number };

// Behaves like the middleware: merges the sent changes into the stored user.
const applyPatch = (user: UserInterface, body: PatchBody): UserInterface => ({
  ...user,
  seenCards: [...new Set([...user.seenCards, ...(body.seenCards || [])])],
  ...(body.seenComments || user.seenComments
    ? {
        seenComments: [...new Set([...(user.seenComments || []), ...(body.seenComments || [])])],
      }
    : {}),
  lastSeenVersion: Math.max(user.lastSeenVersion, body.lastSeenVersion ?? -1),
});

const useServer = (initial: UserInterface) => {
  const server = { user: initial };
  vi.mocked(axios.patch).mockImplementation(async (_url, body: unknown) => {
    server.user = applyPatch(server.user, body as PatchBody);
    return { data: { user: server.user } };
  });
  return server;
};

beforeEach(() => {
  vi.mocked(axios.patch).mockReset();
  vi.mocked(axios.put).mockReset();
});

describe('saving seen state on the user', () => {
  it('preserves read comments during overlapping comment, seen-card, and version updates', async () => {
    const server = useServer(reader);
    const respond = vi.mocked(axios.patch).getMockImplementation()!;
    let release = () => {};
    const firstRequest = new Promise<void>(resolve => {
      release = resolve;
    });
    vi.mocked(axios.patch).mockImplementationOnce(async (url, body) => {
      await firstRequest;
      return respond(url, body);
    });
    let state: Parameters<typeof reducer>[0] = {
      cards: [],
      mechanics: [],
      tags: [],
      annotationAccessor: {},
      user: [reader],
      currentUser: reader,
    };
    const dispatch = (action: Action) => {
      state = reducer(state, action);
    };

    const first = addSeenComments(dispatch, ['comment-a'], reader);
    const second = addSeenComments(dispatch, ['comment-b'], reader);
    addSeenCard(dispatch, 'card-a', reader);
    addLastSeenVersion(dispatch, 5, reader);
    release();
    await Promise.all([first, second]);

    await vi.waitFor(() =>
      expect(state.currentUser).toEqual({
        ...reader,
        seenComments: ['comment-a', 'comment-b'],
        seenCards: ['card-a'],
        lastSeenVersion: 5,
      }),
    );
    expect(server.user).toEqual(state.currentUser);
  });

  it('keeps comments read elsewhere when a tab with an outdated user saves', async () => {
    const server = useServer(reader);
    const outdatedTabUser = reader;

    await addSeenComments(() => {}, ['read-on-phone'], reader);
    await new Promise(resolve => setTimeout(resolve));
    const actions: Action[] = [];
    addSeenCard(action => actions.push(action), 'new-card', outdatedTabUser);

    await vi.waitFor(() => expect(server.user.seenCards).toEqual(['new-card']));
    expect(server.user.seenComments).toEqual(['read-on-phone']);
    // The outdated tab also catches up, so its own read state stops being stale.
    expect(actions).toContainEqual({
      type: UserActionType.UpdateUser,
      payload: { user: server.user },
    });
    expect(axios.put).not.toHaveBeenCalled();
  });

  it('sends only comment IDs that are not saved yet, without the rest of the user', async () => {
    useServer({ ...reader, seenComments: ['comment-a'] });
    localStorage.setItem('api_key', 'test-access-key');

    await addSeenComments(() => {}, ['comment-a', 'comment-b', 'comment-b'], {
      ...reader,
      seenComments: ['comment-a'],
    });

    expect(axios.patch).toHaveBeenCalledWith('http://localhost:8080/user/reader', {
      seenComments: ['comment-b'],
      accessKey: 'test-access-key',
    });
  });

  it('makes no request when every comment is already saved', async () => {
    useServer(reader);
    await addSeenComments(() => {}, ['comment-a'], { ...reader, seenComments: ['comment-a'] });
    expect(axios.patch).not.toHaveBeenCalled();
  });

  it('keeps earlier successful reads when an intervening save fails', async () => {
    const server = useServer(reader);
    const respond = vi.mocked(axios.patch).getMockImplementation()!;
    let requests = 0;
    vi.mocked(axios.patch).mockImplementation(async (url, body) => {
      if (++requests === 2) throw new Error('Temporary failure');
      return respond(url, body);
    });
    const first = addSeenComments(() => {}, ['comment-a'], reader);
    const failed = addSeenComments(() => {}, ['comment-b'], reader).catch(() => {});
    const last = addSeenComments(() => {}, ['comment-c'], reader);
    await Promise.all([first, failed, last]);
    expect(server.user.seenComments).toEqual(['comment-a', 'comment-c']);
  });

  it('fills in fields missing from a stored user in the saved response', async () => {
    vi.mocked(axios.patch).mockResolvedValue({
      data: { user: { uuid: 'reader', name: 'Reader', seenComments: ['comment-a'] } },
    });
    const actions: Action[] = [];
    await addSeenComments(action => actions.push(action), ['comment-a'], reader);
    expect(actions).toContainEqual({
      type: UserActionType.UpdateUser,
      payload: {
        user: {
          uuid: 'reader',
          name: 'Reader',
          seenComments: ['comment-a'],
          seenCards: [],
          lastSeenVersion: -1,
        },
      },
    });
  });

  it('does not save anything for the placeholder user', async () => {
    useServer(reader);
    await addSeenComments(() => {}, ['comment-a'], UNKNOWN_CREATOR);
    addSeenCard(() => {}, 'card-a', UNKNOWN_CREATOR);
    addLastSeenVersion(() => {}, 5, UNKNOWN_CREATOR);
    await new Promise(resolve => setTimeout(resolve));
    expect(axios.patch).not.toHaveBeenCalled();
  });
});
