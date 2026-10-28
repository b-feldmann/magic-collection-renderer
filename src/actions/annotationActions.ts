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

export const persistAnnotation = async (
  annotation: AnnotationInterface,
): Promise<AnnotationInterface> => {
  const parsed = { ...annotation };
  delete (parsed as Record<string, unknown>)._id;
  delete (parsed as Record<string, unknown>).__v;
  const result = await axios.put(MIDDLEWARE_ENDPOINT, {
    annotation: parsed,
    accessKey: getAccessToken(),
  });
  const saved = result.data?.annotation as AnnotationInterface | undefined;
  if (
    !saved ||
    saved.uuid !== annotation.uuid ||
    saved.cardReference !== annotation.cardReference
  ) {
    throw new Error('Invalid annotation update response');
  }
  const normalized = { ...saved };
  delete (normalized as Record<string, unknown>)._id;
  delete (normalized as Record<string, unknown>).__v;
  return normalized;
};

export const setAnnotationReaction = async (
  dispatch: (value: Action) => void,
  annotationUuid: string,
  userUuid: string,
  emoji: string,
  active: boolean,
): Promise<boolean> => {
  try {
    const result = await axios.put(
      `${MIDDLEWARE_ENDPOINT}/${encodeURIComponent(annotationUuid)}/reactions`,
      { accessKey: getAccessToken(), userUuid, emoji, active },
    );
    const annotation: AnnotationInterface | undefined = result.data?.annotation;
    if (
      result.status !== 200 ||
      !annotation ||
      annotation.uuid !== annotationUuid ||
      typeof annotation.cardReference !== 'string' ||
      typeof annotation.content !== 'string' ||
      typeof annotation.author !== 'string' ||
      typeof annotation.datetime !== 'number' ||
      typeof annotation.edited !== 'boolean' ||
      !Array.isArray(annotation.reactions) ||
      !annotation.reactions.every(
        reaction =>
          typeof reaction?.emoji === 'string' &&
          Array.isArray(reaction.users) &&
          reaction.users.every(user => typeof user === 'string'),
      )
    ) {
      throw new Error('Invalid reaction response');
    }
    dispatch({ type: AnnotationActionType.UpdateAnnotation, payload: { annotation } });
    return true;
  } catch {
    staticAntd.message.error("Couldn't save reaction. Please try again.");
    return false;
  }
};
