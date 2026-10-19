import React, { useEffect, useMemo, useState } from 'react';
import { Checkbox, Input, Row, Slider } from 'antd';
import { CardType, ColorType, mapEnum, RarityType } from '../../interfaces/enums';

import styles from './styles.module.scss';
import CardInterface from '../../interfaces/CardInterface';
import cardToColor from '../../utils/cardToColor';
import { UNKNOWN_CREATOR } from '../../utils/constants';
import Mana from '../Mana/Mana.tsx';
import { getAvailableCardTags, getInitialTagFilterState } from '../../utils/cardTagFilter';
import { getRarityIcon } from '../TemplatingCardRender/assetLoader';

export interface CollectionFilterInterface {
  colors: CheckBoxGroupInterface;
  rarity: CheckBoxGroupInterface;
  types: CheckBoxGroupInterface;
  creators: CheckBoxGroupInterface;
  tags: CheckBoxGroupInterface;
}

interface CollectionFilterControlsInterface {
  setCollectionColSpan?: (span: number) => void;
  setCollectionFilter?: (filter: CollectionFilterInterface) => void;
  collection: CardInterface[];
  availableTags?: string[];
  setNameFilter: (filter: string) => void;
}

export interface CheckBoxGroupInterface {
  [key: string]: boolean;
}

interface CardCountStats {
  [key: string]: number;
}

const CollectionFilterControls = ({
  setCollectionColSpan,
  setCollectionFilter,
  collection,
  availableTags = [],
  setNameFilter,
}: CollectionFilterControlsInterface) => {
  const createEnumInitState = (values: string[]): CheckBoxGroupInterface => {
    const group: CheckBoxGroupInterface = {};
    values.forEach((value: string) => {
      group[value] = true;
    });
    return group;
  };

  const [shownCardTypes, setShownCardTypes] = useState<CheckBoxGroupInterface>(() =>
    createEnumInitState(Object.values(CardType)),
  );
  const [shownColors, setShownColors] = useState<CheckBoxGroupInterface>(() =>
    createEnumInitState(Object.values(ColorType)),
  );
  const [shownRarities, setShownRarities] = useState<CheckBoxGroupInterface>(() =>
    createEnumInitState(Object.values(RarityType)),
  );
  const [shownCreators, setShownCreators] = useState<CheckBoxGroupInterface>({});
  const [shownTags, setShownTags] = useState<CheckBoxGroupInterface>({});

  const colorTypeToSymbol = (colorTypeString: string) => {
    switch (colorTypeString) {
      case ColorType.Black:
        return 'b';
      case ColorType.White:
        return 'w';
      case ColorType.Blue:
        return 'u';
      case ColorType.Red:
        return 'r';
      case ColorType.Green:
        return 'g';
      case ColorType.Colorless:
        return 'c';
      default:
        return null;
    }
  };

  const updateEnumState = (
    key: string,
    value: boolean,
    data: CheckBoxGroupInterface,
    fct: (values: CheckBoxGroupInterface) => void,
  ) => {
    const newState = { ...data };
    newState[key] = value;
    fct(newState);
  };

  const updateColSpan = (nextColSpan: number | [number, number]) => {
    let number = -1;
    if (typeof nextColSpan === 'number') {
      number = nextColSpan;
    }

    if (number === 0) number = -1;
    setCollectionColSpan && setCollectionColSpan(number);
  };

  // Recompute the per-category counts only when the collection changes, rather
  // than iterating the entire collection on every render.
  const cardCountStats: CardCountStats = useMemo(() => {
    const stats: CardCountStats = {};
    Object.values(CardType).forEach(key => {
      stats[key] = 0;
    });
    Object.values(RarityType).forEach(key => {
      stats[key] = 0;
    });
    Object.values(ColorType).forEach(key => {
      stats[key] = 0;
    });
    collection.forEach(card => {
      stats[cardToColor(card.front, card.manaCost).color] += 1;
      card.front.cardTypes.forEach(t => {
        stats[t] += 1;
      });
      stats[card.rarity] += 1;
    });
    return stats;
  }, [collection]);

  // Creators are dynamic (unlike the fixed enums), so derive the available
  // creators and their counts from the current-tab collection. Unknown
  // creators sort last, mirroring the Creator sort accessor.
  const creatorList = useMemo(() => {
    const byUuid: { [uuid: string]: { uuid: string; name: string; count: number } } = {};
    collection.forEach(card => {
      const { uuid, name } = card.creator;
      if (!byUuid[uuid]) byUuid[uuid] = { uuid, name, count: 0 };
      byUuid[uuid].count += 1;
    });
    return Object.values(byUuid).sort((a, b) => {
      const aKey = a.uuid === UNKNOWN_CREATOR.uuid ? 'zzzzz' : a.name.toLowerCase();
      const bKey = b.uuid === UNKNOWN_CREATOR.uuid ? 'zzzzz' : b.name.toLowerCase();
      return aKey.localeCompare(bKey);
    });
  }, [collection]);

  const tagList = useMemo(
    () => getAvailableCardTags(collection, availableTags),
    [collection, availableTags],
  );

  // Reconcile the creator checkbox state when the derived creator set changes
  // (e.g. switching tabs). Newly-seen creators default to checked.
  useEffect(() => {
    setShownCreators(prev => {
      const next: CheckBoxGroupInterface = {};
      creatorList.forEach(({ uuid }) => {
        next[uuid] = uuid in prev ? prev[uuid] : true;
      });
      return next;
    });
  }, [creatorList]);

  // Tags are dynamic and scoped to the active-tab collection. Newly available
  // tags default to checked, while tags absent from the tab stay hidden.
  useEffect(() => {
    setShownTags(prev => {
      const next: CheckBoxGroupInterface = {};
      Object.assign(next, getInitialTagFilterState(tagList.map(({ name }) => name)));
      tagList.forEach(({ name }) => {
        if (name in prev) next[name] = prev[name];
      });
      return next;
    });
  }, [tagList]);

  useEffect(() => {
    setCollectionFilter &&
      setCollectionFilter({
        colors: shownColors,
        rarity: shownRarities,
        types: shownCardTypes,
        creators: shownCreators,
        tags: shownTags,
      });
  }, [shownColors, shownRarities, shownCardTypes, shownCreators, shownTags, setCollectionFilter]);

  const spanMarks = {
    0: 'Auto',
    1: '1',
    2: '2',
    3: '3',
    4: '4',
    5: '5',
    6: '6',
    7: '7',
    8: '8',
  };

  return (
    <div className={styles.controls}>
      <Row>
        <div className={styles.controlItem}>
          <h4>Filter by name</h4>
          <Input placeholder="Card Name" allowClear onChange={e => setNameFilter(e.target.value)} />
        </div>
        {setCollectionColSpan && (
          <div className={styles.controlItem}>
            <h4>Cards per row</h4>
            <Slider
              defaultValue={0}
              marks={spanMarks}
              step={1}
              included={false}
              min={0}
              max={8}
              onAfterChange={value => updateColSpan(value)}
            />
          </div>
        )}
        {setCollectionFilter && (
          <div>
            <div className={styles.controlItem}>
              <h4>Shown Card Types</h4>
              {mapEnum(CardType, (key: string) =>
                cardCountStats[key] === 0 ? null : (
                  <Checkbox
                    key={`collection-filter-controls-checkbox-cardmaintype-${key}`}
                    checked={shownCardTypes[key]}
                    onChange={e =>
                      updateEnumState(key, e.target.checked, shownCardTypes, setShownCardTypes)
                    }
                  >
                    {`${key} (${cardCountStats[key]})`}
                  </Checkbox>
                ),
              )}
            </div>
            <div className={styles.controlItem}>
              <h4>Shown Colors</h4>
              <div className={styles.filterOptionGrid} data-testid="color-filter-grid">
                {Object.values(ColorType).map((key: string) => {
                  if (cardCountStats[key] === 0) return null;
                  return (
                    <Checkbox
                      key={`collection-filter-controls-checkbox-color-${key}`}
                      checked={shownColors[key]}
                      onChange={e =>
                        updateEnumState(key, e.target.checked, shownColors, setShownColors)
                      }
                    >
                      {colorTypeToSymbol(key) ? (
                        <Mana cost={true} symbol={colorTypeToSymbol(key)!} shadow={false} />
                      ) : (
                        key
                      )}
                      {` (${cardCountStats[key]})`}
                    </Checkbox>
                  );
                })}
              </div>
            </div>
            <div className={styles.controlItem}>
              <h4>Shown Rarities</h4>
              <div className={styles.filterOptionGrid} data-testid="rarity-filter-grid">
                {mapEnum(RarityType, (key: string) =>
                  cardCountStats[key] === 0 ? null : (
                    <Checkbox
                      key={`collection-filter-controls-checkbox-rarity-${key}`}
                      aria-label={`${key} rarity`}
                      checked={shownRarities[key]}
                      onChange={e =>
                        updateEnumState(key, e.target.checked, shownRarities, setShownRarities)
                      }
                    >
                      <span className={styles.rarityOptionContent}>
                        <img
                          src={getRarityIcon(key as RarityType)}
                          alt=""
                          width={24}
                          height={24}
                          className={styles.rarityIcon}
                        />
                        <span>{` (${cardCountStats[key]})`}</span>
                      </span>
                    </Checkbox>
                  ),
                )}
              </div>
            </div>
            <div className={styles.controlItem}>
              <h4>Shown Creators</h4>
              {creatorList.map(({ uuid, name, count }) => (
                <Checkbox
                  key={`collection-filter-controls-checkbox-creator-${uuid}`}
                  checked={shownCreators[uuid] !== false}
                  onChange={e =>
                    updateEnumState(uuid, e.target.checked, shownCreators, setShownCreators)
                  }
                >
                  {`${uuid === UNKNOWN_CREATOR.uuid ? 'Unknown' : name} (${count})`}
                </Checkbox>
              ))}
            </div>
            <div className={styles.controlItem}>
              <h4>Shown Tags</h4>
              {tagList.map(({ name, count }) => (
                <Checkbox
                  key={`collection-filter-controls-checkbox-tag-${name}`}
                  checked={shownTags[name] !== false}
                  onChange={e => updateEnumState(name, e.target.checked, shownTags, setShownTags)}
                >
                  {`${name} (${count})`}
                </Checkbox>
              ))}
            </div>
            <span> </span>
          </div>
        )}
      </Row>
    </div>
  );
};

export default CollectionFilterControls;
