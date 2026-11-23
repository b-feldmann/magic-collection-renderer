import CardFaceInterface from '../interfaces/CardFaceInterface';
import MechanicInterface from '../interfaces/MechanicInterface';
import { CardType, RarityType } from '../interfaces/enums';
import { BULLET_PREFIX, isKnownSymbol } from './injectUtils';
import {
  CreatedToken,
  findLowercaseTokenSubtypes,
  findUncreatedTokenReferences,
  getTokenDetailDifferences,
  getTokenLinks,
  TokenCardMatch,
  TokenLink,
} from './tokenLinks';
import {
  expandTokenReferences,
  maskTokenReferences,
  parseTokenReference,
  resolveTokenReference,
  TOKEN_REFERENCE,
  tokenReferenceFor,
  unmaskTokenReferences,
} from './tokenReferences';

/**
 * Templating checks for rules text, shown as hints in the card editor.
 *
 * "warning" means the text won't render as intended (an unknown symbol or mechanic, a CARDNAME
 * placeholder). "suggestion" means it renders, but current printed cards word it differently.
 * A check may offer a fix: the whole line with the fix applied.
 */
export type RulesTextLintSeverity = 'warning' | 'suggestion';

export type RulesTextLintRule =
  | 'unknown-symbol'
  | 'unknown-mechanic'
  | 'unclosed-symbol'
  | 'bare-mana'
  | 'loyalty-cost'
  | 'cardname-placeholder'
  | 'tap-symbol'
  | 'literal-name'
  | 'self-reference'
  | 'enters'
  | 'mana-value'
  | 'pronoun'
  | 'until-end-of-turn'
  | 'your-choice-of'
  | 'create-token'
  | 'number-words'
  | 'when-whenever'
  | 'dies'
  | 'outdated-term'
  | 'article'
  | 'spacing'
  | 'enchant-line'
  | 'equip-line'
  | 'crew-line'
  | 'modes'
  | 'off-color-cost'
  | 'missing-stats'
  | 'capitalization'
  | 'missing-period'
  | 'double-punctuation'
  | 'card-type-text'
  | 'duplicate-keyword'
  | 'common-complexity'
  | 'uncommon-complexity'
  | 'activated-ability'
  | 'keyword-placement'
  | 'token-card'
  | 'token-reference'
  | 'token-shorthand';

export interface LintFieldFix {
  label: string;
  // The face field to change, and its new value.
  field: 'cardSubTypes';
  value: string;
}

export interface RulesTextLintIssue {
  key: string;
  rule: RulesTextLintRule;
  severity: RulesTextLintSeverity;
  // The face field holding the text, e.g. "cardText" or "adventureText".
  field: string;
  fieldName: string;
  // Index of the line in the field.
  // Missing for hints about the whole field, e.g. an Aura without an Enchant line.
  line?: number;
  // The line as typed.
  text?: string;
  message: string;
  fix?: { label: string; line: string };
  // A fix that changes another field of the face instead of the line, e.g. adds a subtype.
  fieldFix?: LintFieldFix;
  // A token the line creates that has no token card yet, so the editor can create one.
  missingToken?: CreatedToken;
}

interface Finding {
  rule: RulesTextLintRule;
  severity: RulesTextLintSeverity;
  message: string;
  // The line body with the fix applied, and the fix button's label.
  fixed?: string;
  fixLabel?: string;
}

interface LineContext {
  // The text after a planeswalker cost ("+1|") and a bullet ("* ").
  body: string;
  // `body` with its token references ("[Token: …]"), which `body` masks.
  bodyWithReferences: string;
  face: CardFaceInterface;
  mechanics: MechanicInterface[];
  // How this card refers to itself in this field ("creature", "Equipment", ...), or null to
  // leave ~ alone (legendary cards, unknown types, the spell half of an Adventure, ...).
  selfNoun: string | null;
  // Card text of a planeswalker, whose abilities are written "cost|text".
  loyaltyAbilities: boolean;
  // The face has Cleave, whose square brackets mark words that cleaving removes.
  hasCleave: boolean;
}

const CLEAVE_BRACKET = /\[\s*cleave\b/i;

interface TextField {
  key: string;
  name: string;
  applies: (types: CardType[]) => boolean;
  // The spell half of a two-part card names itself differently; leave its references alone.
  selfReferences: boolean;
}

const TEXT_FIELDS: TextField[] = [
  { key: 'cardText', name: 'Card text', applies: () => true, selfReferences: true },
  {
    key: 'level1Text',
    name: 'Level 1 text',
    applies: types => types.includes(CardType.Evolution),
    selfReferences: true,
  },
  {
    key: 'level2Text',
    name: 'Level 2 text',
    applies: types => types.includes(CardType.Evolution),
    selfReferences: true,
  },
  {
    key: 'adventureText',
    name: 'Adventure text',
    applies: types => types.includes(CardType.Adventure),
    selfReferences: false,
  },
  {
    key: 'omenText',
    name: 'Omen text',
    applies: types => types.includes(CardType.Omen),
    selfReferences: false,
  },
  {
    key: 'prepareText',
    name: 'Prepared text',
    applies: types => types.includes(CardType.Prepared),
    selfReferences: false,
  },
  {
    key: 'aftermathText',
    name: 'Aftermath text',
    applies: types => types.includes(CardType.Aftermath),
    selfReferences: false,
  },
];

const KEYWORDS = [
  'deathtouch',
  'defender',
  'double strike',
  'enchant',
  'equip',
  'first strike',
  'flash',
  'flying',
  'haste',
  'hexproof',
  'indestructible',
  'lifelink',
  'menace',
  'protection',
  'prowess',
  'reach',
  'shroud',
  'trample',
  'vigilance',
  'ward',
];
const KEYWORD_START = new RegExp(String.raw`^(?:${KEYWORDS.join('|')})\b`, 'i');

// First words of a line that make it a sentence, which needs a final period.
const SENTENCE_STARTERS = new Set([
  '~',
  'add',
  'all',
  'as',
  'at',
  'choose',
  'counter',
  'create',
  'creatures',
  'deal',
  'destroy',
  'discard',
  'draw',
  'each',
  'enchanted',
  'equipped',
  'exile',
  'gain',
  'if',
  'look',
  'lose',
  'mill',
  'other',
  'prevent',
  'put',
  'return',
  'reveal',
  'sacrifice',
  'scry',
  'search',
  'shuffle',
  'surveil',
  'tap',
  'target',
  'this',
  'untap',
  'until',
  'when',
  'whenever',
  'you',
  'your',
]);

// Characters a line may end with without a period: punctuation, reminder text, mechanics,
// quotes, dashes before modes and closing formatting markers.
// A single hyphen after a space is a dash typed before modes: "Choose one or both -".
const SENTENCE_END = /[.!?:)\]"'”’—…*_~]$|--$|\s-$/;

const STRIKE_PAIR = /(?<!~)~(?!~)(\S(?:.*?\S)?)~(?!~)/g;

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const replaceAt = (text: string, index: number, length: number, replacement: string) =>
  text.slice(0, index) + replacement + text.slice(index + length);

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// Keeps the capital of a replaced phrase: "Converted mana cost" → "Mana value".
const matchCase = (original: string, replacement: string) =>
  /^[A-Z]/.test(original) ? capitalize(replacement) : replacement;

// Whether text inserted at `index` starts a sentence (and needs a capital letter).
const startsSentence = (body: string, index: number) =>
  /(?:^|[.!?:—(“"]|--)\s*$/.test(body.slice(0, index));

// The Vehicle switch only counts on artifacts; the editor hides it (but keeps it) on other types.
const isVehicle = (face: CardFaceInterface) =>
  !!face.vehicle && (face.cardTypes || []).includes(CardType.Artifact);

/** How a card refers to itself since Magic: The Gathering Foundations, or null to keep ~. */
export const getSelfNoun = (face: CardFaceInterface): string | null => {
  if (face.legendary) return null;
  const types = face.cardTypes || [];
  const subtypes = (face.cardSubTypes || '').toLowerCase().split(/\s+/);
  const has = (type: CardType) => types.includes(type);

  if (has(CardType.Planeswalker) || has(CardType.Emblem) || has(CardType.BasicLand)) return null;
  // Instants and sorceries still use their name in most templates.
  if (has(CardType.Instant) || has(CardType.Sorcery)) return null;
  if (isVehicle(face)) return 'Vehicle';
  if (has(CardType.Creature)) return 'creature';
  if (has(CardType.Evolution))
    return face.cardStats || face.level1Stats || face.level2Stats ? 'creature' : null;
  if (subtypes.includes('equipment')) return 'Equipment';
  if (subtypes.includes('aura')) return 'Aura';
  if (subtypes.includes('saga')) return 'Saga';
  if (has(CardType.Artifact)) return 'artifact';
  if (has(CardType.Enchantment)) return 'enchantment';
  if (has(CardType.Land)) return 'land';
  return null;
};

// "this creature", or "this card" where the card is in a hidden zone or being discarded.
const selfPhrase = (body: string, index: number, length: number, noun: string) => {
  const before = body.slice(Math.max(0, index - 16), index);
  const after = body.slice(index + length);
  const inZone =
    /^(?:'s)?\s+(?:is |was )?(?:in|from) (?:your |a |its owner's )?(?:graveyard|hand|library|exile)\b/i.test(
      after,
    ) || /\b(?:discard|reveal|cycle)\s+$/i.test(before);
  const phrase = `this ${inZone ? 'card' : noun}`;
  return startsSentence(body, index) ? capitalize(phrase) : phrase;
};

// Positions of ~ that are name references, not strikethrough markers (see formatCardText).
const nameReferences = (body: string): number[] => {
  const markers = new Set<number>();
  for (const match of body.matchAll(STRIKE_PAIR)) {
    markers.add(match.index);
    markers.add(match.index + match[0].length - 1);
  }
  const positions: number[] = [];
  for (let i = 0; i < body.length; i += 1) {
    if (body[i] === '~' && body[i + 1] !== '~' && body[i - 1] !== '~' && !markers.has(i)) {
      positions.push(i);
    }
  }
  return positions;
};

const isKeywordLine = (body: string) =>
  body.split(/,\s*/).every(part => /^\[/.test(part.trim()) || KEYWORD_START.test(part.trim()));

type Check = (context: LineContext) => Finding[];

const unknownSymbols: Check = ({ body }) =>
  [...body.matchAll(/\{[^{}]*\}/g)]
    .filter(([symbol]) => !isKnownSymbol(symbol))
    .map(([symbol]) => ({
      rule: 'unknown-symbol',
      severity: 'warning',
      message: `${symbol} isn't a known symbol and is shown as typed. Check the symbol guide.`,
    }));

const unknownMechanics: Check = ({ body, mechanics, hasCleave }) => {
  const named = mechanics.filter(mechanic => mechanic.name.trim());
  // Mechanics may not be loaded yet; don't report every bracket then.
  if (!named.length) return [];

  return [...body.matchAll(/\[([^[\]]*)\]/g)].flatMap(match => {
    const content = match[1];
    if (named.some(mechanic => content.includes(mechanic.name))) return [];
    // With Cleave, other brackets hold the words cleaving removes, not a mechanic.
    if (hasCleave) return [];

    const lowerContent = content.toLowerCase();
    const caseMismatch = named.find(mechanic => lowerContent.includes(mechanic.name.toLowerCase()));
    if (caseMismatch) {
      const start = match.index + 1 + lowerContent.indexOf(caseMismatch.name.toLowerCase());
      return [
        {
          rule: 'unknown-mechanic',
          severity: 'warning',
          message: `[${content}] doesn't match a mechanic because of its capitalization.`,
          fixed: replaceAt(body, start, caseMismatch.name.length, caseMismatch.name),
          fixLabel: `Use "${caseMismatch.name}"`,
        } satisfies Finding,
      ];
    }
    return [
      {
        rule: 'unknown-mechanic',
        severity: 'warning',
        message: `[${content}] isn't a mechanic and is shown as typed. Add it in the mechanic editor or check the spelling.`,
      } satisfies Finding,
    ];
  });
};

const cardnamePlaceholder: Check = ({ body, selfNoun }) =>
  [...body.matchAll(/\bCARD ?NAME\b/g)].map(match => ({
    rule: 'cardname-placeholder',
    severity: 'warning',
    message: `Write ~ for the card's name; ${match[0]} is shown as typed.`,
    fixed: replaceAt(
      body,
      match.index,
      match[0].length,
      selfNoun ? selfPhrase(body, match.index, match[0].length, selfNoun) : '~',
    ),
    fixLabel: selfNoun ? `Use "this ${selfNoun}"` : 'Use ~',
  }));

const tapSymbol: Check = ({ body }) =>
  [...body.matchAll(/(^|, )(Tap|Untap|T|Q)(?=\s*:)/g)].map(match => {
    const symbol = /^(?:Untap|Q)$/.test(match[2]) ? '{ut}' : '{t}';
    return {
      rule: 'tap-symbol',
      severity: 'warning',
      message: `Write ${symbol} for the ${symbol === '{t}' ? 'tap' : 'untap'} symbol in a cost.`,
      fixed: replaceAt(body, match.index + match[1].length, match[2].length, symbol),
      fixLabel: `Use ${symbol}`,
    };
  });

const literalName: Check = ({ body, face, selfNoun }) => {
  const name = face.name?.trim();
  if (!name || name.length < 3) return [];
  const pattern = new RegExp(String.raw`(?<![\w'])${escapeRegExp(name)}(?![\w])`, 'g');
  return [...body.matchAll(pattern)].map(match => ({
    rule: 'literal-name',
    severity: 'suggestion',
    message: selfNoun
      ? `Nonlegendary cards refer to themselves as "this ${selfNoun}", not by name.`
      : `Write ~ instead of "${name}" so the text follows a rename.`,
    fixed: replaceAt(
      body,
      match.index,
      name.length,
      selfNoun ? selfPhrase(body, match.index, name.length, selfNoun) : '~',
    ),
    fixLabel: selfNoun ? `Use "this ${selfNoun}"` : 'Use ~',
  }));
};

const selfReference: Check = ({ body, selfNoun }) => {
  if (!selfNoun) return [];
  return nameReferences(body).map(index => {
    const phrase = selfPhrase(body, index, 1, selfNoun);
    return {
      rule: 'self-reference',
      severity: 'suggestion',
      message: `Since Foundations, nonlegendary cards say "${phrase.toLowerCase()}" instead of their name.`,
      fixed: replaceAt(body, index, 1, phrase),
      fixLabel: `Use "${phrase.toLowerCase()}"`,
    };
  });
};

const entersTheBattlefield: Check = ({ body }) =>
  [...body.matchAll(/\b(enters?) the battlefield\b/gi)].map(match => {
    const after = body.slice(match.index + match[0].length);
    if (/^\s+under\b/i.test(after)) {
      return {
        rule: 'enters',
        severity: 'suggestion',
        message: `Since Bloomburrow, cards say "enters": "a creature enters the battlefield under your control" becomes "a creature you control enters".`,
      };
    }
    return {
      rule: 'enters',
      severity: 'suggestion',
      message: `Since Bloomburrow, cards say "${match[1]}" instead of "${match[0]}".`,
      fixed: replaceAt(body, match.index, match[0].length, match[1]),
      fixLabel: `Use "${match[1]}"`,
    };
  });

const manaValue: Check = ({ body }) =>
  [...body.matchAll(/\bconverted mana cost(s?)\b/gi)].map(match => {
    const replacement = matchCase(match[0], `mana value${match[1]}`);
    return {
      rule: 'mana-value',
      severity: 'suggestion',
      message: `"${match[0]}" is now called "${replacement.toLowerCase()}".`,
      fixed: replaceAt(body, match.index, match[0].length, replacement),
      fixLabel: `Use "${replacement.toLowerCase()}"`,
    };
  });

const pronouns: Check = ({ body }) => [
  ...[...body.matchAll(/\bhis or her\b/gi)].map(match => ({
    rule: 'pronoun' as const,
    severity: 'suggestion' as const,
    message: `Cards say "their" instead of "${match[0]}".`,
    fixed: replaceAt(body, match.index, match[0].length, matchCase(match[0], 'their')),
    fixLabel: 'Use "their"',
  })),
  ...[...body.matchAll(/\bhe or she\b/gi)].map(match => ({
    rule: 'pronoun' as const,
    severity: 'suggestion' as const,
    message: `Cards say "they" instead of "${match[0]}" (with a plural verb: "they control").`,
  })),
];

const untilEndOfTurn: Check = ({ body }) =>
  [...body.matchAll(/\buntil (?:the )?end of (?:the )?turn\b/gi)]
    .filter(([phrase]) => !/^until end of turn$/i.test(phrase))
    .map(match => ({
      rule: 'until-end-of-turn',
      severity: 'suggestion',
      message: `Cards say "until end of turn".`,
      fixed: replaceAt(
        body,
        match.index,
        match[0].length,
        matchCase(match[0], 'until end of turn'),
      ),
      fixLabel: 'Use "until end of turn"',
    }));

// A choice from a list of keywords or keyword counters puts "your choice of" in front:
// "gains your choice of flying or lifelink". A single open choice keeps "… of your choice"
// ("protection from the color of your choice", "sacrifices a creature of their choice").
const KEYWORD_OPTION = String.raw`(?:an? )?(?:${KEYWORDS.join('|')})(?: counters?)?`;
const KEYWORD_CHOICE = new RegExp(
  String.raw`\b(${KEYWORD_OPTION}(?:(?:, (?:or )?| or )${KEYWORD_OPTION})+) of (your|their) choice\b`,
  'gi',
);

const yourChoiceOf: Check = ({ body }) =>
  [...body.matchAll(KEYWORD_CHOICE)].map(match => {
    const [phrase, options, owner] = match;
    const replacement = matchCase(phrase, `${owner.toLowerCase()} choice of ${options}`);
    return {
      rule: 'your-choice-of',
      severity: 'suggestion',
      message: `A choice from a list of options is written "${owner.toLowerCase()} choice of …" in front of the list, e.g. "gains your choice of flying or lifelink until end of turn".`,
      fixed: replaceAt(body, match.index, phrase.length, replacement),
      fixLabel: `Use "${owner.toLowerCase()} choice of"`,
    };
  });

const createToken: Check = ({ body }) =>
  /\bput (?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|x|\d+) [^.]*?\btokens? onto the battlefield\b/i.test(
    body,
  )
    ? [
        {
          rule: 'create-token',
          severity: 'suggestion',
          message: `Tokens are made with "create", e.g. "Create a 1/1 white Soldier creature token."`,
        },
      ]
    : [];

// 'token with: "{T}: Add {G}."' → 'token with "{T}: Add {G}."'
const tokenWithColon: Check = ({ body }) =>
  [...body.matchAll(/\btokens?\b[^."“]*?\bwith(:)/gi)].map(match => ({
    rule: 'create-token',
    severity: 'suggestion',
    message: `Abilities follow "with" without a colon, e.g. 'create a Treasure token with "{t}: Add one mana of any color."'`,
    fixed: replaceAt(body, match.index + match[0].length - 1, 1, ''),
    fixLabel: 'Remove the colon',
  }));

// Token subtypes are capitalized like creature types: "Create a 1/1 white Soldier creature token."
const tokenSubtypeCase: Check = ({ body }) =>
  findLowercaseTokenSubtypes(body).map(({ index, word }) => ({
    rule: 'capitalization',
    severity: 'suggestion',
    message: `Token subtypes start with a capital letter: "${capitalize(word)}".`,
    fixed: replaceAt(body, index, 1, word.charAt(0).toUpperCase()),
    fixLabel: `Use "${capitalize(word)}"`,
  }));

// "[Token: …]" stands for a token the text creates: "Create two [Token: 1/1 red Rogue]."
const uncreatedTokenReference: Check = ({ bodyWithReferences }) =>
  findUncreatedTokenReferences(bodyWithReferences).map(({ reference }) => ({
    rule: 'token-reference',
    severity: 'warning',
    message: `${reference} isn't created here. A token reference stands for a token the text creates, e.g. "Create two [Token: 1/1 red Rogue]." Write other mentions of a token out, e.g. "Sacrifice a Treasure."`,
  }));

const capitalization: Check = ({ body }) => {
  const findings: Finding[] = [];
  if (/^[a-z]/.test(body)) {
    findings.push({
      rule: 'capitalization',
      severity: 'suggestion',
      message: 'Start each ability with a capital letter.',
      fixed: capitalize(body),
      fixLabel: `Use "${capitalize(body.split(/[\s,]/)[0])}"`,
    });
  }
  // Keywords after the first one in a keyword line are lower case: "Flying, trample".
  if (isKeywordLine(body)) {
    let offset = 0;
    body.split(/(,\s*)/).forEach((part, index) => {
      if (index >= 2 && index % 2 === 0 && /^[A-Z]/.test(part) && KEYWORD_START.test(part)) {
        const keyword = part.match(KEYWORD_START)![0];
        findings.push({
          rule: 'capitalization',
          severity: 'suggestion',
          message: `Keywords after the first one are lower case: "${keyword.toLowerCase()}".`,
          fixed: replaceAt(body, offset, 1, part.charAt(0).toLowerCase()),
          fixLabel: `Use "${keyword.toLowerCase()}"`,
        });
      }
      offset += part.length;
    });
  }
  return findings;
};

const missingPeriod: Check = ({ body }) => {
  const text = body.trimEnd();
  if (!text || SENTENCE_END.test(text) || isKeywordLine(text)) return [];
  const firstWord = (text.match(/^[~\w']+/)?.[0] ?? '').toLowerCase();
  const isActivated = /:\s*\S/.test(text);
  const words = text.split(/\s+/).length;
  if (!isActivated && !SENTENCE_STARTERS.has(firstWord) && words < 6) return [];
  return [
    {
      rule: 'missing-period',
      severity: 'suggestion',
      message: 'This ability is a sentence and ends with a period.',
      fixed: `${text}.`,
      fixLabel: 'Add period',
    },
  ];
};

// A quoted ability ends with its own period inside the quote, and the sentence around it doesn't
// get another one: 'with "{T}: Add {G}."', not 'with "{T}: Add {G}.".' or 'with "{T}: Add {G}".'.
const PUNCTUATION_FIXES: {
  pattern: RegExp;
  replacement: string;
  message: string;
  label: string;
}[] = [
  {
    // "… any color.".
    pattern: /([.!?])(["”])\./g,
    replacement: '$1$2',
    message: 'The quoted ability already ends with a period, so no period follows the quote.',
    label: 'Remove period',
  },
  {
    // "{T}: Add {G}".
    pattern: /(["“])([^"“”]*:[^"“”]*[^.!?\s])(["”])\./g,
    replacement: '$1$2.$3',
    message: 'A quoted ability ends with its period inside the quote: "{T}: Add {G}."',
    label: 'Move period into quote',
  },
  {
    pattern: /(?<!\.)\.\.(?!\.)/g,
    replacement: '.',
    message: 'This line has two periods in a row.',
    label: 'Remove period',
  },
];

const doublePunctuation: Check = ({ body }) =>
  PUNCTUATION_FIXES.flatMap(({ pattern, replacement, message, label }): Finding[] => {
    const fixed = body.replace(pattern, replacement);
    return fixed === body
      ? []
      : [{ rule: 'double-punctuation', severity: 'suggestion', message, fixed, fixLabel: label }];
  });

// A cost of symbols followed by the effect without a colon: "{T} Add {G}."
const COST_WITHOUT_COLON = /^((?:\{[^{}]+\})+(?:,\s*(?:\{[^{}]+\})+)*)\s+(?=[A-Z~])/;

// Order of the parts of an activated ability's cost: mana, {T}, {Q}, then everything else
// ("{1}, {T}, Sacrifice this artifact: …").
const costPartRank = (part: string) => {
  if (/^\{t\}$/i.test(part)) return 1;
  if (/^\{(?:ut|q)\}$/i.test(part)) return 2;
  if (/^(?:\{[^{}]+\})+$/.test(part)) return 0;
  return 3;
};

const activatedAbility: Check = ({ body }) => {
  const missingColon = body.match(COST_WITHOUT_COLON);
  if (missingColon && (missingColon[1].match(/\{[^{}]*\}/g) ?? []).every(isKnownSymbol)) {
    const cost = missingColon[1];
    return [
      {
        rule: 'activated-ability',
        severity: 'suggestion',
        message: `An activated ability has a colon between its cost and its effect: "${cost}: …".`,
        fixed: replaceAt(body, cost.length, 0, ':'),
        fixLabel: 'Add colon',
      },
    ];
  }

  const colon = body.search(/:\s*\S/);
  const cost = colon > 0 ? body.slice(0, colon) : '';
  if (!cost || /["“]/.test(cost)) return [];
  const parts = cost.split(/,\s*/).map(part => part.trim());
  const ranks = parts.map(costPartRank);
  if (ranks.every((rank, index) => index === 0 || ranks[index - 1] <= rank)) return [];
  const sorted = parts
    .map((part, index) => ({ part, rank: ranks[index] }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ part }) => part);
  return [
    {
      rule: 'activated-ability',
      severity: 'suggestion',
      message: 'A cost lists mana first, then {T} or {Q}, then other costs.',
      fixed: sorted.join(', ') + body.slice(colon),
      fixLabel: 'Reorder cost',
    },
  ];
};

// A { or [ without its closing partner (or the other way round) isn't turned into a symbol or
// mechanic and is shown as typed.
const unclosedSymbols: Check = ({ body }) => {
  const findings: Finding[] = [];
  const unclosed = (index: number, open: string, close: string) => {
    const token = open === '{' ? body.slice(index + 1).match(/^[^{}[\]\s:,.]+/)?.[0] : undefined;
    const symbol = token && `{${token}}`;
    const snippet = body.slice(index, index + 12).trimEnd();
    findings.push({
      rule: 'unclosed-symbol',
      severity: 'warning',
      message: `The ${open} in "${snippet}" has no closing ${close}, so it's shown as typed.`,
      ...(symbol && isKnownSymbol(symbol)
        ? {
            fixed: replaceAt(body, index + 1 + (token?.length ?? 0), 0, '}'),
            fixLabel: `Use ${symbol}`,
          }
        : {}),
    });
  };
  const stray = (open: string, close: string) =>
    findings.push({
      rule: 'unclosed-symbol',
      severity: 'warning',
      message: `There's a ${close} without a ${open} before it.`,
    });

  [
    ['{', '}'],
    ['[', ']'],
  ].forEach(([open, close]) => {
    let openIndex = -1;
    for (let i = 0; i < body.length; i += 1) {
      if (body[i] === open) {
        if (openIndex >= 0) unclosed(openIndex, open, close);
        openIndex = i;
      } else if (body[i] === close) {
        if (openIndex < 0) stray(open, close);
        openIndex = -1;
      }
    }
    if (openIndex >= 0) unclosed(openIndex, open, close);
  });
  return findings;
};

const LOYALTY_COST = /^([+−–-](?:\d+|X)|0)\s*:\s*(\S.*)$/i;

// A planeswalker ability typed "+1: …" puts its cost in the text instead of the loyalty shield.
const loyaltyCost: Check = ({ body, loyaltyAbilities }) => {
  const match = loyaltyAbilities ? body.match(LOYALTY_COST) : null;
  if (!match) return [];
  const cost = match[1].replace(/[−–]/, '-').toUpperCase();
  return [
    {
      rule: 'loyalty-cost',
      severity: 'warning',
      message: `Write the loyalty cost as "${cost}|" so it's shown in the loyalty shield.`,
      fixed: `${cost}|${match[2]}`,
      fixLabel: `Use "${cost}|"`,
    },
  ];
};

const BARE_MANA_COST = /^(?:\d+|X)?[WUBRGC]*$/;
// Mana typed without braces after "Add": "Add G" or "Add {1}, R or G".
const BARE_MANA_ADDED = /(?<![\w{}])\d*[WUBRGC]+(?![\w}])/g;

const toManaSymbols = (mana: string) =>
  [...mana.matchAll(/\d+|[XWUBRGC]/g)].map(([part]) => `{${part.toLowerCase()}}`).join('');

const bareMana: Check = ({ body, loyaltyAbilities }) => {
  if (loyaltyAbilities && LOYALTY_COST.test(body)) return [];
  // [index, length] of mana written without braces.
  const spans: [number, number][] = [];

  const colon = body.search(/:\s*\S/);
  const cost = colon > 0 ? body.slice(0, colon) : '';
  if (cost && !/["“[]/.test(cost)) {
    let offset = 0;
    cost.split(/(,\s*)/).forEach(part => {
      const trimmed = part.trim();
      if (trimmed && BARE_MANA_COST.test(trimmed)) {
        spans.push([offset + part.indexOf(trimmed), trimmed.length]);
      }
      offset += part.length;
    });
  }
  for (const add of body.matchAll(/\badd\b[^.]*/gi)) {
    for (const mana of add[0].matchAll(BARE_MANA_ADDED)) {
      spans.push([add.index + mana.index, mana[0].length]);
    }
  }
  if (!spans.length) return [];

  let fixed = body;
  let allKnown = true;
  [...spans]
    .sort((a, b) => b[0] - a[0])
    .forEach(([index, length]) => {
      const symbols = toManaSymbols(body.slice(index, index + length));
      allKnown &&= (symbols.match(/\{[^}]*\}/g) ?? []).every(isKnownSymbol);
      fixed = replaceAt(fixed, index, length, symbols);
    });
  const example = body.slice(spans[0][0], spans[0][0] + spans[0][1]);
  return [
    {
      rule: 'bare-mana',
      severity: 'warning',
      message: `Mana is written in braces, e.g. ${toManaSymbols(example)} for "${example}"; otherwise it's shown as plain text.`,
      ...(allKnown ? { fixed, fixLabel: 'Use mana symbols' } : {}),
    },
  ];
};

const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
];
const COUNTED_NOUN = String.raw`(?:cards?|tokens?|counters?|creatures?|permanents?|lands?|artifacts?|enchantments?|planeswalkers?|players?|opponents?|spells?|colors?|modes?)\b`;
// A number counting objects: "draw 2 cards", "2 target creatures", "2 +1/+1 counters".
const COUNT_BEFORE_NOUN = new RegExp(
  String.raw`(?<![\w{}/+\-−.$])\d{1,2}(?=\s+(?:(?:[+-]\d+\/[+-]\d+|[A-Za-z]+)\s+)?${COUNTED_NOUN})`,
  'g',
);
// "Create 2 1/1 white Soldier creature tokens", "Choose 2 —".
const COUNT_AFTER_VERB = /\b(?:creates?|chooses?)\s+(\d{1,2})\b/gi;

// Counts of objects are spelled out; damage, life and keyword numbers ("Scry 2") stay digits.
const numberWords: Check = ({ body }) => {
  const counts = new Map<number, string>();
  for (const match of body.matchAll(COUNT_BEFORE_NOUN)) counts.set(match.index, match[0]);
  for (const match of body.matchAll(COUNT_AFTER_VERB)) {
    counts.set(match.index + match[0].length - match[1].length, match[1]);
  }

  return [...counts]
    .sort(([a], [b]) => a - b)
    .flatMap(([index, digits]): Finding[] => {
      const word = NUMBER_WORDS[Number(digits)];
      if (!word) return [];
      // "Draw 1 card" reads "Draw a card", "1 target creature" just "target creature".
      if (digits === '1' && !/choose/i.test(body.slice(Math.max(0, index - 8), index))) {
        return [
          {
            rule: 'number-words',
            severity: 'suggestion',
            message: 'Counts are written as words: "a card", "one or more", "up to one target".',
          },
        ];
      }
      const replacement = startsSentence(body, index) ? capitalize(word) : word;
      return [
        {
          rule: 'number-words',
          severity: 'suggestion',
          message: `Counts of cards, tokens, counters and targets are written as words: "${word}".`,
          fixed: replaceAt(body, index, digits.length, replacement),
          fixLabel: `Use "${word}"`,
        },
      ];
    });
};

const SELF_SUBJECT = String.raw`(?:~|this [A-Za-z]+)`;
// Events that can happen again to the same object trigger "Whenever".
const REPEATABLE_TRIGGER = new RegExp(
  String.raw`\b(When) (?=(?:${SELF_SUBJECT}|enchanted [A-Za-z]+|equipped creature) (?:attacks|blocks|becomes blocked|becomes tapped|becomes untapped|becomes the target|deals (?:combat )?damage|is dealt damage)\b)`,
  'gi',
);
// Entering and dying happen once to an object; the card triggers "When".
const ONE_TIME_TRIGGER = new RegExp(
  String.raw`\b(Whenever) (?=${SELF_SUBJECT} (?:enters|dies|leaves the battlefield)\b(?! or ))`,
  'gi',
);

const whenWhenever: Check = ({ body }) => [
  ...[...body.matchAll(REPEATABLE_TRIGGER)].map(match => {
    const word = matchCase(match[1], 'whenever');
    return {
      rule: 'when-whenever' as const,
      severity: 'suggestion' as const,
      message:
        'An event that can happen again, like attacking or dealing damage, triggers "whenever".',
      fixed: replaceAt(body, match.index, match[1].length, word),
      fixLabel: `Use "${word}"`,
    };
  }),
  ...[...body.matchAll(ONE_TIME_TRIGGER)].map(match => {
    const word = matchCase(match[1], 'when');
    return {
      rule: 'when-whenever' as const,
      severity: 'suggestion' as const,
      message: 'This card enters or dies only once, so the trigger says "when".',
      fixed: replaceAt(body, match.index, match[1].length, word),
      fixLabel: `Use "${word}"`,
    };
  }),
];

// "is put into a graveyard from the battlefield" is "dies", but only for creatures (and
// planeswalkers); other permanents keep the long wording.
const dies: Check = ({ body, face }) =>
  [...body.matchAll(/\b(is|are) put into [\w' ]*?graveyards? from the battlefield\b/gi)].flatMap(
    (match): Finding[] => {
      const subject =
        body
          .slice(0, match.index)
          .split(/,|\.|\bwhen(?:ever)?\b|\bif\b/i)
          .pop()
          ?.trim() ?? '';
      const isCreature =
        (/\b(?:creatures?|planeswalkers?)\b/i.test(subject) &&
          !/\b(?:artifacts?|enchantments?|lands?|permanents?|cards?|nontoken)\b/i.test(subject)) ||
        (subject === '~' && (face.cardTypes || []).includes(CardType.Creature));
      if (!isCreature) return [];
      const verb = match[1].toLowerCase() === 'is' ? 'dies' : 'die';
      return [
        {
          rule: 'dies',
          severity: 'suggestion',
          message: `A creature put into a graveyard from the battlefield "${verb}".`,
          fixed: replaceAt(body, match.index, match[0].length, verb),
          fixLabel: `Use "${verb}"`,
        },
      ];
    },
  );

const OUTDATED_TERMS =
  /\b(?:(comes|come) into play|into play|in play|(is|are) unblockable|removed from the game|(remove) (.+?) from the game)\b/gi;

const outdatedTerms: Check = ({ body }) =>
  [...body.matchAll(OUTDATED_TERMS)].map(match => {
    const [phrase, enters, isAre, remove, removed] = match;
    let replacement: string;
    if (enters) replacement = enters.toLowerCase() === 'comes' ? 'enters' : 'enter';
    else if (isAre) replacement = "can't be blocked";
    else if (remove) replacement = `exile ${removed}`;
    else if (/^removed/i.test(phrase)) replacement = 'exiled';
    else if (/^into/i.test(phrase)) replacement = 'onto the battlefield';
    else replacement = 'on the battlefield';
    replacement = matchCase(phrase, replacement);
    const shown = remove ? 'exile' : replacement.toLowerCase();
    return {
      rule: 'outdated-term',
      severity: 'suggestion',
      message: `"${remove ? 'remove … from the game' : phrase.toLowerCase()}" is now worded "${shown}".`,
      fixed: replaceAt(body, match.index, phrase.length, replacement),
      fixLabel: `Use "${shown}"`,
    };
  });

// "an" before a vowel sound, including 8/8, 11/11, 18/18 and X/X; "a" before +1/+1.
const NEEDS_AN = /\b(a) (?=(?:8|11|18)\b|X\/|[aeio](?!ne\b|nce\b)\w)/gi;
const NEEDS_A = /\b(an) (?=[+-]\d|(?!8|11\b|18\b)\d|[bcdfgjklmnpqrstvwyz])/gi;

const article: Check = ({ body }) =>
  [
    ...[...body.matchAll(NEEDS_AN)].map(match => [match, 'an'] as const),
    ...[...body.matchAll(NEEDS_A)].map(match => [match, 'a'] as const),
  ].map(([match, word]) => {
    const replacement = matchCase(match[1], word);
    const next = body.slice(match.index + match[0].length).split(/\s/)[0];
    return {
      rule: 'article',
      severity: 'suggestion',
      message: `Write "${word} ${next}".`,
      fixed: replaceAt(body, match.index, match[1].length, replacement),
      fixLabel: `Use "${word}"`,
    };
  });

const spacing: Check = ({ body }) => {
  const fixed = body
    .replace(/(\S) {2,}(?=\S)/g, '$1 ')
    .replace(/(\S) +(?=[.,;:!?](?:\s|$))/g, '$1');
  if (fixed === body) return [];
  return [
    {
      rule: 'spacing',
      severity: 'suggestion',
      message: 'This line has a double space or a space before punctuation.',
      fixed,
      fixLabel: 'Fix spacing',
    },
  ];
};

const CHECKS: Check[] = [
  unknownSymbols,
  unclosedSymbols,
  unknownMechanics,
  loyaltyCost,
  bareMana,
  cardnamePlaceholder,
  tapSymbol,
  literalName,
  selfReference,
  entersTheBattlefield,
  manaValue,
  pronouns,
  untilEndOfTurn,
  yourChoiceOf,
  createToken,
  tokenWithColon,
  numberWords,
  whenWhenever,
  dies,
  outdatedTerms,
  article,
  spacing,
  capitalization,
  tokenSubtypeCase,
  uncreatedTokenReference,
  missingPeriod,
  doublePunctuation,
  activatedAbility,
];

// Splits off the parts of a line that aren't rules text: a planeswalker cost and a bullet.
const splitLine = (line: string, isPlaneswalker: boolean) => {
  const costEnd = isPlaneswalker ? line.indexOf('|') + 1 : 0;
  const rest = line.slice(costEnd);
  const bullet = rest.match(BULLET_PREFIX)?.[0] ?? '';
  return { prefix: line.slice(0, costEnd) + bullet, body: rest.slice(bullet.length) };
};

// Checks of a whole field against the rest of the card. They mostly only explain; a few can fix
// another field of the face.
interface StructureFinding {
  rule: RulesTextLintRule;
  message: string;
  line?: number;
  fieldFix?: LintFieldFix;
}

interface StructureContext {
  face: CardFaceInterface;
  field: TextField;
  // Line bodies without planeswalker cost and bullet, and whether each line is a bullet.
  bodies: string[];
  bullets: boolean[];
  // Colors of the card's mana cost, or null to skip the color check.
  colors: Set<string> | null;
}

type StructureCheck = (context: StructureContext) => StructureFinding[];

const hasSubtype = (face: CardFaceInterface, subtype: string) =>
  (face.cardSubTypes || '').toLowerCase().split(/\s+/).includes(subtype);

// The subtypes with one more at the end ("Cartouche" + "Aura" → "Cartouche Aura").
const addSubtype = (subtypes: string | undefined, subtype: string) =>
  [(subtypes || '').trim(), subtype].filter(Boolean).join(' ');

const firstLineIndex = (bodies: string[]) => bodies.findIndex(body => body.trim());

const enchantLine: StructureCheck = ({ face, field, bodies }) => {
  if (field.key !== 'cardText' || !hasSubtype(face, 'aura')) return [];
  const enchant = bodies.findIndex(body => /^enchant\b/i.test(body.trim()));
  if (enchant < 0) {
    return [
      {
        rule: 'enchant-line',
        message:
          'An Aura starts with an Enchant line that says what it can enchant, e.g. "Enchant creature".',
      },
    ];
  }
  return enchant !== firstLineIndex(bodies)
    ? [{ rule: 'enchant-line', line: enchant, message: 'The Enchant line comes first on an Aura.' }]
    : [];
};

const equipLine: StructureCheck = ({ face, field, bodies }) =>
  field.key === 'cardText' &&
  hasSubtype(face, 'equipment') &&
  !bodies.some(body => /^(?:equip|reconfigure)\b/i.test(body.trim()))
    ? [
        {
          rule: 'equip-line',
          message: 'Equipment has an Equip ability with its cost, e.g. "Equip {2}".',
        },
      ]
    : [];

const crewLine: StructureCheck = ({ face, field, bodies }) =>
  field.key === 'cardText' && isVehicle(face) && !bodies.some(body => /^crew\b/i.test(body.trim()))
    ? [{ rule: 'crew-line', message: 'A Vehicle has a Crew ability, e.g. "Crew 2".' }]
    : [];

const MODE_COUNTS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
const CHOOSE_MODES =
  /\bchoose (one|two|three|four|five)( or (?:both|more))?(?=\s*(?:—|--|-|:|\.|$)|\s+that\b|\s+at random\b)/i;

// "Choose two —" needs more modes than it chooses, written as bullet lines after it.
const modes: StructureCheck = ({ bodies, bullets }) =>
  bodies.flatMap((body, index): StructureFinding[] => {
    if (bullets[index]) return [];
    const match = body.match(CHOOSE_MODES);
    if (!match) return [];
    let count = 0;
    while (bullets[index + 1 + count]) count += 1;
    const needed = match[2] ? 2 : MODE_COUNTS[match[1].toLowerCase()] + 1;
    if (count >= needed) return [];
    return [
      {
        rule: 'modes',
        line: index,
        message: `"${match[0].trim()}" needs at least ${needed} modes as bullet lines ("* …") below it, but there ${count === 1 ? 'is 1' : `are ${count}`}.`,
      },
    ];
  });

// The colors of a mana symbol ("{w/u}" → w, u; "{2/g}" → g; "{rp}" → r), or none for other symbols.
const symbolColors = (symbol: string): string[] => {
  const parts = symbol.slice(1, -1).toLowerCase().split('/');
  if (!parts.every(part => /^(?:\d+|p|[wubrg]{1,2}p?)$/.test(part))) return [];
  return parts.flatMap(part => (/^[wubrg]/.test(part) ? [...part.replace(/p$/, '')] : []));
};

const offColorCost: StructureCheck = ({ field, bodies, colors }) => {
  if (!colors || !field.selfReferences) return [];
  return bodies.flatMap((body, index): StructureFinding[] => {
    const colon = body.search(/:\s*\S/);
    const cost = colon > 0 ? body.slice(0, colon) : '';
    if (!cost || /["“]/.test(cost)) return [];
    const offColor = (cost.match(/\{[^{}]*\}/g) ?? []).filter(symbol => {
      const costSymbolColors = symbolColors(symbol);
      return costSymbolColors.length > 0 && !costSymbolColors.some(color => colors.has(color));
    });
    if (!offColor.length) return [];
    return [
      {
        rule: 'off-color-cost',
        line: index,
        message: `${[...new Set(offColor)].join(', ')} in this cost isn't a color of the card's mana cost. That's allowed, but unusual.`,
      },
    ];
  });
};

const SELF_ENTERS = /^(?:when|whenever) (?:~|this \w+) enters\b/i;

// Text that only works on another card type: an instant that "enters", "Enchanted creature" on
// a card that isn't an Aura, a planeswalker without loyalty abilities.
const cardTypeText: StructureCheck = ({ face, field, bodies }) => {
  if (field.key !== 'cardText') return [];
  const types = face.cardTypes || [];
  const findings: StructureFinding[] = [];
  const isSpell = types.includes(CardType.Instant) || types.includes(CardType.Sorcery);
  const spellNoun = types.includes(CardType.Instant) ? 'an instant' : 'a sorcery';
  // Bestow creatures say "Enchanted creature" without being Auras.
  const bestow = bodies.some(body => /\bbestow\b/i.test(body));

  bodies.forEach((body, line) => {
    const text = body.trim();
    if (isSpell && SELF_ENTERS.test(text)) {
      findings.push({
        rule: 'card-type-text',
        line,
        message: `${capitalize(spellNoun)} never enters the battlefield, so this never triggers.`,
      });
    }
    if (
      types.includes(CardType.Instant) &&
      isKeywordLine(text) &&
      text.split(/,\s*/).some(part => /^flash$/i.test(part.trim()))
    ) {
      findings.push({
        rule: 'card-type-text',
        line,
        message:
          'Instants can already be cast any time you could cast an instant; Flash does nothing.',
      });
    }
    if (/^enchant\b/i.test(text) && !hasSubtype(face, 'aura')) {
      findings.push({
        rule: 'card-type-text',
        line,
        message: 'Only Auras have an Enchant line. Add the Aura subtype or remove the line.',
        // Aura is an enchantment subtype; on other types the fix would be wrong too.
        ...(types.includes(CardType.Enchantment)
          ? {
              fieldFix: {
                label: 'Add Aura subtype',
                field: 'cardSubTypes' as const,
                value: addSubtype(face.cardSubTypes, 'Aura'),
              },
            }
          : {}),
      });
    } else if (/^enchanted\b/i.test(text) && !hasSubtype(face, 'aura') && !bestow) {
      findings.push({
        rule: 'card-type-text',
        line,
        message: '"Enchanted …" refers to what an Aura enchants, but this card isn\'t an Aura.',
      });
    }
    if (/^equipped\b/i.test(text) && !hasSubtype(face, 'equipment')) {
      findings.push({
        rule: 'card-type-text',
        line,
        message:
          '"Equipped …" refers to what an Equipment is attached to, but this card isn\'t Equipment.',
      });
    }
  });

  // A cost typed as "+1: …" is reported by the loyalty-cost check instead.
  const hasLoyaltyAbility = (face.cardText || []).some(
    line => /^[^|]+\|/.test(line) || LOYALTY_COST.test(line),
  );
  if (types.includes(CardType.Planeswalker) && !hasLoyaltyAbility) {
    findings.push({
      rule: 'card-type-text',
      message: 'This planeswalker has no loyalty abilities. Write them as "+1|Draw a card."',
    });
  }
  return findings;
};

// Keywords that another keyword on the card already covers.
const REDUNDANT_KEYWORDS: [covered: string, by: string, reason: string][] = [
  ['first strike', 'double strike', 'Double strike already deals first-strike damage'],
  ['hexproof', 'shroud', 'Shroud already stops your opponents from targeting it'],
  ['reach', 'flying', 'A creature with flying can already block creatures with flying'],
];

const duplicateKeywords: StructureCheck = ({ bodies }) => {
  const seen = new Map<string, number>();
  const findings: StructureFinding[] = [];
  bodies.forEach((body, line) => {
    const text = body.trim();
    if (!text || !isKeywordLine(text)) return;
    text.split(/,\s*/).forEach(part => {
      const keyword = part.replace(/[[\]]/g, '').trim().toLowerCase();
      if (seen.has(keyword)) {
        findings.push({
          rule: 'duplicate-keyword',
          line,
          message: `${capitalize(keyword)} is on this card twice; a second instance does nothing.`,
        });
      } else {
        seen.set(keyword, line);
      }
    });
  });
  REDUNDANT_KEYWORDS.forEach(([covered, by, reason]) => {
    const line = seen.get(covered);
    if (line !== undefined && seen.has(by)) {
      findings.push({
        rule: 'duplicate-keyword',
        line,
        message: `${reason}, so ${covered} does nothing next to ${by}.`,
      });
    }
  });
  return findings;
};

// A custom keyword on its own ("[Plunder]") may sit with the keywords or at the bottom.
const BARE_MECHANIC = /^\[[^\]]*\]$/;
const EQUIP_LINE = /^(?:equip|reconfigure)\b/i;
const isPlainKeywordLine = (text: string) =>
  text.split(/,\s*/).every(part => KEYWORD_START.test(part.trim())) && !EQUIP_LINE.test(text);

// Keywords go at the top of the text box; Equip goes at the bottom.
const keywordPlacement: StructureCheck = ({ field, bodies, bullets }) => {
  if (field.key !== 'cardText') return [];
  const findings: StructureFinding[] = [];
  let firstOther = -1;
  bodies.forEach((body, line) => {
    const text = body.trim();
    if (!text || bullets[line] || BARE_MECHANIC.test(text) || EQUIP_LINE.test(text)) return;
    if (!isPlainKeywordLine(text)) {
      // Other keywords with a cost ("Kicker {1}{G}", "Bestow {3}{W}", "Crew 2") may come first.
      const costKeyword =
        !/[.:]/.test(text.replace(/\([^)]*\)/g, '')) && text.split(/\s+/).length <= 4;
      if (costKeyword) return;
      if (firstOther < 0) firstOther = line;
    } else if (firstOther >= 0) {
      findings.push({
        rule: 'keyword-placement',
        line,
        message:
          "Keyword abilities go at the top of the text box, before the card's other abilities.",
      });
    }
  });

  const lastEquip = bodies.reduce(
    (last, body, line) => (EQUIP_LINE.test(body.trim()) ? line : last),
    -1,
  );
  const afterEquip = bodies.findIndex(
    (body, line) =>
      line > lastEquip && body.trim() && !bullets[line] && !BARE_MECHANIC.test(body.trim()),
  );
  if (lastEquip >= 0 && afterEquip >= 0) {
    findings.push({
      rule: 'keyword-placement',
      line: lastEquip,
      message: "Equip goes last, after the card's other abilities.",
    });
  }
  return findings;
};

const STRUCTURE_CHECKS: StructureCheck[] = [
  enchantLine,
  equipLine,
  crewLine,
  modes,
  offColorCost,
  cardTypeText,
  duplicateKeywords,
  keywordPlacement,
];

// Creatures, Vehicles and planeswalkers show stats; without them the box stays empty.
const missingStats = (face: CardFaceInterface): RulesTextLintIssue[] => {
  const types = face.cardTypes || [];
  const isPlaneswalker = types.includes(CardType.Planeswalker);
  if (!types.includes(CardType.Creature) && !isPlaneswalker && !isVehicle(face)) return [];

  let message: string | undefined;
  if (isPlaneswalker) {
    if (!(face.cardStats || '').trim()) message = 'This planeswalker has no starting loyalty.';
  } else {
    // Power/Toughness is stored as "power/toughness".
    const [power = '', toughness = ''] = (face.cardStats || '').split('/').map(part => part.trim());
    const noun = isVehicle(face) ? 'Vehicle' : 'creature';
    if (!power && !toughness) message = `This ${noun} has no power and toughness.`;
    else if (!power) message = `This ${noun} has no power.`;
    else if (!toughness) message = `This ${noun} has no toughness.`;
  }
  if (!message) return [];
  return [
    {
      key: 'cardStats:missing-stats',
      rule: 'missing-stats',
      severity: 'suggestion',
      field: 'cardStats',
      fieldName: isPlaneswalker ? 'Loyalty' : 'Power/Toughness',
      message,
    },
  ];
};

// Whether a line is a bullet (a mode), after a planeswalker cost if it has one.
const isBullet = (line: string, isPlaneswalker: boolean) =>
  BULLET_PREFIX.test(isPlaneswalker ? line.slice(line.indexOf('|') + 1) : line);

// New World Order: commons stay simple so a board of them is easy to read in Limited.
export const COMMON_MAX_WORDS = 40;
export const COMMON_MAX_ABILITIES = 3;
// Uncommons may do more, but still have to be read across the table.
export const UNCOMMON_MAX_WORDS = 60;
export const UNCOMMON_MAX_ABILITIES = 4;

interface ComplexityLimits {
  rule: 'common-complexity' | 'uncommon-complexity';
  noun: string;
  words: number;
  abilities: number;
  wordsReason: string;
  // Whether static effects on other creatures are pointed out.
  boardEffects: boolean;
}

const COMPLEXITY_LIMITS: Partial<Record<RarityType, ComplexityLimits>> = {
  [RarityType.Common]: {
    rule: 'common-complexity',
    noun: 'common',
    words: COMMON_MAX_WORDS,
    abilities: COMMON_MAX_ABILITIES,
    wordsReason: 'New World Order keeps commons short',
    boardEffects: true,
  },
  [RarityType.Uncommon]: {
    rule: 'uncommon-complexity',
    noun: 'uncommon',
    words: UNCOMMON_MAX_WORDS,
    abilities: UNCOMMON_MAX_ABILITIES,
    wordsReason: 'Uncommons stay readable across the table',
    boardEffects: false,
  },
};

// Reminder text in parentheses isn't counted; a mechanic counts as the words in its brackets.
const countWords = (body: string) =>
  body
    .replace(/\([^)]*\)?/g, ' ')
    .replace(/[[\]]/g, ' ')
    .split(/\s+/)
    .filter(word => /[\p{L}\p{N}{~]/u.test(word)).length;

// A static ability that changes other creatures: lords, anthems, "Creatures can't block."
const BOARD_EFFECT =
  /^(?:other |each other |all |each )?[^.:,"]*?\b(?:creatures|you control|your opponents control|an opponent controls)\b[^.:,"]*?\b(?:get|gets|have|has|can't|cannot)\b/i;
const NOT_STATIC = /^(?:when|whenever|at|if|enchanted|equipped|target|~|this)\b/i;

const rarityComplexity = (
  face: CardFaceInterface,
  fields: { field: TextField; bodies: string[] }[],
  limits: ComplexityLimits,
): RulesTextLintIssue[] => {
  const types = face.cardTypes || [];
  const cardText = fields.find(({ field }) => field.key === 'cardText');
  const issue = (key: string, message: string, line?: number): RulesTextLintIssue => ({
    key: `cardText:${line ?? 'field'}:${limits.rule}:${key}`,
    rule: limits.rule,
    severity: 'suggestion',
    field: 'cardText',
    fieldName: 'Card text',
    line,
    text: line !== undefined ? (face.cardText || [])[line] : undefined,
    message,
  });

  const issues: RulesTextLintIssue[] = [];
  const words = fields
    .flatMap(({ bodies }) => bodies)
    .reduce((sum, body) => sum + countWords(body), 0);
  if (words > limits.words) {
    issues.push(
      issue(
        'words',
        `This ${limits.noun} has ${words} words of rules text without reminder text. ${limits.wordsReason}, at about ${limits.words} words or fewer.`,
      ),
    );
  }

  // A bare mode header ("Choose one or both —") isn't an ability; each mode below it is.
  const bodies = (cardText?.bodies || []).filter(body => {
    const text = body.trim();
    return text && !(/^choose\b/i.test(text) && CHOOSE_MODES.test(text));
  });
  // Each keyword in a keyword line ("Flying, vigilance") is an ability of its own.
  const abilities = bodies.reduce(
    (sum, body) => sum + (isKeywordLine(body.trim()) ? body.split(/,\s*/).length : 1),
    0,
  );
  if (abilities > limits.abilities) {
    issues.push(
      issue(
        'abilities',
        `This ${limits.noun} has ${abilities} abilities, counting each keyword. ${capitalize(limits.noun)}s usually have at most ${limits.abilities}.`,
      ),
    );
  }

  // One-shot effects of instants and sorceries ("Creatures you control get +1/+1 until end of
  // turn") don't stay on the board.
  if (
    limits.boardEffects &&
    !types.includes(CardType.Instant) &&
    !types.includes(CardType.Sorcery)
  ) {
    (cardText?.bodies || []).forEach((body, line) => {
      const text = body.trim();
      if (NOT_STATIC.test(text) || /until end of turn/i.test(text) || !BOARD_EFFECT.test(text)) {
        return;
      }
      issues.push(
        issue(
          'board',
          'Static effects on other creatures (lords, anthems, "can\'t block") make the board harder to read. New World Order keeps them rare at common.',
          line,
        ),
      );
    });
  }
  return issues;
};

const cardNames = (matches: TokenCardMatch[]) =>
  matches.map(({ face }) => `${face.name}${face.cardStats ? ` ${face.cardStats}` : ''}`).join(', ');

/**
 * A reference whose description finds one token card, but whose abilities that card doesn't
 * (or no longer) have: the line with the reference rewritten from the token card.
 */
const outdatedReferenceFix = (
  token: CreatedToken,
  line: string | undefined,
  tokenCards: TokenCardMatch[],
): { face: CardFaceInterface; line: string } | undefined => {
  if (line === undefined || token.reference === undefined) return undefined;
  const { description } = parseTokenReference(token.reference);
  const [match, ...others] = resolveTokenReference(description, tokenCards);
  if (!match || others.length) return undefined;
  const typed = [...line.matchAll(TOKEN_REFERENCE)].find(
    reference => reference[1].trim() === token.reference,
  );
  if (!typed) return undefined;
  const updated = `[Token: ${tokenReferenceFor(match.face)}]`;
  return {
    face: match.face,
    line: line.slice(0, typed.index) + updated + line.slice(typed.index + typed[0].length),
  };
};

// A token reference finds no token card, or several.
const tokenReferenceIssue = (
  { token, candidates = [] }: TokenLink,
  base: Omit<RulesTextLintIssue, 'rule' | 'severity' | 'message' | 'key'> & { key: string },
  tokenCards: TokenCardMatch[],
): RulesTextLintIssue => {
  const reference = `[Token: ${token.reference}]`;
  const outdated = candidates.length
    ? undefined
    : outdatedReferenceFix(token, base.text, tokenCards);
  if (outdated) {
    return {
      ...base,
      key: `${base.key}:token-reference`,
      rule: 'token-reference',
      severity: 'warning',
      message: `${reference} lists abilities the ${outdated.face.name} token card doesn't have, so the card shows only its description. Update the reference to the token card's abilities.`,
      fix: { label: 'Update token reference', line: outdated.line },
    };
  }
  if (candidates.length > 1) {
    return {
      ...base,
      key: `${base.key}:token-reference`,
      rule: 'token-reference',
      severity: 'warning',
      message: `${reference} fits ${candidates.length} token cards (${cardNames(candidates)}). Add more of the description or "with" and a keyword or a few words of an ability to pick one, e.g. [Token: ${token.reference} with flying].`,
    };
  }
  return {
    ...base,
    key: `${base.key}:token-reference`,
    rule: 'token-reference',
    severity: 'warning',
    message: `${reference} finds no token card, so the card shows only its description. Check the description or add the token card.`,
    missingToken: token,
  };
};

// "a 1/1 blue Rogue creature token with flying" → "[Token: 1/1 blue Rogue with flying]" when a
// token card prints that token, so the card's text follows the token card.
const tokenShorthandFix = (
  line: string,
  link: TokenLink,
  tokenCards: TokenCardMatch[],
): { reference: string; line: string; changes?: string } | undefined => {
  const { token, match } = link;
  if (!match || !token.span) return undefined;
  const reference = tokenReferenceFor(match.face);
  // Identical token cards: no reference tells them apart.
  if (resolveTokenReference(reference, tokenCards).length !== 1) return undefined;
  const before = line.slice(0, token.span.start);
  // The reference writes the right article itself.
  const article = before.match(/\b(?:a|an)\s+$/i);
  const start = token.span.start - (article ? article[0].length : 0);
  const fixed = `${line.slice(0, start)}[Token: ${reference}]${line.slice(token.span.end)}`;
  const written = expandTokenReferences(fixed, tokenCards);
  return { reference, line: fixed, changes: written === line ? undefined : written };
};

// "blue", "blue and red", "white, blue, and red".
const listWords = (words: string[]) =>
  words.length < 3
    ? words.join(' and ')
    : `${words.slice(0, -1).join(', ')}, and ${words[words.length - 1]}`;

const colorWords = (colors: string[]) => (colors.length ? listWords(colors) : 'colorless');

// "is green, not blue and red, and also has trample": how the token card differs from the token.
const tokenDetailDifferenceText = (token: CreatedToken, match: TokenCardMatch) => {
  const { colors, extra, missing } = getTokenDetailDifferences(token, match.face);
  const parts = [
    colors && `is ${colorWords(colors.card)}, not ${colorWords(colors.token)}`,
    extra.length && `also has ${listWords(extra)}`,
    missing.length && `doesn't have ${listWords(missing)}`,
  ].filter((part): part is string => Boolean(part));
  return parts.length ? listWords(parts) : 'has other colors or abilities';
};

const tokenCardIssues = (
  face: CardFaceInterface,
  tokenCards: TokenCardMatch[],
  mechanics: MechanicInterface[],
): RulesTextLintIssue[] =>
  getTokenLinks(face, tokenCards, mechanics).flatMap((link, index) => {
    const { token, match, differentStats, differentDetails } = link;
    const field = TEXT_FIELDS.find(textField => textField.key === token.field);
    const lines = face[token.field];
    const text = Array.isArray(lines) ? (lines[token.line] as string) : undefined;
    const base = {
      key: `${token.field}:${token.line}:token-card:${index}`,
      field: token.field,
      fieldName: field?.name ?? token.field,
      line: token.line,
      text,
    };
    if (token.reference !== undefined) {
      return match ? [] : [tokenReferenceIssue(link, base, tokenCards)];
    }
    if (match) {
      const shorthand = text !== undefined && tokenShorthandFix(text, link, tokenCards);
      if (!shorthand) return [];
      return [
        {
          ...base,
          key: `${base.key}:token-shorthand`,
          rule: 'token-shorthand' as const,
          severity: 'suggestion' as const,
          message: `Use [Token: ${shorthand.reference}] for the ${match.face.name} token card.${
            shorthand.changes ? ` Then reads: "${shorthand.changes}"` : ''
          }`,
          fix: { label: 'Use token reference', line: shorthand.line },
        },
      ];
    }
    const kind = token.name || token.subtypes.join(' ');
    // "… this creates through [Plunder]".
    const source = token.mechanic ? ` through [${token.mechanic}]` : '';
    return [
      {
        ...base,
        rule: 'token-card' as const,
        severity: 'suggestion' as const,
        message: differentStats
          ? `This creates a ${token.label} token${source}, but the ${differentStats.face.name || kind} token card is ${differentStats.face.cardStats || 'without power/toughness'}.`
          : differentDetails
            ? `This creates a ${token.label} token${source}, but the ${differentDetails.face.name || kind} token card ${tokenDetailDifferenceText(token, differentDetails)}. Add a token card for this one, or change the text to match that card.`
            : `There's no token card for the ${token.label} token this creates${source}. Add one so the token is printed with the set.`,
        missingToken: token,
      },
    ];
  });

export interface LintOptions {
  // The card's mana cost, to check activated abilities for colors outside it. Leave it out
  // for faces without one of their own (back faces).
  manaCost?: string;
  // The card's rarity; commons are checked for New World Order complexity.
  rarity?: RarityType;
  // The token cards of the collection, to check that every token the card creates has one.
  // Leave it out to skip the check.
  tokenCards?: TokenCardMatch[];
}

/** All templating issues in the rules text of one card face, in field and line order. */
export const lintCardFace = (
  face: CardFaceInterface,
  mechanics: MechanicInterface[] = [],
  { manaCost, rarity, tokenCards }: LintOptions = {},
): RulesTextLintIssue[] => {
  const types = face.cardTypes || [];
  const isPlaneswalker = types.includes(CardType.Planeswalker);
  const selfNoun = getSelfNoun(face);
  const colors = manaCost?.trim()
    ? new Set((manaCost.match(/\{[^{}]*\}/g) ?? []).flatMap(symbolColors))
    : null;

  const textFields = TEXT_FIELDS.filter(field => field.applies(types));
  const hasCleave = textFields.some(field => {
    const lines = face[field.key];
    return Array.isArray(lines) && lines.some(line => CLEAVE_BRACKET.test(line));
  });
  const textIssues = textFields.flatMap(field => {
    const lines = face[field.key];
    if (!Array.isArray(lines)) return [];
    const loyaltyAbilities = isPlaneswalker && field.key === 'cardText';
    const split = lines.map(line => splitLine(line, loyaltyAbilities));

    const lineIssues = lines.flatMap((line, lineIndex) => {
      const { prefix, body: typed } = split[lineIndex];
      if (!typed.trim()) return [];
      // Token references read as one opaque token to the checks; fixes keep them as typed.
      const { masked: body, references } = maskTokenReferences(typed);
      const context: LineContext = {
        body,
        bodyWithReferences: typed,
        face,
        mechanics,
        selfNoun: field.selfReferences ? selfNoun : null,
        loyaltyAbilities,
        hasCleave,
      };

      return CHECKS.flatMap(check => check(context)).map((finding, index): RulesTextLintIssue => ({
        key: `${field.key}:${lineIndex}:${finding.rule}:${index}`,
        rule: finding.rule,
        severity: finding.severity,
        field: field.key,
        fieldName: field.name,
        line: lineIndex,
        text: line,
        message: finding.message,
        fix:
          finding.fixed !== undefined
            ? {
                label: finding.fixLabel ?? 'Fix',
                line: prefix + unmaskTokenReferences(finding.fixed, references),
              }
            : undefined,
      }));
    });

    const structureIssues = STRUCTURE_CHECKS.flatMap(check =>
      check({
        face,
        field,
        bodies: split.map(({ body }) => maskTokenReferences(body).masked),
        bullets: lines.map(line => isBullet(line, loyaltyAbilities)),
        colors,
      }),
    ).map((finding, index): RulesTextLintIssue => ({
      key: `${field.key}:${finding.line ?? 'field'}:${finding.rule}:s${index}`,
      rule: finding.rule,
      severity: 'suggestion',
      field: field.key,
      fieldName: field.name,
      line: finding.line,
      text: finding.line !== undefined ? lines[finding.line] : undefined,
      message: finding.message,
      ...(finding.fieldFix ? { fieldFix: finding.fieldFix } : {}),
    }));

    // Hints about the whole field first, then by line (sort is stable).
    return [...structureIssues, ...lineIssues].sort((a, b) => (a.line ?? -1) - (b.line ?? -1));
  });

  const limits = rarity !== undefined ? COMPLEXITY_LIMITS[rarity] : undefined;
  const complexityIssues = limits
    ? rarityComplexity(
        face,
        textFields.map(field => {
          const lines = face[field.key];
          return {
            field,
            bodies: Array.isArray(lines)
              ? lines.map(line => splitLine(line, isPlaneswalker && field.key === 'cardText').body)
              : [],
          };
        }),
        limits,
      )
    : [];

  // By field, then hints about the whole field first, then by line (sort is stable).
  const fieldOrder = (key: string) => {
    const index = TEXT_FIELDS.findIndex(field => field.key === key);
    return index < 0 ? TEXT_FIELDS.length : index;
  };
  return [
    ...complexityIssues,
    ...textIssues,
    ...(tokenCards ? tokenCardIssues(face, tokenCards, mechanics) : []),
    ...missingStats(face),
  ].sort((a, b) => fieldOrder(a.field) - fieldOrder(b.field) || (a.line ?? -1) - (b.line ?? -1));
};

/** The field's lines with one issue's fix applied. */
export const applyLintFix = (lines: string[], issue: RulesTextLintIssue): string[] =>
  issue.fix ? lines.map((line, index) => (index === issue.line ? issue.fix!.line : line)) : lines;
