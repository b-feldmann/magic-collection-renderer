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
 * Decide whether the "Choose Current User" chooser should be visible.
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
  lastSeenVersion: user.lastSeenVersion || -1,
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

// The API replaces the entire user document. Serialize writes per user and
// apply each change to the preceding response rather than a stale UI snapshot.
const pendingUserUpdates = new Map<
  string,
  { latest: UserInterface; request: Promise<UserInterface> }
>();

const queueUserUpdate = (
  dispatch: (value: Action) => void,
  currentUser: UserInterface,
  update: (user: UserInterface) => UserInterface | undefined,
) => {
  const queue = pendingUserUpdates.get(currentUser.uuid) || {
    latest: currentUser,
    request: Promise.resolve(currentUser),
  };
  const base = queue.request.catch(() => queue.latest);
  const request = base.then(async user => {
    const updated = update(user);
    if (!updated) return user;
    const result = await axios.put(MIDDLEWARE_ENDPOINT, {
      user: updated,
      accessKey: getAccessToken(),
    });
    queue.latest = result.data.user;
    dispatch({
      type: UserActionType.UpdateUser,
      payload: { user: result.data.user },
    });
    return result.data.user as UserInterface;
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
  queueUserUpdate(dispatch, currentUser, user => ({ ...user, lastSeenVersion: version })).catch(
    () => {},
  );
};

export const addSeenCard = (
  dispatch: (value: Action) => void,
  cardUuid: string,
  currentUser: UserInterface,
) => {
  queueUserUpdate(dispatch, currentUser, user => {
    if (user.seenCards.includes(cardUuid)) return;
    return { ...user, seenCards: [...user.seenCards, cardUuid] };
  }).catch(() => {});
};

export const addSeenComments = async (
  dispatch: (value: Action) => void,
  commentUuids: string[],
  currentUser: UserInterface,
) => {
  if (currentUser.uuid === UNKNOWN_CREATOR.uuid) return;
  return queueUserUpdate(dispatch, currentUser, user => {
    const seenComments = new Set(user.seenComments || []);
    const previousSize = seenComments.size;
    commentUuids.forEach(uuid => seenComments.add(uuid));
    if (seenComments.size === previousSize) return;
    return { ...user, seenComments: [...seenComments] };
  });
};
