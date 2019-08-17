import React, { useContext, useEffect, useState } from 'react';
// import CardFaceInterface from '../../interfaces/CardFaceInterface';
import { Button, Row } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import CardInterface from '../../interfaces/CardInterface';

import styles from './styles.module.scss';
import { CardMainType, CardVersion, Creators, RarityType } from '../../interfaces/enums';
import EditField from './EditField';

import CardFaceInterface from '../../interfaces/CardFaceInterface';
import EditorTooltip from '../EditorTooltip/EditorTooltip';
import { updateCard } from '../../actions/cardActions';
import { Store, StoreType } from '../../store';

interface CardEditorInterface {
  card?: CardInterface;
  saveTmpCard: (card: CardInterface | null) => void;
}

const NO_CARD = '-1';

const dummyCard: CardInterface = {
  name: '',
  uuid: NO_CARD,
  manaCost: '',
  rarity: RarityType.Common,
  front: {
    name: '',
    cardMainType: CardMainType.Creature,
    cardText: []
  },
  version: CardVersion.V1,
  lastUpdated: moment().valueOf(),
  createdAt: moment().valueOf(),
  creator: Creators.UNKNOWN
};

const CardEditor: React.FC<CardEditorInterface> = ({
  card = dummyCard,
  saveTmpCard
}: CardEditorInterface) => {
  const [contentChanged, setContentChanged] = useState<boolean>(false);
  const [originalCard, setOriginalCard] = useState<CardInterface>(_.cloneDeep(card));
  const [tmpCard, setTmpCard] = useState<CardInterface>(_.cloneDeep(card));
  const [timerId, setTimerId] = useState<any>(NO_CARD);

  const [editBack, setEditBack] = useState<boolean>(false);

  const { dispatch, cards } = useContext<StoreType>(Store);

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
    updateCard(dispatch, _.cloneDeep(tmpCard));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tmpCard]);

  useEffect(() => {
    setEditBack(false);
    setTmpCard(_.cloneDeep(card));
    setOriginalCard(_.cloneDeep(card));
    saveTmpCard(null);
    setContentChanged(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.uuid]);

  const isCreature = () => getValue('cardMainType') === CardMainType.Creature;
  const isPlaneswalker = () => getValue('cardMainType') === CardMainType.Planeswalker;
  const hasMana = () =>
    getValue('cardMainType') !== CardMainType.Land &&
    getValue('cardMainType') !== CardMainType.Emblem;

  const hasStats = () => isCreature() || isPlaneswalker();

  const inputConfig = [
    { key: 'name', type: 'input', name: 'Card Name' },
    { key: 'cover', type: 'input', name: 'Cover (URL)' },
    { key: 'legendary', type: 'bool', name: 'Legendary?' },
    { key: 'manaCost', type: 'input', name: 'Mana Cost', width: hasMana() ? 50 : 0 },
    {
      key: 'rarity',
      type: 'select',
      name: 'Rarity',
      data: Object.keys(RarityType).map((type: any) => RarityType[type]),
      width: hasMana() ? 50 : 100
    },
    {
      key: 'cardMainType',
      type: 'select',
      name: 'Card Type',
      data: Object.keys(CardMainType).map((type: any) => CardMainType[type]),
      width: 50
    },
    { key: 'cardSubTypes', type: 'input', name: 'Card Sub Types', width: 50 },
    { key: 'cardText', type: 'list', name: 'Card Text' },
    { key: 'flavourText', type: 'area', name: 'Flavour Text' },
    { key: 'flavourAuthor', type: 'input', name: 'Flavour Text Author' },
    {
      key: 'cardStats',
      type: isPlaneswalker() ? 'input' : 'split-input',
      name: isPlaneswalker() ? 'Loyalty' : 'Power/Toughness',
      width: hasStats() ? 50 : 0
    },
    {
      key: 'creator',
      type: 'select',
      name: 'Card Creator',
      data: Object.keys(Creators).map((type: any) => Creators[type]),
      width: hasStats() ? 50 : 100
    }
  ];

  if (card.uuid === NO_CARD)
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
      <Row>
        <EditorTooltip className={styles.tooltip} />
        <Button.Group className={styles.smallButtonGroup} size="small">
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
      <Row>
        {inputConfig.map(config => {
          const style: any = {};
          if (config.width === 0) style.display = 'none';
          if (config.width) style.width = `${config.width}%`;
          return (
            <div
              key={`card-editor-key:${config.key}`}
              className={config.width ? styles.partialField : styles.fullField}
              style={style}
            >
              <EditField
                fieldKey={config.key}
                type={config.type}
                data={config.data}
                name={config.name}
                saveValue={saveValue}
                getValue={getValue}
              />
            </div>
          );
        })}
      </Row>
      <Row>
        <Button.Group className={styles.buttonGroup} size="small">
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
