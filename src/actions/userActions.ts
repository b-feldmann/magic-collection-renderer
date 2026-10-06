import axios from 'axios';

import LogRocket from 'logrocket';
import { Action, UserActionType } from '../reducer';
import UserInterface from '../interfaces/UserInterface';
import { captureError, ActionTag, RequestTag } from './errorLog';
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

  LogRocket.identify(user.uuid, {
    name: user.name,
  });
  LogRocket.log(`Set current user to ${user.name}`, user);

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
  LogRocket.log('Try to get all user');
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
    .catch(error => {
      captureError(error, ActionTag.User, RequestTag.Get, {});
    });
};

export const addLastSeenVersion = (
  dispatch: (value: Action) => void,
  version: number,
  currentUser: UserInterface,
) => {
  const updated = { ...currentUser, lastSeenVersion: version };
  LogRocket.log('Try to update user', updated);
  axios
    .put(MIDDLEWARE_ENDPOINT, { user: updated, accessKey: getAccessToken() })
    .then(result => {
      dispatch({
        type: UserActionType.UpdateUser,
        payload: { user: result.data.user },
      });
    })
    .catch(error => {
      captureError(error, ActionTag.User, RequestTag.Get, {});
    });
};

export const addSeenCard = (
  dispatch: (value: Action) => void,
  cardUuid: string,
  currentUser: UserInterface,
) => {
  if (currentUser.seenCards.some(uuid => uuid === cardUuid)) return;

  const updated = { ...currentUser, seenCards: [...currentUser.seenCards, cardUuid] };
  LogRocket.log('Try to update user', updated);
  axios
    .put(MIDDLEWARE_ENDPOINT, { user: updated, accessKey: getAccessToken() })
    .then(result => {
      dispatch({
        type: UserActionType.UpdateUser,
        payload: { user: result.data.user },
      });
    })
    .catch(error => {
      captureError(error, ActionTag.User, RequestTag.Get, {});
    });
};
