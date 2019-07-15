import React, { useEffect, useState } from 'react';
// import CardFaceInterface from '../../interfaces/CardFaceInterface';
import CardInterface from '../../interfaces/CardInterface';

import styles from './styles.module.scss';
import { CardMainType, Creators, RarityType } from '../../interfaces/enums';
import EditField from './EditField';
import { Button, Row } from 'antd';

import _ from 'lodash';
import useWindowDimensions from '../../useWindowDimensions';

interface CardEditorInterface {
  card: CardInterface;
  saveTmpCard: (card: CardInterface | null) => void;
  saveCard: (card: CardInterface) => void;
}

const dummyCard: CardInterface = {
  name: '',
  cardID: -1,
  rowNumber: -1,
  rarity: RarityType.Common,
  front: {
    name: '',
    cardMainType: CardMainType.Creature,
    manaCost: '',
    cardText: ''
  }
};

const CardEditor: React.FC<CardEditorInterface> = ({
  card = dummyCard,
  saveCard,
  saveTmpCard
}: CardEditorInterface) => {
  const [contentChanged, setContentChanged] = useState<boolean>(false);
  const [originalCard, setOriginalCard] = useState<CardInterface>(
    _.cloneDeep(card)
  );
  const [tmpCard, setTmpCard] = useState<CardInterface>(_.cloneDeep(card));
  const [timerId, setTimerId] = useState<any>(-1);

  const { height } = useWindowDimensions();

  let small = false;
  let tiny = false;

  if (height < 840) small = true;
  if (height < 710) tiny = true;

  const getValue = (key: string): any => {
    if (key === 'rarity' || key === 'creator') return tmpCard[key];
    return tmpCard.front[key];
  };

  const saveValue = (key: string, value: any) => {
    const newTmpCard = { ...tmpCard };
    if (key === 'rarity' || key === 'creator') {
      newTmpCard[key] = value;
    } else {
      newTmpCard.front[key] = value;
    }
    setTmpCard(newTmpCard);

    setContentChanged(true);

    clearTimeout(timerId);
    const tmpId = setTimeout(() => {
      saveTmpCard(newTmpCard);
    }, 300);
    setTimerId(tmpId);
  };

  const discardChanges = () => {
    if (!contentChanged) return;

    setTmpCard(_.cloneDeep(originalCard));
    saveTmpCard(null);
    setContentChanged(false);
  };

  const saveChanges = () => {
    if (!contentChanged) return;

    setTmpCard(_.cloneDeep(tmpCard));
    setOriginalCard(_.cloneDeep(tmpCard));
    saveTmpCard(null);
    saveCard(_.cloneDeep(tmpCard));
    setContentChanged(false);
  };

  useEffect(() => {
    if (
      _.isEqual(originalCard, tmpCard) &&
      _.isEqual(originalCard.front, tmpCard.front) &&
      _.isEqual(originalCard.back, tmpCard.back)
    ) {
      saveTmpCard(null);
      setContentChanged(false);
    }
  }, [tmpCard]);

  useEffect(() => {
    setTmpCard(_.cloneDeep(card));
    setOriginalCard(_.cloneDeep(card));
    saveTmpCard(null);
    setContentChanged(false);
  }, [card.cardID]);

  const inputConfig = [
    { key: 'name', type: 'input', name: 'Card Name' },
    { key: 'cover', type: 'input', name: 'Cover (URL)' },
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

  if (card.cardID === -1)
    return (
      <div className={styles.noCard}>
        Hover over a card and click the edit icon to start the editor!
      </div>
    );

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
      <Row className={tiny ? styles.tiny : ''}>
        <Button.Group
          className={styles.buttonGroup}
          size={small ? 'small' : 'default'}
        >
          <Button
            disabled={!contentChanged}
            onClick={saveChanges}
            type="primary"
          >
            Save Changes
          </Button>
          <Button
            disabled={!contentChanged}
            onClick={discardChanges}
            type="danger"
          >
            Discard Changes
          </Button>
        </Button.Group>
      </Row>
    </div>
  );
};

export default CardEditor;
