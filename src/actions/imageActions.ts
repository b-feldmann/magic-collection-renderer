import axios from 'axios';

import LogRocket from 'logrocket';
import { Action, CardActionType, ImageActionType } from '../reducer';

import CardInterface from '../interfaces/CardInterface';
import { getAccessToken } from '../utils/accessService';
import { captureError, ActionTag, RequestTag } from './errorLog';
import { staticAntd } from '../utils/staticAntd';

const MIDDLEWARE_ENDPOINT = import.meta.env.PROD ? '/images' : 'http://localhost:8080/images';

export const getImage = (dispatch: (value: Action) => void, card: CardInterface, face: 0 | 1) => {
  LogRocket.log('Try to get image');

  const args = { params: { accessKey: getAccessToken(), cardUuid: card.uuid, face } };
  axios
    .get(MIDDLEWARE_ENDPOINT, args)
    .then((result) => {
      dispatch({
        type: ImageActionType.ReadImage,
        payload: { base64: result.data.base64, face, cardUuid: card.uuid },
      });
    })
    .catch((error) => {
      captureError(error, ActionTag.Image, RequestTag.Get, {});
      staticAntd.message.error("Could'nt load card image.");
    });
};

export const createImage = (
  dispatch: (value: Action) => void,
  base64: string,
  card: CardInterface,
  face: 0 | 1,
) => {
  LogRocket.log('Try to create a image');
  const args = { accessKey: getAccessToken(), base64, cardUuid: card.uuid, face };

  axios
    .post(MIDDLEWARE_ENDPOINT, args)
    .then((result) => {
      staticAntd.message.success('Successfully Created Image!');

      dispatch({
        type: ImageActionType.ReadImage,
        payload: { base64, face, cardUuid: card.uuid },
      });
    })
    .catch((error) => {
      captureError(error, ActionTag.Image, RequestTag.Create, {});
      staticAntd.message.error('Failed creating a new image :(');
    });
};
