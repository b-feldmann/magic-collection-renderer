import { describe, expect, it } from 'vitest';
import CardFaceInterface from '../interfaces/CardFaceInterface';
import CardInterface from '../interfaces/CardInterface';
import { CardType, ColorType } from '../interfaces/enums';
import { lintCardFace } from './rulesTextLint';
import {
  getCreatedTokens,
  getTokenCard,
  getTokenCardFaces,
  getTokenCreators,
  getTokenLinks,
  getTokenSources,
  parseCreatedTokens,
} from './tokenLinks';

const labels = (text: string) => parseCreatedTokens(text).map(token => token.label);

describe('parseCreatedTokens', () => {
  it.each([
    ['Create a 1/1 white Soldier creature token.', ['1/1 Soldier']],
    ['When this creature enters, create a Food token.', ['Food']],
    ['Create two Treasure tokens.', ['Treasure']],
    ['Create X 1/1 green Saproling creature tokens.', ['1/1 Saproling']],
    ['Create a 1/1 white and black Spirit creature token with flying.', ['1/1 Spirit']],
    ['Create a tapped 2/2 black Zombie Knight creature token.', ['2/2 Zombie Knight']],
    ['Create a 1/1 white Soldier creature token and a Food token.', ['1/1 Soldier', 'Food']],
    ['[Investigate] Create a Clue token, then draw a card.', ['Clue']],
    [
      'Create a colorless Equipment artifact token named Sword of Dawn with "Equip {2}".',
      ['Sword of Dawn'],
    ],
    ['Create a token that’s a copy of target creature you control.', []],
    ['Whenever a creature token you control dies, draw a card.', []],
    ['When this creature enters, investigate.', ['Clue']],
    ['[Investigate] twice.', ['Clue']],
    ['Target player investigates.', ['Clue']],
    [
      'Investigate. (Create a Clue token. It’s an artifact with "{2}, Sacrifice this token: Draw a card.")',
      ['Clue'],
    ],
    ['Whenever you investigate, put a +1/+1 counter on this creature.', []],
    ['If you investigated this turn, draw a card.', []],
    ['Create a Monster Role token attached to target creature you control.', ['Monster Role']],
    ['Create a Young Hero Role token attached to up to one target creature.', ['Young Hero Role']],
  ])('%s → %j', (text, expected) => {
    expect(labels(text)).toEqual(expected);
  });
});

describe('tokens of custom mechanics', () => {
  const mechanics = [
    { uuid: 'plunder', name: 'Plunder', description: 'Create {ref} Treasure tokens.' },
    {
      uuid: 'muster',
      name: 'Muster',
      description:
        'When this creature enters, create a 1/1 white Soldier creature token with vigilance.',
    },
    { uuid: 'brave', name: 'Brave', description: 'This creature gets +1/+0 while attacking.' },
  ];
  const parse = (text: string) => parseCreatedTokens(text, 'cardText', 0, mechanics);

  it.each([
    ['[Plunder 2]', ['Treasure']],
    ['[Plunder -- X]', ['Treasure']],
    ['[- Plunder]', ['Treasure']],
    ['Flying, [Muster]', ['1/1 Soldier']],
    ['[Brave]', []],
    ['[Unknown] Draw a card.', []],
    // The reminder text spelled out on the line names the token once.
    ['[Plunder 1] (Create 1 Treasure tokens.)', ['Treasure']],
    ['[Muster] When this creature dies, create a Food token.', ['Food', '1/1 Soldier']],
  ])('%s → %j', (text, expected) => {
    expect(parse(text).map(token => token.label)).toEqual(expected);
  });

  it('keeps what the reminder text says about the token and where it comes from', () => {
    expect(parse('[Muster]')[0]).toMatchObject({
      abilities: ['Vigilance'],
      colors: [ColorType.White],
      mechanic: 'Muster',
    });
    expect(parse('Create a Food token.')[0].mechanic).toBeUndefined();
  });

  it('links the token of a mechanic to its token card', () => {
    const tokenCards = getTokenCardFaces([
      { uuid: 'treasure', ...getTokenCard(parse('Create a Treasure token.')[0]) } as CardInterface,
    ]);
    const face = { name: 'Test', cardTypes: [CardType.Creature], cardText: ['[Plunder 1]'] };
    expect(getTokenLinks(face, tokenCards)).toEqual([]);
    expect(getTokenLinks(face, tokenCards, mechanics)[0].match?.card.uuid).toBe('treasure');
    expect(
      getTokenCreators([{ uuid: 'pirate', front: face } as CardInterface], mechanics).map(
        creator => creator.card.uuid,
      ),
    ).toEqual(['pirate']);
  });
});

describe('getCreatedTokens', () => {
  it('reads the rules text fields shown for the card types', () => {
    const face: CardFaceInterface = {
      name: 'Test',
      cardTypes: [CardType.Creature, CardType.Adventure],
      cardText: ['Flying', 'When this creature enters, create a Food token.'],
      adventureText: ['Create a 1/1 white Soldier creature token.'],
      omenText: ['Create a Treasure token.'],
    };
    expect(getCreatedTokens(face).map(token => [token.field, token.line, token.label])).toEqual([
      ['cardText', 1, 'Food'],
      ['adventureText', 0, '1/1 Soldier'],
    ]);
  });
});

describe('getTokenLinks', () => {
  const card = (
    uuid: string,
    front: Partial<CardFaceInterface>,
    back?: Partial<CardFaceInterface>,
  ) =>
    ({
      uuid,
      name: front.name,
      front: { cardText: [], cardTypes: [], ...front },
      back: back && { cardText: [], cardTypes: [], ...back },
    }) as unknown as CardInterface;
  const tokenCards = getTokenCardFaces([
    card('soldier', {
      name: 'Soldier',
      cardTypes: [CardType.Token, CardType.Creature],
      cardSubTypes: 'Soldier',
      cardStats: '1/1',
    }),
    card(
      'double-faced',
      { name: 'Not a token', cardTypes: [CardType.Creature] },
      {
        name: 'Zombie Knight',
        cardTypes: [CardType.Token, CardType.Creature],
        cardSubTypes: 'Zombie Knight',
        cardStats: '2 / 2',
      },
    ),
    card('creature', { name: 'Treasure Hunter', cardTypes: [CardType.Creature] }),
  ]);
  const links = (text: string) =>
    getTokenLinks({ name: 'Test', cardTypes: [CardType.Sorcery], cardText: [text] }, tokenCards);

  it('finds token cards on either face by subtype and power/toughness', () => {
    expect(links('Create a 1/1 white Soldier creature token.')[0].match?.card.uuid).toBe('soldier');
    expect(links('Create a 2/2 black Zombie Knight creature token.')[0].match?.face.name).toBe(
      'Zombie Knight',
    );
  });

  it('only counts token cards', () => {
    expect(links('Create a Treasure token.')[0]).toMatchObject({
      match: undefined,
      differentStats: undefined,
    });
  });

  it('reports a token card of the same kind with other power/toughness', () => {
    const [link] = links('Create a 3/3 white Soldier creature token.');
    expect(link.match).toBeUndefined();
    expect(link.differentStats?.card.uuid).toBe('soldier');
  });
});

describe('getTokenSources', () => {
  const card = (
    uuid: string,
    front: Partial<CardFaceInterface>,
    back?: Partial<CardFaceInterface>,
  ) =>
    ({
      uuid,
      name: front.name,
      front: { cardText: [], cardTypes: [], ...front },
      back: back && { cardText: [], cardTypes: [], ...back },
    }) as unknown as CardInterface;
  const soldier = card('soldier', {
    name: 'Soldier',
    cardTypes: [CardType.Token, CardType.Creature],
    cardSubTypes: 'Soldier',
    cardStats: '1/1',
  });
  const cards = [
    soldier,
    card('captain', {
      name: 'Captain',
      cardTypes: [CardType.Creature],
      cardText: ['When this creature enters, create a 1/1 white Soldier creature token.'],
    }),
    card(
      'double-faced',
      { name: 'Day', cardTypes: [CardType.Creature] },
      {
        name: 'Night',
        cardTypes: [CardType.Sorcery],
        cardText: ['Create two 1/1 Soldier tokens.'],
      },
    ),
    card('big', {
      name: 'Big',
      cardTypes: [CardType.Sorcery],
      cardText: ['Create a 3/3 Soldier creature token.'],
    }),
    card('food', {
      name: 'Feast',
      cardTypes: [CardType.Sorcery],
      cardText: ['Create a Food token.'],
    }),
  ];
  const sources = (tokenCard: CardInterface, collection = cards) =>
    getTokenSources(tokenCard, tokenCard.front, collection, getTokenCreators(collection)).map(
      ({ card: source, face }) => `${source.uuid}:${face.name}`,
    );

  it('finds the faces that create exactly this token', () => {
    expect(sources(soldier)).toEqual(['captain:Captain', 'double-faced:Night']);
  });

  it('follows unsaved changes to the token card', () => {
    expect(sources({ ...soldier, front: { ...soldier.front, cardStats: '3/3' } })).toEqual([
      'big:Big',
    ]);
  });

  it('only links the token card that the creating card links to', () => {
    const secondSoldier = { ...soldier, uuid: 'second-soldier' };
    expect(sources(secondSoldier, [...cards, secondSoldier])).toEqual([]);
  });

  it('is empty for cards that are not tokens', () => {
    expect(sources(cards[1])).toEqual([]);
  });
});

describe('getTokenCard', () => {
  const tokenCard = (text: string) => getTokenCard(parseCreatedTokens(text)[0]).front;

  it('capitalizes subtypes the rules text wrote in lower case', () => {
    expect(tokenCard('{t}: Create a white 1/1 elf warrior creature token.')).toMatchObject({
      name: 'Elf Warrior',
      cardSubTypes: 'Elf Warrior',
    });
    expect(tokenCard('Create a treasure token.')).toMatchObject({ name: 'Treasure' });
  });

  it('builds a creature token with its colors, stats and keywords', () => {
    expect(tokenCard('Create a 1/1 white and black Spirit creature token with flying.')).toEqual({
      name: 'Spirit',
      cardTypes: [CardType.Token, CardType.Creature],
      cardSubTypes: 'Spirit',
      cardText: ['Flying'],
      cardStats: '1/1',
      tokenColors: [ColorType.White, ColorType.Black],
    });
  });

  it('reads several keywords and quoted abilities', () => {
    expect(
      tokenCard(
        'Create a 4/4 red Dragon creature token with flying, haste, and "{r}: This creature gets +1/+0 until end of turn."',
      ).cardText,
    ).toEqual(['Flying, haste', '{r}: This creature gets +1/+0 until end of turn.']);
    expect(
      tokenCard('Create a 2/2 green Wolf creature token with ward {2} and a Food token.').cardText,
    ).toEqual(['Ward {2}']);
  });

  it('gives predefined tokens their types and rules text', () => {
    expect(tokenCard('Create a Treasure token.')).toMatchObject({
      name: 'Treasure',
      cardTypes: [CardType.Token, CardType.Artifact],
      cardText: ['{t}, Sacrifice this token: Add one mana of any color.'],
      tokenColors: [ColorType.Colorless],
    });
    expect(tokenCard('Create a Food token.').cardStats).toBeUndefined();
  });

  it('builds named and legendary tokens', () => {
    expect(
      tokenCard(
        'Create a colorless Equipment artifact token named Sword of Dawn with "Equip {2}".',
      ),
    ).toMatchObject({
      name: 'Sword of Dawn',
      cardTypes: [CardType.Token, CardType.Artifact],
      cardSubTypes: 'Equipment',
      cardText: ['Equip {2}'],
    });
    expect(
      tokenCard('Create Isu, a legendary 2/2 blue Bird creature token named Isu.').legendary,
    ).toBe(true);
  });

  it('builds a token card that the token then links to', () => {
    const texts = [
      'Create a 3/3 green Beast creature token.',
      'Create a tapped 2/2 black Zombie Knight creature token.',
      'Create a Clue token.',
      'Create a colorless Equipment artifact token named Sword of Dawn with "Equip {2}".',
    ];
    texts.forEach(text => {
      const created = getTokenCard(parseCreatedTokens(text)[0]);
      const tokenCards = getTokenCardFaces([{ uuid: 'new', ...created } as CardInterface]);
      const face = { name: 'Test', cardTypes: [CardType.Sorcery], cardText: [text] };
      expect(getTokenLinks(face, tokenCards)[0].match?.card.uuid).toBe('new');
    });
  });

  it('builds Walker, Heartwood and Vibranium tokens as the rules define them', () => {
    expect(tokenCard('Create a Walker token.')).toEqual({
      name: 'Walker',
      cardTypes: [CardType.Token, CardType.Creature],
      cardSubTypes: 'Zombie',
      cardText: [],
      cardStats: '2/2',
      tokenColors: [ColorType.Black],
    });
    expect(tokenCard('Create a Heartwood token.')).toMatchObject({
      cardTypes: [CardType.Token, CardType.Artifact],
      cardText: ['{t}: Add {r} or {g}.'],
      tokenColors: [ColorType.Red, ColorType.Green],
    });
    expect(tokenCard('Create a Vibranium token.').cardText).toEqual([
      'Indestructible',
      "{t}: Add {c}. This mana can't be spent to cast a nonartifact spell.",
    ]);
  });

  it('builds Role tokens as Auras named after the role', () => {
    expect(
      tokenCard('Create a Monster Role token attached to target creature you control.'),
    ).toEqual({
      name: 'Monster',
      cardTypes: [CardType.Token, CardType.Enchantment],
      cardSubTypes: 'Aura Role',
      cardText: ['Enchant creature', 'Enchanted creature gets +1/+1 and has trample.'],
      tokenColors: [ColorType.Colorless],
    });
    expect(tokenCard('Create a Young Hero Role token attached to target creature.').name).toBe(
      'Young Hero',
    );
  });

  it('lets the rules text override a predefined token', () => {
    expect(tokenCard('Create a red Treasure artifact token.').tokenColors).toEqual([ColorType.Red]);
  });

  const PREDEFINED = [
    'Treasure',
    'Food',
    'Clue',
    'Blood',
    'Map',
    'Gold',
    'Powerstone',
    'Junk',
    'Shard',
    'Lander',
    'Mutagen',
    'Vibranium',
    'Heartwood',
    'Walker',
    ...['Cursed', 'Monster', 'Royal', 'Sorcerer', 'Virtuous', 'Wicked', 'Young Hero'].map(
      roleName => `${roleName} Role`,
    ),
  ];

  it('builds predefined token cards without templating hints', () => {
    PREDEFINED.forEach(kind => {
      expect([kind, lintCardFace(tokenCard(`Create a ${kind} token.`))]).toEqual([kind, []]);
    });
  });

  it('builds predefined token cards that the token then links to', () => {
    PREDEFINED.forEach(kind => {
      const text = `Create a ${kind} token.`;
      const tokenCards = getTokenCardFaces([
        { uuid: 'new', ...getTokenCard(parseCreatedTokens(text)[0]) } as CardInterface,
      ]);
      const face = { name: 'Test', cardTypes: [CardType.Sorcery], cardText: [text] };
      expect([kind, getTokenLinks(face, tokenCards)[0].match?.card.uuid]).toEqual([kind, 'new']);
    });
  });

  it('links a bare investigate to the Clue token card', () => {
    const tokenCards = getTokenCardFaces([
      {
        uuid: 'clue',
        ...getTokenCard(parseCreatedTokens('Create a Clue token.')[0]),
      } as CardInterface,
    ]);
    const face = { name: 'Test', cardTypes: [CardType.Sorcery], cardText: ['Investigate twice.'] };
    expect(getTokenLinks(face, tokenCards)[0].match?.card.uuid).toBe('clue');
  });
});
