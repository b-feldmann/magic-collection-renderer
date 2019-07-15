import React, { ReactChild, useState } from 'react';
import CardInterface from '../../interfaces/CardInterface';
import { CardMainType, RarityType } from '../../interfaces/enums';

// const { dialog } = window.require('electron').remote;

interface OfflineCardProviderInterface {
  render: (
    cards: CardInterface[],
    saveCard: (card: CardInterface) => void,
    addCard: () => void
  ) => JSX.Element;
}

interface CardCallbackFunction {
  (card: CardInterface): void;
}

const murkCard: CardInterface = {
  name: 'Murk Murk',
  rarity: RarityType.Common,
  creator: 'Goomy our Breath',
  manaCost: '{b}{1}',
  cardID: 2,
  rowNumber: 2,
  cardStats: '2/1',
  cardText: 'Flying | When ~ attacks you can untap target land.',
  flavourText: '~ the destroyer',
  cardMainType: CardMainType.Creature,
  cardSubTypes: 'Pokemon'
};

const skillCard: CardInterface = {
  name: '"Skill"',
  rarity: RarityType.Uncommon,
  creator: 'Goomy our Light',
  manaCost: '{r}{3}',
  cardID: 1,
  rowNumber: 1,
  cardText: '~ deals 3 damage to target player and each creature they control.',
  flavourText: 'Oops. I tripped.',
  cardMainType: CardMainType.Sorcery
};

const necrozmaCard: CardInterface = {
  name: 'Necrozma',
  cover:
    'https://www.pokewiki.de/images/thumb/2/25/Illustration_Necrozma_%C3%9Cbernahme.jpg/300px-Illustration_Necrozma_%C3%9Cbernahme.jpg',
  rarity: RarityType.MythicRare,
  cardStats: '4/4',
  creator: 'Goomy our Breath',
  manaCost: '{b}{b}{w}{w}',
  cardID: 0,
  rowNumber: 0,
  cardText:
    '{w}{w}: Put a +1/+1 counter on ~. | {b}{b}{t}: Remove all +1/+1 counter from ~. ~ deals 4 damage for each removed counter to target creature.',
  flavourText: 'My team is okay',
  flavourAuthor: 'Goomy our Breath, just before victory',
  cardMainType: CardMainType.Creature,
  legendary: true,
  cardSubTypes: 'Pokemon'
};

const michaCard: CardInterface = {
  name: 'Micha der Ausgeglichene',
  rarity: RarityType.Uncommon,
  cardStats: '1/6',
  creator: 'Goomy our Hope',
  manaCost: '{u}{u}{1}',
  cardID: 3,
  rowNumber: 3,
  cardText:
    '~ enters the battlefield with 3 "Geduldscountern". |' +
    'At the end of your turn remove 1 "Geduldscounter" from ~.|' +
    'When there are no counters on ~ he goes back into his controllers hand and all creatures on the battlefield are destroyed.',
  flavourText: 'WIE BITTE?!',
  cardMainType: CardMainType.Creature,
  cardSubTypes: 'Goomy Follower'
};

const sivirCard: CardInterface = {
  name: 'Sivir Countert Alles',
  rarity: RarityType.Common,
  cardStats: '2/3',
  manaCost: '{w}{2}',
  cardID: 4,
  rowNumber: 4,
  cardText: 'Hexproof | {w}{1}: Give a creature haste',
  cardMainType: CardMainType.Creature,
  cardSubTypes: 'Champ'
};

const zyraCard: CardInterface = {
  name: 'Crit Zyra',
  rarity: RarityType.Common,
  cardStats: '0/1',
  manaCost: '{g}',
  creator: 'Goomy our Light',
  cardID: 5,
  rowNumber: 5,
  cardText:
    '{T}: put a +0/+1 counter on ~. Put a +1/+0 counter on target creature an opponent controls. Tap that creature.',
  cardMainType: CardMainType.Creature,
  cardSubTypes: 'Champ'
};

const eloCard: CardInterface = {
  name: 'Elo Land',
  rarity: RarityType.Uncommon,
  creator: 'Goomy our Hope',
  cardID: 6,
  rowNumber: 6,
  manaCost: '',
  flavourText:
    'Oh Eloland, where the grass is greener and the honey tastes sweeter',
  cardText:
    '{t}: Get a mana of any color. This mana can only be spend to cast gold spells.',
  cardMainType: CardMainType.Land
};

const dittoCard: CardInterface = {
  name: 'Ditto',
  rarity: RarityType.Rare,
  creator: 'Goomy our Soul',
  cardID: 7,
  rowNumber: 7,
  manaCost: '{2}',
  cardStats: '0/1',
  flavourText: 'They told me I could be anything <3',
  cardText: '~ enters the battlefield as a copy of target creature.',
  cardMainType: CardMainType.Creature,
  cardSubTypes: 'Pokemon'
};

const joridCard: CardInterface = {
  name: 'Jorid, Herr der Geier und Käfer',
  rarity: RarityType.Rare,
  creator: 'Goomy our Lord',
  cardID: 8,
  rowNumber: 8,
  manaCost: '{b}{b}{3}',
  cardStats: '5',
  legendary: true,
  flavourText: 'Weakling! You stand no chance against my army mwahaha',
  cardText:
    '{+1}: Summon a 1/4 Beetle Token | {-3}: Summon a 3/1 flying Geier Token | {-x}: Beetle and Geier Tokens you control get x +1/+1 counter and have a second attack step',
  cardMainType: CardMainType.Planeswalker
};

const OfflineCardProvider: React.FC<OfflineCardProviderInterface> = ({
  render
}: OfflineCardProviderInterface) => {
  // const dataPath = storage.getDataPath();
  // console.log(dataPath);
  const initialState = [];
  initialState[necrozmaCard.cardID] = necrozmaCard;
  initialState[skillCard.cardID] = skillCard;
  initialState[murkCard.cardID] = murkCard;
  initialState[michaCard.cardID] = michaCard;
  initialState[sivirCard.cardID] = sivirCard;
  initialState[zyraCard.cardID] = zyraCard;
  initialState[eloCard.cardID] = eloCard;
  initialState[dittoCard.cardID] = dittoCard;
  initialState[joridCard.cardID] = joridCard;

  const [cards, setCards] = useState<CardInterface[]>(initialState);

  const saveCard = (obj: CardInterface) => {
    const newCards: CardInterface[] = [...cards];
    newCards[obj.cardID] = obj;

    setCards(newCards);
  };

  const getCard = () => {};

  const addNewCard = () => {
    const card: CardInterface = {
      name: '',
      rarity: RarityType.Common,
      cardID: cards.length,
      rowNumber: cards.length,
      manaCost: '',
      cardText: '',
      cardMainType: CardMainType.Creature
    };

    saveCard(card);
  };

  return <div>{render(Object.values(cards), saveCard, addNewCard)}</div>;
};

export default OfflineCardProvider;
