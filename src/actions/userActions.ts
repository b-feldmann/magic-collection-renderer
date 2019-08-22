import axios from 'axios';

import { Action, UserActionType } from '../cardReducer';
import UserInterface from '../interfaces/UserInterface';

const MIDDLEWARE_ENDPOINT = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';

export const setCurrentUser = (dispatch: (value: Action) => void, user: UserInterface) => {
  dispatch({
    type: UserActionType.SetCurrentUser,
    payload: { user }
  });
};

export const getUser = (dispatch: (value: Action) => void) => {
  const request = `${MIDDLEWARE_ENDPOINT}/user`;
  axios
    .get(request)
    .then(result => {
      dispatch({
        type: UserActionType.GetUser,
        payload: { user: result.data.user }
      });
    })
    .catch(error => {
      console.log(error);
    });
};
