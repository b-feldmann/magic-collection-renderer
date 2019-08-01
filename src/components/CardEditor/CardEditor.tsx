import React, { useEffect, useState } from 'react';
// import CardFaceInterface from '../../interfaces/CardFaceInterface';
import { Button, Row } from 'antd';
import _ from 'lodash';
import CardInterface from '../../interfaces/CardInterface';

import styles from './styles.module.scss';
import { CardMainType, Creators, RarityType } from '../../interfaces/enums';
import EditField from './EditField';

import useWindowDimensions from '../../useWindowDimensions';
import CardFaceInterface from '../../interfaces/CardFaceInterface';
import EditorTooltip from '../EditorTooltip/EditorTooltip';

interface CardEditorInterface {
  card: CardInterface;
  saveTmpCard: (card: CardInterface | null) => void;
  saveCard: (card: CardInterface) => void;
}

const NO_CARD = '-1';

const dummyCard: CardInterface = {
  name: '',
  cardID: NO_CARD,
  manaCost: '',
  rarity: RarityType.Common,
  front: {
    name: '',
    cardMainType: CardMainType.Creature,
    cardText: []
  }
};

const CardEditor: React.FC<CardEditorInterface> = ({
  card = dummyCard,
  saveCard,
  saveTmpCard
}: CardEditorInterface) => {
  const [contentChanged, setContentChanged] = useState<boolean>(false);
  const [originalCard, setOriginalCard] = useState<CardInterface>(_.cloneDeep(card));
  const [tmpCard, setTmpCard] = useState<CardInterface>(_.cloneDeep(card));
  const [timerId, setTimerId] = useState<any>(NO_CARD);

  const [editBack, setEditBack] = useState<boolean>(false);

  const { height } = useWindowDimensions();

  let small = false;
  let tiny = false;

  if (height < 1000) small = true;
  if (height < 860) tiny = true;

  const getCurrentFace = (currentCard: CardInterface): CardFaceInterface => {
    if (currentCard.back && editBack) return currentCard.back;
    return currentCard.front;
  };

  const getValue = (key: string): any => {
    if (key === 'rarity' || key === 'creator' || key === 'manaCost') return tmpCard[key];
    return getCurrentFace(tmpCard)[key];
  };

  const saveValue = (key: string, value: any) => {
    const newTmpCard = { ...tmpCard };
    if (key === 'name') {
      getCurrentFace(newTmpCard)[key] = value;
      if (newTmpCard.back) {
        newTmpCard.name = `${newTmpCard.front.name} // ${newTmpCard.back.name}`;
      } else {
        newTmpCard.name = `${newTmpCard.front.name}`;
      }
    } else if (key === 'rarity' || key === 'creator' || key === 'manaCost') {
      newTmpCard[key] = value;
    } else {
      getCurrentFace(newTmpCard)[key] = value;
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
    setEditBack(false);
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
    { key: 'cardText', type: 'list', name: 'Card Text' },
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

  if (card.cardID === NO_CARD)
    return (
      <div className={styles.noCard}>
        <span>Hover over a card and click the edit icon to start the editor!</span>
      </div>
    );

  const addBackFace = () => {
    const newTmpCard = { ...tmpCard };
    newTmpCard.back = {
      name: '',
      cardText: [],
      cardMainType: CardMainType.Creature,
      manaCost: ''
    };

    setTmpCard(newTmpCard);
    saveTmpCard(newTmpCard);
    setContentChanged(true);
  };

  const deleteBackFace = () => {
    const newTmpCard = { ...tmpCard };
    delete newTmpCard.back;
    setTmpCard(newTmpCard);
    saveTmpCard(newTmpCard);
    setContentChanged(true);
  };

  return (
    <div className={styles.editor}>
      <Row className={tiny ? styles.tiny : ''}>
        <EditorTooltip className={styles.tooltip} />
        <Button.Group className={styles.smallButtonGroup} size={small ? 'small' : 'default'}>
          {card.back && editBack && (
            <Button type="ghost" onClick={() => setEditBack(false)}>
              <span>Edit Front Face</span>
            </Button>
          )}
          {card.back && !editBack && (
            <Button type="ghost" onClick={() => setEditBack(true)}>
              <span>Edit Back Face</span>
            </Button>
          )}
          {card.back && (
            <Button onClick={deleteBackFace} type="danger">
              <span>Delete Back Face</span>
            </Button>
          )}
          {!card.back && <Button onClick={addBackFace}>Add Back Face</Button>}
        </Button.Group>
      </Row>
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
        <Button.Group className={styles.buttonGroup} size={small ? 'small' : 'default'}>
          <Button disabled={!contentChanged} onClick={saveChanges} type="primary">
            <span>Save Changes</span>
          </Button>
          <Button disabled={!contentChanged} onClick={discardChanges} type="danger">
            <span>Discard Changes</span>
          </Button>
        </Button.Group>
      </Row>
    </div>
  );
};

export default CardEditor;
