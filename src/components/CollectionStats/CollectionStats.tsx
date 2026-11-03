import React from 'react';
import CardInterface from '../../interfaces/CardInterface';
import { CardType, ColorType, RarityType } from '../../interfaces/enums';
import cardToColor from '../../utils/cardToColor';
import { getVariantGroups } from '../../utils/cardVariants';
import { getConvertedManaCost } from '../../utils/sortAccessors';
import styles from './collectionStats.module.scss';

type ColorKey = 'white' | 'blue' | 'black' | 'red' | 'green' | 'colorless' | 'multicolor';
type RarityKey = RarityType;
type CardTypeKey = 'Creature' | 'Instant / Sorcery' | 'Other';
type ChartCategory = { key: string; label: string; color: string };
type ManaCurvePoint = { cmc: number } & Record<string, number>;

export interface ManaCurveData {
  colors: (ManaCurvePoint & Record<ColorKey, number>)[];
  rarities: (ManaCurvePoint & Record<RarityKey, number>)[];
  types: (ManaCurvePoint & Record<CardTypeKey, number>)[];
  tagCategories: ChartCategory[];
  tags: ManaCurvePoint[];
}

const colorCategories: ChartCategory[] = [
  { key: 'white', label: 'White', color: '#b7ac83' },
  { key: 'blue', label: 'Blue', color: '#2458c6' },
  { key: 'black', label: 'Black', color: '#35313a' },
  { key: 'red', label: 'Red', color: '#c94231' },
  { key: 'green', label: 'Green', color: '#168238' },
  { key: 'colorless', label: 'Colorless', color: '#898f95' },
  { key: 'multicolor', label: 'Multicolor', color: '#b58c14' },
];

const rarityCategories: ChartCategory[] = [
  { key: RarityType.Common, label: 'Common', color: '#626970' },
  { key: RarityType.Uncommon, label: 'Uncommon', color: '#9ecae8' },
  { key: RarityType.Rare, label: 'Rare', color: '#c4a14d' },
  { key: RarityType.MythicRare, label: 'Mythic', color: '#c94231' },
];

const typeCategories: ChartCategory[] = [
  { key: 'Creature', label: 'Creature', color: '#168238' },
  { key: 'Instant / Sorcery', label: 'Instant / Sorcery', color: '#2458c6' },
  { key: 'Other', label: 'Other', color: '#6b7280' },
];

const tagColors = [
  '#2458c6',
  '#c94231',
  '#168238',
  '#843fc6',
  '#b58c14',
  '#007c91',
  '#c2185b',
  '#4b5563',
];

const colorKeyFor = (color: ColorType): ColorKey => {
  if (color === ColorType.Gold) return 'multicolor';
  if (color === ColorType.White) return 'white';
  if (color === ColorType.Blue) return 'blue';
  if (color === ColorType.Black) return 'black';
  if (color === ColorType.Red) return 'red';
  if (color === ColorType.Green) return 'green';
  return 'colorless';
};

const emptyPoint = (cmc: number): ManaCurvePoint & Record<string, number> => ({
  cmc,
  white: 0,
  blue: 0,
  black: 0,
  red: 0,
  green: 0,
  colorless: 0,
  multicolor: 0,
  [RarityType.Common]: 0,
  [RarityType.Uncommon]: 0,
  [RarityType.Rare]: 0,
  [RarityType.MythicRare]: 0,
  Creature: 0,
  'Instant / Sorcery': 0,
  Other: 0,
});

const trimEmptyBuckets = <T extends ManaCurvePoint>(
  data: T[],
  categories: ChartCategory[],
): T[] => {
  const hasData = (point: T) => categories.some(category => point[category.key] > 0);
  const first = data.findIndex(hasData);
  if (first === -1) return [];
  let last = data.length - 1;
  while (last > first && !hasData(data[last])) last -= 1;
  return data.slice(first, last + 1);
};

export const buildManaCurveData = (
  collection: CardInterface[],
  allCards: CardInterface[] = collection,
): ManaCurveData => {
  const firstVariants = getVariantGroups(collection, allCards).map(group => group[0]);
  const maxCmc = firstVariants.reduce(
    (maximum, card) => Math.max(maximum, getConvertedManaCost(card.manaCost || '')),
    0,
  );
  const points = Array.from({ length: maxCmc + 1 }, (_, cmc) => emptyPoint(cmc));
  const tagTotals = new Map<string, number>();

  firstVariants.forEach(card => {
    new Set(card.tags || []).forEach(tag => tagTotals.set(tag, (tagTotals.get(tag) || 0) + 1));
  });

  const tagCategories = [...tagTotals.entries()]
    .sort(([tagA, countA], [tagB, countB]) => countB - countA || tagA.localeCompare(tagB))
    .map(([label], index) => ({
      key: `tag-${index}`,
      label,
      color: tagColors[index % tagColors.length],
    }));
  const tagCategoryByName = new Map(tagCategories.map(category => [category.label, category]));
  const tagPoints = points.map(({ cmc }) =>
    tagCategories.reduce<ManaCurvePoint>(
      (point, category) => {
        point[category.key] = 0;
        return point;
      },
      { cmc },
    ),
  );

  firstVariants.forEach(card => {
    const cmc = getConvertedManaCost(card.manaCost || '');
    const point = points[cmc];
    point[colorKeyFor(cardToColor(card.front, card.manaCost).color)] += 1;
    if (card.rarity in point) point[card.rarity] += 1;

    const cardTypes = card.front.cardTypes || [];
    const isLand = cardTypes.includes(CardType.Land) || cardTypes.includes(CardType.BasicLand);
    if (!isLand) {
      if (cardTypes.includes(CardType.Creature)) point.Creature += 1;
      else if (cardTypes.includes(CardType.Instant) || cardTypes.includes(CardType.Sorcery)) {
        point['Instant / Sorcery'] += 1;
      } else point.Other += 1;
    }

    new Set(card.tags || []).forEach(tag => {
      const category = tagCategoryByName.get(tag);
      if (category) tagPoints[cmc][category.key] += 1;
    });
  });

  return {
    colors: trimEmptyBuckets(
      points.map(({ cmc, white, blue, black, red, green, colorless, multicolor }) => ({
        cmc,
        white,
        blue,
        black,
        red,
        green,
        colorless,
        multicolor,
      })),
      colorCategories,
    ),
    rarities: trimEmptyBuckets(
      points.map(({ cmc, Common, Uncommon, Rare, 'Mythic Rare': mythicRare }) => ({
        cmc,
        [RarityType.Common]: Common,
        [RarityType.Uncommon]: Uncommon,
        [RarityType.Rare]: Rare,
        [RarityType.MythicRare]: mythicRare,
      })),
      rarityCategories,
    ),
    types: trimEmptyBuckets(
      points.map(({ cmc, Creature, 'Instant / Sorcery': instantSorcery, Other }) => ({
        cmc,
        Creature,
        'Instant / Sorcery': instantSorcery,
        Other,
      })),
      typeCategories,
    ),
    tagCategories,
    tags: trimEmptyBuckets(tagPoints, tagCategories),
  };
};

const getMaxStackCount = (data: ManaCurvePoint[], categories: ChartCategory[]) =>
  data.reduce(
    (maximum, point) =>
      Math.max(
        maximum,
        categories.reduce((sum, category) => sum + point[category.key], 0),
      ),
    0,
  );

const formatCount = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const ManaCurveChart = ({
  title,
  data,
  categories,
  maxCount,
  countUnit = 'card',
  countUnitPlural = 'cards',
}: {
  title: string;
  data: ManaCurvePoint[];
  categories: ChartCategory[];
  maxCount: number;
  countUnit?: string;
  countUnitPlural?: string;
}) => {
  const total = data.reduce(
    (sum, point) =>
      sum + categories.reduce((bucketTotal, category) => bucketTotal + point[category.key], 0),
    0,
  );
  const countText = formatCount(total, countUnit, countUnitPlural);

  return (
    <figure className={styles.chart}>
      <figcaption className={styles.chartHeading}>
        <h3>{title}</h3>
        <span>{countText}</span>
      </figcaption>
      <div className={styles.chartGraph}>
        <div className={styles.plotViewport}>
          <div
            className={styles.plot}
            role="img"
            aria-label={`Mana curve by ${title.toLowerCase()}: ${countText}`}
            style={{ minWidth: `${Math.max(100, data.length * 15)}px` }}
          >
            {data.map(point => {
              const description = categories
                .filter(category => point[category.key] > 0)
                .map(category => `${point[category.key]} ${category.label}`)
                .join(', ');

              return (
                <div
                  className={styles.barColumn}
                  key={point.cmc}
                  title={`CMC ${point.cmc}: ${description || 'No cards'}`}
                >
                  <div className={styles.barStack}>
                    {categories.map(category => {
                      const count = point[category.key];
                      if (!count) return null;
                      return (
                        <span
                          className={styles.barSegment}
                          key={category.key}
                          style={{
                            backgroundColor: category.color,
                            height: `${(count / maxCount) * 100}%`,
                          }}
                        >
                          <span className={styles.segmentCount}>{count}</span>
                        </span>
                      );
                    })}
                  </div>
                  <span className={styles.cmcLabel}>{point.cmc}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <ul className={styles.legend} aria-label={`${title} legend`}>
        {categories.map(category => (
          <li key={category.key}>
            <span className={styles.legendSwatch} style={{ backgroundColor: category.color }} />
            {category.label}
          </li>
        ))}
      </ul>
    </figure>
  );
};

const CollectionStats = ({
  collection,
  allCards = collection,
}: {
  collection: CardInterface[];
  allCards?: CardInterface[];
}) => {
  const data = buildManaCurveData(collection, allCards);
  const maxCount = Math.max(
    1,
    getMaxStackCount(data.colors, colorCategories),
    getMaxStackCount(data.rarities, rarityCategories),
    getMaxStackCount(data.types, typeCategories),
    getMaxStackCount(data.tags, data.tagCategories),
  );

  return (
    <section className={styles.statsBar} aria-label="Collection mana curves">
      <div className={styles.charts} role="group" aria-label="Mana curve charts" tabIndex={0}>
        <ManaCurveChart
          title="Color"
          data={data.colors}
          categories={colorCategories}
          maxCount={maxCount}
        />
        <ManaCurveChart
          title="Rarity"
          data={data.rarities}
          categories={rarityCategories}
          maxCount={maxCount}
        />
        <ManaCurveChart
          title="Nonland Card Types"
          data={data.types}
          categories={typeCategories}
          maxCount={maxCount}
        />
        <ManaCurveChart
          title="Tags"
          data={data.tags}
          categories={data.tagCategories}
          maxCount={maxCount}
          countUnit="tag match"
          countUnitPlural="tag matches"
        />
      </div>
    </section>
  );
};

export default CollectionStats;
