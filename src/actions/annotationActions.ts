import axios from 'axios';

import LogRocket from 'logrocket';
import { message } from 'antd';
import { Action, AnnotationActionType } from '../cardReducer';

import { getAccessToken } from '../utils/accessService';
import AnnotationInterface from '../interfaces/AnnotationInterface';
import UserInterface from '../interfaces/UserInterface';
import { captureError, ActionTag, RequestTag } from './errorLog';

const MIDDLEWARE_ENDPOINT =
  process.env.NODE_ENV === 'production' ? '/annotations' : 'http://localhost:3001/annotations';

export const getAnnotations = (dispatch: (value: Action) => void) => {
  LogRocket.log('Try to get all annotations');
  const args = { params: { accessKey: getAccessToken() } };
  axios
    .get(MIDDLEWARE_ENDPOINT, args)
    .then(result => {
      dispatch({
        type: AnnotationActionType.GetAnnotations,
        payload: { annotations: result.data.annotations }
      });
    })
    .catch(error => {
      captureError(error, ActionTag.Annotation, RequestTag.Get, {});
    });
};

export const createAnnotation = (
  dispatch: (value: Action) => void,
  content: string,
  author: UserInterface,
  cardReference: string
) => {
  LogRocket.log('Try to create annotation', content, cardReference, author);
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
      captureError(error, ActionTag.Annotation, RequestTag.Create, {});
      message.error('Failed creating a new annotation :(');
    });
};

export const updateAnnotation = (
  dispatch: (value: Action) => void,
  updated: AnnotationInterface
) => {
  LogRocket.log('Try to update annotation', updated);

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
      captureError(error, ActionTag.Annotation, RequestTag.Update, {});
      message.error("Could'nt update annotation");
    });
};
