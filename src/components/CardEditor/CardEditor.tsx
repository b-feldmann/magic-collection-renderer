import React, { useState, useEffect } from 'react';
import CardInterface from '../../interfaces/CardInterface';

import styles from './styles.module.css';
import { CardMainType, Creators, RarityType } from '../../interfaces/enums';
import EditField from './EditField';

interface CardEditorInterface {
  card: CardInterface;
  saveCard: (card: CardInterface) => void;
}

const CardEditor: React.FC<CardEditorInterface> = ({
  card,
  saveCard
}: CardEditorInterface) => {
  const [tmpCard, setTmpCard] = useState<CardInterface>(card);
  const [timerId, setTimerId] = useState<any>(-1);

  const getValue = (key: string): any => {
    return tmpCard[key];
  };

  const saveValue = (key: string, value: any) => {
    const newTmpCard = { ...tmpCard };
    newTmpCard[key] = value;
    setTmpCard(newTmpCard);

    clearTimeout(timerId);
    const tmpId = setTimeout(() => {
      saveCard(newTmpCard);
    }, 300);
    setTimerId(tmpId);
  };

  useEffect(() => {
    setTmpCard(card);
  }, [card.cardID]);

  const inputConfig = [
    { key: 'name', type: 'input', name: 'Card Name' },
    { key: 'manaCost', type: 'input', name: 'Mana Cost' },
    { key: 'legendary', type: 'bool', name: 'Legendary?' },
    {
      key: 'cardMainType',
      type: 'select',
      name: 'Card Type',
      data: Object.keys(CardMainType).map((type: any) => CardMainType[type])
    },
    { key: 'cardSubTypes', type: 'input', name: 'Card Sub Types' },
    {
      key: 'rarity',
      type: 'select',
      name: 'Rarity',
      data: Object.keys(RarityType).map((type: any) => RarityType[type])
    },
    { key: 'cardText', type: 'area', name: 'Card Text' },
    { key: 'flavourText', type: 'area-small', name: 'Flavour Text' },
    { key: 'flavourAuthor', type: 'input', name: 'Flavour Text Author' },
    { key: 'cardStats', type: 'input', name: 'Power / Toughness' },
    {
      key: 'creator',
      type: 'select',
      name: 'Card Creator',
      data: Object.keys(Creators).map((type: any) => Creators[type])
    }
  ];

  return (
    <div className={styles.editor}>
      {inputConfig.map(config => (
        <div key={`card-editor-key:${config.key}`}>
          <EditField
            fieldKey={config.key}
            type={config.type}
            data={config.data}
            name={config.name}
            saveValue={saveValue}
            getValue={getValue}
          />
        </div>
      ))}
    </div>
  );
};

export default CardEditor;
