import { describe, expect, it } from 'vitest';
import CardInterface from '../interfaces/CardInterface';
import { openSamplePack, PACK_LAYOUT } from './samplePack';

const card = (
  name: string,
  rarity: string,
  manaCost = '{1}',
  cardTypes: string[] = ['Creature'],
  variantIds?: string[],
): CardInterface =>
  ({
    name,
    uuid: name,
    manaCost,
    rarity,
    variantIds,
    creator: { name: 'Tester', uuid: 'tester' },
    meta: { comment: '', likes: [], dislikes: [], createdAt: 0, lastUpdated: 0, state: 'Approved' },
    front: { name, cardTypes, cardText: [] },
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
  card('Soldier', 'Common', '', ['Token', 'Creature']),
];

const slots = (pack: ReturnType<typeof openSamplePack>) => pack.cards.map(entry => entry.slot);

describe('openSamplePack', () => {
  it('opens a 15-card pack: rare, three uncommons, ten commons and a basic land', () => {
    const pack = openSamplePack(fullSet, fullSet, seeded(1));
    expect(pack.cards).toHaveLength(15);
    expect(slots(pack).filter(slot => slot === 'Common')).toHaveLength(PACK_LAYOUT.commons);
    expect(slots(pack).filter(slot => slot === 'Uncommon')).toHaveLength(PACK_LAYOUT.uncommons);
    expect(['Rare', 'Mythic Rare']).toContain(slots(pack)[0]);
    expect(pack.cards[pack.cards.length - 1]).toMatchObject({
      slot: 'Basic Land',
      card: { name: 'Plains' },
    });
    expect(pack.shortfalls).toEqual([]);
    expect(
      pack.cards.every(
        ({ card: entry, slot }) =>
          slot === 'Basic Land' ||
          entry.rarity === slot ||
          (slot === 'Mythic Rare' && entry.rarity === 'Mythic Rare'),
      ),
    ).toBe(true);
  });

  it('never repeats a card and leaves out tokens', () => {
    for (let seed = 1; seed < 50; seed += 1) {
      const names = openSamplePack(fullSet, fullSet, seeded(seed)).cards.map(
        entry => entry.card.name,
      );
      expect(new Set(names).size).toBe(names.length);
      expect(names).not.toContain('Soldier');
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

  it('explains the slots the set cannot fill yet', () => {
    const pack = openSamplePack(
      [card('Lonely common', 'Common'), card('Uncommon', 'Uncommon')],
      undefined,
      seeded(1),
    );
    expect(pack.cards.map(entry => entry.card.name)).toEqual(['Uncommon', 'Lonely common']);
    expect(pack.shortfalls).toEqual([
      'There are no rares or mythic rares, so the rare slot is empty.',
      'There is only 1 uncommon, so the pack has 1 of 3.',
      'There is only 1 common, so the pack has 1 of 10.',
      'There are no basic land cards, so the land slot is empty.',
    ]);
  });
});
