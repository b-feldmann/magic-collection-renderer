import uuidv4 from 'uuid/v4';
import { message } from 'antd';

import { CardAction, CardActionType } from './cardReducer';
import { CardMainType, CardVersion, Creators, RarityType } from './interfaces/enums';

import { getDropboxInstance } from './dropboxService';
import CardInterface from './interfaces/CardInterface';

const collectionFileName = '/magic-collection-data.json';

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

export const getAllCards = (dispatch: (value: CardAction) => void) => {
  getDropboxInstance()
    .download(collectionFileName)
    .then((fileContent: any) => {
      const { data } = fileContent;

      data.forEach((uuid: string) => readCard(dispatch, uuid));

      // return dispatch({
      //   type: CardActionType.GetAllCards,
      //   payload: { cards: data }
      // });
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
      return dispatch({
        type: CardActionType.ReadCard,
        payload: { card: data }
      });
    });
};

const updateCollectionUuids = (cards: CardInterface[], updatedCard: CardInterface) => {
  const apiArgs = {
    path: collectionFileName,
    mode: 'overwrite'
  };

  getDropboxInstance()
    .download(collectionFileName)
    .then((fileContent: any) => {
      const { data } = fileContent;
      // @ts-ignore
      if (data.find(uuid => uuid === updatedCard.uuid)) return;

      const uuids = [...data, updatedCard.uuid];

      getDropboxInstance()
        .upload(apiArgs, JSON.stringify(uuids))
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

  updateCollectionUuids(cards, updated);
};

export const deleteCard = (dispatch: (value: CardAction) => void, uuid: string) => {
  getDropboxInstance()
    .download(collectionFileName)
    .then((fileContent: any) => {
      const { data } = fileContent;
      return dispatch({
        type: CardActionType.DeleteCard,
        payload: { uuid }
      });
    });
};
