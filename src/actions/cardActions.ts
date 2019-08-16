import uuidv4 from 'uuid/v4';
import axios from 'axios';

import { message } from 'antd';
import moment from 'moment';
import { Action, CardActionType } from '../cardReducer';
import { CardMainType, CardVersion, Creators, RarityType } from '../interfaces/enums';

import CardInterface from '../interfaces/CardInterface';
import { getAccessToken } from '../dropboxService';

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
  creator: Creators.UNKNOWN,
  version: CardVersion.V1,
  lastUpdated: moment().valueOf(),
  createdAt: moment().valueOf()
});

export const refreshCollection = (dispatch: (value: Action) => void) => {
  dispatch({
    type: CardActionType.RefreshCollection
  });

  const request = `${MIDDLEWARE_ENDPOINT}/cards`;
  axios
    .get(request)
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
      console.log(error);
    });
};

export const createCard = (dispatch: (value: Action) => void, card?: CardInterface) => {
  const request = `${MIDDLEWARE_ENDPOINT}/cards`;
  const args = card ? { card, accessKey: getAccessToken() } : { accessKey: getAccessToken() };

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
      message.error('Failed creating a new card :(');
      console.log(error);
    });
};

export const updateCard = (dispatch: (value: Action) => void, updated: CardInterface) => {
  const request = `${MIDDLEWARE_ENDPOINT}/cards`;
  axios
    .put(request, { card: updated, accessKey: getAccessToken() })
    .then(result => {
      message.success('Successfully Updated Card');
      return dispatch({
        type: CardActionType.UpdateCard,
        payload: {
          card: result.data.card
        }
      });
    })
    .catch(error => {
      message.error("Could'nt update the card");
      console.log(error);
    });
};
