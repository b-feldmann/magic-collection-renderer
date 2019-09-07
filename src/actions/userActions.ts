import axios from 'axios';

import LogRocket from 'logrocket';
import { Action, UserActionType } from '../reducer';
import UserInterface from '../interfaces/UserInterface';
import { captureError, ActionTag, RequestTag } from './errorLog';
import { getAccessToken } from '../utils/accessService';

const MIDDLEWARE_ENDPOINT =
  process.env.NODE_ENV === 'production' ? '/user' : 'http://localhost:3001/user';

export const setCurrentUser = (dispatch: (value: Action) => void, user: UserInterface) => {
  LogRocket.identify(user.uuid, {
    name: user.name
  });
  LogRocket.log(`Set current user to ${user.name}`, user);

  dispatch({
    type: UserActionType.SetCurrentUser,
    payload: { user }
  });
};

const fixUser = (user: UserInterface) => ({
  ...user,
  seenCards: user.seenCards || [],
  lastSeenVersion: user.lastSeenVersion || -1
});

export const getUser = (dispatch: (value: Action) => void) => {
  const args = { params: { accessKey: getAccessToken() } };
  LogRocket.log('Try to get all user');
  axios
    .get(MIDDLEWARE_ENDPOINT, args)
    .then(result => {
      dispatch({
        type: UserActionType.GetUser,
        payload: { user: result.data.user.map((user: UserInterface) => fixUser(user)) }
      });
    })
    .catch(error => {
      captureError(error, ActionTag.User, RequestTag.Get, {});
    });
};

export const addLastSeenVersion = (
  dispatch: (value: Action) => void,
  version: number,
  currentUser: UserInterface
) => {
  const updated = { ...currentUser, lastSeenVersion: version };
  LogRocket.log('Try to update user', updated);
  axios
    .put(MIDDLEWARE_ENDPOINT, { user: updated, accessKey: getAccessToken() })
    .then(result => {
      dispatch({
        type: UserActionType.UpdateUser,
        payload: { user: result.data.user }
      });
    })
    .catch(error => {
      captureError(error, ActionTag.User, RequestTag.Get, {});
    });
};

export const addSeenCard = (
  dispatch: (value: Action) => void,
  cardUuid: string,
  currentUser: UserInterface
) => {
  if (currentUser.seenCards.some(uuid => uuid === cardUuid)) return;

  const updated = { ...currentUser, seenCards: [...currentUser.seenCards, cardUuid] };
  LogRocket.log('Try to update user', updated);
  axios
    .put(MIDDLEWARE_ENDPOINT, { user: updated, accessKey: getAccessToken() })
    .then(result => {
      dispatch({
        type: UserActionType.UpdateUser,
        payload: { user: result.data.user }
      });
    })
    .catch(error => {
      captureError(error, ActionTag.User, RequestTag.Get, {});
    });
};
