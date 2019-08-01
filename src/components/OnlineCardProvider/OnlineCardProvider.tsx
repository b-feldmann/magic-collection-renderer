import React, { useState, useEffect } from 'react';
import { Input, message, Modal } from 'antd';

import dropboxAccess from '../../utils/dropbox-fetch-axios';

import { CardMainType, Creators, RarityType } from '../../interfaces/enums';
import CardInterface from '../../interfaces/CardInterface';
import useLocalStorage from './useLocalStorageHook';
import defaultKeywords from './defaultKeywords';

interface OnlineCardProviderInterface {
  render: (
    cards: CardInterface[],
    saveCard: (card: CardInterface) => void,
    addCard: () => void,
    keywords: string[]
  ) => JSX.Element;
}

interface CollectionInterface {
  [key: string]: CardInterface;
}

const collectionFileName = '/magic-collection-data.json';

const OnlineCardProvider: React.FC<OnlineCardProviderInterface> = ({
  render
}: OnlineCardProviderInterface) => {
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const [cards, setCards] = useState<CollectionInterface>({});
  const [keywords, setKeywords] = useState<string[]>(defaultKeywords);
  const [showApiModal, setShowApiModal] = useState(false);
  const [tmpApiKey, setTmpApiKey] = useState<string>('');
  const [apiKey, setApiKey] = useLocalStorage('api_key');

  dropboxAccess.setToken(apiKey.toString());

  const clean = (cardsToClean: CollectionInterface): CollectionInterface => {
    Object.values(cardsToClean).forEach((card: CardInterface) => {
      delete card.rowNumber;
      if (typeof card.front.cardText === 'string') {
        // @ts-ignore
        card.front.cardText = card.front.cardText.split('|');
      }
      if (card.back && typeof card.back.cardText === 'string') {
        // @ts-ignore
        card.back.cardText = card.back.cardText.split('|');
      }
    });
    return cardsToClean;
  };

  const initCollection = () => {
    dropboxAccess.download(collectionFileName).then((fileContent: any) => {
      const { data } = fileContent;
      setCards(clean(data));
    });
  };

  const saveCardToDropBox = (newCard: CardInterface) => {
    const apiArgs = {
      path: collectionFileName,
      mode: 'overwrite'
    };

    dropboxAccess.download(collectionFileName).then((fileContent: any) => {
      const collection: CollectionInterface = fileContent.data;
      collection[newCard.cardID] = newCard;
      setCards(clean(collection));

      dropboxAccess
        .upload(apiArgs, JSON.stringify(collection))
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
        })
        .catch((result: any) => {
          message.error('Something went wrong while uploading data :(');
        });
    });
  };

  const saveCard = (obj: CardInterface) => {
    const newCards: CollectionInterface = { ...cards };
    newCards[obj.cardID] = obj;

    setCards(newCards);
    saveCardToDropBox(obj);
  };

  const ID = (): string => {
    const generateId = (): string =>
      `_${Math.random()
        .toString(36)
        .substr(2, 15)}`;
    let id = '';
    let unique = true;

    const checkId = (c: CardInterface): boolean => {
      if (c.cardID !== id) return true;
      unique = false;
      return false;
    };

    do {
      id = generateId();
      Object.values(cards).every(checkId);
    } while (!unique);

    return id;
  };

  const addNewCard = () => {
    const card: CardInterface = {
      name: '',
      rarity: RarityType.Common,
      cardID: ID(),
      manaCost: '',
      creator: Creators.UNKNOWN,
      front: {
        name: '',
        cardText: [],
        cardMainType: CardMainType.Creature
      }
    };

    saveCard(card);
  };

  useEffect(() => {
    if (apiKey.length > 0) {
      initCollection();
    }
  }, []);

  useEffect(() => {
    if (apiKey.length === 0) {
      setShowApiModal(true);
    } else {
      initCollection();
    }
  }, [apiKey]);

  useEffect(() => {
    if (!dataLoaded && Object.values(cards).length > 0) {
      setDataLoaded(true);
    }
  }, [Object.values(cards).length]);

  return (
    <div>
      <Modal
        title="Enter API key"
        visible={showApiModal}
        onOk={() => {
          // @ts-ignore
          setApiKey(tmpApiKey);
          setShowApiModal(false);
        }}
      >
        <h4>Key:</h4>
        <Input onChange={e => setTmpApiKey(e.target.value)} value={tmpApiKey} />
      </Modal>
      {dataLoaded ? (
        <div>{render(Object.values(cards), saveCard, addNewCard, keywords)}</div>
      ) : (
        <div>Loading Cards...</div>
      )}
    </div>
  );
};

export default OnlineCardProvider;
