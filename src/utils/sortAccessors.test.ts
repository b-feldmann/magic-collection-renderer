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

  it('treats X in a mana cost as zero when sorting', () => {
    const cards = [
      makeCard({ manaCost: '{1}', front: { name: 'One' } as any }),
      makeCard({ manaCost: '{X}{X}', front: { name: 'Variable' } as any }),
    ];

    const accessors = buildSortAccessors(SortByType.ManaCost, SortByType.Name, NO_ANNOTATIONS);
    const sorted = sortBy(cards, accessors).map(c => c.front.name);

    expect(sorted).toEqual(['Variable', 'One']);
  });

  it('orders Last Updated by exact time, newest first, ahead of the secondary sort', () => {
    const cards = [
      makeCard({
        front: { name: 'Ann' } as any,
        meta: { lastUpdated: new Date(2026, 0, 2, 9).getTime() } as any,
      }),
      makeCard({
        front: { name: 'Zed' } as any,
        meta: { lastUpdated: new Date(2026, 0, 2, 18).getTime() } as any,
      }),
    ];

    const accessors = buildSortAccessors(SortByType.LastUpdated, SortByType.Name, NO_ANNOTATIONS);

    expect(sortBy(cards, accessors).map(c => c.front.name)).toEqual(['Zed', 'Ann']);
  });

  it.each([SortByType.Color, SortByType.Creator, SortByType.ManaCost, SortByType.LastUpdated])(
    'lets the secondary sort decide ties within %s',
    primary => {
      const lastUpdated = new Date(2026, 0, 1, 12).getTime();
      const shared = { manaCost: '{1}{U}', meta: { lastUpdated } as any };
      // Names run against the rarity order, so a hidden name tiebreaker would fail this.
      const cards = [
        makeCard({ ...shared, rarity: RarityType.Common, front: { name: 'Alpha' } as any }),
        makeCard({ ...shared, rarity: RarityType.MythicRare, front: { name: 'Zeta' } as any }),
      ];

      const accessors = buildSortAccessors(primary, SortByType.Rarity, NO_ANNOTATIONS);

      expect(sortBy(cards, accessors).map(c => c.front.name)).toEqual(['Zeta', 'Alpha']);
    },
  );

  it('falls back to name when the primary and secondary sorts tie', () => {
    const cards = [
      makeCard({ front: { name: 'Beta' } as any }),
      makeCard({ front: { name: 'Alpha' } as any }),
    ];

    const accessors = buildSortAccessors(SortByType.Rarity, SortByType.Rarity, NO_ANNOTATIONS);

    expect(sortBy(cards, accessors).map(c => c.front.name)).toEqual(['Alpha', 'Beta']);
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
