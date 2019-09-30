import axios from 'axios';

// @ts-ignore
import jsonpack from 'jsonpack';

import { message } from 'antd';
import LogRocket from 'logrocket';
import { Action, DeckActionType } from '../reducer';
import DeckIdentifierInterface from '../DeckIdentifierInterface';
import DeckInterface from '../DeckInterface';
import SmallCardInterface from '../SmallCardInterface';

const MIDDLEWARE_ENDPOINT =
  process.env.NODE_ENV === 'production' ? '/decks' : 'http://localhost:3001/decks';

export const getDecks = (dispatch: (value: Action) => void, hash: string) => {
  LogRocket.log(`Try to get all decks with hash: ${hash}`);

  const args = { params: { hash } };
  axios
    .get(`${MIDDLEWARE_ENDPOINT}/all`, args)
    .then(result => {
      dispatch({
        type: DeckActionType.GetDecks,
        payload: { decks: result.data.decks }
      });
    })
    .catch(error => {
      message.error("Could'nt load decks.");
    });
};

export const readDeck = (dispatch: (value: Action) => void, uuid: string) => {
  LogRocket.log(`Try to get deck with uuid: ${uuid}`);

  const args = { params: { uuid } };
  axios
    .get(MIDDLEWARE_ENDPOINT, args)
    .then(result => {
      console.log(result.data.deck);
      message.success('Successfully Read Card!');
      if (result.data.deck.cards.length === 0) {
        dispatch({
          type: DeckActionType.ReadDeck,
          payload: { deck: result.data.deck }
        });
        return;
      }

      dispatch({
        type: DeckActionType.ReadDeck,
        payload: { deck: { ...result.data.deck, cards: jsonpack.unpack(result.data.deck.cards) } }
      });
    })
    .catch(error => {
      console.log(error);
      message.error("Could'nt read deck.");
    });
};

export const createDeck = (
  dispatch: (value: Action) => void,
  name: string,
  commander: SmallCardInterface,
  cover: string,
  hash: string
) => {
  LogRocket.log('Try to create a deck', name, hash);
  const args = { name, hash, commander, cover };

  axios
    .post(MIDDLEWARE_ENDPOINT, args)
    .then(result => {
      message.success('Successfully Created Deck!');
      return dispatch({
        type: DeckActionType.CreateDeck,
        payload: {
          deck: result.data.deck
        }
      });
    })
    .catch(error => {
      message.error('Failed creating a new deck :(');
    });
};

export const updateDeck = (dispatch: (value: Action) => void, updated: DeckInterface) => {
  const { name, uuid } = updated;
  LogRocket.log('Try to update a deck', {
    name,
    uuid,
    updated
  });

  axios
    .put(MIDDLEWARE_ENDPOINT, { deck: { ...updated, cards: jsonpack.pack(updated.cards) } })
    .then(result => {
      message.success('Successfully Updated Deck');
      return dispatch({
        type: DeckActionType.UpdateDeck,
        payload: {
          deck: { ...result.data.deck, cards: jsonpack.unpack(result.data.deck.cards) }
        }
      });
    })
    .catch(error => {
      console.log(error);
      message.error("Could'nt update the deck");
    });
};
