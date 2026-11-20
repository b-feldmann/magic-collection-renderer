import CardFaceInterface from '../interfaces/CardFaceInterface';
import CardInterface from '../interfaces/CardInterface';
import MechanicInterface from '../interfaces/MechanicInterface';
import { CardType, ColorType } from '../interfaces/enums';

/**
 * Tokens a card creates ("Create a 1/1 white Soldier creature token") and the token cards in the
 * collection that print them, so a set ships a token card for every token it makes.
 */
export interface CreatedToken {
  // The face field and line that create the token.
  field: string;
  line: number;
  // Subtypes as written ("Soldier", "Food"), or empty for a named token.
  subtypes: string[];
  // "named Sword of Light"
  name?: string;
  // Power/toughness as written, e.g. "1/1" or "X/X".
  stats?: string;
  // A short name for hints and links: "1/1 Soldier", "Food".
  label: string;
  // Card types as written ("artifact creature"), without Token.
  cardTypes: CardType[];
  // Colors as written; empty when none are named.
  colors: ColorType[];
  legendary: boolean;
  // Keywords and quoted abilities after "with": ["Flying", "Equip {2}"].
  abilities: string[];
  // The custom mechanic whose reminder text creates the token, for "[Plunder 2]".
  mechanic?: string;
}

export interface TokenCardMatch {
  card: CardInterface;
  face: CardFaceInterface;
}

export interface TokenLink {
  token: CreatedToken;
  // The token card that prints this token.
  match?: TokenCardMatch;
  // A token card of the same kind with other power/toughness, when none matches exactly.
  differentStats?: TokenCardMatch;
}

// Rules text fields and the card types that show them (the editor hides, but keeps, the others).
const TOKEN_TEXT_FIELDS: { key: string; applies: (types: CardType[]) => boolean }[] = [
  { key: 'cardText', applies: () => true },
  { key: 'level1Text', applies: types => types.includes(CardType.Evolution) },
  { key: 'level2Text', applies: types => types.includes(CardType.Evolution) },
  { key: 'adventureText', applies: types => types.includes(CardType.Adventure) },
  { key: 'omenText', applies: types => types.includes(CardType.Omen) },
  { key: 'prepareText', applies: types => types.includes(CardType.Prepared) },
];

const COUNT = String.raw`(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|x|\d+|that many|twice that many|a number of|another)`;
const CREATE = new RegExp(String.raw`\bcreates?\s+(?:${COUNT}\s+)?([^.;]*?)\btokens?\b`, 'gi');
// "… token and a Treasure token", "… token or a Food token".
const ALSO = new RegExp(String.raw`^,?\s+(?:and|or)\s+(?:${COUNT}\s+)?([^.;]*?)\btokens?\b`, 'i');
const NAMED = /^\s+named\s+(.+?)(?=\s+with\b|\s+that\b|[.,;"]|$)/i;
// "create Princess, a legendary 4/4 black Dog creature token": the name leads the description.
const LEADING_NAME = /^(\p{Lu}[^,"“]*?),\s+an?\s+/u;
const WITH = /^\s+with\s+/i;
const QUOTED = /^["“]([^"”]*)["”]/;
const ABILITY_SEPARATOR = /^(?:,\s*(?:and\s+)?|\s+and\s+)(?=["“\p{L}])/u;
const TOKEN_KEYWORDS = [
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
// "flying", "ward {2}".
const TOKEN_KEYWORD = new RegExp(
  String.raw`^(?:${TOKEN_KEYWORDS.join('|')})\b(?:\s+(?:\{[^{}]*\})+|\s+\d+\b)?`,
  'i',
);
const STATS = /(?:^|\s)((?:\d+|x|\*)\/(?:\d+|x|\*))(?=\s|$)/i;
// The keyword action "investigate" creates a Clue token, also without its reminder text. Triggers
// on it ("Whenever you investigate") and "investigated" don't.
const INVESTIGATE =
  /(?<!\b(?:whenever|when|if|after|once|time)\s+(?:you|a player|an opponent|they)\s+)\binvestigates?\b/i;

const TYPE_WORDS: Record<string, CardType> = {
  artifact: CardType.Artifact,
  creature: CardType.Creature,
  enchantment: CardType.Enchantment,
  land: CardType.Land,
};

const COLOR_WORDS: Record<string, ColorType> = {
  white: ColorType.White,
  blue: ColorType.Blue,
  black: ColorType.Black,
  red: ColorType.Red,
  green: ColorType.Green,
  colorless: ColorType.Colorless,
};

interface PredefinedToken {
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
const PREDEFINED_TOKENS: Record<string, PredefinedToken> = {
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

const getPredefinedToken = (token: CreatedToken) =>
  token.name ? undefined : PREDEFINED_TOKENS[token.subtypes.join(' ').toLowerCase()];

// Words in a token description that aren't subtypes.
const NOT_SUBTYPES = new Set([
  'white',
  'blue',
  'black',
  'red',
  'green',
  'colorless',
  'multicolored',
  'and',
  'creature',
  'artifact',
  'enchantment',
  'land',
  'legendary',
  'snow',
  'tapped',
  'untapped',
  'attacking',
  'blocking',
  'basic',
  'additional',
  'token',
]);

// Words that show the text before "token" isn't a token description: "a copy of target token",
// "one or more tokens".
const NOT_A_DESCRIPTION =
  /\b(?:copy|copies|of|target|that|those|this|these|it|them|each|or|more|the|your|you|control)\b/i;
const ALL_STATS = /(?:\d+|x|\*)\/(?:\d+|x|\*)/gi;

// The keywords and quoted abilities of `with flying and vigilance`, `with "Equip {2}"`.
const parseAbilities = (text: string): string[] => {
  const start = text.match(WITH);
  if (!start) return [];
  let rest = text.slice(start[0].length);
  const keywords: string[] = [];
  const quoted: string[] = [];
  for (;;) {
    const quote = rest.match(QUOTED);
    const ability = quote || rest.match(TOKEN_KEYWORD);
    if (!ability) break;
    if (quote) quoted.push(quote[1].trim());
    else keywords.push(ability[0].toLowerCase());
    rest = rest.slice(ability[0].length);
    const separator = rest.match(ABILITY_SEPARATOR);
    if (!separator) break;
    rest = rest.slice(separator[0].length);
  }
  const keywordLine = keywords.join(', ');
  return [
    ...(keywordLine ? [keywordLine[0].toUpperCase() + keywordLine.slice(1)] : []),
    ...quoted.filter(Boolean),
  ];
};

const describe = (
  description: string,
  field: string,
  line: number,
  name: string | undefined,
  abilities: string[],
): CreatedToken | null => {
  const stats = description.match(STATS)?.[1];
  const words = description
    .replace(STATS, ' ')
    .split(/\s+/)
    .map(word => word.replace(/[^\p{L}'-]/gu, ''))
    .filter(Boolean);
  // Subtypes are capitalized, even when the rules text forgot to ("a 1/1 white soldier token").
  const subtypes = words
    .filter(word => !NOT_SUBTYPES.has(word.toLowerCase()))
    .map(word => word.charAt(0).toUpperCase() + word.slice(1));
  // A copy ("a token that's a copy of …") or a bare "1/1 creature token" names no kind of token.
  if (!subtypes.length && !name) return null;
  const lower = words.map(word => word.toLowerCase());
  const cardTypes = [...new Set(lower.flatMap(word => TYPE_WORDS[word] ?? []))];
  const colors = [...new Set(lower.flatMap(word => COLOR_WORDS[word] ?? []))];
  const kind = name || subtypes.join(' ');
  return {
    field,
    line,
    subtypes,
    name,
    stats,
    label: stats ? `${stats} ${kind}` : kind,
    cardTypes,
    colors,
    legendary: lower.includes('legendary'),
    abilities,
  };
};

// The tokens a text creates, without looking into mechanics.
const parseText = (text: string, field: string, line: number): CreatedToken[] => {
  const plain = text.replace(/[[\]]/g, '').replace(/[‘’]/g, "'");
  const tokens: CreatedToken[] = [];
  for (const match of plain.matchAll(CREATE)) {
    let description = match[1];
    let rest = plain.slice(match.index + match[0].length);
    for (;;) {
      const leading = description.match(LEADING_NAME);
      if (leading) description = description.slice(leading[0].length);
      const named = rest.match(NAMED);
      const name = named?.[1].trim() || leading?.[1].trim();
      const abilities = parseAbilities(named ? rest.slice(named[0].length) : rest);
      const token = describe(description, field, line, name, abilities);
      if (token) tokens.push(token);
      const also = rest.match(ALSO);
      if (!also) break;
      description = also[1];
      rest = rest.slice(also[0].length);
    }
  }
  // Reminder text ("Investigate. (Create a Clue token. …)") already names the Clue.
  if (INVESTIGATE.test(plain) && !tokens.some(token => token.label === 'Clue')) {
    tokens.push(describe('Clue', field, line, undefined, [])!);
  }
  return tokens;
};

/**
 * The reminder texts of the custom mechanics a line uses, as the card shows them: "[Plunder 2]"
 * with "Create {ref} Treasure tokens." reads "Create 2 Treasure tokens.". Mechanics are found
 * like the card render finds them: the first one whose name is in the brackets.
 */
const mechanicReminders = (text: string, mechanics: MechanicInterface[]) =>
  [...text.matchAll(/\[([^[\]]*)\]/g)].flatMap(([, content]) => {
    const mechanic = mechanics.find(
      candidate => candidate.name.trim() && content.includes(candidate.name),
    );
    if (!mechanic?.description) return [];
    // "[- Plunder]" shows the reminder only; "[Plunder -- 2]" joins name and ref with a dash.
    const ref = content
      .replace(mechanic.name, '')
      .trim()
      .replace(/^-{1,2}\s*/, '');
    return [{ name: mechanic.name, reminder: mechanic.description.replace(/\{ref\}/g, ref) }];
  });

/**
 * The tokens one line of rules text creates, including those of the custom mechanics it uses
 * ("[Plunder 2]" whose reminder text creates Treasure tokens).
 */
export const parseCreatedTokens = (
  text: string,
  field = 'cardText',
  line = 0,
  mechanics: MechanicInterface[] = [],
): CreatedToken[] => {
  const tokens = parseText(text, field, line);
  mechanicReminders(text, mechanics).forEach(({ name, reminder }) => {
    parseText(reminder, field, line).forEach(token => {
      // Reminder text the line spells out itself names the token once.
      if (tokens.some(other => other.label === token.label)) return;
      tokens.push({ ...token, mechanic: name });
    });
  });
  return tokens;
};

/**
 * Subtypes of tokens a line creates that are written in lower case ("Create a 1/1 white soldier
 * creature token"), with their position in the line.
 */
export const findLowercaseTokenSubtypes = (text: string): { index: number; word: string }[] => {
  const found: { index: number; word: string }[] = [];
  // `match` ends with the description followed by "token(s)".
  const check = (match: RegExpMatchArray, offset: number) => {
    // The leading name of "create Princess, a … token" isn't a subtype.
    const description = match[1].replace(LEADING_NAME, '');
    if (NOT_A_DESCRIPTION.test(description)) return;
    const tokenWord = match[0].match(/tokens?$/i)?.[0] ?? '';
    const start = offset + match[0].length - tokenWord.length - description.length;
    const withoutStats = description.replace(ALL_STATS, stats => ' '.repeat(stats.length));
    for (const word of withoutStats.matchAll(/\p{L}[\p{L}'-]*/gu)) {
      if (/^\p{Ll}/u.test(word[0]) && !NOT_SUBTYPES.has(word[0].toLowerCase())) {
        found.push({ index: start + word.index, word: word[0] });
      }
    }
  };
  for (const match of text.matchAll(CREATE)) {
    check(match, match.index);
    // "… token and a treasure token".
    let offset = match.index + match[0].length;
    for (;;) {
      const also = text.slice(offset).match(ALSO);
      if (!also) break;
      check(also, offset + also.index!);
      offset += also.index! + also[0].length;
    }
  }
  return found;
};

/** All tokens a face creates, in field and line order, also through custom mechanics. */
export const getCreatedTokens = (
  face: CardFaceInterface,
  mechanics: MechanicInterface[] = [],
): CreatedToken[] => {
  const types = face.cardTypes || [];
  return TOKEN_TEXT_FIELDS.filter(field => field.applies(types)).flatMap(field => {
    const lines = face[field.key];
    if (!Array.isArray(lines)) return [];
    return lines.flatMap((line, index) => parseCreatedTokens(line, field.key, index, mechanics));
  });
};

/** The faces of token cards in the collection. */
export const getTokenCardFaces = (cards: CardInterface[]): TokenCardMatch[] =>
  cards.flatMap(card =>
    [card.front, card.back]
      .filter((face): face is CardFaceInterface =>
        Boolean(face?.cardTypes?.includes(CardType.Token)),
      )
      .map(face => ({ card, face })),
  );

const words = (text = '') => text.toLowerCase().split(/\s+/).filter(Boolean);
const normaliseStats = (stats = '') => stats.replace(/\s+/g, '').toLowerCase();

const isSameKind = (token: CreatedToken, face: CardFaceInterface) => {
  if (token.name) return face.name.trim().toLowerCase() === token.name.toLowerCase();
  const faceWords = new Set([...words(face.name), ...words(face.cardSubTypes)]);
  return token.subtypes.every(subtype => faceWords.has(subtype.toLowerCase()));
};

// The token card that prints the token, or one of the same kind with other power/toughness.
const linkToken = (token: CreatedToken, tokenCards: TokenCardMatch[]): TokenLink => {
  const sameKind = tokenCards.filter(candidate => isSameKind(token, candidate.face));
  const match = token.stats
    ? sameKind.find(
        candidate => normaliseStats(candidate.face.cardStats) === normaliseStats(token.stats),
      )
    : sameKind[0];
  return { token, match, differentStats: match ? undefined : sameKind[0] };
};

/** Links each token the face creates to the token card that prints it. */
export const getTokenLinks = (
  face: CardFaceInterface,
  tokenCards: TokenCardMatch[],
  mechanics: MechanicInterface[] = [],
): TokenLink[] => getCreatedTokens(face, mechanics).map(token => linkToken(token, tokenCards));

/** A card face in the collection and the tokens its rules text creates. */
export interface TokenCreator extends TokenCardMatch {
  tokens: CreatedToken[];
}

/** The faces of the collection that create tokens. Parsed once per collection. */
export const getTokenCreators = (
  cards: CardInterface[],
  mechanics: MechanicInterface[] = [],
): TokenCreator[] =>
  cards.flatMap(card =>
    [card.front, card.back].flatMap(face => {
      if (!face) return [];
      const tokens = getCreatedTokens(face, mechanics);
      return tokens.length ? [{ card, face, tokens }] : [];
    }),
  );

/**
 * The card faces that create the token printed by `tokenFace` of `tokenCard`: the faces whose
 * token links lead to exactly this token card face. `tokenCard` may be an unsaved draft, so it
 * replaces its saved version in the collection's token cards.
 */
export const getTokenSources = (
  tokenCard: CardInterface,
  tokenFace: CardFaceInterface,
  cards: CardInterface[],
  creators: TokenCreator[],
): TokenCardMatch[] => {
  if (!tokenFace.cardTypes?.includes(CardType.Token)) return [];
  const saved = cards.some(card => card.uuid === tokenCard.uuid);
  const tokenCards = getTokenCardFaces(
    saved
      ? cards.map(card => (card.uuid === tokenCard.uuid ? tokenCard : card))
      : [...cards, tokenCard],
  );
  return creators.filter(
    ({ card, tokens }) =>
      card.uuid !== tokenCard.uuid &&
      tokens.some(token => {
        const { match } = linkToken(token, tokenCards);
        return match?.card.uuid === tokenCard.uuid && match.face === tokenFace;
      }),
  );
};

/**
 * A token card for a token that has none yet: its name, types, colors and power/toughness, with
 * the abilities the rules text gives it ("with flying") or the rules text of a predefined token
 * (Treasure, Food, ...).
 */
export const getTokenCard = (token: CreatedToken): Pick<CardInterface, 'name' | 'front'> => {
  const predefined = getPredefinedToken(token);
  // What the rules text spells out wins over the predefined token.
  const cardTypes = token.cardTypes.length
    ? token.cardTypes
    : predefined?.cardTypes || [CardType.Creature];
  const name = token.name || predefined?.name || token.subtypes.join(' ');
  const front: CardFaceInterface = {
    name,
    cardTypes: [CardType.Token, ...cardTypes],
    cardSubTypes: predefined?.subtypes ?? token.subtypes.join(' '),
    cardText: token.abilities.length ? token.abilities : predefined?.cardText || [],
    tokenColors: token.colors.length ? token.colors : predefined?.colors || [ColorType.Colorless],
  };
  if (token.legendary) front.legendary = true;
  if (cardTypes.includes(CardType.Creature)) {
    front.cardStats = token.stats || predefined?.stats || '';
  }
  return { name, front };
};
