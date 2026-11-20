import { describe, expect, it } from 'vitest';
import { EMPTY_CARD } from '../actions/cardActions';
import CardInterface from '../interfaces/CardInterface';
import { CardState, CardType } from '../interfaces/enums';
import { CARD_TABS, isBasicLandCard, isTokenCard } from './cardTabs';

const card = (uuid: string, state: CardState, cardTypes: CardType[], back?: CardType[]) => {
  const empty = EMPTY_CARD();
  return {
    ...empty,
    uuid,
    front: { ...empty.front, cardTypes },
    back: back && { ...empty.front, cardTypes: back },
    meta: { ...empty.meta, state },
  } as CardInterface;
};

const creature = [CardType.Creature];
const token = [CardType.Token, CardType.Creature];
const basicLand = [CardType.BasicLand, CardType.Land];
const land = [CardType.Land];
const cards = [
  card('draft', CardState.Draft, creature),
  card('rate', CardState.Rate, creature),
  card('approved', CardState.Approved, creature),
  card('draft-token', CardState.Draft, token),
  card('rate-token', CardState.Rate, token),
  card('approved-token', CardState.Approved, token),
  // A creature that flips into a token is an ordinary card.
  card('flips-into-token', CardState.Draft, creature, token),
  card('draft-basic', CardState.Draft, basicLand),
  card('rate-basic', CardState.Rate, basicLand),
  card('approved-basic', CardState.Approved, basicLand),
  card('draft-land', CardState.Draft, land),
];

const tab = (name: string) => {
  const cardTab = CARD_TABS.find(candidate => candidate.name === name);
  if (!cardTab) throw new Error(`No ${name} tab`);
  return cards.filter(cardTab.filter).map(c => c.uuid);
};

describe('card tabs', () => {
  it('recognizes token cards by their front face', () => {
    expect(cards.filter(isTokenCard).map(c => c.uuid)).toEqual([
      'draft-token',
      'rate-token',
      'approved-token',
    ]);
  });

  it('recognizes basic land cards by their front face', () => {
    expect(cards.filter(isBasicLandCard).map(c => c.uuid)).toEqual([
      'draft-basic',
      'rate-basic',
      'approved-basic',
    ]);
  });

  it('keeps tokens and basic lands out of the drafts, rating and approved tabs', () => {
    expect(tab('Card drafts / idea dump')).toEqual(['draft', 'flips-into-token', 'draft-land']);
    expect(tab('Cards to rate')).toEqual(['rate']);
    expect(tab('Approved cards')).toEqual(['approved']);
  });

  it('lists every basic land in the basic lands tab', () => {
    expect(tab('Basic Lands')).toEqual(['draft-basic', 'rate-basic', 'approved-basic']);
  });

  it('lists every token in the tokens tab', () => {
    expect(tab('Tokens')).toEqual(['draft-token', 'rate-token', 'approved-token']);
  });

  it('keeps every card in All', () => {
    expect(tab('All')).toHaveLength(cards.length);
  });
});
