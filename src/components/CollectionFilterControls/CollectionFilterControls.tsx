import React, { useEffect, useMemo, useState } from 'react';
import { Checkbox, Input, Slider } from 'antd';
import { CardType, ColorType, RarityType } from '../../interfaces/enums';

import styles from './styles.module.scss';
import CardInterface from '../../interfaces/CardInterface';
import cardToColor from '../../utils/cardToColor';
import { UNKNOWN_CREATOR } from '../../utils/constants';
import Mana from '../Mana/Mana.tsx';
import { getAvailableCardTags, getInitialTagFilterState } from '../../utils/cardTagFilter';
import FilterScrollRegion from './FilterScrollRegion';

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
  sortControls?: React.ReactNode;
}

export interface CheckBoxGroupInterface {
  [key: string]: boolean;
}

interface CardCountStats {
  [key: string]: number;
}

// Keep the optional tag list stable so the tag-state effect can settle.
const EMPTY_AVAILABLE_TAGS: string[] = [];

const createEnumInitState = (values: string[]): CheckBoxGroupInterface =>
  Object.fromEntries(values.map(value => [value, true]));

const FilterSection = ({
  title,
  number,
  children,
}: React.PropsWithChildren<{ title: string; number: number }>) => (
  <section className={styles.filterSection} aria-label={title}>
    <div className={styles.sectionHeading}>
      <h3>{title}</h3>
      <span aria-hidden="true">{String(number).padStart(2, '0')}</span>
    </div>
    {children}
  </section>
);

const FilterOption = ({
  label,
  category,
  count,
  checked,
  onChange,
  icon,
}: {
  label: string;
  category: string;
  count: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
}) => (
  <Checkbox
    className={styles.filterOption}
    aria-label={`${label} ${category}`}
    checked={checked}
    onChange={event => onChange(event.target.checked)}
  >
    {icon && (
      <span className={styles.optionIcon} aria-hidden="true">
        {icon}
      </span>
    )}
    <span className={styles.optionLabel} title={label}>
      {label}
    </span>
    <span className={styles.optionCount}>{count}</span>
  </Checkbox>
);

const CollectionFilterControls = ({
  setCollectionColSpan,
  setCollectionFilter,
  collection,
  availableTags = EMPTY_AVAILABLE_TAGS,
  setNameFilter,
  sortControls,
}: CollectionFilterControlsInterface) => {
  const [nameFilter, setNameFilterValue] = useState('');
  const [cardsPerRow, setCardsPerRow] = useState(0);
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

  const hasChanges =
    nameFilter !== '' ||
    (!!setCollectionFilter &&
      ([shownCardTypes, shownColors, shownRarities, shownCreators].some(group =>
        Object.values(group).some(value => !value),
      ) ||
        Object.values(shownTags).some(Boolean)));

  const resetFilters = () => {
    setNameFilterValue('');
    setNameFilter('');
    setShownCardTypes(createEnumInitState(Object.values(CardType)));
    setShownColors(createEnumInitState(Object.values(ColorType)));
    setShownRarities(createEnumInitState(Object.values(RarityType)));
    setShownCreators(createEnumInitState(creatorList.map(({ uuid }) => uuid)));
    setShownTags(getInitialTagFilterState(tagList.map(({ name }) => name)));
  };

  const firstSectionNumber = sortControls ? 2 : 1;

  return (
    <div className={styles.controls}>
      <div className={styles.header}>
        <h2>Filters</h2>
        <button
          type="button"
          className={styles.resetButton}
          disabled={!hasChanges}
          onClick={resetFilters}
        >
          Reset all
        </button>
      </div>
      <FilterScrollRegion>
        <Input
          className={styles.search}
          aria-label="Filter by card name"
          placeholder="Search card names…"
          prefix={
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
          }
          value={nameFilter}
          allowClear
          onChange={event => {
            setNameFilterValue(event.target.value);
            setNameFilter(event.target.value);
          }}
        />
        {sortControls && (
          <FilterSection title="Sort & order" number={1}>
            {sortControls}
          </FilterSection>
        )}
        {setCollectionFilter && (
          <>
            <FilterSection title="Card types" number={firstSectionNumber}>
              <div className={styles.filterOptionGrid}>
                {Object.values(CardType)
                  .filter(key => cardCountStats[key] > 0)
                  .map(key => (
                    <FilterOption
                      key={key}
                      label={key}
                      category="type"
                      count={cardCountStats[key]}
                      checked={shownCardTypes[key]}
                      onChange={checked =>
                        updateEnumState(key, checked, shownCardTypes, setShownCardTypes)
                      }
                    />
                  ))}
              </div>
            </FilterSection>
            <FilterSection title="Colors" number={firstSectionNumber + 1}>
              <div className={styles.filterOptionGrid} data-testid="color-filter-grid">
                {Object.values(ColorType)
                  .filter(key => cardCountStats[key] > 0)
                  .map(key => (
                    <FilterOption
                      key={key}
                      label={key[0].toUpperCase() + key.slice(1)}
                      category="color"
                      count={cardCountStats[key]}
                      checked={shownColors[key]}
                      onChange={checked =>
                        updateEnumState(key, checked, shownColors, setShownColors)
                      }
                      icon={
                        key === ColorType.Gold ? (
                          <span
                            className={styles.goldColorDot}
                            data-testid="gold-filter-icon"
                            style={{ backgroundColor: '#eed66b' }}
                          />
                        ) : colorTypeToSymbol(key) ? (
                          <Mana cost symbol={colorTypeToSymbol(key)!} shadow={false} />
                        ) : (
                          <span>✧</span>
                        )
                      }
                    />
                  ))}
              </div>
            </FilterSection>
            <FilterSection title="Rarity" number={firstSectionNumber + 2}>
              <div className={styles.filterOptionGrid} data-testid="rarity-filter-grid">
                {Object.values(RarityType)
                  .filter(key => cardCountStats[key] > 0)
                  .map(key => (
                    <FilterOption
                      key={key}
                      label={key}
                      category="rarity"
                      count={cardCountStats[key]}
                      checked={shownRarities[key]}
                      onChange={checked =>
                        updateEnumState(key, checked, shownRarities, setShownRarities)
                      }
                    />
                  ))}
              </div>
            </FilterSection>
            <details className={styles.disclosure}>
              <summary>
                <span>Creators</span>
                <span className={styles.groupCount}>{creatorList.length}</span>
              </summary>
              <div className={styles.secondaryOptions}>
                {creatorList.map(({ uuid, name, count }) => (
                  <FilterOption
                    key={uuid}
                    label={uuid === UNKNOWN_CREATOR.uuid ? 'Unknown' : name}
                    category="creator"
                    count={count}
                    checked={shownCreators[uuid] !== false}
                    onChange={checked =>
                      updateEnumState(uuid, checked, shownCreators, setShownCreators)
                    }
                  />
                ))}
                {creatorList.length === 0 && (
                  <p className={styles.emptyGroup}>No creators in this collection.</p>
                )}
              </div>
            </details>
            <details className={styles.disclosure}>
              <summary>
                <span>Tags</span>
                <span className={styles.groupCount}>{tagList.length}</span>
              </summary>
              <div className={styles.secondaryOptions}>
                {tagList.map(({ name, count }) => (
                  <FilterOption
                    key={name}
                    label={name}
                    category="tag"
                    count={count}
                    checked={shownTags[name] === true}
                    onChange={checked => updateEnumState(name, checked, shownTags, setShownTags)}
                  />
                ))}
                {tagList.length === 0 && (
                  <p className={styles.emptyGroup}>No tags in this collection.</p>
                )}
              </div>
            </details>
          </>
        )}
        {setCollectionColSpan && (
          <details className={`${styles.disclosure} ${styles.displaySettings}`}>
            <summary>
              <span>Display settings</span>
            </summary>
            <div className={styles.densityHeading}>
              <span>Cards per row</span>
              <output>{cardsPerRow === 0 ? 'Auto' : cardsPerRow}</output>
            </div>
            <Slider
              ariaLabelForHandle="Cards per row"
              value={cardsPerRow}
              marks={{ 0: 'Auto', 2: '2', 4: '4', 6: '6', 8: '8' }}
              step={1}
              included={false}
              min={0}
              max={8}
              onChange={setCardsPerRow}
              onChangeComplete={updateColSpan}
            />
          </details>
        )}
      </FilterScrollRegion>
    </div>
  );
};

export default CollectionFilterControls;
