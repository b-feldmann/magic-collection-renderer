import axios from 'axios';

import { Action, AnnotationActionType } from '../reducer';

import { getAccessToken } from '../utils/accessService';
import AnnotationInterface from '../interfaces/AnnotationInterface';
import UserInterface from '../interfaces/UserInterface';
import { staticAntd } from '../utils/staticAntd';

const MIDDLEWARE_ENDPOINT = import.meta.env.PROD
  ? '/annotations'
  : 'http://localhost:8080/annotations';

export const getAnnotations = (dispatch: (value: Action) => void) => {
  const args = { params: { accessKey: getAccessToken() } };
  axios
    .get(MIDDLEWARE_ENDPOINT, args)
    .then(result => {
      dispatch({
        type: AnnotationActionType.GetAnnotations,
        payload: { annotations: result.data.annotations },
      });
    })
    .catch(() => {});
};

export const createAnnotation = (
  dispatch: (value: Action) => void,
  content: string,
  author: UserInterface,
  cardReference: string,
) => {
  const args = { accessKey: getAccessToken(), content, author: author.uuid, cardReference };

  return axios
    .post(MIDDLEWARE_ENDPOINT, args)
    .then(result => {
      if (result.status !== 200 || !result.data?.annotation) {
        staticAntd.message.error('Failed creating a new comment :(');
        return false;
      }
      dispatch({
        type: AnnotationActionType.CreateAnnotation,
        payload: {
          annotation: result.data.annotation,
        },
      });
      return true;
    })
    .catch(_error => {
      staticAntd.message.error('Failed creating a new comment :(');
      return false;
    });
};

export const updateAnnotation = (
  dispatch: (value: Action) => void,
  updated: AnnotationInterface,
) => {
  axios
    .put(MIDDLEWARE_ENDPOINT, { mechanic: updated, accessKey: getAccessToken() })
    .then(result => {
      return dispatch({
        type: AnnotationActionType.UpdateAnnotation,
        payload: {
          annotation: result.data.annotation,
        },
      });
    })
    .catch(_error => {
      staticAntd.message.error("Couldn't update comment");
    });
};
