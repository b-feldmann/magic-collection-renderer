import CardFaceInterface from '../interfaces/CardFaceInterface';
import MechanicInterface from '../interfaces/MechanicInterface';
import { CardType } from '../interfaces/enums';
import { BULLET_PREFIX, isKnownSymbol } from './injectUtils';

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
  | 'missing-period';

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
  face: CardFaceInterface;
  mechanics: MechanicInterface[];
  // How this card refers to itself in this field ("creature", "Equipment", ...), or null to
  // leave ~ alone (legendary cards, unknown types, the spell half of an Adventure, ...).
  selfNoun: string | null;
  // Card text of a planeswalker, whose abilities are written "cost|text".
  loyaltyAbilities: boolean;
}

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

const unknownMechanics: Check = ({ body, mechanics }) => {
  const named = mechanics.filter(mechanic => mechanic.name.trim());
  // Mechanics may not be loaded yet; don't report every bracket then.
  if (!named.length) return [];

  return [...body.matchAll(/\[([^[\]]*)\]/g)].flatMap(match => {
    const content = match[1];
    if (named.some(mechanic => content.includes(mechanic.name))) return [];

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
  createToken,
  numberWords,
  whenWhenever,
  dies,
  outdatedTerms,
  article,
  spacing,
  capitalization,
  missingPeriod,
];

// Splits off the parts of a line that aren't rules text: a planeswalker cost and a bullet.
const splitLine = (line: string, isPlaneswalker: boolean) => {
  const costEnd = isPlaneswalker ? line.indexOf('|') + 1 : 0;
  const rest = line.slice(costEnd);
  const bullet = rest.match(BULLET_PREFIX)?.[0] ?? '';
  return { prefix: line.slice(0, costEnd) + bullet, body: rest.slice(bullet.length) };
};

// Checks of a whole field against the rest of the card. They only explain; there's no fix.
interface StructureFinding {
  rule: RulesTextLintRule;
  message: string;
  line?: number;
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

const STRUCTURE_CHECKS: StructureCheck[] = [enchantLine, equipLine, crewLine, modes, offColorCost];

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

export interface LintOptions {
  // The card's mana cost, to check activated abilities for colors outside it. Leave it out
  // for faces without one of their own (back faces).
  manaCost?: string;
}

/** All templating issues in the rules text of one card face, in field and line order. */
export const lintCardFace = (
  face: CardFaceInterface,
  mechanics: MechanicInterface[] = [],
  { manaCost }: LintOptions = {},
): RulesTextLintIssue[] => {
  const types = face.cardTypes || [];
  const isPlaneswalker = types.includes(CardType.Planeswalker);
  const selfNoun = getSelfNoun(face);
  const colors = manaCost?.trim()
    ? new Set((manaCost.match(/\{[^{}]*\}/g) ?? []).flatMap(symbolColors))
    : null;

  const textIssues = TEXT_FIELDS.filter(field => field.applies(types)).flatMap(field => {
    const lines = face[field.key];
    if (!Array.isArray(lines)) return [];
    const loyaltyAbilities = isPlaneswalker && field.key === 'cardText';
    const split = lines.map(line => splitLine(line, loyaltyAbilities));

    const lineIssues = lines.flatMap((line, lineIndex) => {
      const { prefix, body } = split[lineIndex];
      if (!body.trim()) return [];
      const context: LineContext = {
        body,
        face,
        mechanics,
        selfNoun: field.selfReferences ? selfNoun : null,
        loyaltyAbilities,
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
            ? { label: finding.fixLabel ?? 'Fix', line: prefix + finding.fixed }
            : undefined,
      }));
    });

    const structureIssues = STRUCTURE_CHECKS.flatMap(check =>
      check({
        face,
        field,
        bodies: split.map(({ body }) => body),
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
    }));

    // Hints about the whole field first, then by line (sort is stable).
    return [...structureIssues, ...lineIssues].sort((a, b) => (a.line ?? -1) - (b.line ?? -1));
  });

  return [...textIssues, ...missingStats(face)];
};

/** The field's lines with one issue's fix applied. */
export const applyLintFix = (lines: string[], issue: RulesTextLintIssue): string[] =>
  issue.fix ? lines.map((line, index) => (index === issue.line ? issue.fix!.line : line)) : lines;
