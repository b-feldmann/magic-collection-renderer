import React, { useState } from 'react';
import CardInterface from '../../interfaces/CardInterface';

import { Checkbox, Input, Select } from 'antd';

import styles from './styles.module.css';
import { CardMainType, Creators, RarityType } from '../../interfaces/enums';
const { TextArea } = Input;

interface CardEditorInterface {
  card: CardInterface;
  saveCard: (key: number, card: CardInterface) => void;
}

const CardEditor: React.FC<CardEditorInterface> = ({
  card,
  saveCard
}: CardEditorInterface) => {
  const [tmpCard, setTmpCard] = useState<CardInterface>(card);

  const getValue = (key: string): any => {
    return tmpCard[key];
  };

  const saveValue = (key: string, value: any) => {
    const newTmpCard = { ...tmpCard };
    newTmpCard[key] = value;
    setTmpCard(newTmpCard);
    saveCard(newTmpCard.cardIndex, newTmpCard);
  };

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

  const buildField = (
    key: string,
    type: string,
    name: string,
    data?: string[]
  ) => {
    if (type === 'input') {
      return (
        <span>
          <p className={styles.label}>{name}</p>
          <Input
            value={getValue(key)}
            onChange={e => saveValue(key, e.target.value)}
          />
        </span>
      );
    }

    if (type === 'area') {
      return (
        <span>
          <p className={styles.label}>{name}</p>
          <TextArea
            value={getValue(key)}
            onChange={e => saveValue(key, e.target.value)}
            rows={4}
          />
        </span>
      );
    }

    if (type === 'area-small') {
      return (
        <span>
          <p className={styles.label}>{name}</p>
          <TextArea
            value={getValue(key)}
            onChange={e => saveValue(key, e.target.value)}
            rows={2}
          />
        </span>
      );
    }

    if (type === 'bool') {
      return (
        <Checkbox
          className={styles.label}
          checked={getValue(key)}
          onChange={e => saveValue(key, e.target.checked)}
        >
          {name}
        </Checkbox>
      );
    }

    if (type === 'select' && data) {
      return (
        <span>
          <p className={styles.label}>{name}</p>
          <Select
            value={getValue(key)}
            onChange={(value: string) => saveValue(key, value)}
            style={{ width: '100%' }}
          >
            {data.map(d => (
              <Select.Option key={`${key} + ${d}`} value={d}>
                {d}
              </Select.Option>
            ))}
          </Select>
        </span>
      );
    }

    return '';
  };

  return (
    <div className={styles.editor}>
      {inputConfig.map(config => (
        <div key={`card-editor-key:${config.key}`}>
          {buildField(config.key, config.type, config.name, config.data)}
        </div>
      ))}
    </div>
  );
};

export default CardEditor;
