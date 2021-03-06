import React, { useContext, useEffect, useState } from 'react';
import { Button, Row } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import CardInterface from '../../interfaces/CardInterface';

import styles from './styles.module.scss';
import {
  BasicLandArtStyles,
  BasicLandType,
  CardArtStyles,
  CardMainType,
  CardState,
  RarityType
} from '../../interfaces/enums';
import EditField from './EditField';

import CardFaceInterface from '../../interfaces/CardFaceInterface';
import EditorTooltip from '../EditorTooltip/EditorTooltip';
import { updateCard } from '../../actions/cardActions';
import { Store, StoreType } from '../../store';
import { EDIT_TIME_OFFSET, UNKNOWN_CREATOR } from '../../utils/constants';

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
  creator: UNKNOWN_CREATOR,
  meta: {
    comment: '',
    likes: [],
    dislikes: [],
    lastUpdated: moment().valueOf(),
    createdAt: moment().valueOf(),
    state: CardState.Draft
  }
};

interface InputConfigInterface {
  key: string;
  type:
    | 'input'
    | 'split-input'
    | 'upload-input'
    | 'select'
    | 'area'
    | 'radio'
    | 'list'
    | 'split-list'
    | 'bool';
  name: string;
  data?: { key: string; value: string }[];
  width?: number;
}

const CardEditor: React.FC<CardEditorInterface> = ({
  card = dummyCard,
  saveTmpCard
}: CardEditorInterface) => {
  const [contentChanged, setContentChanged] = useState<boolean>(false);
  const [originalCard, setOriginalCard] = useState<CardInterface>(_.cloneDeep(card));
  const [tmpCard, setTmpCard] = useState<CardInterface>(_.cloneDeep(card));
  const [timerId, setTimerId] = useState<any>(NO_CARD);

  const [editBack, setEditBack] = useState<boolean>(false);

  const { dispatch, user } = useContext<StoreType>(Store);

  const getCurrentFace = (currentCard: CardInterface): CardFaceInterface => {
    if (currentCard.back && editBack) return currentCard.back;
    return currentCard.front;
  };

  const getValue = (key: string): any => {
    if (key === 'creator') return tmpCard[key].uuid;
    if (key === 'rarity' || key === 'manaCost') return tmpCard[key];
    if (key === 'comment') return tmpCard.meta[key];
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
    } else if (key === 'creator') {
      newTmpCard[key] = _.find(user, o => o.uuid === value) || UNKNOWN_CREATOR;
    } else if (key === 'rarity' || key === 'manaCost') {
      newTmpCard[key] = value;
    } else if (key === 'comment') {
      newTmpCard.meta[key] = value;
    } else {
      getCurrentFace(newTmpCard)[key] = value;
    }

    if (key === 'cardMainType') {
      if (value === CardMainType.BasicLand) {
        if (
          getValue('cardSubTypes') !== BasicLandType.Plains &&
          getValue('cardSubTypes') !== BasicLandType.Island &&
          getValue('cardSubTypes') !== BasicLandType.Swamp &&
          getValue('cardSubTypes') !== BasicLandType.Mountain &&
          getValue('cardSubTypes') !== BasicLandType.Forest
        ) {
          saveValue('cardSubTypes', BasicLandType.Plains);
        }

        if (
          getValue('artStyle') !== BasicLandArtStyles.Unstable &&
          getValue('artStyle') !== BasicLandArtStyles.Regular
        ) {
          saveValue('artStyle', BasicLandArtStyles.Regular);
        }
      } else if (value === CardMainType.Land) {
        if (getValue('artStyle') !== CardArtStyles.Borderless) {
          saveValue('artStyle', CardArtStyles.Regular);
        }
      } else if (value === CardMainType.Planeswalker) {
        saveValue('artStyle', CardArtStyles.Regular);
      } else if (
        getValue('artStyle') !== CardArtStyles.Borderless &&
        getValue('artStyle') !== CardArtStyles.Invocation
      ) {
        saveValue('artStyle', CardArtStyles.Regular);
      }
    }

    setTmpCard(newTmpCard);

    setContentChanged(true);

    clearTimeout(timerId);
    const tmpId = setTimeout(() => {
      saveTmpCard(newTmpCard);
    }, EDIT_TIME_OFFSET);
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

  const isCreature = () =>
    getValue('cardMainType') === CardMainType.Creature ||
    getValue('cardMainType') === CardMainType.ArtifactCreature;
  const isPlaneswalker = () => getValue('cardMainType') === CardMainType.Planeswalker;
  const hasMana = () =>
    getValue('cardMainType') !== CardMainType.Land &&
    getValue('cardMainType') !== CardMainType.Emblem;

  const hasStats = () => isCreature() || isPlaneswalker();

  let inputConfig: InputConfigInterface[] = [
    {
      key: 'artStyle',
      type: 'radio',
      name: 'Art Style',
      data: Object.keys(CardArtStyles)
        .filter(style =>
          style !== CardArtStyles.Regular
            ? getValue('cardMainType') !== CardMainType.Planeswalker &&
              getValue('cardMainType') !== CardMainType.Land
            : true
        )
        .map((type: any) => ({
          key: CardArtStyles[type],
          value: CardArtStyles[type]
        })),
      width: 100
    },
    { key: 'name', type: 'input', name: 'Card Name' },
    { key: 'cover', type: 'upload-input', name: 'Cover (URL)' },
    { key: 'legendary', type: 'bool', name: 'Legendary?' },
    { key: 'manaCost', type: 'input', name: 'Mana Cost', width: hasMana() ? 50 : 0 },
    {
      key: 'rarity',
      type: 'select',
      name: 'Rarity',
      data: Object.keys(RarityType).map((type: any) => ({
        key: RarityType[type],
        value: RarityType[type]
      })),
      width: hasMana() ? 50 : 100
    },
    {
      key: 'cardMainType',
      type: 'select',
      name: 'Card Type',
      data: Object.keys(CardMainType).map((type: any) => ({
        key: CardMainType[type],
        value: CardMainType[type]
      })),
      width: 50
    },
    { key: 'cardSubTypes', type: 'input', name: 'Card Sub Types', width: 50 },
    { key: 'cardText', type: isPlaneswalker() ? 'split-list' : 'list', name: 'Card Text' },
    { key: 'flavourText', type: 'area', name: 'Flavour Text', width: isPlaneswalker() ? 0 : 100 },
    {
      key: 'flavourAuthor',
      type: 'input',
      name: 'Flavour Text Author',
      width: isPlaneswalker() ? 0 : 100
    },
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
      data: user.filter(u => u.name !== 'ADMIN').map(o => ({ key: o.uuid, value: o.name })),
      width: hasStats() ? 50 : 100
    },
    { key: 'comment', type: 'area', name: 'Comment' }
  ];

  if (getValue('cardMainType') === CardMainType.BasicLand) {
    inputConfig = [
      {
        key: 'artStyle',
        type: 'radio',
        name: 'Art Style',
        data: Object.keys(BasicLandArtStyles).map((type: any) => ({
          key: BasicLandArtStyles[type],
          value: BasicLandArtStyles[type]
        })),
        width: 100
      },
      { key: 'cover', type: 'upload-input', name: 'Cover (URL)' },
      {
        key: 'cardMainType',
        type: 'select',
        name: 'Card Type',
        data: Object.keys(CardMainType).map((type: any) => ({
          key: CardMainType[type],
          value: CardMainType[type]
        })),
        width: 100
      },
      {
        key: 'cardSubTypes',
        type: 'select',
        name: 'Land Types',
        data: Object.keys(BasicLandType).map((type: any) => ({
          key: BasicLandType[type],
          value: BasicLandType[type]
        })),
        width: 100
      },
      {
        key: 'creator',
        type: 'select',
        name: 'Card Creator',
        data: user.filter(u => u.name !== 'ADMIN').map(o => ({ key: o.uuid, value: o.name })),
        width: hasStats() ? 50 : 100
      },
      { key: 'comment', type: 'area', name: 'Comment' }
    ];
  }

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
      <canvas id="cover-resize-canvas" className={styles.canvas} />
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
