import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Button, ConfigProvider, Flex, Modal, Row } from 'antd';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import dayjs from 'dayjs';
import CardInterface from '../../interfaces/CardInterface';

import styles from './styles.module.scss';
import {
  AdventureType,
  BasicLandArtStyles,
  BasicLandType,
  CardArtStyles,
  CardType,
  CardState,
  ColorType,
  CoverFit,
  OmenType,
  PreparedType,
  RarityType,
} from '../../interfaces/enums';
import EditField from './EditField';
import { MUTUALLY_EXCLUSIVE_CARD_TYPES, resolveExclusiveCardTypes } from '../../utils/cardTypes';
import { getAutomaticCardTags, getCardTags, updateCardTags } from '../../utils/cardTags';
import { createTag } from '../../actions/tagActions';

import CardFaceInterface from '../../interfaces/CardFaceInterface';
import { createCardVariant, deleteCard, updateCard } from '../../actions/cardActions';
import { withLatestVariantIds } from '../../utils/cardVariants';
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
  // Immediate draft tracking, separate from the debounced collection preview.
  onDraftChange?: (card: CardInterface | null) => void;
}

const NO_CARD = '-1';

// The set-themed Alternate Art showcases (ELD, more to come) are
// adventure-only.
const ALTERNATE_ART_STYLES: string[] = [CardArtStyles.EldAlternateArt];

// Card types that exist in the data model but must not be offered in the
// Card Types multi-select.
const HIDDEN_CARD_TYPES = new Set([CardType.Aftermath, CardType.SplitCard]);

// Single source of truth for which art styles may be selected for a given set
// of card types. Used both to build the Art Style radio options and to decide
// whether the current art style can be kept when the card types change.
const isArtStyleAvailableForType = (artStyle: string, cardTypes: CardType[] = []): boolean => {
  if (cardTypes.includes(CardType.BasicLand)) {
    return (Object.values(BasicLandArtStyles) as string[]).includes(artStyle);
  }
  if (cardTypes.includes(CardType.Evolution)) return artStyle === CardArtStyles.Regular;
  if (artStyle === CardArtStyles.Invocation) return false;
  // Invention is artifact-only and unavailable for the mutually exclusive
  // showcase types (Adventure/Omen/Split Card/Aftermath/Prepared/Planeswalker).
  if (artStyle === CardArtStyles.Invention) {
    return (
      cardTypes.includes(CardType.Artifact) &&
      !MUTUALLY_EXCLUSIVE_CARD_TYPES.some(t => cardTypes.includes(t))
    );
  }
  if (artStyle !== CardArtStyles.Regular) {
    if (cardTypes.includes(CardType.Token)) return false;
    // Planeswalkers only support the Borderless showcase frames, not the other
    // non-regular art styles.
    if (cardTypes.includes(CardType.Planeswalker)) return artStyle === CardArtStyles.Borderless;
    // The Alternate Art showcases are adventure-only.
    if (ALTERNATE_ART_STYLES.includes(artStyle)) return cardTypes.includes(CardType.Adventure);
    // Adventures and omens support the Extended art style, but no other
    // non-regular art styles (Borderless is disabled for them; omens have no
    // borderless frames at all).
    if (
      cardTypes.includes(CardType.Omen) ||
      cardTypes.includes(CardType.Adventure) ||
      cardTypes.includes(CardType.Prepared)
    ) {
      return artStyle === CardArtStyles.Extended;
    }
  }
  return true;
};

// The Adventure section configures the spell half of an Adventure card. It
// is spliced into the field list only when the current face is an Adventure
// (rendering it hidden would duplicate generic queries like the "Add
// Mechanic" placeholder of the text-list footer).
const adventureSectionConfig: InputConfigInterface[] = [
  { key: 'adventureSection', type: 'divider', name: 'Adventure', width: 100 },
  { key: 'adventureName', type: 'input', name: 'Name', width: 50 },
  { key: 'adventureCost', type: 'input', name: 'Cost', width: 50 },
  {
    key: 'adventureType',
    type: 'select',
    name: 'Type',
    // An adventure is only ever an Instant or a Sorcery.
    data: (Object.keys(AdventureType) as (keyof typeof AdventureType)[]).map(type => ({
      key: AdventureType[type],
      value: AdventureType[type],
    })),
    width: 100,
  },
  { key: 'adventureText', type: 'text-list', name: 'Text', width: 100 },
];

// The Omen section configures the spell half of an Omen card, mirroring the
// Adventure section. It is spliced into the field list only when the current
// face is an Omen.
const omenSectionConfig: InputConfigInterface[] = [
  { key: 'omenSection', type: 'divider', name: 'Omen', width: 100 },
  { key: 'omenName', type: 'input', name: 'Name', width: 50 },
  { key: 'omenCost', type: 'input', name: 'Cost', width: 50 },
  {
    key: 'omenType',
    type: 'select',
    name: 'Type',
    // An omen is only ever an Instant or a Sorcery.
    data: (Object.keys(OmenType) as (keyof typeof OmenType)[]).map(type => ({
      key: OmenType[type],
      value: OmenType[type],
    })),
    width: 100,
  },
  { key: 'omenText', type: 'text-list', name: 'Text', width: 100 },
];

// The Prepared section configures the spell half of a Prepared card,
// mirroring the Adventure and Omen sections. It is spliced into the field
// list only when the current face is a Prepared card.
const prepareSectionConfig: InputConfigInterface[] = [
  { key: 'prepareSection', type: 'divider', name: 'Prepared', width: 100 },
  { key: 'prepareName', type: 'input', name: 'Name', width: 50 },
  { key: 'prepareCost', type: 'input', name: 'Cost', width: 50 },
  {
    key: 'prepareType',
    type: 'select',
    name: 'Type',
    // A prepared spell is only ever an Instant or a Sorcery.
    data: (Object.keys(PreparedType) as (keyof typeof PreparedType)[]).map(type => ({
      key: PreparedType[type],
      value: PreparedType[type],
    })),
    width: 100,
  },
  { key: 'prepareText', type: 'text-list', name: 'Text', width: 100 },
];

const getEvolutionSectionConfig = (includeStats: boolean): InputConfigInterface[] => {
  const section1: InputConfigInterface[] = [
    { key: 'evolutionSection1', type: 'divider', name: 'Level 1', width: 100 },
    {
      key: 'level1Indicator',
      pairedFieldKey: 'level1Text',
      type: 'paired-text',
      name: 'Level / Card Text',
      width: 100,
    },
  ];
  if (includeStats) {
    section1.push({
      key: 'level1Stats',
      type: 'split-input',
      name: 'Power/Toughness',
      width: 50,
    });
  }
  const section2: InputConfigInterface[] = [
    { key: 'evolutionSection2', type: 'divider', name: 'Level 2', width: 100 },
    {
      key: 'level2Indicator',
      pairedFieldKey: 'level2Text',
      type: 'paired-text',
      name: 'Level / Card Text',
      width: 100,
    },
  ];

  if (includeStats) {
    section2.push({
      key: 'level2Stats',
      type: 'split-input',
      name: 'Power/Toughness',
      width: 50,
    });
  }

  return [...section1, ...section2];
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
    | 'paired-text'
    | 'upload-input'
    | 'select'
    | 'multi-select'
    | 'area'
    | 'radio'
    | 'list'
    | 'split-list'
    | 'text-list'
    | 'bool'
    | 'divider';
  name: string;
  pairedFieldKey?: string;
  data?: { key: string; value: string }[];
  disabledKeys?: string[];
  allowCreate?: boolean;
  nonRemovableValues?: string[];
  width?: number;
}

// Rating status/votes are edited in the modal, not in this editor's draft.
// Keep the editable comment while taking the remaining metadata from the store.
const withLatestMetadata = (draft: CardInterface, cards: CardInterface[]): CardInterface => {
  const latest = cards.find(card => card.uuid === draft.uuid);
  return latest ? { ...draft, meta: { ...latest.meta, comment: draft.meta.comment } } : draft;
};

const CardEditor: React.FC<CardEditorInterface> = ({
  card = dummyCard,
  saveTmpCard: savePreview,
  onDraftChange,
}: CardEditorInterface) => {
  const saveTmpCard = (draft: CardInterface | null) => {
    const current = draft ? withLatestMetadata(draft, collectionRef.current) : null;
    onDraftChange?.(current);
    savePreview(current);
  };
  const [contentChanged, setContentChanged] = useState<boolean>(false);
  const [originalCard, setOriginalCard] = useState<CardInterface>(() => cloneDeep(card));
  const [storedTmpCard, setTmpCard] = useState<CardInterface>(() => cloneDeep(card));
  // Transient debounce handles for the live preview (short) and the DB
  // auto-save (longer, only fires once edits have settled). Kept in refs so
  // updating them never triggers a re-render.
  const timerId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveGenRef = useRef<number>(0);

  const [editBack, setEditBack] = useState<boolean>(false);
  const [creatingVariant, setCreatingVariant] = useState(false);
  const creatingVariantRef = useRef(false);
  const inFlightSaves = useRef(new Set<Promise<unknown>>());

  const { dispatch, user, mechanics, tags, currentUser, cards } = useContext<StoreType>(Store);
  const tmpCard = useMemo(() => withLatestMetadata(storedTmpCard, cards), [storedTmpCard, cards]);
  const collectionRef = useRef(cards);
  collectionRef.current = cards;

  const saveEditorSnapshot = (snapshot: CardInterface): Promise<unknown> => {
    const saving = updateCard(
      dispatch,
      cloneDeep(
        withLatestMetadata(
          withLatestVariantIds(snapshot, collectionRef.current),
          collectionRef.current,
        ),
      ),
    );
    inFlightSaves.current.add(saving);
    saving.then(
      () => inFlightSaves.current.delete(saving),
      () => inFlightSaves.current.delete(saving),
    );
    return saving;
  };

  const createVariant = async () => {
    if (creatingVariantRef.current || card.uuid === NO_CARD) return;
    creatingVariantRef.current = true;
    setCreatingVariant(true);
    if (timerId.current) clearTimeout(timerId.current);
    if (saveTimerId.current) clearTimeout(saveTimerId.current);
    saveGenRef.current += 1;
    const snapshot = cloneDeep(tmpCard);
    try {
      // An older in-flight PUT must finish before reciprocal links are written.
      await Promise.all([...inFlightSaves.current]);
      await createCardVariant(
        dispatch,
        withLatestVariantIds(snapshot, collectionRef.current),
        collectionRef.current,
        currentUser,
      );
      setOriginalCard(cloneDeep(snapshot));
      setContentChanged(false);
      saveTmpCard(null);
    } catch {
      // Actions report persistence failures. Keep the editable draft for retry.
      saveTmpCard(snapshot);
    } finally {
      creatingVariantRef.current = false;
      setCreatingVariant(false);
    }
  };

  const canDeleteCard = currentUser.name === BJENNWARE || card.creator.uuid === currentUser.uuid;
  const canFavoriteCard = card.uuid !== NO_CARD && card.creator.uuid === currentUser.uuid;

  const getCurrentFace = (currentCard: CardInterface): CardFaceInterface => {
    if (currentCard.back && editBack) return currentCard.back;
    return currentCard.front;
  };

  const getValue = (key: string): any => {
    if (key === 'creator') return tmpCard[key].uuid;
    if (key === 'rarity' || key === 'manaCost') return tmpCard[key];
    if (key === 'comment') return tmpCard.meta[key];
    if (key === 'coverFit') return getCurrentFace(tmpCard).coverFit || CoverFit.Zoom;
    if (key === 'tags') return getCardTags(tmpCard, mechanics);
    return getCurrentFace(tmpCard)[key];
  };

  const saveValue = (key: string, value: any) => {
    const previousCard = cloneDeep(tmpCard);
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
    } else if (key === 'tags') {
      newTmpCard.tags = value;
      value.forEach((tag: string) => createTag(dispatch, tag));
    } else {
      getCurrentFace(newTmpCard)[key] = value;
    }

    newTmpCard.tags = updateCardTags(previousCard, newTmpCard, mechanics);

    if (key === 'cardTypes') {
      const previousTypes: CardType[] = getCurrentFace(tmpCard).cardTypes || [];
      const nextTypes: CardType[] = resolveExclusiveCardTypes(value || [], previousTypes);

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

      // An adventure's spell half must be an Instant or a Sorcery; default
      // to Instant when the Adventure type is added without one (mirrors the
      // basicLandType defaulting above).
      if (nextTypes.includes(CardType.Adventure)) {
        const at = getValue('adventureType');
        if (at !== AdventureType.Instant && at !== AdventureType.Sorcery) {
          saveValue('adventureType', AdventureType.Instant);
        }
      }

      // An omen's spell half must be an Instant or a Sorcery too; default to
      // Instant when the Omen type is added without one.
      if (nextTypes.includes(CardType.Omen)) {
        const ot = getValue('omenType');
        if (ot !== OmenType.Instant && ot !== OmenType.Sorcery) {
          saveValue('omenType', OmenType.Instant);
        }
      }

      // A prepared spell half must be an Instant or a Sorcery too; default
      // to Instant when the Prepared type is added without one.
      if (nextTypes.includes(CardType.Prepared)) {
        const pt = getValue('prepareType');
        if (pt !== PreparedType.Instant && pt !== PreparedType.Sorcery) {
          saveValue('prepareType', PreparedType.Instant);
        }
      }

      // Automatic art style switch when the current style is no longer
      // available for the new set of card types: adding Adventure replaces
      // the Borderless showcase with the ELD alternate style (Extended stays
      // available); removing Adventure falls back from the alternate
      // showcases to Extended; anything else falls back to that type's
      // Regular style.
      if (!isArtStyleAvailableForType(getValue('artStyle'), nextTypes)) {
        const currentArtStyle = getValue('artStyle');
        if (
          nextTypes.includes(CardType.Adventure) &&
          (currentArtStyle === CardArtStyles.Borderless ||
            currentArtStyle === CardArtStyles.Extended)
        ) {
          saveValue('artStyle', CardArtStyles.EldAlternateArt);
        } else if (
          !nextTypes.includes(CardType.Adventure) &&
          ALTERNATE_ART_STYLES.includes(currentArtStyle) &&
          isArtStyleAvailableForType(CardArtStyles.Extended, nextTypes)
        ) {
          saveValue('artStyle', CardArtStyles.Extended);
        } else {
          saveValue(
            'artStyle',
            nextTypes.includes(CardType.BasicLand)
              ? BasicLandArtStyles.Regular
              : CardArtStyles.Regular,
          );
        }
      }
    }

    setTmpCard(newTmpCard);

    onDraftChange?.(newTmpCard);
    setContentChanged(true);

    if (timerId.current) clearTimeout(timerId.current);
    timerId.current = setTimeout(() => {
      saveTmpCard(newTmpCard);
    }, EDIT_TIME_OFFSET);

    if (saveTimerId.current) clearTimeout(saveTimerId.current);
    const saveGen = ++saveGenRef.current;
    saveTimerId.current = setTimeout(() => {
      saveEditorSnapshot(newTmpCard)
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
    const restored = withLatestVariantIds(cloneDeep(originalCard), collectionRef.current);
    setTmpCard(restored);
    saveTmpCard(null);
    setContentChanged(false);
    saveEditorSnapshot(restored).catch(() => {});
  };

  const confirmDeleteCard = () => {
    if (card.uuid === NO_CARD) return;

    Modal.confirm({
      title: `Delete "${card.name || 'this card'}"?`,
      content: 'This permanently deletes the card and cannot be undone.',
      okText: 'Yes, delete card',
      okType: 'danger',
      cancelText: 'Cancel',
      async onOk() {
        if (timerId.current) clearTimeout(timerId.current);
        if (saveTimerId.current) clearTimeout(saveTimerId.current);
        saveGenRef.current += 1;
        await Promise.all([...inFlightSaves.current]);
        saveTmpCard(null);
        return deleteCard(dispatch, card.uuid, collectionRef.current);
      },
    });
  };

  const toggleFavorite = () => {
    const updatedCard = { ...tmpCard, favorite: !tmpCard.favorite };

    // Persist immediately. Also cancel any pending debounced save so it cannot
    // overwrite the favorite flag with an older snapshot of the card.
    if (timerId.current) clearTimeout(timerId.current);
    if (saveTimerId.current) clearTimeout(saveTimerId.current);
    saveGenRef.current += 1;
    setTmpCard(updatedCard);
    setOriginalCard(cloneDeep(updatedCard));
    setContentChanged(false);
    saveTmpCard(null);
    saveEditorSnapshot(updatedCard).catch(() => {});
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
    if (timerId.current) clearTimeout(timerId.current);
    if (saveTimerId.current) clearTimeout(saveTimerId.current);
    saveGenRef.current += 1;
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
  const isAdventure = () => types().includes(CardType.Adventure);
  const isOmen = () => types().includes(CardType.Omen);
  const isPrepared = () => types().includes(CardType.Prepared);
  const isEvolution = () => types().includes(CardType.Evolution);
  const hasMana = () =>
    !types().includes(CardType.Token) && !isLand() && !types().includes(CardType.Emblem);
  const showManaCost = () => hasMana() && !editBack;
  // Tokens take their colors from the explicit Token Colors selection instead
  // of a mana cost (a Token that is also a Land keeps deriving colors from its
  // rules text).
  const isColoredToken = () => types().includes(CardType.Token) && !types().includes(CardType.Land);
  const showColorIdentity = () => !tmpCard.manaCost && !isColoredToken();

  const hasStats = () => isCreature() || isPlaneswalker() || isVehicle();

  const hasNickname = () =>
    getValue('artStyle') !== CardArtStyles.Invention &&
    getValue('artStyle') !== CardArtStyles.Invocation;

  // With one member of the exclusive group selected, the other members become
  // unselectable in the Card Types multi-select.
  const exclusiveDisabledKeys = types().some(t =>
    MUTUALLY_EXCLUSIVE_CARD_TYPES.includes(t as CardType),
  )
    ? MUTUALLY_EXCLUSIVE_CARD_TYPES.filter(t => !types().includes(t as CardType))
    : [];

  const cardTypeOptions = (Object.keys(CardType) as (keyof typeof CardType)[])
    .filter(type => !HIDDEN_CARD_TYPES.has(CardType[type]))
    .map(type => ({
      key: CardType[type],
      value: CardType[type],
    }))
    .sort((a, b) => a.value.localeCompare(b.value));

  const tagOptions = [
    ...new Set([
      ...(tags || []),
      ...(tmpCard.tags || []),
      ...mechanics.map(mechanic => mechanic.name),
    ]),
  ]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .map(tag => ({ key: tag, value: tag }));
  const automaticTags = getAutomaticCardTags(tmpCard, mechanics);

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
    {
      key: 'tags',
      type: 'multi-select',
      name: 'Tags',
      data: tagOptions,
      allowCreate: true,
      nonRemovableValues: automaticTags,
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
    ...(showColorIdentity()
      ? [
          {
            key: 'colorIdentity',
            type: 'multi-select' as const,
            name: 'Color Identity',
            data: [
              ColorType.White,
              ColorType.Blue,
              ColorType.Black,
              ColorType.Red,
              ColorType.Green,
            ].map(color => ({
              key: color,
              value: `${color.charAt(0).toUpperCase()}${color.slice(1)}`,
            })),
            width: 100,
          },
        ]
      : []),
    {
      key: 'cardTypes',
      type: 'multi-select',
      name: 'Card Types',
      data: cardTypeOptions,
      disabledKeys: exclusiveDisabledKeys,
      width: 100,
    },
    { key: 'cardSubTypes', type: 'input', name: 'Card Sub Types', width: 100 },
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
    // Evolution is mutually exclusive with Creature, but still owns level-specific P/T fields.
    ...(isEvolution() ? getEvolutionSectionConfig(hasStats()) : []),
    ...(isAdventure() ? adventureSectionConfig : []),
    ...(isOmen() ? omenSectionConfig : []),
    ...(isPrepared() ? prepareSectionConfig : []),
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
        data: cardTypeOptions,
        disabledKeys: exclusiveDisabledKeys,
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
    const saveGen = ++saveGenRef.current;
    saveEditorSnapshot(newTmpCard)
      .then(() => {
        if (saveGen === saveGenRef.current) saveTmpCard(null);
      })
      .catch(() => {});
  };

  const deleteBackFace = () => {
    const newTmpCard = { ...tmpCard };
    delete newTmpCard.back;
    setTmpCard(newTmpCard);
    saveTmpCard(newTmpCard);
    setContentChanged(true);
    const saveGen = ++saveGenRef.current;
    saveEditorSnapshot(newTmpCard)
      .then(() => {
        if (saveGen === saveGenRef.current) saveTmpCard(null);
      })
      .catch(() => {});
  };

  return (
    <ConfigProvider componentDisabled={creatingVariant}>
      <div className={styles.editor}>
        <canvas id="cover-resize-canvas" className={styles.canvas} />
        <Row>
          <div className={`${styles.fullField} ${styles.actionField}`}>
            <Flex className={styles.smallButtonGroup} wrap gap={4}>
              {canFavoriteCard && (
                <Button size="small" onClick={toggleFavorite}>
                  {tmpCard.favorite ? 'Unmark as favorite' : 'Mark as favorite'}
                </Button>
              )}
              <Button
                size="small"
                aria-label="Create Variant"
                onClick={createVariant}
                loading={creatingVariant}
              >
                Create Variant
              </Button>
              {card.back && editBack && (
                <Button size="small" onClick={() => setEditBack(false)}>
                  <span>Edit Front Face</span>
                </Button>
              )}
              {card.back && !editBack && (
                <Button size="small" onClick={() => setEditBack(true)}>
                  <span>Edit Back Face</span>
                </Button>
              )}
              {card.back && (
                <Button size="small" onClick={deleteBackFace} danger>
                  <span>Delete Back Face</span>
                </Button>
              )}
              {!card.back && (
                <Button size="small" onClick={addBackFace}>
                  Add Back Face
                </Button>
              )}
            </Flex>
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
                  pairedFieldKey={config.pairedFieldKey}
                  data={config.data}
                  disabledKeys={config.disabledKeys}
                  name={config.name}
                  allowCreate={config.allowCreate}
                  nonRemovableValues={config.nonRemovableValues}
                  saveValue={saveValue}
                  getValue={getValue}
                />
              </div>
            );
          })}
        </Row>
        <Row>
          <div className={`${styles.fullField} ${styles.actionField}`}>
            <Flex className={styles.buttonGroup} wrap gap={4}>
              <Button size="small" disabled={!contentChanged} onClick={undoChanges} danger>
                <span>Undo Changes</span>
              </Button>
              {canDeleteCard && (
                <Button size="small" onClick={confirmDeleteCard} danger>
                  <span>Delete Card</span>
                </Button>
              )}
            </Flex>
          </div>
        </Row>
      </div>
    </ConfigProvider>
  );
};

export default CardEditor;
