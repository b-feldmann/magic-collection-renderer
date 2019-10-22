import uuidv4 from 'uuid/v4';
import axios from 'axios';

import { message } from 'antd';
import moment from 'moment';
import LogRocket from 'logrocket';
import { Action, CardActionType } from '../reducer';
import { CardMainType, CardState, RarityType } from '../interfaces/enums';

import CardInterface from '../interfaces/CardInterface';
import { getAccessToken, deleteAccessToken } from '../utils/accessService';
import { UNKNOWN_CREATOR } from '../utils/constants';
import UserInterface from '../interfaces/UserInterface';
import { captureError, ActionTag, RequestTag } from './errorLog';
import { createImage, getImage } from './imageActions';

const MIDDLEWARE_ENDPOINT = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';

export const EMPTY_CARD = (): CardInterface => ({
  name: '',
  uuid: uuidv4(),
  front: {
    name: '',
    cardMainType: CardMainType.Creature,
    cardText: []
  },
  manaCost: '',
  rarity: RarityType.Common,
  creator: UNKNOWN_CREATOR,
  meta: {
    comment: '',
    likes: [],
    dislikes: [],
    lastUpdated: moment().valueOf(),
    createdAt: moment().valueOf(),
    state: CardState.Draft
  }
});

export const refreshCollection = (dispatch: (value: Action) => void) => {
  LogRocket.log('Try to get all cards');
  dispatch({
    type: CardActionType.RefreshCollection
  });

  const request = `${MIDDLEWARE_ENDPOINT}/cards`;
  const args = { params: { accessKey: getAccessToken() } };
  axios
    .get(request, args)
    .then(result => {
      // result.data.cards.forEach((card: CardInterface) => {
      //   if (!card.createdAt) {
      //     card.createdAt = moment().valueOf();
      //     updateCard(dispatch, card);
      //   }
      // });

      dispatch({
        type: CardActionType.BulkReadCard,
        payload: { cards: result.data.cards }
      });
    })
    .catch(error => {
      if (error.response) {
        const { response } = error;
        if (response.status && response.status === 401) {
          deleteAccessToken();
          LogRocket.error('Wrong access token! You are not authorized to use this service :(');
          message.error('Wrong access token! You are not authorized to use this service :(', 3);
          return;
        }
      }

      captureError(error, ActionTag.Card, RequestTag.Get, {});
      message.error("Could'nt load collection. Maybe you access token is wrong.");
    });
};

export const createCard = (dispatch: (value: Action) => void, creator: UserInterface) => {
  LogRocket.log('Try to create a card', creator);
  const request = `${MIDDLEWARE_ENDPOINT}/cards`;
  const args = { accessKey: getAccessToken(), creator };

  axios
    .post(request, args)
    .then(result => {
      message.success('Successfully Created Card!');
      return dispatch({
        type: CardActionType.CreateCard,
        payload: {
          card: result.data.card
        }
      });
    })
    .catch(error => {
      captureError(error, ActionTag.Card, RequestTag.Create, {});
      message.error('Failed creating a new card :(');
    });
};

export const updateCard = (dispatch: (value: Action) => void, updated: CardInterface) => {
  const { name, uuid } = updated;
  LogRocket.log('Try to update a card', {
    name,
    uuid,
    updated
  });
  const request = `${MIDDLEWARE_ENDPOINT}/cards`;
  const parsed = { ...updated };
  if (updated.front.cover && updated.front.cover.startsWith('base64:')) {
    createImage(dispatch, updated.front.cover.substring(7), updated, 0);
    parsed.front.cover = 'loading';
  }
  if (
    updated.back &&
    parsed.back &&
    updated.back.cover &&
    updated.back.cover.startsWith('base64:')
  ) {
    createImage(dispatch, updated.back.cover.substring(7), updated, 1);
    parsed.back.cover = 'loading';
  }

  axios
    .put(request, { card: parsed, accessKey: getAccessToken() })
    .then(result => {
      message.success('Successfully Updated Card');
      if (
        result.data.card.front.cover &&
        (result.data.card.front.cover === 'loading' ||
          result.data.card.front.cover.startsWith('base64:'))
      ) {
        getImage(dispatch, result.data.card, 0);
      }
      if (result.data.card.back) {
        if (
          result.data.card.back.cover &&
          (result.data.card.back.cover === 'loading' ||
            result.data.card.back.cover.startsWith('base64:'))
        ) {
          getImage(dispatch, result.data.card, 1);
        }
      }
      return dispatch({
        type: CardActionType.UpdateCard,
        payload: {
          card: result.data.card
        }
      });
    })
    .catch(error => {
      captureError(error, ActionTag.Card, RequestTag.Update, {});
      message.error("Could'nt update the card");
    });
};
