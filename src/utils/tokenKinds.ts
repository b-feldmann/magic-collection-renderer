import CardFaceInterface from '../interfaces/CardFaceInterface';
import { CardType, ColorType } from '../interfaces/enums';

/**
 * What tokens are made of, shared by the rules text parser (tokenLinks) and token references
 * (tokenReferences): keywords, type and color words, and the predefined tokens.
 */

export const TOKEN_KEYWORDS = [
  'deathtouch',
  'defender',
  'double strike',
  'first strike',
  'flash',
  'flying',
  'haste',
  'hexproof',
  'indestructible',
  'lifelink',
  'menace',
  'prowess',
  'reach',
  'trample',
  'vigilance',
  'ward',
];

export const TYPE_WORDS: Record<string, CardType> = {
  artifact: CardType.Artifact,
  creature: CardType.Creature,
  enchantment: CardType.Enchantment,
  land: CardType.Land,
};

export const COLOR_WORDS: Record<string, ColorType> = {
  white: ColorType.White,
  blue: ColorType.Blue,
  black: ColorType.Black,
  red: ColorType.Red,
  green: ColorType.Green,
  colorless: ColorType.Colorless,
};

// Colors and token card types in the order rules text names them.
export const COLOR_ORDER = [
  ColorType.White,
  ColorType.Blue,
  ColorType.Black,
  ColorType.Red,
  ColorType.Green,
];
export const TOKEN_TYPE_ORDER = [
  CardType.Artifact,
  CardType.Enchantment,
  CardType.Land,
  CardType.Creature,
];

export interface PredefinedToken {
  cardTypes: CardType[];
  cardText: string[];
  // The card name, when it isn't the token's kind (Walker is a Zombie, Monster Role is "Monster").
  name?: string;
  // The type line's subtypes, when they aren't the token's kind.
  subtypes?: string;
  // Colorless when left out.
  colors?: ColorType[];
  stats?: string;
}

// Role tokens are Auras that enchant a creature (rule 111.10j-r).
const role = (name: string, ...effects: string[]): PredefinedToken => ({
  name,
  subtypes: 'Aura Role',
  cardTypes: [CardType.Enchantment],
  cardText: ['Enchant creature', ...effects],
});

/**
 * Predefined tokens (rule 111.10), which rules text names without their card type ("Create a
 * Treasure token", "Create a Monster Role token attached to …"), with what their token cards
 * print. Keyed by the token's kind in lower case. The double-faced Incubator is left out.
 */
export const PREDEFINED_TOKENS: Record<string, PredefinedToken> = {
  blood: {
    cardTypes: [CardType.Artifact],
    cardText: ['{1}, {t}, Discard a card, Sacrifice this token: Draw a card.'],
  },
  clue: {
    cardTypes: [CardType.Artifact],
    cardText: ['{2}, Sacrifice this token: Draw a card.'],
  },
  food: {
    cardTypes: [CardType.Artifact],
    cardText: ['{2}, {t}, Sacrifice this token: You gain 3 life.'],
  },
  gold: {
    cardTypes: [CardType.Artifact],
    cardText: ['Sacrifice this token: Add one mana of any color.'],
  },
  junk: {
    cardTypes: [CardType.Artifact],
    cardText: [
      '{t}, Sacrifice this token: Exile the top card of your library. You may play that card this turn. Activate only as a sorcery.',
    ],
  },
  map: {
    cardTypes: [CardType.Artifact],
    cardText: [
      '{1}, {t}, Sacrifice this token: Target creature you control explores. Activate only as a sorcery.',
    ],
  },
  powerstone: {
    cardTypes: [CardType.Artifact],
    cardText: ["{t}: Add {c}. This mana can't be spent to cast a nonartifact spell."],
  },
  shard: {
    cardTypes: [CardType.Enchantment],
    cardText: ['{2}, Sacrifice this token: Scry 1, then draw a card.'],
  },
  treasure: {
    cardTypes: [CardType.Artifact],
    cardText: ['{t}, Sacrifice this token: Add one mana of any color.'],
  },
  lander: {
    cardTypes: [CardType.Artifact],
    cardText: [
      '{2}, {t}, Sacrifice this token: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.',
    ],
  },
  mutagen: {
    cardTypes: [CardType.Artifact],
    cardText: [
      '{1}, {t}, Sacrifice this token: Put a +1/+1 counter on target creature. Activate only as a sorcery.',
    ],
  },
  vibranium: {
    cardTypes: [CardType.Artifact],
    cardText: [
      'Indestructible',
      "{t}: Add {c}. This mana can't be spent to cast a nonartifact spell.",
    ],
  },
  heartwood: {
    cardTypes: [CardType.Artifact],
    colors: [ColorType.Red, ColorType.Green],
    cardText: ['{t}: Add {r} or {g}.'],
  },
  walker: {
    name: 'Walker',
    subtypes: 'Zombie',
    cardTypes: [CardType.Creature],
    colors: [ColorType.Black],
    stats: '2/2',
    cardText: [],
  },
  'cursed role': role('Cursed', 'Enchanted creature has base power and toughness 1/1.'),
  'monster role': role('Monster', 'Enchanted creature gets +1/+1 and has trample.'),
  'royal role': role('Royal', 'Enchanted creature gets +1/+1 and has ward {1}.'),
  'sorcerer role': role(
    'Sorcerer',
    'Enchanted creature gets +1/+1 and has "Whenever this creature attacks, scry 1."',
  ),
  'virtuous role': role(
    'Virtuous',
    'Enchanted creature gets +1/+1 for each enchantment you control.',
  ),
  'wicked role': role(
    'Wicked',
    'Enchanted creature gets +1/+1.',
    'When this token is put into a graveyard from the battlefield, each opponent loses 1 life.',
  ),
  'young hero role': role(
    'Young Hero',
    'Enchanted creature has "Whenever this creature attacks, if its toughness is 3 or less, put a +1/+1 counter on it."',
  ),
};

/**
 * The kind of predefined token a token card prints, as rules text names it: "Treasure",
 * "Monster Role", "Walker". Undefined for other token cards.
 */
export const getPredefinedKind = (face: CardFaceInterface): string | undefined => {
  const name = face.name.trim();
  const lower = name.toLowerCase();
  const isRole = /\brole\b/i.test(face.cardSubTypes || '');
  const key = isRole && !lower.endsWith(' role') ? `${lower} role` : lower;
  const predefined = PREDEFINED_TOKENS[key];
  if (!predefined) return undefined;
  // A named token that happens to be called "Food" is still a Food token when it prints one.
  return isRole && !lower.endsWith(' role') ? `${name} Role` : name;
};

const KEYWORD = String.raw`(?:${TOKEN_KEYWORDS.join('|')})\b[^,]*`;
// A line of keywords only: "Flying, vigilance", "Ward {2}".
export const KEYWORD_LINE = new RegExp(String.raw`^${KEYWORD}(?:,\s*${KEYWORD})*$`, 'i');

// A line without its reminder text, quotes, closing period and case.
export const plainAbility = (line: string) =>
  line
    .replace(/\([^)]*\)/g, ' ')
    .replace(/["“”]/g, '')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.$/, '')
    .toLowerCase();

/**
 * Abilities as comparable pieces: "Flying, vigilance" and "Flying" + "Vigilance" are the same,
 * and reminder text, quotes, a closing period and case don't count.
 */
export const abilityPieces = (lines: string[]) =>
  new Set(
    lines.flatMap(line => {
      const plain = plainAbility(line);
      if (!plain) return [];
      return KEYWORD_LINE.test(plain) ? plain.split(/\s*,\s*/) : [plain];
    }),
  );

/** A token card's own name, unless it only repeats the subtypes ("Soldier" for a Soldier token). */
export const tokenCardName = (face: CardFaceInterface) => {
  const name = (face.name || '').trim();
  const subtypes = (face.cardSubTypes || '').trim();
  return name && name.toLowerCase() !== subtypes.toLowerCase() ? name : undefined;
};

/**
 * A token card's abilities as the creating card prints them: "~" becomes the token's name
 * ("Put a +1/+1 counter on Princess"), or "this creature" / "this token" for unnamed tokens.
 */
export const tokenAbilityLines = (face: CardFaceInterface) => {
  const self =
    tokenCardName(face) ??
    ((face.cardTypes || []).includes(CardType.Creature) ? 'this creature' : 'this token');
  return (face.cardText || []).map(line => line.replace(/~/g, self));
};

const lowerWords = (text = '') => text.toLowerCase().split(/\s+/).filter(Boolean);

/** The words of a token card's name and subtypes, lower case. */
export const tokenFaceWords = (face: CardFaceInterface) =>
  new Set([...lowerWords(face.name), ...lowerWords(face.cardSubTypes)]);

export const normaliseStats = (stats = '') => stats.replace(/\s+/g, '').toLowerCase();

/**
 * A token card's colors in WUBRG order: [Colorless] when set to colorless, empty when no color is
 * set (older token cards), which rules text and references then leave unsaid.
 */
export const tokenFaceColors = (face: CardFaceInterface): ColorType[] => {
  const colors = COLOR_ORDER.filter(color => face.tokenColors?.includes(color));
  if (colors.length) return colors;
  return face.tokenColors?.includes(ColorType.Colorless) ? [ColorType.Colorless] : [];
};
