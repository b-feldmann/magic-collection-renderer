import CardFaceInterface from '../interfaces/CardFaceInterface';
import CardInterface from '../interfaces/CardInterface';
import MechanicInterface from '../interfaces/MechanicInterface';
import { CardType, ColorType } from '../interfaces/enums';
import {
  abilityPieces,
  tokenAbilityLines,
  COLOR_ORDER,
  COLOR_WORDS,
  tokenFaceColors,
  normaliseStats,
  PREDEFINED_TOKENS,
  TOKEN_KEYWORDS,
  tokenFaceWords,
  TYPE_WORDS,
} from './tokenKinds';
import {
  maskTokenReferences,
  parseTokenReference,
  resolveTokenReference,
  TOKEN_REFERENCE,
} from './tokenReferences';

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
  // The text inside a token reference, for "Create [Token: 1/1 blue Rogue]": "1/1 blue Rogue".
  reference?: string;
  // Where the line describes the token in words ("1/1 blue Rogue creature token with flying"),
  // from the description to the end of its abilities. Not set for references and mechanics.
  span?: { start: number; end: number };
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
  // A token card of the same kind and power/toughness with other colors or abilities.
  differentDetails?: TokenCardMatch;
  // For a token reference: all token cards it fits. One is the match; several need a "with".
  candidates?: TokenCardMatch[];
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
// "create your choice of a … token or a … token", also written "create of your choice a …".
const CHOICE = String.raw`(?:(?:your\s+choice\s+of|of\s+your\s+choice)\s+)`;
const CREATE = new RegExp(
  String.raw`\bcreates?\s+${CHOICE}?(?:${COUNT}\s+)?([^.;]*?)\btokens?\b`,
  'gi',
);
// "… token and a Treasure token", "… token or a Food token".
const ALSO = new RegExp(String.raw`^,?\s+(?:and|or)\s+(?:${COUNT}\s+)?([^.;]*?)\btokens?\b`, 'i');
const NAMED = /^\s+named\s+(.+?)(?=\s+with\b|\s+that\b|[.,;"]|$)/i;
// "create Princess, a legendary 4/4 black Dog creature token": the name leads the description.
const LEADING_NAME = /^(\p{Lu}[^,"“]*?),\s+an?\s+/u;
// "with flying", also the stray colon in 'with: "{T}: Add {G}."'.
const WITH = /^\s+with:?\s+/i;
const QUOTED = /^["“]([^"”]*)["”]/;
const ABILITY_SEPARATOR = /^(?:,\s*(?:and\s+)?|\s+and\s+)(?=["“\p{L}])/u;
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

/**
 * The keywords and quoted abilities of `with flying and vigilance`, `with "Equip {2}"`, and the
 * text after them, where a further token may follow ("… with lifelink or a 1/1 Dog token").
 */
const parseAbilities = (text: string): { abilities: string[]; rest: string } => {
  const start = text.match(WITH);
  if (!start) return { abilities: [], rest: text };
  let rest = text.slice(start[0].length);
  // The text after the last ability; a separator only counts when another ability follows it.
  let after = text;
  const keywords: string[] = [];
  const quoted: string[] = [];
  for (;;) {
    const quote = rest.match(QUOTED);
    const ability = quote || rest.match(TOKEN_KEYWORD);
    if (!ability) break;
    if (quote) quoted.push(quote[1].trim());
    else keywords.push(ability[0].toLowerCase());
    rest = rest.slice(ability[0].length);
    after = rest;
    const separator = rest.match(ABILITY_SEPARATOR);
    if (!separator) break;
    rest = rest.slice(separator[0].length);
  }
  const keywordLine = keywords.join(', ');
  return {
    abilities: [
      ...(keywordLine ? [keywordLine[0].toUpperCase() + keywordLine.slice(1)] : []),
      ...quoted.filter(Boolean),
    ],
    rest: after,
  };
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

// A token reference reads as "<marker> description token" to the parser; the marker holds the
// reference's index.
const REFERENCE_MARKER = /(\d+)/;

/**
 * The text as the parser reads it: without square brackets (mechanics like [Investigate] are
 * words of the sentence), with straight apostrophes and token references as "description token".
 * `origin` maps each position to the position in `text` it comes from.
 */
const prepareText = (text: string) => {
  let plain = '';
  const origin: number[] = [];
  const references: string[] = [];
  const addText = (from: number, to: number) => {
    for (let index = from; index < to; index += 1) {
      const char = text[index];
      if (char === '[' || char === ']') continue;
      plain += char === '‘' || char === '’' ? "'" : char;
      origin.push(index);
    }
  };
  let last = 0;
  for (const match of text.matchAll(TOKEN_REFERENCE)) {
    addText(last, match.index);
    references.push(match[1].trim());
    const stand = `${references.length - 1} ${parseTokenReference(match[1]).description} token`;
    plain += stand;
    origin.push(...Array<number>(stand.length).fill(match.index));
    last = match.index + match[0].length;
  }
  addText(last, text.length);
  return { plain, origin, references };
};

/**
 * The token references ("[Token: …]") a line doesn't create a token with, e.g. "Sacrifice a
 * [Token: Treasure]". A reference stands for a token the text creates.
 */
export const findUncreatedTokenReferences = (
  text: string,
): { index: number; length: number; reference: string }[] => {
  const created = new Set<number>();
  parseText(text, '', 0, created);
  return [...text.matchAll(TOKEN_REFERENCE)]
    .filter((_, index) => !created.has(index))
    .map(match => ({ index: match.index, length: match[0].length, reference: match[0] }));
};

// The tokens a text creates, without looking into mechanics. `createdReferences` collects the
// indices of the token references that are created.
const parseText = (
  text: string,
  field: string,
  line: number,
  createdReferences?: Set<number>,
): CreatedToken[] => {
  const { plain, origin, references } = prepareText(text);
  const tokens: CreatedToken[] = [];
  for (const match of plain.matchAll(CREATE)) {
    let description = match[1];
    // Where `description` and the text after its "token" start.
    let position = match.index + match[0].length;
    let start = position - (match[0].match(/tokens?$/i)?.[0].length ?? 0) - description.length;
    let rest = plain.slice(position);
    for (;;) {
      const reference = description.match(REFERENCE_MARKER);
      const leading = reference ? null : description.match(LEADING_NAME);
      if (leading) description = description.slice(leading[0].length);
      const named = reference ? null : rest.match(NAMED);
      const name = named?.[1].trim() || leading?.[1].trim();
      const parsed = reference
        ? { abilities: [], rest }
        : parseAbilities(named ? rest.slice(named[0].length) : rest);
      const token = describe(description, field, line, name, parsed.abilities);
      const end = plain.length - parsed.rest.length;
      if (reference) createdReferences?.add(Number(reference[1]));
      if (token && reference) token.reference = references[Number(reference[1])];
      // Where the description ("1/1 blue Rogue creature token with flying") is in the line.
      else if (token && end > start)
        token.span = { start: origin[start], end: origin[end - 1] + 1 };
      if (token) tokens.push(token);
      // "… token with lifelink or a 1/1 white Dog creature token".
      rest = parsed.rest;
      position = end;
      const also = rest.match(ALSO);
      if (!also) break;
      description = also[1];
      position += also[0].length;
      start = position - (also[0].match(/tokens?$/i)?.[0].length ?? 0) - description.length;
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
    if (/^\s*token\s*:/i.test(content)) return [];
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
    parseText(reminder, field, line).forEach(({ span: _reminderSpan, ...token }) => {
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
export const findLowercaseTokenSubtypes = (line: string): { index: number; word: string }[] => {
  // Token references take their case from the token card.
  const text = maskTokenReferences(line).masked;
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
      // Skip "named …" and "with …" of the token before: "… token with lifelink or a dog token".
      let rest = text.slice(offset);
      rest = rest.slice(rest.match(NAMED)?.[0].length ?? 0);
      offset = text.length - parseAbilities(rest).rest.length;
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

const isSameKind = (token: CreatedToken, face: CardFaceInterface) => {
  if (token.name) return face.name.trim().toLowerCase() === token.name.toLowerCase();
  const faceWords = tokenFaceWords(face);
  if (!token.subtypes.every(subtype => faceWords.has(subtype.toLowerCase()))) return false;
  // A predefined token ("a Food token") has its card types even when the text leaves them out:
  // a Food Goblin artifact creature token isn't a Food token.
  const predefined = getPredefinedToken(token);
  if (!predefined) return true;
  const types = token.cardTypes.length ? token.cardTypes : predefined.cardTypes;
  const faceTypes: CardType[] = (face.cardTypes || []).filter(type => type !== CardType.Token);
  return faceTypes.length === types.length && types.every(type => faceTypes.includes(type));
};

const hasSameStats = (token: CreatedToken, face: CardFaceInterface) =>
  !token.stats || normaliseStats(face.cardStats) === normaliseStats(token.stats);

// Colors only tell tokens apart when the rules text and the token card both name them.
const hasSameColors = (token: CreatedToken, face: CardFaceInterface) => {
  const faceColors = face.tokenColors || [];
  if (!token.colors.length || !faceColors.length) return true;
  return (
    token.colors.length === faceColors.length &&
    token.colors.every(color => faceColors.includes(color))
  );
};

/**
 * A token card prints the abilities the rules text gives the token ("with flying"), and none
 * more. Predefined tokens (Treasure, Food, ...) have their abilities on the card only.
 */
const hasSameAbilities = (token: CreatedToken, face: CardFaceInterface) => {
  if (!token.abilities.length && getPredefinedToken(token)) return true;
  const tokenPieces = abilityPieces(token.abilities);
  const facePieces = abilityPieces(tokenAbilityLines(face));
  return (
    tokenPieces.size === facePieces.size && [...tokenPieces].every(piece => facePieces.has(piece))
  );
};

export interface TokenDetailDifferences {
  // Set when the colors differ: the token card's and the rules text's, in WUBRG order.
  colors?: { card: ColorType[]; token: ColorType[] };
  // Abilities the token card prints that the rules text doesn't give the token.
  extra: string[];
  // Abilities the rules text gives the token that the token card doesn't print.
  missing: string[];
}

/** How a token card of the same kind and power/toughness differs from the token the text makes. */
export const getTokenDetailDifferences = (
  token: CreatedToken,
  face: CardFaceInterface,
): TokenDetailDifferences => {
  const colors = hasSameColors(token, face)
    ? undefined
    : {
        card: tokenFaceColors(face),
        token: COLOR_ORDER.filter(color => token.colors.includes(color)).concat(
          token.colors.includes(ColorType.Colorless) ? [ColorType.Colorless] : [],
        ),
      };
  if (hasSameAbilities(token, face)) return { colors, extra: [], missing: [] };
  const tokenPieces = abilityPieces(token.abilities);
  const facePieces = abilityPieces(tokenAbilityLines(face));
  return {
    colors,
    extra: [...facePieces].filter(piece => !tokenPieces.has(piece)),
    missing: [...tokenPieces].filter(piece => !facePieces.has(piece)),
  };
};

/**
 * The token card that prints the token, or else one of the same kind with other power/toughness,
 * or one with the same power/toughness but other colors or abilities.
 */
const linkToken = (token: CreatedToken, tokenCards: TokenCardMatch[]): TokenLink => {
  // A reference names its token card; it doesn't fall back to similar ones.
  if (token.reference !== undefined) {
    const candidates = resolveTokenReference(token.reference, tokenCards);
    return { token, match: candidates.length === 1 ? candidates[0] : undefined, candidates };
  }
  const sameKind = tokenCards.filter(candidate => isSameKind(token, candidate.face));
  const sameStats = sameKind.filter(candidate => hasSameStats(token, candidate.face));
  const match = sameStats.find(
    candidate => hasSameColors(token, candidate.face) && hasSameAbilities(token, candidate.face),
  );
  return {
    token,
    match,
    differentStats: match || sameStats.length ? undefined : sameKind[0],
    differentDetails: match ? undefined : sameStats[0],
  };
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
 * (Treasure, Food, ...). A double-faced predefined token (Incubator) gets its back face as well.
 */
export const getTokenCard = (
  token: CreatedToken,
): Pick<CardInterface, 'name' | 'front' | 'back'> => {
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
  const back = predefined?.back;
  if (!back) return { name, front };
  return {
    name,
    front,
    back: {
      name: back.name,
      cardTypes: [CardType.Token, ...back.cardTypes],
      cardSubTypes: back.subtypes ?? '',
      cardText: back.cardText,
      tokenColors: back.colors || [ColorType.Colorless],
      ...(back.cardTypes.includes(CardType.Creature) ? { cardStats: back.stats || '' } : {}),
    },
  };
};
