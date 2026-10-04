import axios from 'axios';

import LogRocket from 'logrocket';
import { Action, MechanicActionType } from '../reducer';

import { getAccessToken } from '../utils/accessService';
import MechanicInterface from '../interfaces/MechanicInterface';
import { captureError, ActionTag, RequestTag } from './errorLog';
import { staticAntd } from '../utils/staticAntd';

const MIDDLEWARE_ENDPOINT = import.meta.env.PROD ? '' : 'http://localhost:8080';

export const getMechanics = (dispatch: (value: Action) => void) => {
  LogRocket.log('Try to get all mechanics');

  const request = `${MIDDLEWARE_ENDPOINT}/mechanics`;
  const args = { params: { accessKey: getAccessToken() } };
  axios
    .get(request, args)
    .then((result) => {
      dispatch({
        type: MechanicActionType.GetMechanics,
        payload: { mechanics: result.data.mechanics },
      });
    })
    .catch((error) => {
      captureError(error, ActionTag.Mechanic, RequestTag.Get, {});
    });
};

export const createMechanic = (dispatch: (value: Action) => void) => {
  LogRocket.log('Try to create mechanic');

  const request = `${MIDDLEWARE_ENDPOINT}/mechanics`;
  const args = { accessKey: getAccessToken() };

  axios
    .post(request, args)
    .then((result) => {
      return dispatch({
        type: MechanicActionType.CreateMechanic,
        payload: {
          mechanic: result.data.mechanic,
        },
      });
    })
    .catch((error) => {
      staticAntd.message.error('Failed creating a new mechanic :(');
      captureError(error, ActionTag.Mechanic, RequestTag.Create, {});
    });
};

export const updateMechanic = (dispatch: (value: Action) => void, updated: MechanicInterface) => {
  LogRocket.log('Try to update mechanic', updated);

  const request = `${MIDDLEWARE_ENDPOINT}/mechanics`;
  const parsed = { ...updated };
  // `_id`/`__v` are Mongo-internal fields that ride along on mechanics held in
  // memory from the server (notably freshly POST-created ones). Sending them
  // back in the PUT makes MongoDB's replaceOne reject the update ("immutable
  // field '_id' was found to have been altered"), which is why updating a
  // mechanic right after creating it fails. The app keys mechanics by `uuid`,
  // so drop them.
  delete (parsed as Record<string, unknown>)._id;
  delete (parsed as Record<string, unknown>).__v;
  axios
    .put(request, { mechanic: parsed, accessKey: getAccessToken() })
    .then((result) => {
      return dispatch({
        type: MechanicActionType.UpdateMechanic,
        payload: {
          mechanic: result.data.mechanic,
        },
      });
    })
    .catch((error) => {
      captureError(error, ActionTag.Mechanic, RequestTag.Update, {});
      staticAntd.message.error("Could'nt update mechanic");
    });
};
