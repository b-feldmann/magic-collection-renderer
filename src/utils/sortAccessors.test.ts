import { describe, expect, it } from 'vitest';
import sortBy from 'lodash/sortBy';
import { RarityType, SortByType } from '../interfaces/enums';
import CardInterface from '../interfaces/CardInterface';
import { EMPTY_CARD } from '../actions/cardActions';
import { buildSortAccessors, getConvertedManaCost } from './sortAccessors';

const NO_ANNOTATIONS = {};

const makeCard = (overrides: Partial<CardInterface>): CardInterface => {
  const card = EMPTY_CARD();
  return {
    ...card,
    ...overrides,
    front: { ...card.front, ...(overrides.front || {}) },
    meta: { ...card.meta, ...(overrides.meta || {}) },
  } as CardInterface;
};

describe('buildSortAccessors', () => {
  it('sorts by rarity (Mythic Rare before Common) with name as secondary', () => {
    const cards = [
      makeCard({ rarity: RarityType.MythicRare, name: 'Zeta', front: { name: 'Zeta' } as any }),
      makeCard({ rarity: RarityType.Common, name: 'Beta', front: { name: 'Beta' } as any }),
      makeCard({ rarity: RarityType.Rare, name: 'Alpha', front: { name: 'Alpha' } as any }),
      makeCard({ rarity: RarityType.Common, name: 'Alpha', front: { name: 'Alpha' } as any }),
    ];

    const accessors = buildSortAccessors(SortByType.Rarity, SortByType.Name, NO_ANNOTATIONS);
    const sorted = sortBy(cards, accessors).map(c => c.front.name);

    expect(sorted).toEqual(['Zeta', 'Alpha', 'Alpha', 'Beta']);
  });

  it('sorts by converted mana cost with name as secondary', () => {
    const cards = [
      makeCard({ manaCost: '{2}{U}{U}', name: 'Big', front: { name: 'Big' } as any }),
      makeCard({ manaCost: '{1}{G}', name: 'Mid', front: { name: 'Mid' } as any }),
      makeCard({ manaCost: '', name: 'Free', front: { name: 'Free' } as any }),
    ];

    const accessors = buildSortAccessors(SortByType.ManaCost, SortByType.Name, NO_ANNOTATIONS);
    const sorted = sortBy(cards, accessors).map(c => c.front.name);

    expect(sorted).toEqual(['Free', 'Mid', 'Big']);
  });

  it('defaults to Last Updated primary and Name secondary (newest first, then A-Z)', () => {
    const cards = [
      makeCard({ name: 'Old', front: { name: 'Old' } as any, meta: { lastUpdated: 100 } as any }),
      makeCard({ name: 'Zed', front: { name: 'Zed' } as any, meta: { lastUpdated: 300 } as any }),
      makeCard({ name: 'Ann', front: { name: 'Ann' } as any, meta: { lastUpdated: 300 } as any }),
    ];

    const accessors = buildSortAccessors(SortByType.LastUpdated, SortByType.Name, NO_ANNOTATIONS);
    const sorted = sortBy(cards, accessors).map(c => c.front.name);

    expect(sorted).toEqual(['Ann', 'Zed', 'Old']);
  });

  it('skips the secondary sort when it equals the primary', () => {
    const cards = [
      makeCard({ name: 'Beta', front: { name: 'Beta' } as any }),
      makeCard({ name: 'Alpha', front: { name: 'Alpha' } as any }),
    ];

    const accessors = buildSortAccessors(SortByType.Rarity, SortByType.Rarity, NO_ANNOTATIONS);
    const sorted = sortBy(cards, accessors).map(c => c.front.name);

    expect(accessors).toHaveLength(1);
    // Only the primary key applies: original order preserved for ties.
    expect(sorted).toEqual(['Beta', 'Alpha']);
  });
});

describe('getConvertedManaCost', () => {
  it('adds up numeric symbols and counts single mana symbols as 1', () => {
    expect(getConvertedManaCost('{2}{U}{U}')).toBe(4);
    expect(getConvertedManaCost('{1}{G}')).toBe(2);
    expect(getConvertedManaCost('{R}')).toBe(1);
    expect(getConvertedManaCost('{5}{W}{W}{W}')).toBe(8);
  });

  it('returns 0 for empty or symbol-less costs', () => {
    expect(getConvertedManaCost('')).toBe(0);
    expect(getConvertedManaCost('nonsense')).toBe(0);
  });
});
