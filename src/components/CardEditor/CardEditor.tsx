import React, {useContext, useEffect, useRef, useState} from 'react';
import {Button, Row, Space} from 'antd';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import dayjs from 'dayjs';
import CardInterface from '../../interfaces/CardInterface';

import styles from './styles.module.scss';
import {
    BasicLandArtStyles,
    BasicLandType,
    CardArtStyles,
    CardMainType,
    CardState,
    RarityType,
} from '../../interfaces/enums';
import EditField from './EditField';

import CardFaceInterface from '../../interfaces/CardFaceInterface';
import EditorTooltip from '../EditorTooltip/EditorTooltip';
import {updateCard} from '../../actions/cardActions';
import {Store, StoreType} from '../../store';
import {EDIT_SAVE_OFFSET, EDIT_TIME_OFFSET, UNKNOWN_CREATOR} from '../../utils/constants';

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

    const {dispatch, user} = useContext<StoreType>(Store);

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
        const newTmpCard = {...tmpCard};
        if (key === 'name') {
            getCurrentFace(newTmpCard)[key] = value;
            if (newTmpCard.back) {
                newTmpCard.name = `${newTmpCard.front.name} // ${newTmpCard.back.name}`;
            } else {
                newTmpCard.name = `${newTmpCard.front.name}`;
            }
        } else if (key === 'creator') {
            newTmpCard[key] = user.find((o) => o.uuid === value) || UNKNOWN_CREATOR;
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
                getValue('artStyle') !== CardArtStyles.Invocation &&
                !(getValue('artStyle') === CardArtStyles.Invention &&
                    (value === CardMainType.Artifact || value === CardMainType.ArtifactCreature))
            ) {
                saveValue('artStyle', CardArtStyles.Regular);
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
                .catch(() => {
                });
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

    const isCreature = () =>
        getValue('cardMainType') === CardMainType.Creature ||
        getValue('cardMainType') === CardMainType.ArtifactCreature ||
        getValue('cardMainType') === CardMainType.CreatureToken;
    const isPlaneswalker = () => getValue('cardMainType') === CardMainType.Planeswalker;
    const hasMana = () =>
        getValue('cardMainType') !== CardMainType.ArtifactToken &&
        getValue('cardMainType') !== CardMainType.CreatureToken &&
        getValue('cardMainType') !== CardMainType.Land &&
        getValue('cardMainType') !== CardMainType.Emblem;

    const hasStats = () => isCreature() || isPlaneswalker();

    let inputConfig: InputConfigInterface[] = [
        {
            key: 'artStyle',
            type: 'radio',
            name: 'Art Style',
            data: (Object.keys(CardArtStyles) as (keyof typeof CardArtStyles)[])
                .filter((style) => {
                        if (style === CardArtStyles.Invention) {
                            return (
                                getValue('cardMainType') === CardMainType.Artifact ||
                                getValue('cardMainType') === CardMainType.ArtifactCreature
                            );
                        }
                        if (style !== CardArtStyles.Regular) {
                            return (
                                getValue('cardMainType') !== CardMainType.Planeswalker &&
                                getValue('cardMainType') !== CardMainType.Land &&
                                getValue('cardMainType') !== CardMainType.CreatureToken &&
                                getValue('cardMainType') !== CardMainType.ArtifactToken
                            );
                        } else {
                            return true;
                        }
                    }
                )
                .map((type) => ({
                    key: CardArtStyles[type],
                    value: CardArtStyles[type],
                })),
            width: 100,
        },
        {key: 'name', type: 'input', name: 'Card Name', width: 50},
        {key: 'cover', type: 'upload-input', name: 'Cover (URL)', width: 50},
        {key: 'legendary', type: 'bool', name: 'Legendary?', width: 100},
        {key: 'manaCost', type: 'input', name: 'Mana Cost', width: hasMana() ? 50 : 0},
        {
            key: 'rarity',
            type: 'select',
            name: 'Rarity',
            data: (Object.keys(RarityType) as (keyof typeof RarityType)[]).map((type) => ({
                key: RarityType[type],
                value: RarityType[type],
            })),
            width: hasMana() ? 50 : 100,
        },
        {
            key: 'cardMainType',
            type: 'select',
            name: 'Card Type',
            data: (Object.keys(CardMainType) as (keyof typeof CardMainType)[]).map((type) => ({
                key: CardMainType[type],
                value: CardMainType[type],
            })),
            width: 50,
        },
        {key: 'cardSubTypes', type: 'input', name: 'Card Sub Types', width: 50},
        {key: 'cardText', type: isPlaneswalker() ? 'split-list' : 'list', name: 'Card Text', width: 100},
        {key: 'flavourText', type: 'area', name: 'Flavour Text', width: isPlaneswalker() ? 0 : 100},
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
            data: user.filter((u) => u.name !== 'ADMIN').map((o) => ({key: o.uuid, value: o.name})),
            width: hasStats() ? 50 : 100,
        },
        // { key: 'comment', type: 'area', name: 'Comment' },
    ];

    if (getValue('cardMainType') === CardMainType.BasicLand) {
        inputConfig = [
            {
                key: 'artStyle',
                type: 'radio',
                name: 'Art Style',
                data: (Object.keys(BasicLandArtStyles) as (keyof typeof BasicLandArtStyles)[]).map(
                    (type) => ({
                        key: BasicLandArtStyles[type],
                        value: BasicLandArtStyles[type],
                    }),
                ),
                width: 100,
            },
            {key: 'cover', type: 'upload-input', name: 'Cover (URL)'},
            {
                key: 'cardMainType',
                type: 'select',
                name: 'Card Type',
                data: (Object.keys(CardMainType) as (keyof typeof CardMainType)[]).map((type) => ({
                    key: CardMainType[type],
                    value: CardMainType[type],
                })),
                width: 100,
            },
            {
                key: 'cardSubTypes',
                type: 'select',
                name: 'Land Types',
                data: (Object.keys(BasicLandType) as (keyof typeof BasicLandType)[]).map((type) => ({
                    key: BasicLandType[type],
                    value: BasicLandType[type],
                })),
                width: 100,
            },
            {
                key: 'creator',
                type: 'select',
                name: 'Card Creator',
                data: user.filter((u) => u.name !== 'ADMIN').map((o) => ({key: o.uuid, value: o.name})),
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
        const newTmpCard = {...tmpCard};
        newTmpCard.back = {
            name: '',
            cardText: [],
            cardMainType: CardMainType.Creature,
            manaCost: '',
        };

        setTmpCard(newTmpCard);
        saveTmpCard(newTmpCard);
        setContentChanged(true);
        updateCard(dispatch, cloneDeep(newTmpCard));
    };

    const deleteBackFace = () => {
        const newTmpCard = {...tmpCard};
        delete newTmpCard.back;
        setTmpCard(newTmpCard);
        saveTmpCard(newTmpCard);
        setContentChanged(true);
        updateCard(dispatch, cloneDeep(newTmpCard));
    };

    return (
        <div className={styles.editor}>
            <canvas id="cover-resize-canvas" className={styles.canvas}/>
            <Row>
                <div className={styles.fullField}>
                    <Space.Compact className={styles.smallButtonGroup} size="small">
                        {card.back && editBack && (
                            <Button ghost onClick={() => setEditBack(false)}>
                                <span>Edit Front Face</span>
                            </Button>
                        )}
                        {card.back && !editBack && (
                            <Button ghost onClick={() => setEditBack(true)}>
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
                {inputConfig.map((config) => {
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
                <div className={styles.fullField}>
                    <Space.Compact className={styles.buttonGroup} size="small">
                        <Button disabled={!contentChanged} onClick={undoChanges} danger>
                            <span>Undo Changes</span>
                        </Button>
                    </Space.Compact>
                </div>
            </Row>
        </div>
    );
};

export default CardEditor;
