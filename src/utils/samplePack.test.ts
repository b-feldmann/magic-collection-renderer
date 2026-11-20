import { describe, expect, it } from 'vitest';
import CardInterface from '../interfaces/CardInterface';
import { openSamplePack } from './samplePack';

const card = (
  name: string,
  rarity: string,
  manaCost = '{1}',
  cardTypes: string[] = ['Creature'],
  variantIds?: string[],
  cardSubTypes?: string,
): CardInterface =>
  ({
    name,
    uuid: name,
    manaCost,
    rarity,
    variantIds,
    creator: { name: 'Tester', uuid: 'tester' },
    meta: { comment: '', likes: [], dislikes: [], createdAt: 0, lastUpdated: 0, state: 'Approved' },
    front: { name, cardTypes, cardSubTypes, cardText: [] },
  }) as CardInterface;

// A small seeded generator, so packs are repeatable.
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const colors = ['{W}', '{U}', '{B}', '{R}', '{G}'];
const fullSet = [
  ...Array.from({ length: 30 }, (_, i) => card(`Common ${i}`, 'Common', colors[i % 5])),
  ...Array.from({ length: 10 }, (_, i) => card(`Uncommon ${i}`, 'Uncommon', colors[i % 5])),
  ...Array.from({ length: 5 }, (_, i) => card(`Rare ${i}`, 'Rare')),
  card('Mythic', 'Mythic Rare'),
  card('Plains', 'Common', '', ['Basic Land']),
  card('Harbor Colony', 'Common', '', ['Land'], undefined, 'Colony'),
  card('Rare Colony', 'Rare', '', ['Land'], undefined, 'Colony'),
  card('Soldier', 'Common', '', ['Token', 'Creature']),
  card('Colony Token', 'Common', '', ['Token', 'Land'], undefined, 'Colony'),
];

const slots = (pack: ReturnType<typeof openSamplePack>) => pack.cards.map(entry => entry.slot);

describe('openSamplePack', () => {
  it('opens a 15-card pack: rare, four uncommons, nine commons and a common Colony land', () => {
    const pack = openSamplePack(fullSet, fullSet, seeded(1));
    expect(pack.cards).toHaveLength(15);
    expect(slots(pack).filter(slot => slot === 'Common')).toHaveLength(9);
    expect(slots(pack).filter(slot => slot === 'Uncommon')).toHaveLength(4);
    expect(['Rare', 'Mythic Rare']).toContain(slots(pack)[0]);
    expect(pack.cards[pack.cards.length - 1]).toMatchObject({
      slot: 'Land',
      card: { name: 'Harbor Colony' },
    });
    expect(pack.shortfalls).toEqual([]);
    expect(
      pack.cards.every(
        ({ card: entry, slot }) =>
          slot === 'Land' ||
          entry.rarity === slot ||
          (slot === 'Mythic Rare' && entry.rarity === 'Mythic Rare'),
      ),
    ).toBe(true);
  });

  it('never repeats a card and never has a token or, with Colony lands around, a basic land', () => {
    for (let seed = 1; seed < 50; seed += 1) {
      const names = openSamplePack(fullSet, fullSet, seeded(seed)).cards.map(
        entry => entry.card.name,
      );
      expect(new Set(names).size).toBe(names.length);
      expect(names).not.toContain('Soldier');
      expect(names).not.toContain('Colony Token');
      expect(names).not.toContain('Plains');
      expect(names.filter(name => name === 'Harbor Colony')).toHaveLength(1);
    }
  });

  it('has a common of each color', () => {
    const pack = openSamplePack(fullSet, fullSet, seeded(7));
    const commonCosts = pack.cards
      .filter(entry => entry.slot === 'Common')
      .map(entry => entry.card.manaCost);
    colors.forEach(color => expect(commonCosts).toContain(color));
  });

  it('puts a mythic in the rare slot about one time in eight', () => {
    const packs = 4000;
    let mythics = 0;
    const random = seeded(3);
    for (let i = 0; i < packs; i += 1) {
      if (openSamplePack(fullSet, fullSet, random).cards[0].slot === 'Mythic Rare') mythics += 1;
    }
    expect(mythics / packs).toBeGreaterThan(0.1);
    expect(mythics / packs).toBeLessThan(0.15);
  });

  it('uses a mythic when the set has no rares yet', () => {
    const pack = openSamplePack([card('Mythic', 'Mythic Rare')], undefined, () => 0.99);
    expect(pack.cards[0]).toMatchObject({ slot: 'Mythic Rare' });
  });

  it('counts variants once', () => {
    const cards = [
      card('Rare', 'Rare', '{1}', ['Creature'], ['Rare alt']),
      card('Rare alt', 'Rare', '{1}', ['Creature'], ['Rare']),
    ];
    expect(openSamplePack(cards).poolSize).toBe(1);
  });

  it('takes the Colony land from the whole collection when the shown cards have none', () => {
    const shown = fullSet.filter(entry => entry.name !== 'Harbor Colony');
    const pack = openSamplePack(shown, fullSet, seeded(3));
    expect(pack.cards[pack.cards.length - 1]).toEqual({
      card: expect.objectContaining({ name: 'Harbor Colony' }),
      slot: 'Land',
    });
    expect(pack.shortfalls).toEqual([]);
    expect(pack.poolSize).toBe(shown.length - 2); // without the tokens
  });

  it('falls back to a basic land only when the collection has no Colony lands', () => {
    const noColonies = fullSet.filter(entry => !/Colony/.test(entry.name));
    const pack = openSamplePack(noColonies, noColonies, seeded(5));
    expect(pack.cards.filter(entry => entry.slot === 'Land')).toEqual([
      { card: expect.objectContaining({ name: 'Plains' }), slot: 'Land' },
    ]);
    expect(pack.cards.filter(entry => entry.card.name === 'Plains')).toHaveLength(1);
    expect(pack.shortfalls).toEqual([]);

    // Shown cards without lands: the basic land comes from the whole collection.
    const shown = noColonies.filter(entry => entry.name !== 'Plains');
    const shownPack = openSamplePack(shown, noColonies, seeded(5));
    expect(shownPack.cards[shownPack.cards.length - 1]).toEqual({
      card: expect.objectContaining({ name: 'Plains' }),
      slot: 'Land',
    });
  });

  it('explains the slots the set cannot fill yet', () => {
    const pack = openSamplePack(
      [card('Lonely common', 'Common'), card('Uncommon', 'Uncommon')],
      undefined,
      seeded(1),
    );
    expect(pack.cards.map(entry => entry.card.name)).toEqual(['Uncommon', 'Lonely common']);
    expect(pack.shortfalls).toEqual([
      'There are no rares or mythic rares, so the rare slot is empty.',
      'There is only 1 uncommon, so the pack has 1 of 4.',
      'There is only 1 common, so the pack has 1 of 9.',
      'There are no common Colony lands or basic lands, so the land slot is empty.',
    ]);
  });
});
