import axios from 'axios';

import LogRocket from 'logrocket';
import { Action, UserActionType } from '../cardReducer';
import UserInterface from '../interfaces/UserInterface';
import { captureError, ActionTag, RequestTag } from './errorLog';
import { getAccessToken } from '../utils/accessService';

const MIDDLEWARE_ENDPOINT = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';

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

export const getUser = (dispatch: (value: Action) => void) => {
  const request = `${MIDDLEWARE_ENDPOINT}/user`;
  const args = { params: { accessKey: getAccessToken() } };
  LogRocket.log('Try to get all user');
  axios
    .get(request, args)
    .then(result => {
      dispatch({
        type: UserActionType.GetUser,
        payload: { user: result.data.user }
      });
    })
    .catch(error => {
      captureError(error, ActionTag.User, RequestTag.Get, {});
    });
};
