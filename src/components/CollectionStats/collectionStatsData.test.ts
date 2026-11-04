import { describe, expect, it } from 'vitest';
import CardInterface from '../../interfaces/CardInterface';
import { buildManaCurveData, getSharedCountMaximum, colorCategories } from './collectionStatsData';

export const card = (
  name: string,
  manaCost = '',
  cardTypes: string[] = ['Creature'],
  tags: string[] = [],
  rarity = 'Common',
): CardInterface =>
  ({
    name,
    uuid: name,
    manaCost,
    rarity,
    tags,
    creator: { name: 'Tester', uuid: 'tester' },
    meta: { comment: '', likes: [], dislikes: [], createdAt: 0, lastUpdated: 0, state: 'Approved' },
    front: { name, cardTypes, cardText: [] },
  }) as CardInterface;

describe('collection statistics data', () => {
  it('assigns tag colors by name rather than frequency or card order', () => {
    const alphabetical = buildManaCurveData([
      card('Both', '{2}', ['Creature'], ['Aggro', 'Flying']),
    ]);
    const flyingHeavy = buildManaCurveData([
      card('Flying', '{3}', ['Creature'], ['Flying']),
      card('Both', '{2}', ['Creature'], ['Flying', 'Aggro']),
    ]);
    for (const category of alphabetical.tagCategories) {
      expect(flyingHeavy.tagCategories.find(entry => entry.label === category.label)?.color).toBe(
        category.color,
      );
    }
  });

  it('orders tags alphabetically whatever their frequency, card order or active filter', () => {
    const zombies = ['Zombie one', 'Zombie two', 'Zombie three'].map(name =>
      card(name, '{1}', ['Creature'], ['Zombie']),
    );
    const flyers = ['Flyer one', 'Flyer two'].map(name =>
      card(name, '{2}', ['Creature'], ['Flying']),
    );
    const all = [...zombies, ...flyers];
    const labels = (collection: CardInterface[]) =>
      buildManaCurveData(collection, all).tagCategories.map(category => category.label);

    // Zombie is the more frequent tag in the full collection, Flying in the filtered one.
    expect(labels(all)).toEqual(['Flying', 'Zombie']);
    expect(labels([zombies[0], ...flyers])).toEqual(['Flying', 'Zombie']);
    expect(labels([...all].reverse())).toEqual(['Flying', 'Zombie']);
  });

  it('keeps tag colors when filtering out alphabetically earlier tags', () => {
    const allCards = [
      card('Aggro', '{2}', ['Creature'], ['Aggro']),
      card('Flying', '{3}', ['Creature'], ['Flying']),
    ];
    const full = buildManaCurveData(allCards);
    const filtered = buildManaCurveData([allCards[1]], allCards);
    expect(filtered.tagCategories.map(category => category.label)).toEqual(['Flying']);
    expect(filtered.tagCategories[0].color).toBe(full.tagCategories[1].color);
  });

  it('assigns distinct colors to sixteen tags before repeating the palette', () => {
    const tags = Array.from(
      { length: 17 },
      (_, index) => `Tag ${String(index + 1).padStart(2, '0')}`,
    );
    const data = buildManaCurveData([card('Tagged', '{2}', ['Creature'], tags)]);
    const colors = data.tagCategories.map(category => category.color);
    expect(data.tagCategories).toHaveLength(17);
    expect(new Set(colors.slice(0, 16)).size).toBe(16);
    expect(colors[16]).toBe(colors[0]);
  });

  it('uses the largest segment for individual scales and the largest stack for stacked scales', () => {
    const data = buildManaCurveData([card('W1', '{W}'), card('W2', '{W}'), card('U1', '{U}')]);
    expect(getSharedCountMaximum(data.colors, colorCategories, 'individual')).toBe(2);
    expect(getSharedCountMaximum(data.colors, colorCategories, 'stacked')).toBe(3);
    expect(getSharedCountMaximum([], [], 'individual')).toBe(1);
    expect(getSharedCountMaximum(data.tags, [], 'stacked')).toBe(1);
  });
  it('calculates nonland metrics from actual mana values before grouping expensive cards', () => {
    const data = buildManaCurveData([
      card('Two', '{1}{W}'),
      card('Three', '{2}{U}'),
      card('Eight', '{8}'),
      card('Land', '', ['Land']),
    ]);
    expect(data.summary).toMatchObject({
      cardCount: 4,
      nonlandCount: 3,
      landCount: 1,
      twoToThreeCount: 2,
      twoToThreePercent: 67,
    });
    expect(data.summary.averageManaValue).toBeCloseTo(13 / 3);
    expect(data.colors[7].colorless).toBe(1);
  });

  it('aligns all sections and excludes basic and creature lands outside the color curve', () => {
    const data = buildManaCurveData([
      card('Basic', '', ['Basic Land'], ['Land tag']),
      card('Creature land', '{G}', ['Creature', 'Land'], ['Land tag']),
      card('Spell', '{2}{G}', ['Sorcery'], ['Spell tag'], 'Rare'),
    ]);
    for (const points of [data.colors, data.types, data.rarities, data.tags]) {
      expect(points.map(point => point.cmc)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    }
    expect(data.summary.nonlandCount).toBe(1);
    expect(data.summary.landCount).toBe(2);
    expect(data.colors[0].colorless).toBe(2);
    expect(data.colors[1].green).toBe(0);
    expect(data.rarities[0].Common).toBe(0);
    expect(data.types[0].Creature).toBe(0);
    expect(data.types[3].Sorcery).toBe(1);
    expect(data.rarities[3].Rare).toBe(1);
    expect(data.tagCategories.map(c => c.label)).toEqual(['Spell tag']);
  });

  it('counts lands at zero mana alongside free spells without changing nonland statistics', () => {
    const data = buildManaCurveData([
      card('Land', '', ['Land']),
      card('Basic land', '', ['Basic Land']),
      card('Creature land with cost', '{5}{G}', ['Creature', 'Land']),
      card('Free spell', '', ['Artifact']),
      card('Two drop', '{1}{U}', ['Creature']),
    ]);
    expect(data.colors[0].colorless).toBe(4);
    expect(data.colors[2].blue).toBe(1);
    expect(data.colors[6].colorless).toBe(0);
    expect(data.types[0].Artifact).toBe(1);
    expect(data.rarities[0].Common).toBe(1);
    expect(data.summary).toMatchObject({
      cardCount: 5,
      landCount: 3,
      nonlandCount: 2,
      averageManaValue: 1,
      twoToThreeCount: 1,
      twoToThreePercent: 50,
    });
  });

  it('keeps multicolor exclusive and includes each of the seven color groups', () => {
    const data = buildManaCurveData([
      card('White', '{W}'),
      card('Blue', '{U}'),
      card('Black', '{B}'),
      card('Red', '{R}'),
      card('Green', '{G}'),
      card('Colorless', '{1}'),
      card('Multicolor', '{W}{U}'),
    ]);
    expect(data.colors[1]).toEqual({
      cmc: 1,
      white: 1,
      blue: 1,
      black: 1,
      red: 1,
      green: 1,
      colorless: 1,
      multicolor: 0,
    });
    expect(data.colors[2]).toEqual({
      cmc: 2,
      white: 0,
      blue: 0,
      black: 0,
      red: 0,
      green: 0,
      colorless: 0,
      multicolor: 1,
    });
  });

  it('separates spell types and uses an exclusive primary type for mixed-type cards', () => {
    const data = buildManaCurveData([
      card('Artifact creature', '{2}', ['Artifact', 'Creature']),
      card('Instant', '{2}', ['Instant']),
      card('Sorcery', '{2}', ['Sorcery']),
      card('Enchantment', '{2}', ['Enchantment']),
      card('Artifact', '{2}', ['Artifact']),
      card('Planeswalker', '{2}', ['Planeswalker']),
      card('Unknown', '{2}', ['Something']),
    ]);
    expect(data.types[2]).toEqual({
      cmc: 2,
      Creature: 1,
      Instant: 1,
      Sorcery: 1,
      Enchantment: 1,
      Artifact: 1,
      Planeswalker: 1,
      Other: 1,
    });
  });

  it('counts all four rarities independently at the same mana value', () => {
    const data = buildManaCurveData(
      ['Common', 'Uncommon', 'Rare', 'Mythic Rare'].map(rarity =>
        card(rarity, '{3}', ['Creature'], [], rarity),
      ),
    );
    expect(data.rarities[3]).toEqual({ cmc: 3, Common: 1, Uncommon: 1, Rare: 1, 'Mythic Rare': 1 });
  });

  it('counts canonical family data even when only an alternate matches the active collection', () => {
    const first = {
      ...card('first', '{1}{W}', ['Creature'], ['Canonical']),
      variantIds: ['alternate'],
    };
    const alternate = {
      ...card('alternate', '{5}{U}', ['Instant'], ['Alternate']),
      variantIds: ['first'],
      meta: { ...first.meta, createdAt: 2 },
    };
    const data = buildManaCurveData([alternate], [first, alternate]);
    expect(data.summary.cardCount).toBe(1);
    expect(data.colors[2].white).toBe(1);
    expect(data.colors[6].blue).toBe(0);
    expect(data.tagCategories.map(c => c.label)).toEqual(['Canonical']);
    expect(buildManaCurveData([first, alternate]).summary.cardCount).toBe(1);
  });

  it('deduplicates repeated tags but retains overlapping tag matches', () => {
    const data = buildManaCurveData([
      card('Tagged', '{2}', ['Creature'], ['Aggro', 'Aggro', 'Flying']),
      card('Second', '{3}', ['Instant'], ['Aggro']),
    ]);
    expect(data.tagCategories.map(c => c.label)).toEqual(['Aggro', 'Flying']);
    expect(data.tags[2]).toEqual({ cmc: 2, 'tag-Aggro': 1, 'tag-Flying': 1 });
    expect(data.tags[3]).toEqual({ cmc: 3, 'tag-Aggro': 1, 'tag-Flying': 0 });
    expect(data.summary.nonlandCount).toBe(2);
  });

  it('keeps a tag key when filtering removes other tags', () => {
    const aggro = card('Aggro one', '{1}', ['Creature'], ['Aggro']);
    const flying = card('Flyer', '{2}', ['Creature'], ['Flying']);
    const secondFlying = card('Second flyer', '{3}', ['Creature'], ['Flying']);
    const all = [aggro, flying, secondFlying];
    const keyOf = (collection: typeof all, label: string) =>
      buildManaCurveData(collection, all).tagCategories.find(c => c.label === label)?.key;
    expect(keyOf(all, 'Aggro')).toBe(keyOf([aggro], 'Aggro'));
  });

  it.each([{ collection: [] }, { collection: [card('Only land', '', ['Land'])] }])(
    'keeps empty nonland metrics finite',
    ({ collection }) => {
      const data = buildManaCurveData(collection);
      expect(data.summary).toMatchObject({
        nonlandCount: 0,
        averageManaValue: 0,
        twoToThreeCount: 0,
        twoToThreePercent: 0,
      });
      expect(data.tagCategories).toEqual([]);
      expect(data.colors).toHaveLength(8);
    },
  );
});
