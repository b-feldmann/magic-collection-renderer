import CardInterface from '../interfaces/CardInterface';
import { CardType, ColorType, RarityType } from '../interfaces/enums';
import cardToColor from './cardToColor';
import { getVariantGroups } from './cardVariants';

/**
 * A sample draft booster opened from the set: 15 cards with one rare or mythic, four uncommons,
 * nine commons and a land: a common Land with the Colony subtype, or a basic land when the set
 * has no Colony lands.
 */
export const PACK_LAYOUT = { rares: 1, uncommons: 4, commons: 9, lands: 1 };
// About one pack in eight has a mythic rare in its rare slot.
export const MYTHIC_CHANCE = 1 / 8;

const DRAFT_COLORS = [
  ColorType.White,
  ColorType.Blue,
  ColorType.Black,
  ColorType.Red,
  ColorType.Green,
];

export type PackSlot = 'Rare' | 'Mythic Rare' | 'Uncommon' | 'Common' | 'Land';

export interface PackCard {
  card: CardInterface;
  slot: PackSlot;
}

export interface SamplePack {
  cards: PackCard[];
  // Slots the set can't fill yet, e.g. "There are only 6 commons, so the pack has 6 of 9."
  shortfalls: string[];
  // Draftable cards the pack was opened from.
  poolSize: number;
}

const types = (card: CardInterface) => card.front.cardTypes || [];
const isBasicLand = (card: CardInterface) => types(card).includes(CardType.BasicLand);
const COLONY = /\bcolony\b/i;
// The land slot holds a common Land with the Colony subtype instead of a basic land.
const isColonyLand = (card: CardInterface) =>
  card.rarity === RarityType.Common &&
  types(card).includes(CardType.Land) &&
  COLONY.test(card.front.cardSubTypes || '');
// Tokens and emblems come with the set but aren't opened in packs.
const isDraftable = (card: CardInterface) =>
  !types(card).includes(CardType.Token) && !types(card).includes(CardType.Emblem);

// Fisher–Yates on a copy.
const shuffle = <T>(items: T[], random: () => number): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

// Real boosters have at least one common of each color; then the rest is random.
const pickCommons = (commons: CardInterface[], count: number, random: () => number) => {
  const shuffled = shuffle(commons, random);
  const picked: CardInterface[] = [];
  DRAFT_COLORS.forEach(color => {
    const card = shuffled.find(
      candidate =>
        !picked.includes(candidate) &&
        cardToColor(candidate.front, candidate.manaCost).color === color,
    );
    if (card && picked.length < count) picked.push(card);
  });
  shuffled.forEach(card => {
    if (picked.length < count && !picked.includes(card)) picked.push(card);
  });
  return picked;
};

/**
 * Opens a sample pack from `cards` (e.g. the cards shown in the current tab). Variants count once;
 * tokens and emblems are never in a pack. Basic lands only fill the land slot, and only when there
 * is no common Colony land; either comes from `allCards` when `cards` has none. `random` returns
 * numbers in [0, 1), for repeatable tests.
 */
export const openSamplePack = (
  cards: CardInterface[],
  allCards: CardInterface[] = cards,
  random: () => number = Math.random,
): SamplePack => {
  const pool = getVariantGroups(cards, allCards)
    .map(group => group[0])
    .filter(isDraftable);
  // The land slot takes a Colony land: from the shown cards, else from the whole collection. Only
  // when there are no Colony lands at all does it fall back to a basic land, found the same way.
  const collection = getVariantGroups(allCards, allCards)
    .map(group => group[0])
    .filter(isDraftable);
  const landsOf = (isLand: (card: CardInterface) => boolean) => {
    const shown = pool.filter(isLand);
    return shown.length ? shown : collection.filter(isLand);
  };
  const colonies = landsOf(isColonyLand);
  const lands = colonies.length ? colonies : landsOf(isBasicLand);
  // Colony and basic lands only ever fill the land slot.
  const others = pool.filter(card => !isBasicLand(card) && !isColonyLand(card));
  const ofRarity = (rarity: RarityType) => others.filter(card => card.rarity === rarity);
  const rares = ofRarity(RarityType.Rare);
  const mythics = ofRarity(RarityType.MythicRare);
  const uncommons = ofRarity(RarityType.Uncommon);
  const commons = ofRarity(RarityType.Common);
  const shortfalls: string[] = [];

  // The rare slot: a mythic about one time in eight, or whenever the set has no rares yet.
  const rollsMythic = random() < MYTHIC_CHANCE;
  const rareSlot: PackCard[] = [];
  if (mythics.length && (rollsMythic || !rares.length)) {
    rareSlot.push({ card: shuffle(mythics, random)[0], slot: 'Mythic Rare' });
  } else if (rares.length) {
    rareSlot.push({ card: shuffle(rares, random)[0], slot: 'Rare' });
  } else {
    shortfalls.push('There are no rares or mythic rares, so the rare slot is empty.');
  }

  const pickedUncommons = shuffle(uncommons, random).slice(0, PACK_LAYOUT.uncommons);
  if (pickedUncommons.length < PACK_LAYOUT.uncommons) {
    shortfalls.push(
      `There ${uncommons.length === 1 ? 'is' : 'are'} only ${plural(uncommons.length, 'uncommon')}, so the pack has ${pickedUncommons.length} of ${PACK_LAYOUT.uncommons}.`,
    );
  }

  const pickedCommons = pickCommons(commons, PACK_LAYOUT.commons, random);
  if (pickedCommons.length < PACK_LAYOUT.commons) {
    shortfalls.push(
      `There ${commons.length === 1 ? 'is' : 'are'} only ${plural(commons.length, 'common')}, so the pack has ${pickedCommons.length} of ${PACK_LAYOUT.commons}.`,
    );
  }

  const landSlot = shuffle(lands, random).slice(0, PACK_LAYOUT.lands);
  if (!landSlot.length) {
    shortfalls.push('There are no common Colony lands or basic lands, so the land slot is empty.');
  }

  return {
    cards: [
      ...rareSlot,
      ...pickedUncommons.map(card => ({ card, slot: 'Uncommon' as const })),
      ...pickedCommons.map(card => ({ card, slot: 'Common' as const })),
      ...landSlot.map(card => ({ card, slot: 'Land' as const })),
    ],
    shortfalls,
    poolSize: pool.length,
  };
};
