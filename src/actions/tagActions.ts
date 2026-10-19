import axios from 'axios';

import { Action, TagActionType } from '../reducer';
import { getAccessToken } from '../utils/accessService';

const MIDDLEWARE_ENDPOINT = import.meta.env.PROD ? '' : 'http://localhost:8080';

export const getTags = (dispatch: (value: Action) => void) => {
  axios
    .get(`${MIDDLEWARE_ENDPOINT}/tags`, { params: { accessKey: getAccessToken() } })
    .then(result => {
      dispatch({ type: TagActionType.GetTags, payload: { tags: result.data.tags } });
    })
    .catch(() => {});
};

export const createTag = (dispatch: (value: Action) => void, tag: string) => {
  const name = tag.trim();
  if (!name) return;

  axios
    .post(`${MIDDLEWARE_ENDPOINT}/tags`, { tag: name, accessKey: getAccessToken() })
    .then(() => {
      dispatch({ type: TagActionType.CreateTag, payload: { tag: name } });
    })
    .catch(() => {});
};
