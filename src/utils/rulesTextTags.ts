import { CardType } from '../interfaces/enums';

/**
 * Tags derived from what a card's rules text does (as opposed to mechanic names).
 *
 * Every rule is checked against the normalised text of each sentence of a face: lower case,
 * smart quotes made straight, mechanic brackets removed and whitespace collapsed. A rule matches
 * when any of its `patterns` matches a sentence (or `test` returns true for it) and its optional
 * `appliesTo` accepts the face. To tune a tag, add or change a pattern here and add an example to
 * `rulesTextTags.test.ts`.
 */
interface RulesTextTagRule {
  tag: string;
  patterns?: RegExp[];
  test?: (sentence: string) => boolean;
  // Receives the face's types and all of its normalised sentences.
  appliesTo?: (cardTypes: CardType[], sentences: string[]) => boolean;
  // Also check each sentence joined with the next one, for effects written as two sentences.
  spansSentences?: boolean;
}

// A number as written on cards: "2", "x", "two", ...
const N = String.raw`(?:\d+|x|one|two|three|four|five|six|seven|eight|nine|ten)`;
// Any adjectives before a noun: "target nonblack attacking creature", "target tapped creature".
const ADJECTIVES = String.raw`(?:[\w'-]+ )*?`;
// "target", "another target", "up to one target", "up to two other target", ...
const TARGET = String.raw`(?:up to ${N} )?(?:another |other )?(?:${N} )?(?:other )?targets? `;

const isCreature = (cardTypes: CardType[]) => cardTypes.includes(CardType.Creature);

// The Flash keyword on its own line or in a keyword list ("Flash, trample"), or granted flash.
const FLASH = /(?:^|, )flash(?:,|$)|as though (?:it|this spell|~) had flash/;

// Can be cast in combat: an instant, a card with flash, or unknown types (e.g. pasted text).
const isInstantSpeed = (cardTypes: CardType[], sentences: string[]) =>
  cardTypes.length === 0 ||
  cardTypes.includes(CardType.Instant) ||
  sentences.some(sentence => FLASH.test(sentence));

const COMBAT_KEYWORDS =
  'first strike|double strike|indestructible|hexproof|shroud|trample|deathtouch|lifelink|vigilance|menace|flying|reach|protection from';

// Keywords that make a creature hard to block.
const EVASION_KEYWORDS = 'flying|menace|fear|intimidate|shadow|skulk|horsemanship';
// Keywords that can stand in a list before an evasion keyword: "gains haste and flying".
const LISTED_KEYWORDS = `${COMBAT_KEYWORDS}|haste|${EVASION_KEYWORDS}`;

// "Draw a card, then discard a card" and the reverse only filter the hand.
const LOOT = /\b(?:draw a card, then discard a card|discard a card, then draw a card)\b/;
const DRAW = new RegExp(
  // Not the trigger condition of "Whenever you draw a card" / "Whenever an opponent draws".
  String.raw`(?<!\b(?:whenever|when|each time|the first time) (?:you|a player|an opponent|that player|each player|they) )\bdraws? (?:(?:a|an|${N}|that many|an additional|additional) )?(?:additional )?cards?\b`,
);

// An activated ability's cost and effect: "{2}{g}, {t}: this creature fights …".
const ACTIVATED_ABILITY = /^([^:"]+): (.+)$/;
// Any symbol in a cost except tap and untap: {1}, {x}, {g}, {w/u}, ...
const MANA_SYMBOL = /\{(?![tq]\})[^}]+\}/;

export const RULES_TEXT_TAG_RULES: RulesTextTagRule[] = [
  {
    tag: 'Creature Removal',
    patterns: [
      // Destroy / exile a targeted creature or any permanent (but not a creature *card*).
      new RegExp(
        String.raw`\b(?:destroy|exile)s? ${TARGET}${ADJECTIVES}(?:creature|permanent)s?\b(?! cards?\b)(?! you control\b)(?![^.]*\breturn\b)`,
      ),
      // A creature chosen earlier: "Destroy the chosen creature.", "Exile that creature."
      /\b(?:destroy|exile)s? (?:the chosen|each chosen|that|those) creatures?\b(?![^.]*\breturn\b)/,
      // Board wipes.
      new RegExp(
        String.raw`\b(?:destroy|exile)s? (?:all|each) ${ADJECTIVES}(?:other )?creatures?\b`,
      ),
      // Direct damage that can hit a creature, including "bite" effects.
      new RegExp(
        String.raw`\bdeals? [^.]*?\bdamage\b[^.]*?\bto (?:any (?:${N} )?targets?|${TARGET}${ADJECTIVES}creatures?\b|each (?:other )?${ADJECTIVES}creatures?\b)`,
      ),
      // Shrinking toughness: "Target creature gets -3/-3", "Creatures your opponents control get -1/-1".
      /\bcreatures?\b[^.]*?\bgets? -(?:\d+|x)\/-(?:[1-9]\d*|x)/,
      // Edicts.
      new RegExp(
        String.raw`\b(?:target|each) (?:player|opponent)s? (?:[^.]*? )?sacrifices? (?:a|an|${N}) ${ADJECTIVES}creatures?\b`,
      ),
      // Fight.
      new RegExp(String.raw`\bfights? ${TARGET}${ADJECTIVES}creature`),
    ],
  },
  {
    tag: 'Flicker',
    // Exiles something and returns it to the battlefield, in one sentence or the next:
    // "Exile target creature you control, then return it to the battlefield under its owner's control."
    patterns: [
      /\bexiles? (?:up to \w+ )?(?:another )?(?:other )?(?:target|each|all|any number of|~|this creature|it|two|three)\b.*?\breturns? (?:it|them|that card|those cards|that creature|those creatures|that permanent|those permanents|the exiled (?:card|creature|permanent)s?|each card exiled this way|all cards exiled this way)\b[^.]*?\bto the battlefield\b/,
    ],
    spansSentences: true,
  },
  {
    tag: 'Ramp',
    // A mana ability: "{T}: Add {G}.", "{T}, Pay 1 life: Add one mana of any color." Mana
    // creatures and mana rocks count; lands don't (unless they are also creatures).
    patterns: [/\{t\}(?:, [^:]*)?: add\b/],
    appliesTo: cardTypes => !cardTypes.includes(CardType.Land) || isCreature(cardTypes),
  },
  {
    tag: 'Ramp',
    // Land ramp: "Search your library for up to two basic land cards, put them onto the battlefield".
    patterns: [
      /\bsearch (?:your|their) library for [^.]*?\blands? cards?\b[^.]*?\bonto the battlefield\b/,
    ],
  },
  {
    tag: 'Combat Trick',
    // Instant-speed pumps and keyword grants until end of turn, or +1/+1 counters on a creature.
    patterns: [
      /\bgets? \+(?:\d+|x)\/\+(?:\d+|x)\b[^.]*?\buntil end of turn\b/,
      new RegExp(String.raw`\bgains? [^.]*?\b(?:${COMBAT_KEYWORDS})\b[^.]*?\buntil end of turn\b`),
      /\bput (?:a|an|one|two|three|x|\d+) \+1\/\+1 counters? on (?:up to \w+ )?(?:another )?target (?:[\w'-]+ )*?creature/,
    ],
    appliesTo: isInstantSpeed,
  },
  {
    tag: 'Small Reanimator',
    // Returns a creature or permanent card with a small mana value / power from a graveyard to the
    // battlefield.
    test: sentence =>
      /\b(?:return|put)s?\b/.test(sentence) &&
      /\b(?:creature|permanent) cards?\b|\btarget (?:[\w'-]+ )*?permanents?\b/.test(sentence) &&
      /\bgraveyards?\b/.test(sentence) &&
      /\bonto the battlefield\b|\bto the battlefield\b/.test(sentence) &&
      new RegExp(
        String.raw`\b(?:mana value|converted mana cost|power|toughness) (?:${N}|equal to [^.]*?) or less\b`,
      ).test(sentence),
  },
  {
    tag: 'Graveyard Leave',
    // Triggers or conditions on cards leaving a graveyard.
    patterns: [
      /\b(?:card|cards|permanent card|creature card|it|this card)? ?leaves? (?:your|a|an opponent's|any|their|its owner's) graveyards?\b/,
      /\bcards? (?:have )?left your graveyard\b/,
    ],
  },
  {
    tag: 'Evasion',
    patterns: [
      // The keyword on its own line or in a keyword list, with or without reminder text.
      new RegExp(String.raw`(?:^|, )(?:${EVASION_KEYWORDS})(?:,|\.?$| \()`),
      // Granted: "Creatures you control have flying", "gets +1/+0 and gains haste and menace".
      new RegExp(
        String.raw`\b(?:has|have|gains?) (?:(?:${LISTED_KEYWORDS})(?:,? and |, |,? or ))*(?:${EVASION_KEYWORDS})\b`,
      ),
      // "can't be blocked", "can't be blocked except by two or more creatures", ...
      /\bcan't be blocked\b/,
    ],
  },
  {
    tag: 'Card Draw',
    // Drawing cards, and Clues (which draw later). One-for-one looting doesn't count.
    test: sentence =>
      (DRAW.test(sentence) && !LOOT.test(sentence)) ||
      /\binvestigates?\b/.test(sentence) ||
      /\bcreates? [^.]*?\bclue tokens?\b/.test(sentence),
  },
  {
    tag: 'Fixing',
    patterns: [
      // "Add one mana of any color", "Add X mana of any one color", "mana of any type".
      /\badd [^.]*?\bmana of any (?:one )?(?:colou?r|type)\b/,
      // Dual lands and filters: "Add {W} or {U}.", "Add {R}, {G}, or {W}."
      /\badd \{[wubrg]\}(?:, \{[wubrg]\})*,? or \{[wubrg]\}/,
      // Searching for any basic land, or one of several land types.
      /\bsearch (?:your|their) library for [^.]*?\b(?:basic )?lands? cards?\b/,
      /\b(?:plains|island|swamp|mountain|forest) or (?:plains|island|swamp|mountain|forest) cards?\b/,
      /\bcreates? [^.]*?\btreasure tokens?\b/,
    ],
  },
  {
    tag: 'Counterspell',
    patterns: [
      new RegExp(
        String.raw`\bcounter (?:up to ${N} )?(?:${N} )?target (?:[\w'-]+ )*?(?:spells?|abilit(?:y|ies))\b`,
      ),
      /\bcounter (?:that|the chosen|each|all) (?:[\w'-]+ )*?(?:spells?|abilit(?:y|ies))\b/,
      /\bcounter it\b/,
    ],
  },
  {
    tag: 'Token Creation',
    patterns: [
      // "Create a 1/1 white Soldier creature token", "create a Treasure token", "create a token
      // that's a copy of …". Not tokens handed to an opponent ("Its controller creates a 1/1 token").
      /(?<!\b(?:its controller|that player|target player|target opponent|each opponent|an opponent|its owner) )\bcreates? [^.]*?\btokens?\b/,
      // Keyword actions and abilities that create tokens.
      /\b(?:investigates?|amass(?:es)?|populates?|incubates?|afterlife|embalm|eternalize|myriad|living weapon|offspring)\b/,
    ],
  },
  {
    tag: 'Mana Sink',
    // A repeatable activated ability that costs mana, so spare mana has a use every turn. Mana
    // abilities and one-shot abilities that sacrifice or exile the card itself don't count.
    test: sentence => {
      const match = sentence.match(ACTIVATED_ABILITY);
      if (!match) return false;
      const [, cost, effect] = match;
      return (
        MANA_SYMBOL.test(cost) &&
        !/^add\b/.test(effect) &&
        !/\b(?:sacrifice|exile) (?:~|this\b|it\b)/.test(cost)
      );
    },
  },
];

export const normaliseRulesText = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[−–]/g, '-')
    .replace(/[[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// Splits on sentence ends and line breaks, but not inside mana symbols or decimals.
const splitSentences = (text: string): string[] =>
  text
    .split(/\n|(?<=[.!?])\s+/)
    .map(normaliseRulesText)
    .filter(Boolean);

const matchesRule = (rule: RulesTextTagRule, sentence: string): boolean =>
  Boolean(rule.patterns?.some(pattern => pattern.test(sentence))) || Boolean(rule.test?.(sentence));

/**
 * Returns the rules-text tags for one card face. `rulesText` may contain several lines; flavour
 * text must not be passed in.
 */
export const getRulesTextTags = (rulesText: string, cardTypes: CardType[] = []): string[] => {
  const sentences = splitSentences(rulesText);

  const sentencePairs = sentences
    .slice(1)
    .map((sentence, index) => `${sentences[index]} ${sentence}`);

  const tags = RULES_TEXT_TAG_RULES.filter(
    rule =>
      (!rule.appliesTo || rule.appliesTo(cardTypes, sentences)) &&
      (rule.spansSentences ? [...sentences, ...sentencePairs] : sentences).some(sentence =>
        matchesRule(rule, sentence),
      ),
  ).map(rule => rule.tag);

  // Several rules can produce the same tag.
  return [...new Set(tags)];
};
