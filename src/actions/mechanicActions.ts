import axios from 'axios';

import { message } from 'antd';
import { Action, MechanicActionType } from '../cardReducer';

import { getAccessToken } from '../utils/accessService';
import MechanicInterface from '../interfaces/MechanicInterface';
import { captureError, captureRequest, ActionTag, RequestTag } from './errorLog';

const MIDDLEWARE_ENDPOINT = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';

export const getMechanics = (dispatch: (value: Action) => void) => {
  captureRequest('Try to get all mechanics', ActionTag.Mechanic, RequestTag.Get, {});

  const request = `${MIDDLEWARE_ENDPOINT}/mechanics`;
  const args = { params: { accessKey: getAccessToken() } };
  axios
    .get(request, args)
    .then(result => {
      dispatch({
        type: MechanicActionType.GetMechanics,
        payload: { mechanics: result.data.mechanics }
      });
    })
    .catch(error => {
      captureError(error, ActionTag.Mechanic, RequestTag.Get, {});
      console.log(error);
    });
};

export const createMechanic = (dispatch: (value: Action) => void) => {
  captureRequest('Try to create mechanic', ActionTag.Mechanic, RequestTag.Create, {});

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
      captureError(error, ActionTag.Mechanic, RequestTag.Create, {});
      console.log(error);
    });
};

export const updateMechanic = (dispatch: (value: Action) => void, updated: MechanicInterface) => {
  captureRequest('Try to update mechanic', ActionTag.Mechanic, RequestTag.Update, { ...updated });

  const request = `${MIDDLEWARE_ENDPOINT}/mechanics`;
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
      captureError(error, ActionTag.Mechanic, RequestTag.Update, {});
      message.error("Could'nt update mechanic");
      console.log(error);
    });
};
