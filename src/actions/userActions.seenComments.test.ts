import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { addLastSeenVersion, addSeenCard, addSeenComments } from './userActions';
import reducer, { Action, UserActionType } from '../reducer';
import UserInterface from '../interfaces/UserInterface';

vi.mock('axios', () => ({ default: { put: vi.fn(), get: vi.fn() } }));

const reader: UserInterface = {
  uuid: 'reader',
  name: 'Reader',
  seenCards: [],
  lastSeenVersion: 0,
};

beforeEach(() => {
  vi.mocked(axios.put).mockReset();
});

describe('saving seen comments on the user', () => {
  it('preserves read comments during overlapping comment, seen-card, and version updates', async () => {
    let release = () => {};
    const firstRequest = new Promise<void>(resolve => {
      release = resolve;
    });
    let requests = 0;
    vi.mocked(axios.put).mockImplementation(async (_url, body: unknown) => {
      if (requests++ === 0) await firstRequest;
      return { data: { user: (body as { user: UserInterface }).user } };
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
  });

  it('does not duplicate saved comment IDs', async () => {
    vi.mocked(axios.put).mockImplementation(async (_url, body: unknown) => ({
      data: { user: (body as { user: UserInterface }).user },
    }));
    const actions: Action[] = [];
    await addSeenComments(action => actions.push(action), ['comment-a', 'comment-b', 'comment-b'], {
      ...reader,
      seenComments: ['comment-a'],
    });
    expect(actions).toContainEqual({
      type: UserActionType.UpdateUser,
      payload: {
        user: {
          ...reader,
          seenComments: ['comment-a', 'comment-b'],
        },
      },
    });
  });

  it('keeps earlier successful reads when an intervening save fails', async () => {
    let requests = 0;
    let saved = reader;
    vi.mocked(axios.put).mockImplementation(async (_url, body: unknown) => {
      if (++requests === 2) throw new Error('Temporary failure');
      saved = (body as { user: UserInterface }).user;
      return { data: { user: saved } };
    });
    const first = addSeenComments(() => {}, ['comment-a'], reader);
    const failed = addSeenComments(() => {}, ['comment-b'], reader).catch(() => {});
    const last = addSeenComments(() => {}, ['comment-c'], reader);
    await Promise.all([first, failed, last]);
    expect(saved.seenComments).toEqual(['comment-a', 'comment-c']);
  });
});
