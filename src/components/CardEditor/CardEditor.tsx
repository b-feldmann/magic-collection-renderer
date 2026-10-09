import React, { useContext, useEffect, useRef, useState } from 'react';
import { Button, Modal, Row, Space } from 'antd';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import dayjs from 'dayjs';
import CardInterface from '../../interfaces/CardInterface';

import styles from './styles.module.scss';
import {
  BasicLandArtStyles,
  BasicLandType,
  CardArtStyles,
  CardType,
  CardState,
  ColorType,
  CoverFit,
  RarityType,
} from '../../interfaces/enums';
import EditField from './EditField';

import CardFaceInterface from '../../interfaces/CardFaceInterface';
import { deleteCard, updateCard } from '../../actions/cardActions';
import { Store, StoreType } from '../../store';
import {
  BJENNWARE,
  EDIT_SAVE_OFFSET,
  EDIT_TIME_OFFSET,
  UNKNOWN_CREATOR,
} from '../../utils/constants';

interface CardEditorInterface {
  card?: CardInterface;
  saveTmpCard: (card: CardInterface | null) => void;
}

const NO_CARD = '-1';

// Single source of truth for which art styles may be selected for a given set
// of card types. Used both to build the Art Style radio options and to decide
// whether the current art style can be kept when the card types change.
const isArtStyleAvailableForType = (artStyle: string, cardTypes: CardType[] = []): boolean => {
  if (cardTypes.includes(CardType.BasicLand)) {
    return (Object.values(BasicLandArtStyles) as string[]).includes(artStyle);
  }
  if (artStyle === CardArtStyles.Invocation) return false;
  if (artStyle === CardArtStyles.Invention) return cardTypes.includes(CardType.Artifact);
  if (artStyle !== CardArtStyles.Regular) {
    if (cardTypes.includes(CardType.Token)) return false;
    // Planeswalkers only support the Borderless showcase frames, not the other
    // non-regular art styles.
    if (cardTypes.includes(CardType.Planeswalker)) return artStyle === CardArtStyles.Borderless;
    return true;
  }
  return true;
};

const dummyCard: CardInterface = {
  name: '',
  uuid: NO_CARD,
  manaCost: '',
  rarity: RarityType.Common,
  front: {
    name: '',
    cardTypes: [CardType.Creature],
    cardText: [],
  },
  creator: UNKNOWN_CREATOR,
  meta: {
    comment: '',
    likes: [],
    dislikes: [],
    lastUpdated: dayjs().valueOf(),
    createdAt: dayjs().valueOf(),
    state: CardState.Draft,
  },
};

interface InputConfigInterface {
  key: string;
  type:
    | 'input'
    | 'split-input'
    | 'upload-input'
    | 'select'
    | 'multi-select'
    | 'area'
    | 'radio'
    | 'list'
    | 'split-list'
    | 'text-list'
    | 'bool';
  name: string;
  data?: { key: string; value: string }[];
  width?: number;
}

const CardEditor: React.FC<CardEditorInterface> = ({
  card = dummyCard,
  saveTmpCard,
}: CardEditorInterface) => {
  const [contentChanged, setContentChanged] = useState<boolean>(false);
  const [originalCard, setOriginalCard] = useState<CardInterface>(() => cloneDeep(card));
  const [tmpCard, setTmpCard] = useState<CardInterface>(() => cloneDeep(card));
  // Transient debounce handles for the live preview (short) and the DB
  // auto-save (longer, only fires once edits have settled). Kept in refs so
  // updating them never triggers a re-render.
  const timerId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveGenRef = useRef<number>(0);

  const [editBack, setEditBack] = useState<boolean>(false);

  const { dispatch, user, mechanics, currentUser } = useContext<StoreType>(Store);

  const canDeleteCard = currentUser.name === BJENNWARE;

  const getCurrentFace = (currentCard: CardInterface): CardFaceInterface => {
    if (currentCard.back && editBack) return currentCard.back;
    return currentCard.front;
  };

  const getValue = (key: string): any => {
    if (key === 'creator') return tmpCard[key].uuid;
    if (key === 'rarity' || key === 'manaCost') return tmpCard[key];
    if (key === 'comment') return tmpCard.meta[key];
    if (key === 'coverFit') return getCurrentFace(tmpCard).coverFit || CoverFit.Zoom;
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
      newTmpCard[key] = user.find(o => o.uuid === value) || UNKNOWN_CREATOR;
    } else if (key === 'rarity' || key === 'manaCost') {
      newTmpCard[key] = value;
    } else if (key === 'comment') {
      newTmpCard.meta[key] = value;
    } else {
      getCurrentFace(newTmpCard)[key] = value;
    }

    if (key === 'cardTypes') {
      const nextTypes: CardType[] = value || [];

      if (nextTypes.includes(CardType.BasicLand)) {
        const bl = getValue('basicLandType');
        if (
          ![
            BasicLandType.Plains,
            BasicLandType.Island,
            BasicLandType.Swamp,
            BasicLandType.Mountain,
            BasicLandType.Forest,
          ].includes(bl)
        ) {
          saveValue('basicLandType', BasicLandType.Plains);
        }
      }

      // Keep the current art style if it is still available for the new set of
      // card types; otherwise fall back to that type's Regular style.
      if (!isArtStyleAvailableForType(getValue('artStyle'), nextTypes)) {
        saveValue(
          'artStyle',
          nextTypes.includes(CardType.BasicLand)
            ? BasicLandArtStyles.Regular
            : CardArtStyles.Regular,
        );
      }
    }

    setTmpCard(newTmpCard);

    setContentChanged(true);

    if (timerId.current) clearTimeout(timerId.current);
    timerId.current = setTimeout(() => {
      saveTmpCard(newTmpCard);
    }, EDIT_TIME_OFFSET);

    if (saveTimerId.current) clearTimeout(saveTimerId.current);
    const saveGen = ++saveGenRef.current;
    saveTimerId.current = setTimeout(() => {
      updateCard(dispatch, cloneDeep(newTmpCard))
        .then(() => {
          // Only clear the "unsaved changes" marker if no newer edits are
          // pending; otherwise the parent would drop them from its preview.
          if (saveGen === saveGenRef.current) saveTmpCard(null);
        })
        .catch(() => {});
    }, EDIT_SAVE_OFFSET);
  };

  const undoChanges = () => {
    if (!contentChanged) return;

    if (timerId.current) clearTimeout(timerId.current);
    if (saveTimerId.current) clearTimeout(saveTimerId.current);
    setTmpCard(cloneDeep(originalCard));
    saveTmpCard(null);
    setContentChanged(false);
    updateCard(dispatch, cloneDeep(originalCard));
  };

  const confirmDeleteCard = () => {
    if (card.uuid === NO_CARD) return;

    Modal.confirm({
      title: `Delete "${card.name || 'this card'}"?`,
      content: 'This permanently deletes the card and cannot be undone.',
      okText: 'Yes, delete card',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        if (timerId.current) clearTimeout(timerId.current);
        if (saveTimerId.current) clearTimeout(saveTimerId.current);
        saveTmpCard(null);
        return deleteCard(dispatch, card.uuid);
      },
    });
  };

  useEffect(() => {
    if (
      isEqual(originalCard, tmpCard) &&
      isEqual(originalCard.front, tmpCard.front) &&
      isEqual(originalCard.back, tmpCard.back)
    ) {
      saveTmpCard(null);
      setContentChanged(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tmpCard]);

  useEffect(() => {
    setEditBack(false);
    setTmpCard(cloneDeep(card));
    setOriginalCard(cloneDeep(card));
    saveTmpCard(null);
    setContentChanged(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.uuid]);

  // Cancel any pending debounced preview/save if the editor unmounts.
  useEffect(
    () => () => {
      if (timerId.current) clearTimeout(timerId.current);
      if (saveTimerId.current) clearTimeout(saveTimerId.current);
    },
    [],
  );

  const types = (): string[] => getValue('cardTypes') || [];
  const isCreature = () => types().includes(CardType.Creature);
  const isArtifact = () => types().includes(CardType.Artifact);
  const isVehicle = () => isArtifact() && !!getValue('vehicle');
  const isPlaneswalker = () => types().includes(CardType.Planeswalker);
  const isLand = () => types().includes(CardType.Land) || types().includes(CardType.BasicLand);
  const hasMana = () =>
    !types().includes(CardType.Token) && !isLand() && !types().includes(CardType.Emblem);
  const showManaCost = () => hasMana() && !editBack;
  // Tokens take their colors from the explicit Token Colors selection instead
  // of a mana cost (a Token that is also a Land keeps deriving colors from its
  // rules text).
  const isColoredToken = () => types().includes(CardType.Token) && !types().includes(CardType.Land);

  const hasStats = () => isCreature() || isPlaneswalker() || isVehicle();

  const hasNickname = () =>
    getValue('artStyle') !== CardArtStyles.Invention &&
    getValue('artStyle') !== CardArtStyles.Invocation;

  let inputConfig: InputConfigInterface[] = [
    {
      key: 'artStyle',
      type: 'radio',
      name: 'Art Style',
      data: (Object.keys(CardArtStyles) as (keyof typeof CardArtStyles)[])
        .filter(style =>
          isArtStyleAvailableForType(CardArtStyles[style], getValue('cardTypes') || []),
        )
        .map(type => ({
          key: CardArtStyles[type],
          value: CardArtStyles[type],
        })),
      width: 100,
    },
    { key: 'name', type: 'input', name: 'Card Name', width: hasNickname() ? 50 : 100 },
    { key: 'nickname', type: 'input', name: 'Nickname', width: hasNickname() ? 50 : 0 },
    { key: 'cover', type: 'upload-input', name: 'Cover (URL)', width: 50 },
    {
      key: 'coverFit',
      type: 'select',
      name: 'Cover Fit',
      data: (Object.keys(CoverFit) as (keyof typeof CoverFit)[]).map(type => ({
        key: CoverFit[type],
        value: CoverFit[type],
      })),
      width: 50,
    },
    { key: 'legendary', type: 'bool', name: 'Legendary?', width: isArtifact() ? 50 : 100 },
    {
      key: 'vehicle',
      type: 'bool',
      name: 'Vehicle?',
      width: isArtifact() ? 50 : 0,
    },
    { key: 'manaCost', type: 'input', name: 'Mana Cost', width: showManaCost() ? 50 : 0 },
    {
      key: 'tokenColors',
      type: 'multi-select',
      name: 'Token Colors',
      data: (Object.keys(ColorType) as (keyof typeof ColorType)[])
        .filter(
          colorKey =>
            ColorType[colorKey] !== ColorType.Colorless && ColorType[colorKey] !== ColorType.Gold,
        )
        .map(type => ({
          key: ColorType[type],
          value: `${ColorType[type].charAt(0).toUpperCase()}${ColorType[type].slice(1)}`,
        })),
      width: isColoredToken() ? 100 : 0,
    },
    {
      key: 'rarity',
      type: 'select',
      name: 'Rarity',
      data: (Object.keys(RarityType) as (keyof typeof RarityType)[]).map(type => ({
        key: RarityType[type],
        value: RarityType[type],
      })),
      // The rarity is card-level and only editable on the front face; the
      // card render still shows it on the back face.
      width: editBack ? 0 : showManaCost() ? 50 : 100,
    },
    {
      key: 'cardTypes',
      type: 'multi-select',
      name: 'Card Types',
      data: (Object.keys(CardType) as (keyof typeof CardType)[]).map(type => ({
        key: CardType[type],
        value: CardType[type],
      })),
      width: 100,
    },
    { key: 'cardSubTypes', type: 'input', name: 'Card Sub Types', width: 50 },
    {
      key: 'cardText',
      type: isPlaneswalker() ? 'split-list' : 'text-list',
      name: 'Card Text',
      width: 100,
    },
    { key: 'flavourText', type: 'area', name: 'Flavour Text', width: isPlaneswalker() ? 0 : 100 },
    {
      key: 'flavourAuthor',
      type: 'input',
      name: 'Flavour Text Author',
      width: isPlaneswalker() ? 0 : 100,
    },
    {
      key: 'cardStats',
      type: isPlaneswalker() ? 'input' : 'split-input',
      name: isPlaneswalker() ? 'Loyalty' : 'Power/Toughness',
      width: hasStats() ? 50 : 0,
    },
    {
      key: 'creator',
      type: 'select',
      name: 'Card Creator',
      data: user.filter(u => u.name !== 'ADMIN').map(o => ({ key: o.uuid, value: o.name })),
      width: hasStats() ? 50 : 100,
    },
    // { key: 'comment', type: 'area', name: 'Comment' },
  ];

  if ((getValue('cardTypes') || []).includes(CardType.BasicLand)) {
    inputConfig = [
      {
        key: 'artStyle',
        type: 'radio',
        name: 'Art Style',
        data: (Object.keys(BasicLandArtStyles) as (keyof typeof BasicLandArtStyles)[]).map(
          type => ({
            key: BasicLandArtStyles[type],
            value: BasicLandArtStyles[type],
          }),
        ),
        width: 100,
      },
      { key: 'cover', type: 'upload-input', name: 'Cover (URL)', width: 50 },
      {
        key: 'coverFit',
        type: 'select',
        name: 'Cover Fit',
        data: (Object.keys(CoverFit) as (keyof typeof CoverFit)[]).map(type => ({
          key: CoverFit[type],
          value: CoverFit[type],
        })),
        width: 50,
      },
      {
        key: 'cardTypes',
        type: 'multi-select',
        name: 'Card Types',
        data: (Object.keys(CardType) as (keyof typeof CardType)[]).map(type => ({
          key: CardType[type],
          value: CardType[type],
        })),
        width: 100,
      },
      {
        key: 'basicLandType',
        type: 'select',
        name: 'Land Types',
        data: (Object.keys(BasicLandType) as (keyof typeof BasicLandType)[]).map(type => ({
          key: BasicLandType[type],
          value: BasicLandType[type],
        })),
        width: 100,
      },
      {
        key: 'creator',
        type: 'select',
        name: 'Card Creator',
        data: user.filter(u => u.name !== 'ADMIN').map(o => ({ key: o.uuid, value: o.name })),
        width: hasStats() ? 50 : 100,
      },
      // { key: 'comment', type: 'area', name: 'Comment' },
    ];
  }

  if (card.uuid === NO_CARD)
    return (
      <div className={styles.noCard}>
        <span>Click on a card to start the editor!</span>
      </div>
    );

  const addBackFace = () => {
    const newTmpCard = { ...tmpCard };
    newTmpCard.back = {
      name: '',
      cardText: [],
      cardTypes: [CardType.Creature],
      manaCost: '',
    };

    setTmpCard(newTmpCard);
    saveTmpCard(newTmpCard);
    setContentChanged(true);
    // Clear the parent's "unsaved changes" marker once the save lands,
    // matching the debounced saveValue path. Without this the freshly
    // saved card stays pinned as tmpCard and the app keeps warning about
    // (already-saved) unsaved changes.
    updateCard(dispatch, cloneDeep(newTmpCard))
      .then(() => saveTmpCard(null))
      .catch(() => {});
  };

  const deleteBackFace = () => {
    const newTmpCard = { ...tmpCard };
    delete newTmpCard.back;
    setTmpCard(newTmpCard);
    saveTmpCard(newTmpCard);
    setContentChanged(true);
    updateCard(dispatch, cloneDeep(newTmpCard))
      .then(() => saveTmpCard(null))
      .catch(() => {});
  };

  return (
    <div className={styles.editor}>
      <canvas id="cover-resize-canvas" className={styles.canvas} />
      <Row>
        <div className={styles.fullField}>
          <Space.Compact className={styles.smallButtonGroup} size="small">
            {card.back && editBack && (
              <Button onClick={() => setEditBack(false)}>
                <span>Edit Front Face</span>
              </Button>
            )}
            {card.back && !editBack && (
              <Button onClick={() => setEditBack(true)}>
                <span>Edit Back Face</span>
              </Button>
            )}
            {card.back && (
              <Button onClick={deleteBackFace} danger>
                <span>Delete Back Face</span>
              </Button>
            )}
            {!card.back && <Button onClick={addBackFace}>Add Back Face</Button>}
          </Space.Compact>
        </div>
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
                mechanics={mechanics}
              />
            </div>
          );
        })}
      </Row>
      <Row>
        <div className={styles.fullField}>
          <Space.Compact className={styles.buttonGroup} size="small">
            <Button disabled={!contentChanged} onClick={undoChanges} danger>
              <span>Undo Changes</span>
            </Button>
            {canDeleteCard && (
              <Button onClick={confirmDeleteCard} danger>
                <span>Delete Card</span>
              </Button>
            )}
          </Space.Compact>
        </div>
      </Row>
    </div>
  );
};

export default CardEditor;
