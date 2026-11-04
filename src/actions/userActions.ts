import axios from 'axios';

import { Action, UserActionType } from '../reducer';
import UserInterface from '../interfaces/UserInterface';
import { getAccessToken } from '../utils/accessService';
import { UNKNOWN_CREATOR } from '../utils/constants';

const MIDDLEWARE_ENDPOINT = import.meta.env.PROD ? '/user' : 'http://localhost:8080/user';

const CURRENT_USER_STORAGE_KEY = 'mtg-funset:currentUser';

/** Whether a current user was persisted in a previous session. */
export const hasStoredUser = (): boolean => localStorage.getItem(CURRENT_USER_STORAGE_KEY) !== null;

/**
 * Decide whether the "Choose current user" chooser should be visible.
 *
 * On reload `currentUser` starts as `UNKNOWN_CREATOR` and the persisted user is
 * only restored after the async `/user` fetch resolves. Showing the chooser in
 * that window causes a brief flash even though a user is already stored, so we
 * keep it hidden until the user list has loaded (`users.length > 0`) when a user
 * was stored on mount.
 */
export const shouldShowUserSelect = (
  currentUser: UserInterface,
  users: UserInterface[],
  hadStoredUserOnMount: boolean,
): boolean => {
  if (currentUser.uuid !== UNKNOWN_CREATOR.uuid) return false;
  if (users.length === 0 && hadStoredUserOnMount) return false;
  return true;
};

export const setCurrentUser = (dispatch: (value: Action) => void, user: UserInterface) => {
  if (user.uuid === UNKNOWN_CREATOR.uuid) {
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  } else {
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, user.uuid);
  }

  dispatch({
    type: UserActionType.SetCurrentUser,
    payload: { user },
  });
};

const fixUser = (user: UserInterface) => ({
  ...user,
  seenCards: user.seenCards || [],
  lastSeenVersion: user.lastSeenVersion ?? -1,
});

export const getUser = (dispatch: (value: Action) => void) => {
  const args = { params: { accessKey: getAccessToken() } };
  axios
    .get(MIDDLEWARE_ENDPOINT, args)
    .then(result => {
      const users = result.data.user.map((user: UserInterface) => fixUser(user));
      dispatch({
        type: UserActionType.GetUser,
        payload: { user: users },
      });

      const storedUuid = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
      if (!storedUuid) return;

      const storedUser = users.find((user: UserInterface) => user.uuid === storedUuid);
      if (storedUser) {
        setCurrentUser(dispatch, storedUser);
      } else {
        localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
      }
    })
    .catch(() => {});
};

type UserChanges = Partial<Pick<UserInterface, 'seenCards' | 'seenComments' | 'lastSeenVersion'>>;

// The API applies only the sent changes, so another tab or device can't lose its
// reads to this client's outdated copy. Writes are serialized per user so that the
// newest server response is the one that ends up in the store.
const pendingUserUpdates = new Map<
  string,
  { latest: UserInterface; request: Promise<UserInterface> }
>();

const queueUserUpdate = async (
  dispatch: (value: Action) => void,
  currentUser: UserInterface,
  getChanges: (user: UserInterface) => UserChanges | undefined,
) => {
  if (currentUser.uuid === UNKNOWN_CREATOR.uuid) return undefined;
  const queue = pendingUserUpdates.get(currentUser.uuid) || {
    latest: currentUser,
    request: Promise.resolve(currentUser),
  };
  const base = queue.request.catch(() => queue.latest);
  const request = base.then(async user => {
    const changes = getChanges(user);
    if (!changes) return user;
    const result = await axios.patch(
      `${MIDDLEWARE_ENDPOINT}/${encodeURIComponent(currentUser.uuid)}`,
      { ...changes, accessKey: getAccessToken() },
    );
    const updated = fixUser(result.data.user);
    queue.latest = updated;
    dispatch({
      type: UserActionType.UpdateUser,
      payload: { user: updated },
    });
    return updated;
  });
  queue.request = request;
  pendingUserUpdates.set(currentUser.uuid, queue);
  return request.finally(() => {
    if (queue.request === request) {
      pendingUserUpdates.delete(currentUser.uuid);
    }
  });
};

export const addLastSeenVersion = (
  dispatch: (value: Action) => void,
  version: number,
  currentUser: UserInterface,
) => {
  queueUserUpdate(dispatch, currentUser, () => ({ lastSeenVersion: version })).catch(() => {});
};

export const addSeenCard = (
  dispatch: (value: Action) => void,
  cardUuid: string,
  currentUser: UserInterface,
) => {
  queueUserUpdate(dispatch, currentUser, user => {
    if (user.seenCards.includes(cardUuid)) return undefined;
    return { seenCards: [cardUuid] };
  }).catch(() => {});
};

export const addSeenComments = async (
  dispatch: (value: Action) => void,
  commentUuids: string[],
  currentUser: UserInterface,
) => {
  return queueUserUpdate(dispatch, currentUser, user => {
    const seen = new Set(user.seenComments || []);
    const seenComments = [...new Set(commentUuids)].filter(uuid => !seen.has(uuid));
    return seenComments.length ? { seenComments } : undefined;
  });
};
