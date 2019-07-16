import React, { useState, useEffect } from 'react';
import { Input, message, Modal } from 'antd';

// @ts-ignore
import dropboxAccess from 'dropbox-fetch';

import { CardMainType, RarityType } from '../../interfaces/enums';
import CardInterface from '../../interfaces/CardInterface';
import useLocalStorage from './useLocalStorageHook';

interface OnlineCardProviderInterface {
  render: (
    cards: CardInterface[],
    saveCard: (card: CardInterface) => void,
    addCard: () => void
  ) => JSX.Element;
}

const collectionFileName = '/magic-collection-data.json';

const OnlineCardProvider: React.FC<OnlineCardProviderInterface> = ({
  render
}: OnlineCardProviderInterface) => {
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const [cards, setCards] = useState<CardInterface[]>([]);
  const [showApiModal, setShowApiModal] = useState(false);
  const [tmpApiKey, setTmpApiKey] = useState<string>('');
  const [apiKey, setApiKey] = useLocalStorage('api_key');

  dropboxAccess.setToken(apiKey);

  const initCollection = () => {
    dropboxAccess
      .download(collectionFileName)
      .then((result: any) => {
        return result.text();
      })
      .then((fileContent: any) => {
        const data = JSON.parse(fileContent);
        const newCards: CardInterface[] = [];
        data.forEach((card: CardInterface) => {
          newCards[card.cardID] = card;
        });

        setCards(newCards);
      });
  };

  const saveCardToDropBox = (newCard: CardInterface) => {
    const apiArgs = {
      path: collectionFileName,
      mode: 'overwrite'
    };

    dropboxAccess
      .download(collectionFileName)
      .then((result: any) => {
        return result.text();
      })
      .then((fileContent: any) => {
        const data: CardInterface[] = JSON.parse(fileContent);
        const collection: CardInterface[] = [];
        data.forEach((card: CardInterface) => {
          collection[card.cardID] = card;
        });
        collection[newCard.cardID] = newCard;
        setCards(collection);

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
    const newCards: CardInterface[] = [...cards];
    newCards[obj.cardID] = obj;

    setCards(newCards);
    saveCardToDropBox(obj);
  };

  const addNewCard = () => {
    const card: CardInterface = {
      name: '',
      rarity: RarityType.Common,
      cardID: cards.length,
      rowNumber: cards.length,
      front: {
        name: '',
        manaCost: '',
        cardText: '',
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
    if (!dataLoaded && cards.length > 0) {
      setDataLoaded(true);
    }
  }, [cards.length]);

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
        <div>{render(Object.values(cards), saveCard, addNewCard)}</div>
      ) : (
        <div>Loading Cards...</div>
      )}
    </div>
  );
};

export default OnlineCardProvider;
