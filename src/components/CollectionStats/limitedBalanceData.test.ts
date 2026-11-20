import { describe, expect, it } from 'vitest';
import CardInterface from '../../interfaces/CardInterface';
import { buildLimitedBalance } from './limitedBalanceData';

const card = (
  name: string,
  manaCost: string,
  {
    types = ['Creature'],
    stats,
    tags = [],
    rarity = 'Common',
    variantIds,
  }: {
    types?: string[];
    stats?: string;
    tags?: string[];
    rarity?: string;
    variantIds?: string[];
  } = {},
): CardInterface =>
  ({
    name,
    uuid: name,
    manaCost,
    rarity,
    tags,
    variantIds,
    creator: { name: 'Tester', uuid: 'tester' },
    meta: { comment: '', likes: [], dislikes: [], createdAt: 0, lastUpdated: 0, state: 'Approved' },
    front: { name, cardTypes: types, cardText: [], cardStats: stats },
  }) as CardInterface;

const row = (balance: ReturnType<typeof buildLimitedBalance>, key: string) =>
  balance.rows.find(entry => entry.category.key === key)!;

describe('buildLimitedBalance', () => {
  const collection = [
    card('Knight', '{1}{W}', { stats: '2/2' }),
    card('Griffin', '{3}{W}', { stats: '2/3', tags: ['Evasion'] }),
    card('Giant', '{5}{W}', { stats: '6/6' }),
    card('Statue', '{2}{W}', { stats: '*/*' }),
    card('Smite', '{W}', { types: ['Instant'], tags: ['Creature Removal'], rarity: 'Uncommon' }),
    card('Sage', '{1}{U}', { stats: '1/3', tags: ['Card Draw'] }),
    card('Plains', '', { types: ['Basic Land'] }),
    card('Soldier', '', { types: ['Token', 'Creature'], stats: '1/1' }),
  ];

  it('always lists white to green and adds Colorless and Multicolor only when used', () => {
    const balance = buildLimitedBalance(collection);
    expect(balance.rows.map(entry => entry.category.label)).toEqual([
      'White',
      'Blue',
      'Black',
      'Red',
      'Green',
      'Colorless',
    ]);
  });

  it('counts creatures, their average size and power spread per color', () => {
    const white = row(buildLimitedBalance(collection), 'white');
    expect(white.nonlandCount).toBe(5);
    expect(white.creatures.map(creature => creature.name)).toEqual([
      'Knight',
      'Griffin',
      'Giant',
      'Statue',
    ]);
    // */* counts as a creature but not in the averages.
    expect(white.averagePower).toBeCloseTo(10 / 3);
    expect(white.averageToughness).toBeCloseTo(11 / 3);
    expect(white.powerCounts).toEqual([0, 2, 0, 0, 1]);
    expect(white.averageManaValue).toBeCloseTo((2 + 4 + 6 + 3 + 1) / 5);
  });

  it('counts the cards of each role from their tags', () => {
    const balance = buildLimitedBalance(collection);
    expect(row(balance, 'white').roles['Creature Removal'].map(entry => entry.name)).toEqual([
      'Smite',
    ]);
    expect(row(balance, 'white').roles.Evasion).toHaveLength(1);
    expect(row(balance, 'blue').roles['Card Draw']).toHaveLength(1);
    expect(balance.total.roles['Creature Removal']).toHaveLength(1);
  });

  it('leaves out tokens, counts lands apart and variants once', () => {
    const balance = buildLimitedBalance([
      ...collection,
      card('Knight alt', '{1}{W}', { stats: '2/2', variantIds: ['Knight'] }),
    ]);
    expect(balance.total.nonlandCount).toBe(6);
    expect(balance.total.landCount).toBe(1);
    expect(balance.total.creatures.map(creature => creature.name)).not.toContain('Soldier');
  });

  it('filters by rarity tier', () => {
    const commons = buildLimitedBalance(collection, collection, 'common');
    expect(row(commons, 'white').roles['Creature Removal']).toEqual([]);
    const uncommons = buildLimitedBalance(collection, collection, 'uncommon');
    expect(uncommons.total.nonlandCount).toBe(1);
  });

  it('has no averages without cards', () => {
    const black = row(buildLimitedBalance(collection), 'black');
    expect(black).toMatchObject({
      nonlandCount: 0,
      averageManaValue: null,
      averagePower: null,
      averageToughness: null,
    });
  });
});
