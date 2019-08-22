import axios from 'axios';

import { message } from 'antd';
import { Action, AnnotationActionType } from '../cardReducer';

import { getAccessToken } from '../dropboxService';
import AnnotationInterface from '../interfaces/AnnotationInterface';
import UserInterface from '../interfaces/UserInterface';

const MIDDLEWARE_ENDPOINT =
  process.env.NODE_ENV === 'production' ? '/annotations' : 'http://localhost:3001/annotations';

export const getAnnotations = (dispatch: (value: Action) => void) => {
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
  author: UserInterface,
  cardReference: string
) => {
  const args = { accessKey: getAccessToken(), content, author: author.uuid, cardReference };

  axios
    .post(MIDDLEWARE_ENDPOINT, args)
    .then(result => {
      message.success('Successfully Created Annotation!');
      return dispatch({
        type: AnnotationActionType.CreateAnnotation,
        payload: {
          annotation: result.data.annotation
        }
      });
    })
    .catch(error => {
      message.error('Failed creating a new annotation :(');
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
      message.success('Successfully Updated Annotation');
      return dispatch({
        type: AnnotationActionType.UpdateAnnotation,
        payload: {
          annotation: result.data.annotation
        }
      });
    })
    .catch(error => {
      message.error("Could'nt update annotation");
      console.log(error);
    });
};
