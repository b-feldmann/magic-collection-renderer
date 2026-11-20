import CardInterface from '../../interfaces/CardInterface';
import { CardType, ColorType } from '../../interfaces/enums';
import cardToColor from '../../utils/cardToColor';
import { getVariantGroups } from '../../utils/cardVariants';
import parseStats from '../../utils/parseStats';
import { getConvertedManaCost } from '../../utils/sortAccessors';
import { ChartCategory, colorCategories, getRarityTier, RarityTier } from './collectionStatsData';

/**
 * Per-color Limited balance: how many creatures each color has and how big they are, and how
 * much removal, evasion, card draw, ... it gets. Roles come from the cards' tags (automatic
 * rules-text tags or the same tag set by hand).
 */
export const balanceRoles = [
  { tag: 'Creature Removal', label: 'Removal' },
  { tag: 'Evasion', label: 'Evasion' },
  { tag: 'Card Draw', label: 'Card draw' },
  { tag: 'Combat Trick', label: 'Tricks' },
  { tag: 'Counterspell', label: 'Counters' },
  { tag: 'Fixing', label: 'Fixing' },
  { tag: 'Mana Sink', label: 'Mana sinks' },
] as const;
export type BalanceRoleTag = (typeof balanceRoles)[number]['tag'];

// Creatures by printed power.
export const powerBuckets = ['0–1', '2', '3', '4', '5+'] as const;

export type BalanceRarity = 'all' | RarityTier;
export const balanceRarities: { key: BalanceRarity; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'common', label: 'Commons' },
  { key: 'uncommon', label: 'Uncommons' },
  { key: 'rare', label: 'Rares & Mythics' },
];

export interface BalanceCard {
  uuid: string;
  name: string;
}

export interface BalanceRow {
  category: ChartCategory;
  // Draftable cards: no tokens or emblems. Lands are counted separately.
  nonlandCount: number;
  landCount: number;
  averageManaValue: number | null;
  creatures: BalanceCard[];
  // Averages over creatures with a numeric power/toughness (not */* or X/X).
  averagePower: number | null;
  averageToughness: number | null;
  powerCounts: number[];
  roles: Record<BalanceRoleTag, BalanceCard[]>;
}

export interface LimitedBalance {
  rows: BalanceRow[];
  total: BalanceRow;
}

const isNotDraftable = (card: CardInterface) =>
  (card.front.cardTypes || []).some(type => type === CardType.Token || type === CardType.Emblem);

const isLand = (card: CardInterface) =>
  (card.front.cardTypes || []).some(type => type === CardType.Land || type === CardType.BasicLand);

const numeric = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value) : null);

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

const powerBucket = (power: number) => Math.min(Math.max(power - 1, 0), powerBuckets.length - 1);

const buildRow = (category: ChartCategory, cards: CardInterface[]): BalanceRow => {
  const nonlands = cards.filter(card => !isLand(card));
  const creatureCards = nonlands.filter(card =>
    (card.front.cardTypes || []).includes(CardType.Creature),
  );
  const stats = creatureCards.map(card => parseStats(card.front.cardStats));
  const powers = stats.flatMap(({ power }) => numeric(power) ?? []);
  const toughnesses = stats.flatMap(({ toughness }) => numeric(toughness) ?? []);
  const powerCounts = powerBuckets.map(() => 0);
  powers.forEach(power => {
    powerCounts[powerBucket(power)] += 1;
  });
  const toEntry = (card: CardInterface): BalanceCard => ({ uuid: card.uuid, name: card.name });
  const roles = Object.fromEntries(
    balanceRoles.map(({ tag }) => [
      tag,
      cards.filter(card => (card.tags || []).includes(tag)).map(toEntry),
    ]),
  ) as Record<BalanceRoleTag, BalanceCard[]>;

  return {
    category,
    nonlandCount: nonlands.length,
    landCount: cards.length - nonlands.length,
    averageManaValue: average(nonlands.map(card => getConvertedManaCost(card.manaCost || ''))),
    creatures: creatureCards.map(toEntry),
    averagePower: average(powers),
    averageToughness: average(toughnesses),
    powerCounts,
    roles,
  };
};

const colorKey = (card: CardInterface) => {
  const color = cardToColor(card.front, card.manaCost).color;
  return color === ColorType.Gold ? 'multicolor' : color;
};

/**
 * One row per color (white to green always; Colorless and Multicolor when they have cards) and
 * a total. Variants count once; tokens and emblems aren't drafted and are left out.
 */
export const buildLimitedBalance = (
  collection: CardInterface[],
  allCards: CardInterface[] = collection,
  rarity: BalanceRarity = 'all',
): LimitedBalance => {
  const cards = getVariantGroups(collection, allCards)
    .map(group => group[0])
    .filter(card => !isNotDraftable(card))
    .filter(card => rarity === 'all' || getRarityTier(card.rarity) === rarity);
  const byColor = new Map<string, CardInterface[]>();
  cards.forEach(card => {
    const key = colorKey(card);
    byColor.set(key, [...(byColor.get(key) || []), card]);
  });
  const rows = colorCategories
    .filter((category, index) => index < 5 || byColor.has(category.key))
    .map(category => buildRow(category, byColor.get(category.key) || []));
  const total = buildRow({ key: 'total', label: 'Total', color: '#64748b' }, cards);
  return { rows, total };
};
