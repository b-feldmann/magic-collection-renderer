import uuidv4 from 'uuid/v4';
import uuidv5 from 'uuid/v5';
import { message } from 'antd';

import { CardAction, CardActionType } from './cardReducer';
import { CardMainType, CardVersion, Creators, RarityType } from './interfaces/enums';

import { getDropboxInstance } from './dropboxService';
import CardInterface from './interfaces/CardInterface';

const createIdentity = (card: CardInterface) => {
  return uuidv5(JSON.stringify(card), card.uuid);
};

const collectionFileName = '/magic-collection-data.json';

const localStorageFile = 'collection-cache';

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
  version: CardVersion.V1
});

export const refreshCollection = (
  dispatch: (value: CardAction) => void,
  cards: CardInterface[]
) => {
  dispatch({
    type: CardActionType.RefreshCollection
  });

  getDropboxInstance()
    .download(collectionFileName)
    .then((fileContent: any) => {
      const { data } = fileContent;

      const uuidToCard: { [key: string]: CardInterface } = {};
      if (cards && cards.length > 0) {
        cards.forEach(card => {
          uuidToCard[card.uuid] = card;
        });
      } else {
        const cache = localStorage.getItem(localStorageFile);
        if (cache) {
          const cachedCards: CardInterface[] = JSON.parse(cache);
          cachedCards.forEach(card => {
            uuidToCard[card.uuid] = card;
          });
        }
      }

      const untouchedCards: CardInterface[] = [];

      Object.keys(data).forEach((uuid: any) => {
        if (uuidToCard[uuid] && createIdentity(uuidToCard[uuid]) === data[uuid]) {
          untouchedCards.push(uuidToCard[uuid]);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          readCard(dispatch, uuid);
        }
      });

      if (untouchedCards) {
        dispatch({
          type: CardActionType.BulkReadCard,
          payload: { cards: untouchedCards }
        });
      }
    });
};

export const createCard = (dispatch: (value: CardAction) => void) => {
  return dispatch({
    type: CardActionType.CreateCard,
    payload: {
      card: EMPTY_CARD()
    }
  });
};

export const readCard = (dispatch: (value: CardAction) => void, uuid: string) => {
  getDropboxInstance()
    .download(`/cards/${uuid}.json`)
    .then((fileContent: any) => {
      const { data } = fileContent;

      const cache = localStorage.getItem(localStorageFile);
      if (cache) {
        const cachedCards: CardInterface[] = JSON.parse(cache);
        localStorage.setItem(localStorageFile, JSON.stringify([...cachedCards, data]));
      } else {
        localStorage.setItem(localStorageFile, JSON.stringify([data]));
      }

      return dispatch({
        type: CardActionType.ReadCard,
        payload: { card: data }
      });
    });
};

const updateCollectionUuids = (updatedCard: CardInterface) => {
  const apiArgs = {
    path: collectionFileName,
    mode: 'overwrite'
  };

  getDropboxInstance()
    .download(collectionFileName)
    .then((fileContent: any) => {
      const { data } = fileContent;

      const identifier = { ...data };
      identifier[updatedCard.uuid] = createIdentity(updatedCard);

      getDropboxInstance()
        .upload(apiArgs, JSON.stringify(identifier))
        .then((result: any) => {
          console.log('Saved uuids');
        })
        .catch((result: any) => {
          console.log('Something went wrong while saving uuids :(');
        });
    });
};

export const updateCard = (
  dispatch: (value: CardAction) => void,
  cards: CardInterface[],
  updated: CardInterface
) => {
  const apiArgs = {
    path: `cards/${updated.uuid}.json`,
    mode: 'overwrite'
  };

  getDropboxInstance()
    .upload(apiArgs, JSON.stringify(updated))
    .then((result: any) => {
      // do whatever you want with the response
      if (result.status === 200) {
        message.success('Saved collection to server :)');
      } else if (result.status === 400) {
        message.error('Status 400');
      } else if (result.status === 500) {
        message.error('Status 500');
      } else {
        message.error(`Unknown Status ${result.status}`);
      }

      return dispatch({
        type: CardActionType.UpdateCard,
        payload: { card: updated }
      });
    })
    .catch((result: any) => {
      message.error('Something went wrong while uploading data :(');
    });

  updateCollectionUuids(updated);

  localStorage.setItem(localStorageFile, JSON.stringify([...cards, updated]));
};

export const deleteCard = (dispatch: (value: CardAction) => void, uuid: string) => {
  getDropboxInstance()
    .download(collectionFileName)
    .then((fileContent: any) => {
      return dispatch({
        type: CardActionType.DeleteCard,
        payload: { uuid }
      });
    });
};
