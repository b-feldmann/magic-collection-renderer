import CardInterface from '../interfaces/CardInterface';
import { CardState, CardType } from '../interfaces/enums';

/**
 * Token cards: their front face is a token. A card whose back face is a token (a creature that
 * flips into one) is an ordinary card.
 */
export const isTokenCard = (card: CardInterface): boolean =>
  Boolean(card.front?.cardTypes?.includes(CardType.Token));

/** Basic land cards: their front face is a basic land. */
export const isBasicLandCard = (card: CardInterface): boolean =>
  Boolean(card.front?.cardTypes?.includes(CardType.BasicLand));

/**
 * Cards that go through the draft → rating → approved workflow. Tokens print with the cards that
 * make them and basic lands are a given, so neither is rated on its own.
 */
export const isRateableCard = (card: CardInterface): boolean =>
  !isTokenCard(card) && !isBasicLandCard(card);

export interface CardTab {
  name: string;
  filter: (card: CardInterface) => boolean;
}

// Shared by the desktop and mobile layouts so the collection grid and the tab counts agree on
// which cards belong to each tab. Tokens and basic lands aren't rated, so they skip the drafts,
// rating and approved tabs and each get a tab of their own.
export const CARD_TABS: CardTab[] = [
  { name: 'All', filter: () => true },
  {
    name: 'Card drafts / idea dump',
    filter: card => card.meta.state === CardState.Draft && isRateableCard(card),
  },
  {
    name: 'Cards to rate',
    filter: card => card.meta.state === CardState.Rate && isRateableCard(card),
  },
  {
    name: 'Approved cards',
    filter: card => card.meta.state === CardState.Approved && isRateableCard(card),
  },
  { name: 'Tokens', filter: isTokenCard },
  { name: 'Basic Lands', filter: isBasicLandCard },
];

export const tabKey = (name: string) => `tab-key-${name}`;
