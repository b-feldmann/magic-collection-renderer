import axios from 'axios';

import { Action, ImageActionType, ImagePayload } from '../reducer';

import CardInterface from '../interfaces/CardInterface';
import { getAccessToken } from '../utils/accessService';
import { getCoverFileName } from '../utils/cover';
import { staticAntd } from '../utils/staticAntd';

const MIDDLEWARE_ENDPOINT = import.meta.env.PROD ? '/images' : 'http://localhost:8080/images';

const getCoverForFace = (card: CardInterface, face: 0 | 1): string | undefined =>
  face === 1 && card.back ? card.back.cover : card.front.cover;

// Every store update re-sorts the collection and re-renders its consumers, so
// images arriving close together (a screen full of cells) share one update.
const IMAGE_BATCH_WINDOW_MS = 50;
const loadedImages = new WeakMap<(value: Action) => void, ImagePayload[]>();

const queueLoadedImage = (dispatch: (value: Action) => void, image: ImagePayload) => {
  const queued = loadedImages.get(dispatch);
  if (queued) {
    queued.push(image);
    return;
  }

  const images = [image];
  loadedImages.set(dispatch, images);
  setTimeout(() => {
    loadedImages.delete(dispatch);
    dispatch({ type: ImageActionType.ReadImages, payload: { images } });
  }, IMAGE_BATCH_WINDOW_MS);
};

export const getImage = (dispatch: (value: Action) => void, card: CardInterface, face: 0 | 1) => {
  const args = { params: { accessKey: getAccessToken(), cardUuid: card.uuid, face } };
  axios
    .get(MIDDLEWARE_ENDPOINT, args)
    .then(result => {
      if (!result.data?.base64) return;

      // The file name persisted on the card's cover (`loading:<name>`) is
      // re-attached so the editor keeps showing it after a reload.
      queueLoadedImage(dispatch, {
        base64: result.data.base64,
        name: getCoverFileName(getCoverForFace(card, face)),
        face,
        cardUuid: card.uuid,
      });
    })
    .catch(_error => {
      staticAntd.message.error("Couldn't load the card image.");
    });
};

export const createImage = (
  dispatch: (value: Action) => void,
  base64: string,
  name: string,
  card: CardInterface,
  face: 0 | 1,
) => {
  const args = { accessKey: getAccessToken(), base64, cardUuid: card.uuid, face };

  return axios
    .post(MIDDLEWARE_ENDPOINT, args)
    .then(() => {
      dispatch({
        type: ImageActionType.ReadImage,
        payload: { base64, name, face, cardUuid: card.uuid },
      });
    })
    .catch(error => {
      staticAntd.message.error("Couldn't create the image. Please try again.");
      throw error;
    });
};
