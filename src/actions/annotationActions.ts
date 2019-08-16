import axios from 'axios';

import { message } from 'antd';
import { Action, AnnotationActionType } from '../cardReducer';

import { getAccessToken } from '../dropboxService';
import { Creators } from '../interfaces/enums';
import AnnotationInterface from '../interfaces/AnnotationInterface';

const MIDDLEWARE_ENDPOINT =
  process.env.NODE_ENV === 'production' ? '/annotations' : 'http://localhost:3001/annotations';

export const getAnnotatopns = (dispatch: (value: Action) => void) => {
  axios
    .get(MIDDLEWARE_ENDPOINT)
    .then(result => {
      dispatch({
        type: AnnotationActionType.GetAnnotations,
        payload: { annotations: result.data.annotations }
      });
    })
    .catch(error => {
      console.log(error);
    });
};

export const createAnnotation = (
  dispatch: (value: Action) => void,
  content: string,
  author: Creators,
  cardReference: string
) => {
  const args = { accessKey: getAccessToken(), content, author, cardReference };

  axios
    .post(MIDDLEWARE_ENDPOINT, args)
    .then(result => {
      message.success('Successfully Created Mechanic!');
      return dispatch({
        type: AnnotationActionType.CreateAnnotation,
        payload: {
          annotation: result.data.annotation
        }
      });
    })
    .catch(error => {
      message.error('Failed creating a new mechanic :(');
      console.log(error);
    });
};

export const updateAnnotation = (
  dispatch: (value: Action) => void,
  updated: AnnotationInterface
) => {
  axios
    .put(MIDDLEWARE_ENDPOINT, { mechanic: updated, accessKey: getAccessToken() })
    .then(result => {
      message.success('Successfully Updated Mechanic');
      return dispatch({
        type: AnnotationActionType.UpdateAnnotation,
        payload: {
          annotation: result.data.annotation
        }
      });
    })
    .catch(error => {
      message.error("Could'nt update mechanic");
      console.log(error);
    });
};
