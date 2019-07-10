import React, { ReactChild, useState } from 'react';
import CardInterface from '../../interfaces/CardInterface';
import { CardMainType, RarityType } from '../../interfaces/enums';

// const { dialog } = window.require('electron').remote;

interface OfflineCardProviderInterface {
  children: ReactChild;
}

interface CardCallbackFunction {
  (card: CardInterface): void;
}

const OnlineCardProvider = ({ children }: OfflineCardProviderInterface) => {
  // const dataPath = storage.getDataPath();
  // console.log(dataPath);
  const [cards, setCards] = useState<CardInterface[]>([]);

  const murkCard: CardInterface = {
    name: 'Murk Murk',
    rarity: RarityType.Common,
    creator: 'Goomy our Breath',
    manaCost: '{b}{1}',
    cardIndex: 2,
    rowNumber: 2,
    cardStats: '2/1',
    cardText: 'Flying | When ~ attacks you can tap target land.',
    flavourText: '~ the destroyer',
    cardMainType: CardMainType.Creature,
    cardSubTypes: 'Pokemon'
  };

  const saveCard = (key: string, obj: CardInterface) => {
    // fs.writeFile('cards', obj, err => {
    //   if (err) {
    //     alert('An error ocurred creating the file ' + err.message);
    //   }
    //
    //   alert('The file has been succesfully saved');
    // });
  };

  const getCard = (key: string) => {
    // fs.readFile('cards', 'utf-8', (err, data) => {
    //   if (err) {
    //     alert('An error ocurred reading the file :' + err.message);
    //     return;
    //   }
    //
    //   // Change how to handle the file content
    //   console.log('The file content is : ' + data);
    //
    //   // const card: CardInterface = {
    //   //   rowNumber: -1,
    //   //   name: '',
    //   //   cardMainType: CardMainType.Creature,
    //   //   manaCost: '{0}',
    //   //   rarity: RarityType.Common,
    //   //   cardText: '',
    //   //   cardIndex: -1,
    //   //   ...data
    //   // };
    //   //
    //   // console.log(card);
    // });
  };

  saveCard('murk', murkCard);

  // storage.set('murk', card3, function(error) {
  //   if (error) throw error;
  // });

  const getAllCards = () => {
    const allCards: CardInterface[] = [];

    // storage.getAll(function(error, data) {
    //   if (error) throw error;
    //
    //   console.log(data);
    // });
    // console.log(allCards);

    return setCards(allCards);
  };

  const childWithProp = React.Children.map(children, child => {
    // @ts-ignore
    return React.cloneElement(child, { cards, getCard });
  });

  // return childWithProp;
  return children;
};

export default OnlineCardProvider;
