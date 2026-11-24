/** An ability of a planeswalker, which is a line of its card text, written as in Oracle text. */
export interface LoyaltyAbility {
  /** "+1", "0", "−3" or "−X" (with a minus, not a hyphen); empty for one without a loyalty cost. */
  cost: string;
  text: string;
}

export type LoyaltyShape = 'up' | 'neutral' | 'down';

/** The most abilities the editor adds to a planeswalker. */
export const MAX_LOYALTY_ABILITIES = 4;

const MINUS = '−';
const DASHES = /[-–—]/g;

/** The characters of a cost that is being typed. A hyphen becomes a minus. */
export const cleanLoyaltyCost = (typed: string): string =>
  typed
    .replace(DASHES, MINUS)
    .replace(/[^+−\dX]/gi, '')
    .toUpperCase();

const formatCost = (cost: number): string => {
  if (cost < 0) return `${MINUS}${-cost}`;
  return cost > 0 ? `+${cost}` : '0';
};

// The loyalty a cost changes, or null for one that isn't a number ("−X").
const getCostValue = (cost: string): number | null =>
  /^[+−]?\d+$/.test(cost) ? Number(cost.replace(MINUS, '-')) : null;

/** A typed cost as the card shows it: "2" is "+2", and "X" is "−X" as on nearly every print. */
export const normalizeLoyaltyCost = (typed: string): string => {
  const cost = cleanLoyaltyCost(typed);
  if (/^[+−]*$/.test(cost)) return '';
  if (cost === 'X') return `${MINUS}X`;
  const value = getCostValue(cost);
  return value === null ? cost : formatCost(value);
};

/** The next higher or lower cost, or null if there is none ("−X"). */
export const stepLoyaltyCost = (cost: string, offset: 1 | -1): string | null => {
  if (!cost) return formatCost(offset);
  const value = getCostValue(cost);
  return value === null ? null : formatCost(value + offset);
};

/** The shape of the shield around a cost. */
export const getLoyaltyShape = (cost: string): LoyaltyShape => {
  if (cost.startsWith('+')) return 'up';
  return cost.startsWith(MINUS) ? 'down' : 'neutral';
};

// "+1: Draw a card.", or "[+1]: Draw a card." as in the rules.
const COST_LINE = /^\s*(\[?)([+−–-](?:\d+|X)|0)(\]?)\s*:\s*([\s\S]*)$/i;
// How costs were written before, also without one: "+1|Draw a card.", "|Flying".
const OLD_LINE = /^\s*[{[]?([+−–—-]?(?:\d+|X)?)[}\]]?\s*\|\s*([\s\S]*)$/i;

/** The cost and the text of a line like "+1: Draw a card.". Any other line has no cost. */
export const parseLoyaltyLine = (line: string): LoyaltyAbility => {
  const [, open, cost, close, text] = COST_LINE.exec(line) ?? [];
  if (cost && !open === !close) return { cost: normalizeLoyaltyCost(cost), text };
  const old = OLD_LINE.exec(line);
  return old ? { cost: normalizeLoyaltyCost(old[1]), text: old[2] } : { cost: '', text: line };
};

/** The line of an ability. */
export const formatLoyaltyLine = ({ cost, text }: LoyaltyAbility): string => {
  const written = normalizeLoyaltyCost(cost);
  if (!written) return text;
  return text ? `${written}: ${text}` : `${written}:`;
};

/** An ability whose text starts with its cost, or null if it doesn't. */
export const parseTypedCost = (text: string): LoyaltyAbility | null => {
  const ability = parseLoyaltyLine(text);
  return ability.cost && ability.text.trim() ? ability : null;
};

/** Text whose loyalty costs have a minus instead of a hyphen. Its length stays the same. */
export const replaceCostHyphens = (text: string): string =>
  text.replace(/^([ \t]*\[?)[–-](?=(?:\d+|X)\]?[ \t]*:)/gim, `$1${MINUS}`);

/** The abilities of a planeswalker's card text. */
export const parseLoyaltyAbilities = (cardText: string[]): LoyaltyAbility[] =>
  cardText.filter(line => line.trim()).map(parseLoyaltyLine);

/** The card text of abilities. One that is still empty has no line yet. */
export const formatLoyaltyAbilities = (abilities: LoyaltyAbility[]): string[] =>
  abilities.map(formatLoyaltyLine).filter(line => line.trim());
