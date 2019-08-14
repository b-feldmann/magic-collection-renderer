import axios from 'axios';

import { message } from 'antd';
import { Action, MechanicActionType } from '../cardReducer';

import { getAccessToken } from '../dropboxService';
import MechanicInterface from '../interfaces/MechanicInterface';

const MIDDLEWARE_ENDPOINT = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';

export const getMechanics = (dispatch: (value: Action) => void) => {
  const request = `${MIDDLEWARE_ENDPOINT}/mechanics`;
  axios
    .get(request)
    .then(result => {
      dispatch({
        type: MechanicActionType.GetMechanics,
        payload: { mechanics: result.data.mechanics }
      });
    })
    .catch(error => {
      console.log(error);
    });
};

export const createMechanic = (dispatch: (value: Action) => void) => {
  const request = `${MIDDLEWARE_ENDPOINT}/mechanics`;
  const args = { accessKey: getAccessToken() };

  axios
    .post(request, args)
    .then(result => {
      message.success('Successfully Created Mechanic!');
      return dispatch({
        type: MechanicActionType.CreateMechanic,
        payload: {
          mechanic: result.data.mechanic
        }
      });
    })
    .catch(error => {
      message.error('Failed creating a new mechanic :(');
      console.log(error);
    });
};

export const updateMechanic = (dispatch: (value: Action) => void, updated: MechanicInterface) => {
  const request = `${MIDDLEWARE_ENDPOINT}/mechanic`;
  axios
    .put(request, { mechanic: updated, accessKey: getAccessToken() })
    .then(result => {
      message.success('Successfully Updated Mechanic');
      return dispatch({
        type: MechanicActionType.UpdateMechanic,
        payload: {
          mechanic: result.data.mechanic
        }
      });
    })
    .catch(error => {
      message.error("Could'nt update mechanic");
      console.log(error);
    });
};
