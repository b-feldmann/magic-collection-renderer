import CardFaceInterface from '../interfaces/CardFaceInterface';
import { CardType, ColorType } from '../interfaces/enums';
import type { TokenCardMatch } from './tokenLinks';
import {
  abilityPieces,
  COLOR_WORDS,
  getPredefinedKind,
  KEYWORD_LINE,
  normaliseStats,
  plainAbility,
  PREDEFINED_TOKENS,
  tokenAbilityLines,
  tokenCardName,
  TOKEN_TYPE_ORDER,
  tokenFaceColors,
  tokenFaceWords,
  TYPE_WORDS,
} from './tokenKinds';

/**
 * Token references in rules text: "Create two [Token: 1/1 blue Rogue]." points at the token card
 * that is a 1/1 blue Rogue, and the card shows the token as printed rules text: "Create two 1/1
 * blue Rogue creature tokens with "Whenever this creature becomes tapped, surveil 1."".
 *
 * The reference describes the token card by name, power/toughness, colors, subtypes and card
 * types. When that fits several token cards, a "with" part picks one by a keyword or a piece of
 * an ability: [Token: 1/1 blue Rogue with flying], [Token: 1/1 blue Rogue with "surveil"]. The
 * abilities on the card always come from the token card. Count words ("two") and "tapped" stay
 * outside the brackets.
 *
 * A reference to a token that is sacrificed shows only its kind: "Sacrifice a [Token: Food]" reads
 * "Sacrifice a Food".
 */

/** A token reference anywhere in a line. Group 1 is the text inside the brackets. */
export const TOKEN_REFERENCE = /\[\s*token\s*:([^[\]]*)\]/gi;
const HAS_TOKEN_REFERENCE = /\[\s*token\s*:/i;

export const hasTokenReference = (text: string) => HAS_TOKEN_REFERENCE.test(text);

export interface TokenReference {
  // The text inside the brackets, trimmed: "1/1 blue Rogue with flying".
  content: string;
  // The part before "with": "1/1 blue Rogue".
  description: string;
  // The pieces of the "with" part: keywords in lower case, or text from inside quotes.
  keywords: string[];
  quotes: string[];
}

const QUOTE = /["“]([^"”]*)["”]?/g;

export const parseTokenReference = (content: string): TokenReference => {
  const trimmed = content.trim();
  const withIndex = trimmed.search(/\s+with\s+/i);
  const description = (withIndex < 0 ? trimmed : trimmed.slice(0, withIndex)).trim();
  const withPart = withIndex < 0 ? '' : trimmed.slice(withIndex).replace(/^\s+with\s+/i, '');
  const quotes = [...withPart.matchAll(QUOTE)].map(([, quote]) => quote.trim()).filter(Boolean);
  const keywords = withPart
    .replace(QUOTE, ' ')
    .split(/,|\band\b/i)
    .map(part => part.trim().toLowerCase())
    .filter(Boolean);
  return { content: trimmed, description, keywords, quotes };
};

const STATS = /^(?:\d+|x|\*)\/(?:\d+|x|\*)$/i;

interface DescriptionTerms {
  stats?: string;
  colors: ColorType[];
  types: CardType[];
  legendary: boolean;
  // Words of the name and subtypes, lower case.
  words: string[];
}

// The parts of a description; color and type words are optional, the rest has to match.
const describeTerms = (description: string): DescriptionTerms => {
  const terms: DescriptionTerms = { colors: [], types: [], legendary: false, words: [] };
  description
    .replace(/,/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .forEach(word => {
      const lower = word.toLowerCase();
      if (STATS.test(word)) terms.stats = word;
      else if (COLOR_WORDS[lower]) terms.colors.push(COLOR_WORDS[lower]);
      else if (TYPE_WORDS[lower]) terms.types.push(TYPE_WORDS[lower]);
      else if (lower === 'legendary') terms.legendary = true;
      else if (lower !== 'and' && lower !== 'token' && lower !== 'tokens') terms.words.push(lower);
    });
  return terms;
};

const sameColors = (a: ColorType[], b: ColorType[]) =>
  a.length === b.length && a.every(color => b.includes(color));

// A predefined token ([Token: Food]) has its card types even when the reference leaves them out:
// a Food Goblin artifact creature token isn't a Food token.
const hasPredefinedTypes = (terms: DescriptionTerms, face: CardFaceInterface) => {
  const predefined = PREDEFINED_TOKENS[terms.words.join(' ')];
  if (!predefined) return true;
  const types = terms.types.length ? terms.types : predefined.cardTypes;
  const faceTypes: CardType[] = (face.cardTypes || []).filter(type => type !== CardType.Token);
  return faceTypes.length === types.length && types.every(type => faceTypes.includes(type));
};

const matchesReference = (reference: TokenReference, face: CardFaceInterface) => {
  const terms = describeTerms(reference.description);
  if (terms.stats && normaliseStats(face.cardStats) !== normaliseStats(terms.stats)) return false;
  // A token card without colors set fits any colors.
  const faceColors = tokenFaceColors(face);
  if (terms.colors.length && faceColors.length && !sameColors(terms.colors, faceColors)) {
    return false;
  }
  if (terms.types.some(type => !face.cardTypes?.includes(type))) return false;
  if (terms.legendary && !face.legendary) return false;
  const faceWords = tokenFaceWords(face);
  if (terms.words.some(word => !faceWords.has(word))) return false;
  if (!hasPredefinedTypes(terms, face)) return false;
  const abilities = tokenAbilityLines(face);
  const pieces = abilityPieces(abilities);
  if (reference.keywords.some(keyword => !pieces.has(keyword))) return false;
  const lines = abilities.map(looseAbility);
  return reference.quotes.every(quote => lines.some(line => line.includes(looseAbility(quote))));
};

// Quoted abilities in a reference turn inner quotes into single quotes and drop mechanic brackets.
const looseAbility = (text: string) => plainAbility(text.replace(/['‘’[\]]/g, ''));

/** The token cards a reference fits. Exactly one means the reference finds its token card. */
export const resolveTokenReference = (
  reference: TokenReference | string,
  tokenCards: TokenCardMatch[],
): TokenCardMatch[] => {
  const parsed = typeof reference === 'string' ? parseTokenReference(reference) : reference;
  return tokenCards.filter(({ face }) => matchesReference(parsed, face));
};

// "an 8/8", "an X/X", "an Elf", "a 1/1".
const article = (text: string) => (/^(?:[aeiou]|8|11\/|18\/|x\/)/i.test(text) ? 'an' : 'a');

const list = (items: string[]) => {
  if (items.length <= 2) return items.join(' and ');
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
};

const colorText = (face: CardFaceInterface) => {
  const colors = tokenFaceColors(face).map(color => color as string);
  return list(colors);
};

const MECHANIC_ONLY = /^\[[^[\]]*\]$/;

/**
 * The abilities of a token card as a "with …" list: keyword lines as lower case keywords ("flying
 * and vigilance"), other lines quoted, without reminder text. Quotes inside an ability become
 * single quotes, as printed. In a reference (`forReference`), square brackets can't appear, so a
 * mechanic ([Ravage {1}]) is quoted without them.
 */
const abilityItems = (face: CardFaceInterface, forReference: boolean) =>
  tokenAbilityLines(face).flatMap(line => {
    const text = line.replace(/\s*\([^)]*\)/g, '').trim();
    if (!text) return [];
    if (MECHANIC_ONLY.test(text) && !forReference) return [text];
    if (KEYWORD_LINE.test(text)) {
      return text
        .split(/\s*,\s*/)
        .map(keyword => keyword.charAt(0).toLowerCase() + keyword.slice(1));
    }
    const quoted = text.replace(/["“”]/g, "'");
    return [`"${forReference ? quoted.replace(/[[\]]/g, '') : quoted}"`];
  });

const abilityText = (face: CardFaceInterface) => {
  const items = abilityItems(face, false);
  return items.length ? ` with ${list(items)}` : '';
};

interface FaceDescription {
  // "legendary 4/4 black Dog creature", without article and "token".
  core: string;
  // The token's name when it isn't just its kind: "Princess".
  name?: string;
  // " with menace and "…"", or empty.
  abilities: string;
}

const describeFace = (face: CardFaceInterface): FaceDescription => {
  const predefined = getPredefinedKind(face);
  if (predefined) return { core: predefined, abilities: '' };
  const subtypes = (face.cardSubTypes || '').trim();
  const types = TOKEN_TYPE_ORDER.filter(type => face.cardTypes?.includes(type)).map(type =>
    type.toLowerCase(),
  );
  const core = [
    face.legendary ? 'legendary' : '',
    (face.cardStats || '').replace(/\s+/g, ''),
    colorText(face),
    subtypes,
    ...types,
  ]
    .filter(Boolean)
    .join(' ');
  return { core, name: tokenCardName(face), abilities: abilityText(face) };
};

/**
 * The words a reference shows for a token card. `determiner` is the article or count word in
 * front of it: "two" makes it plural, "a" is replaced by the right article, no determiner adds one.
 */
const tokenText = (
  { core, name, abilities }: FaceDescription,
  plural: boolean,
  hasDeterminer: boolean,
) => {
  if (plural) return `${core} tokens${name ? ` named ${name}` : ''}${abilities}`;
  if (name && !hasDeterminer) return `${name}, ${article(core)} ${core} token${abilities}`;
  const token = `${core} token${name ? ` named ${name}` : ''}${abilities}`;
  return hasDeterminer ? token : `${article(core)} ${token}`;
};

const PLURAL_COUNT = String.raw`(?:one or more|two|three|four|five|six|seven|eight|nine|ten|x|\d+|that many|twice that many|a number of|any number of|that number of|those)`;
const SINGULAR_DETERMINER = String.raw`(?:one|another|that|the|this|each)`;
const ADJECTIVES = String.raw`(?:(?:tapped|untapped|attacking|blocking|additional|other)(?:\s+and\s+(?:tapped|untapped|attacking|blocking))?\s+)?`;
const PLURAL_BEFORE = new RegExp(String.raw`\b${PLURAL_COUNT}\s+${ADJECTIVES}$`, 'i');
const DETERMINER_BEFORE = new RegExp(
  String.raw`\b(?:${SINGULAR_DETERMINER}|a|an)\s+${ADJECTIVES}$`,
  'i',
);
// Text up to a reference that is sacrificed: "Sacrifice a", "you sacrifice a Clue or another". The
// things sacrificed along with it are listed in between, without another "create" or sentence.
const SACRIFICE_BEFORE = new RegExp(
  String.raw`\bsacrific(?:e|es|ed|ing)\s+(?:(?:(?!\bcreates?\b)[^.;:"“”])*?(?:,|\band\b|\bor\b)\s+)?(?:(?:a|an|up to|${PLURAL_COUNT}|${SINGULAR_DETERMINER})\s+)*${ADJECTIVES}$`,
  'i',
);

/** Whether the reference at `index` of the line is a token the text sacrifices. */
export const isSacrificedReference = (line: string, index: number) =>
  SACRIFICE_BEFORE.test(line.slice(0, index).replace(TOKEN_REFERENCE, 'token'));

// A reference with the article written in front of it: "a [Token: …]". Group 1 is the article,
// group 2 the reference, group 3 a period right after it.
const REFERENCE_IN_LINE = /(\b(?:a|an)\s+)?\[\s*token\s*:([^[\]]*)\](\.)?/gi;

// How a reference that finds no single token card reads: "a 1/1 blue Rogue token".
const fallbackText = (reference: TokenReference, plural: boolean, hasDeterminer: boolean) => {
  const core = reference.description || 'token';
  const noun = /\btokens?$/i.test(core) ? core.replace(/\btokens?$/i, '').trim() : core;
  if (plural) return `${noun} tokens`;
  return hasDeterminer ? `${noun} token` : `${article(noun)} ${noun} token`;
};

/** What a sacrificed token is called: "Food", "Rogue", "token named Princess". */
export const sacrificedTokenKind = (face: CardFaceInterface) => {
  const predefined = getPredefinedKind(face);
  if (predefined) return predefined;
  const name = tokenCardName(face);
  return name ? `token named ${name}` : (face.cardSubTypes || '').trim() || 'token';
};

const IRREGULAR_PLURALS: Record<string, string> = {
  blood: 'Blood tokens',
  gold: 'Gold tokens',
  fish: 'Fish',
  mouse: 'Mice',
  ox: 'Oxen',
  fungus: 'Fungi',
};

const pluralKind = (kind: string) => {
  if (/^token\b/.test(kind)) return kind.replace(/^token/, 'tokens');
  return kind.replace(/\S+$/, word => {
    const irregular = IRREGULAR_PLURALS[word.toLowerCase()];
    if (irregular) return irregular;
    if (/(?:el|wol|dwar)f$/i.test(word)) return `${word.slice(0, -1)}ves`;
    if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
    return /(?:s|x|z|ch|sh)$/i.test(word) ? `${word}es` : `${word}s`;
  });
};

const sacrificedText = (
  reference: TokenReference,
  matches: TokenCardMatch[],
  plural: boolean,
  hasDeterminer: boolean,
) => {
  // Several token cards of the same kind (a blue and a red Rogue) read the same here.
  const kinds = [...new Set(matches.map(({ face }) => sacrificedTokenKind(face)))];
  const described = reference.description
    .split(/\s+/)
    .filter(word => {
      const lower = word.toLowerCase().replace(/,$/, '');
      return (
        !STATS.test(word) &&
        !COLOR_WORDS[lower] &&
        !TYPE_WORDS[lower] &&
        !['legendary', 'and', 'token', 'tokens'].includes(lower)
      );
    })
    .join(' ');
  const kind = kinds.length === 1 ? kinds[0] : described || 'token';
  if (plural) return pluralKind(kind);
  return hasDeterminer ? kind : `${article(kind)} ${kind}`;
};

/**
 * The line with every token reference written out as rules text, from the token card it finds.
 * A reference that finds no single token card shows its description: "a 1/1 blue Rogue token".
 */
export const expandTokenReferences = (line: string, tokenCards: TokenCardMatch[]): string => {
  if (!hasTokenReference(line)) return line;
  return line.replace(
    REFERENCE_IN_LINE,
    (
      whole,
      typedArticle: string | undefined,
      content: string,
      period: string | undefined,
      offset: number,
    ) => {
      const before = line.slice(0, offset);
      const plural = !typedArticle && PLURAL_BEFORE.test(before);
      const hasDeterminer = !typedArticle && !plural && DETERMINER_BEFORE.test(before);
      const reference = parseTokenReference(content);
      const matches = resolveTokenReference(reference, tokenCards);
      const text = isSacrificedReference(line, offset)
        ? sacrificedText(reference, matches, plural, hasDeterminer)
        : matches.length === 1
          ? tokenText(describeFace(matches[0].face), plural, hasDeterminer)
          : fallbackText(reference, plural, hasDeterminer);
      // A quoted ability ends the sentence already: … surveil 1." instead of … surveil 1.".
      const keepPeriod = period && !/[.!?]["']+$/.test(text);
      // "A [Token: …]" at the start of a sentence keeps its capital letter.
      const written = typedArticle && /^A/.test(typedArticle) ? capitalize(text) : text;
      return `${written}${keepPeriod ? period : ''}`;
    },
  );
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The face fields with rules text that may hold token references. */
export const TOKEN_REFERENCE_FIELDS = [
  'cardText',
  'level1Text',
  'level2Text',
  'adventureText',
  'omenText',
  'prepareText',
  'aftermathText',
] as const;

/** The face with every token reference in its rules text written out. Unchanged without any. */
export const expandFaceTokenReferences = <T extends object>(
  face: T,
  tokenCards: TokenCardMatch[],
): T => {
  const fields = face as Record<string, unknown>;
  const changed = TOKEN_REFERENCE_FIELDS.filter(key => {
    const lines = fields[key];
    return (
      Array.isArray(lines) &&
      lines.some(line => typeof line === 'string' && hasTokenReference(line))
    );
  });
  if (!changed.length) return face;
  const expanded: Record<string, unknown> = { ...fields };
  changed.forEach(key => {
    expanded[key] = (fields[key] as string[]).map(line => expandTokenReferences(line, tokenCards));
  });
  return expanded as T;
};

/**
 * The description a reference to the token card starts from: "1/1 blue Rogue", "legendary
 * Princess", "legendary 2/2 blue Bird".
 */
export const tokenCardDescription = (face: CardFaceInterface) => {
  const predefined = getPredefinedKind(face);
  if (predefined) return predefined;
  const legendary = face.legendary ? 'legendary' : '';
  const { name } = describeFace(face);
  if (name) return [legendary, name].filter(Boolean).join(' ');
  const colors = list(tokenFaceColors(face));
  return [
    legendary,
    (face.cardStats || '').replace(/\s+/g, ''),
    colors,
    (face.cardSubTypes || '').trim(),
  ]
    .filter(Boolean)
    .join(' ');
};

/**
 * The reference to a token card: its description and all of its abilities, so the rules text
 * shows which token it creates: `1/1 blue Rogue with "Whenever this creature becomes tapped,
 * surveil 1."`. Predefined tokens (Treasure, Food, ...) are named only; their abilities are
 * understood, as on printed cards.
 */
export const tokenReferenceFor = (face: CardFaceInterface) => {
  const description = tokenCardDescription(face);
  if (getPredefinedKind(face)) return description;
  const abilities = abilityItems(face, true);
  return abilities.length ? `${description} with ${list(abilities)}` : description;
};

export interface OpenTokenReference {
  // Where the reference starts ("[") and ends (after its "]", or at the caret while unclosed).
  start: number;
  end: number;
  // What is typed after "Token:" up to the caret.
  query: string;
}

const OPEN_REFERENCE = /\[\s*token\s*:([^[\]\n]*)$/i;
const REFERENCE_REST = /^[^[\]\n]*\]/;

/** The token reference the caret is in while typing it, for autocomplete. */
export const findOpenTokenReference = (text: string, caret: number): OpenTokenReference | null => {
  const open = text.slice(0, caret).match(OPEN_REFERENCE);
  if (!open) return null;
  const rest = text.slice(caret).match(REFERENCE_REST);
  return {
    start: caret - open[0].length,
    end: caret + (rest ? rest[0].length : 0),
    query: open[1].trim(),
  };
};

/** A short text for the abilities of a token card, for lists of token cards. */
export const tokenCardAbilitySummary = (face: CardFaceInterface) =>
  tokenAbilityLines(face)
    .map(line => line.replace(/\s*\([^)]*\)/g, '').trim())
    .filter(Boolean)
    .join(' · ');

// A run of private use characters as long as the reference, ending in "token" so token
// creation checks see "create … token". `maskTokenReferences` and `unmaskTokenReferences` use it.
const MASK_START = '';
const MASK_FILL = '';
const MASK_END = '';
const MASK = /*token/g;

/**
 * The line with each token reference replaced by a placeholder of the same length, so text checks
 * read it as one opaque token, and the references to put back with `unmaskTokenReferences`.
 */
export const maskTokenReferences = (line: string) => {
  const references: string[] = [];
  const masked = line.replace(TOKEN_REFERENCE, reference => {
    references.push(reference);
    return `${MASK_START}${MASK_FILL.repeat(Math.max(0, reference.length - 7))}token${MASK_END}`;
  });
  return { masked, references };
};

/** Puts the references `maskTokenReferences` took out back into a (possibly changed) line. */
export const unmaskTokenReferences = (masked: string, references: string[]) => {
  let index = 0;
  return masked.replace(MASK, placeholder => references[index++] ?? placeholder);
};
