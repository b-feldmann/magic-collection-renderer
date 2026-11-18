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
  | 'cardname-placeholder'
  | 'tap-symbol'
  | 'literal-name'
  | 'self-reference'
  | 'enters'
  | 'mana-value'
  | 'pronoun'
  | 'until-end-of-turn'
  | 'create-token'
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
  line: number;
  // The line as typed.
  text: string;
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

/** How a card refers to itself since Magic: The Gathering Foundations, or null to keep ~. */
export const getSelfNoun = (face: CardFaceInterface): string | null => {
  if (face.legendary) return null;
  const types = face.cardTypes || [];
  const subtypes = (face.cardSubTypes || '').toLowerCase().split(/\s+/);
  const has = (type: CardType) => types.includes(type);

  if (has(CardType.Planeswalker) || has(CardType.Emblem) || has(CardType.BasicLand)) return null;
  // Instants and sorceries still use their name in most templates.
  if (has(CardType.Instant) || has(CardType.Sorcery)) return null;
  if (face.vehicle) return 'Vehicle';
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

const CHECKS: Check[] = [
  unknownSymbols,
  unknownMechanics,
  cardnamePlaceholder,
  tapSymbol,
  literalName,
  selfReference,
  entersTheBattlefield,
  manaValue,
  pronouns,
  untilEndOfTurn,
  createToken,
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

/** All templating issues in the rules text of one card face, in field and line order. */
export const lintCardFace = (
  face: CardFaceInterface,
  mechanics: MechanicInterface[] = [],
): RulesTextLintIssue[] => {
  const types = face.cardTypes || [];
  const isPlaneswalker = types.includes(CardType.Planeswalker);
  const selfNoun = getSelfNoun(face);

  return TEXT_FIELDS.filter(field => field.applies(types)).flatMap(field => {
    const lines = face[field.key];
    if (!Array.isArray(lines)) return [];

    return lines.flatMap((line, lineIndex) => {
      const { prefix, body } = splitLine(line, isPlaneswalker && field.key === 'cardText');
      if (!body.trim()) return [];
      const context: LineContext = {
        body,
        face,
        mechanics,
        selfNoun: field.selfReferences ? selfNoun : null,
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
  });
};

/** The field's lines with one issue's fix applied. */
export const applyLintFix = (lines: string[], issue: RulesTextLintIssue): string[] =>
  issue.fix ? lines.map((line, index) => (index === issue.line ? issue.fix!.line : line)) : lines;
