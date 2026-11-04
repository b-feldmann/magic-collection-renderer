import CardInterface from '../../interfaces/CardInterface';
import { CardType, ColorType, RarityType } from '../../interfaces/enums';
import cardToColor from '../../utils/cardToColor';
import { getVariantGroups } from '../../utils/cardVariants';
import { getConvertedManaCost } from '../../utils/sortAccessors';

export type ChartCategory = { key: string; label: string; color: string };
export type ManaCurvePoint = { cmc: number } & Record<string, number>;
export type ChartLayout = 'stacked' | 'individual';
export interface ManaCurveData {
  colors: ManaCurvePoint[];
  rarities: ManaCurvePoint[];
  types: ManaCurvePoint[];
  tags: ManaCurvePoint[];
  tagCategories: ChartCategory[];
  summary: {
    cardCount: number;
    nonlandCount: number;
    landCount: number;
    averageManaValue: number;
    twoToThreeCount: number;
    twoToThreePercent: number;
  };
}

export const colorCategories: ChartCategory[] = [
  { key: 'white', label: 'White', color: '#e1dcc8' },
  { key: 'blue', label: 'Blue', color: '#3e73d5' },
  { key: 'black', label: 'Black', color: '#57535e' },
  { key: 'red', label: 'Red', color: '#bc6453' },
  { key: 'green', label: 'Green', color: '#3a9858' },
  { key: 'colorless', label: 'Colorless', color: '#929fa7' },
  { key: 'multicolor', label: 'Multicolor', color: '#b28b40' },
];
export const rarityCategories: ChartCategory[] = [
  { key: RarityType.Common, label: 'Common', color: '#7b8489' },
  { key: RarityType.Uncommon, label: 'Uncommon', color: '#8aafcc' },
  { key: RarityType.Rare, label: 'Rare', color: '#b49b52' },
  { key: RarityType.MythicRare, label: 'Mythic', color: '#b85e49' },
];
export const typeCategories: ChartCategory[] = [
  { key: CardType.Creature, label: 'Creature', color: '#3a9858' },
  { key: CardType.Instant, label: 'Instant', color: '#3e73d5' },
  { key: CardType.Sorcery, label: 'Sorcery', color: '#9b83b1' },
  { key: CardType.Enchantment, label: 'Enchantment', color: '#c5a66b' },
  { key: CardType.Artifact, label: 'Artifact', color: '#9aa5ab' },
  { key: CardType.Planeswalker, label: 'Planeswalker', color: '#b47886' },
  { key: 'Other', label: 'Other', color: '#718c89' },
];
const tagColors = [
  '#3e73d5',
  '#b65e4f',
  '#3a9858',
  '#9168b5',
  '#b28b40',
  '#007c91',
  '#b15e86',
  '#64748b',
  '#c07c40',
  '#4e9b96',
  '#a3a04f',
  '#c889a5',
  '#7070a8',
  '#896f4c',
  '#4784a3',
  '#a95d8f',
];

const emptyPoints = (categories: ChartCategory[]): ManaCurvePoint[] =>
  Array.from({ length: 8 }, (_, cmc) => {
    const point: ManaCurvePoint = { cmc };
    categories.forEach(category => {
      point[category.key] = 0;
    });
    return point;
  });

export const getSharedCountMaximum = (
  data: ManaCurvePoint[],
  categories: ChartCategory[],
  layout: ChartLayout,
): number =>
  data.reduce((maximum, point) => {
    const counts = categories.map(category => point[category.key] || 0);
    const count =
      layout === 'stacked'
        ? counts.reduce((sum, value) => sum + value, 0)
        : counts.reduce((largest, value) => Math.max(largest, value), 0);
    return Math.max(maximum, count);
  }, 1);

const isLand = (card: CardInterface) => {
  const types = card.front.cardTypes || [];
  return types.includes(CardType.Land) || types.includes(CardType.BasicLand);
};

export const buildManaCurveData = (
  collection: CardInterface[],
  allCards: CardInterface[] = collection,
): ManaCurveData => {
  const cards = getVariantGroups(collection, allCards).map(group => group[0]);
  const nonlands = cards.filter(card => !isLand(card));
  // Use the full collection so filtering and frequency changes cannot shift tag colors.
  const tagColorByName = new Map(
    [...new Set([...allCards, ...collection].flatMap(card => card.tags || []))]
      .sort((a, b) => a.localeCompare(b))
      .map((tag, index) => [tag, tagColors[index % tagColors.length]]),
  );
  // Alphabetical, not by frequency, so filtering cannot make the tag charts swap places.
  const tagCategories = [...new Set(nonlands.flatMap(card => card.tags || []))]
    .sort((a, b) => a.localeCompare(b))
    .map(label => ({
      // Named, not ranked: a tag keeps its key (and its bars) when filtering removes other tags.
      key: `tag-${label}`,
      label,
      color: tagColorByName.get(label)!,
    }));
  const tagByName = new Map(tagCategories.map(category => [category.label, category.key]));
  const colors = emptyPoints(colorCategories);
  const rarities = emptyPoints(rarityCategories);
  const types = emptyPoints(typeCategories);
  const tags = emptyPoints(tagCategories);
  let totalManaValue = 0;
  let twoToThreeCount = 0;
  cards.forEach(card => {
    const land = isLand(card);
    const manaValue = land ? 0 : getConvertedManaCost(card.manaCost || '');
    const bucket = Math.min(7, manaValue);
    const color = cardToColor(card.front, card.manaCost).color;
    colors[bucket][color === ColorType.Gold ? 'multicolor' : color] += 1;
    if (land) return;
    totalManaValue += manaValue;
    if (manaValue === 2 || manaValue === 3) twoToThreeCount += 1;
    if (rarityCategories.some(category => category.key === card.rarity)) {
      rarities[bucket][card.rarity] += 1;
    }
    const primaryType =
      typeCategories.find(category =>
        (card.front.cardTypes || []).includes(category.key as CardType),
      )?.key || 'Other';
    types[bucket][primaryType] += 1;
    new Set(card.tags || []).forEach(tag => {
      const key = tagByName.get(tag);
      if (key) tags[bucket][key] += 1;
    });
  });
  return {
    colors,
    rarities,
    types,
    tags,
    tagCategories,
    summary: {
      cardCount: cards.length,
      nonlandCount: nonlands.length,
      landCount: cards.length - nonlands.length,
      averageManaValue: nonlands.length ? totalManaValue / nonlands.length : 0,
      twoToThreeCount,
      twoToThreePercent: nonlands.length
        ? Math.round((twoToThreeCount / nonlands.length) * 100)
        : 0,
    },
  };
};
