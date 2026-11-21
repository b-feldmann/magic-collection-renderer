import { describe, expect, it } from 'vitest';
import CardFaceInterface from '../interfaces/CardFaceInterface';
import CardInterface from '../interfaces/CardInterface';
import { CardType, ColorType } from '../interfaces/enums';
import { applyLintFix, lintCardFace } from './rulesTextLint';
import { getTokenCardFaces, getTokenLinks, TokenCardMatch } from './tokenLinks';
import {
  expandTokenReferences,
  findOpenTokenReference,
  maskTokenReferences,
  resolveTokenReference,
  tokenReferenceFor,
  unmaskTokenReferences,
} from './tokenReferences';

const tokenCard = (uuid: string, front: Partial<CardFaceInterface>) =>
  ({
    uuid,
    name: front.name,
    front: {
      cardText: [],
      ...front,
      cardTypes: [CardType.Token, ...(front.cardTypes || [CardType.Creature])],
    },
  }) as unknown as CardInterface;

const blueRogue = tokenCard('blue-rogue', {
  name: 'Rogue',
  cardSubTypes: 'Rogue',
  cardStats: '1/1',
  tokenColors: [ColorType.Blue],
  cardText: ['Whenever this creature becomes tapped, surveil 1.'],
});
const redRogue = tokenCard('red-rogue', {
  name: 'Rogue',
  cardSubTypes: 'Rogue',
  cardStats: '1/1',
  tokenColors: [ColorType.Red],
});
const princess = tokenCard('princess', {
  name: 'Princess',
  cardSubTypes: 'Dog',
  cardStats: '4/4',
  legendary: true,
  tokenColors: [ColorType.Black],
  cardText: [
    'Menace',
    // "~" is the token's name; written out on the creating card it reads "Princess".
    'Sacrifice another creature: Put a +1/+1 counter on ~. Activate only as a sorcery.',
  ],
});
const treasure = tokenCard('treasure', {
  name: 'Treasure',
  cardSubTypes: 'Treasure',
  cardTypes: [CardType.Artifact],
  cardText: ['{t}, Sacrifice this token: Add one mana of any color.'],
});
const spirit = tokenCard('spirit', {
  name: 'Spirit',
  cardSubTypes: 'Spirit',
  cardStats: '1/1',
  tokenColors: [ColorType.White, ColorType.Black],
  cardText: ['Flying, vigilance (Attacking doesn’t cause this creature to tap.)'],
});
const elf = tokenCard('elf', {
  name: 'Elf Warrior',
  cardSubTypes: 'Elf Warrior',
  cardStats: '8/8',
  tokenColors: [ColorType.Green],
});

const tokenCards = getTokenCardFaces([blueRogue, redRogue, princess, treasure, spirit, elf]);
const expand = (line: string, cards: TokenCardMatch[] = tokenCards) =>
  expandTokenReferences(line, cards);

describe('expandTokenReferences', () => {
  it.each([
    [
      'When this artifact enters, create [Token: 1/1 blue Rogue].',
      'When this artifact enters, create a 1/1 blue Rogue creature token with "Whenever this creature becomes tapped, surveil 1."',
    ],
    [
      'When this creature enters, create [Token: 1/1 red Rogue], then surveil 2.',
      'When this creature enters, create a 1/1 red Rogue creature token, then surveil 2.',
    ],
    ['Create two [Token: 1/1 red Rogue].', 'Create two 1/1 red Rogue creature tokens.'],
    ['Create X [Token: 1/1 red Rogue].', 'Create X 1/1 red Rogue creature tokens.'],
    ['Create a tapped [Token: 1/1 red Rogue].', 'Create a tapped 1/1 red Rogue creature token.'],
    [
      'When ~ enters, create [Token: Princess].',
      'When ~ enters, create Princess, a legendary 4/4 black Dog creature token with menace and "Sacrifice another creature: Put a +1/+1 counter on Princess. Activate only as a sorcery."',
    ],
    ['Create [Token: Treasure].', 'Create a Treasure token.'],
    ['Create three [Token: Treasure].', 'Create three Treasure tokens.'],
    [
      'Create [Token: 1/1 white and black Spirit].',
      'Create a 1/1 white and black Spirit creature token with flying and vigilance.',
    ],
    ['Create [Token: 8/8 Elf Warrior].', 'Create an 8/8 green Elf Warrior creature token.'],
    // A typed article is replaced by the right one.
    ['Create a [Token: 8/8 Elf Warrior].', 'Create an 8/8 green Elf Warrior creature token.'],
    ['A [Token: Treasure] appears.', 'A Treasure token appears.'],
  ])('%s', (line, expected) => {
    expect(expand(line)).toBe(expected);
  });

  it('shows the description of a reference that finds no single token card', () => {
    expect(expand('Create [Token: 2/2 green Bear].')).toBe('Create a 2/2 green Bear token.');
    expect(expand('Create two [Token: 1/1 Rogue].')).toBe('Create two 1/1 Rogue tokens.');
  });

  it('follows the token card when it changes', () => {
    const changed = getTokenCardFaces([
      { ...redRogue, front: { ...redRogue.front, cardText: ['Haste'] } },
    ]);
    expect(expand('Create [Token: 1/1 red Rogue].', changed)).toBe(
      'Create a 1/1 red Rogue creature token with haste.',
    );
  });

  it('leaves lines without references alone', () => {
    const line = 'Create a 1/1 white Soldier creature token.';
    expect(expand(line)).toBe(line);
  });
});

describe('resolveTokenReference', () => {
  const uuids = (reference: string, cards = tokenCards) =>
    resolveTokenReference(reference, cards).map(({ card }) => card.uuid);

  it('matches name, power/toughness, colors and subtypes, in any case', () => {
    expect(uuids('1/1 blue Rogue')).toEqual(['blue-rogue']);
    expect(uuids('1/1 RED rogue')).toEqual(['red-rogue']);
    expect(uuids('Princess')).toEqual(['princess']);
    expect(uuids('legendary black Dog creature')).toEqual(['princess']);
    expect(uuids('Rogue')).toEqual(['blue-rogue', 'red-rogue']);
    expect(uuids('2/2 Rogue')).toEqual([]);
  });

  it('does not take a creature token with a predefined subtype for the predefined token', () => {
    const cannonfodder = tokenCard('cannonfodder', {
      name: 'Cannonfodder',
      cardTypes: [CardType.Creature, CardType.Artifact],
      cardSubTypes: 'Food Goblin',
      cardStats: '0/1',
    });
    const food = tokenCard('food', {
      name: 'Food',
      cardTypes: [CardType.Artifact],
      cardSubTypes: 'Food',
    });
    const cards = getTokenCardFaces([cannonfodder, food]);
    expect(uuids('Food', cards)).toEqual(['food']);
    expect(uuids('Cannonfodder', cards)).toEqual(['cannonfodder']);
    expect(uuids('Food Goblin', cards)).toEqual(['cannonfodder']);
  });

  it('picks between token cards by a keyword or words of an ability', () => {
    const blueTwin = tokenCard('blue-twin', {
      name: 'Rogue',
      cardSubTypes: 'Rogue',
      cardStats: '1/1',
      tokenColors: [ColorType.Blue],
      cardText: ['Flying'],
    });
    const cards = getTokenCardFaces([blueRogue, blueTwin]);
    expect(uuids('1/1 blue Rogue', cards)).toEqual(['blue-rogue', 'blue-twin']);
    expect(uuids('1/1 blue Rogue with flying', cards)).toEqual(['blue-twin']);
    expect(uuids('1/1 blue Rogue with "surveil"', cards)).toEqual(['blue-rogue']);
  });
});

describe('tokenReferenceFor', () => {
  it.each([
    [0, '1/1 blue Rogue with "Whenever this creature becomes tapped, surveil 1."'],
    [1, '1/1 red Rogue'],
    [
      2,
      'legendary Princess with menace and "Sacrifice another creature: Put a +1/+1 counter on Princess. Activate only as a sorcery."',
    ],
    [4, '1/1 white and black Spirit with flying and vigilance'],
    // Predefined tokens are named only, like on printed cards.
    [3, 'Treasure'],
  ])('includes all abilities of token card %i', (index, expected) => {
    const reference = tokenReferenceFor(tokenCards[index].face);
    expect(reference).toBe(expected);
    expect(resolveTokenReference(reference, tokenCards)).toEqual([tokenCards[index]]);
  });

  it('names unnamed legendary tokens legendary too', () => {
    const [bird] = getTokenCardFaces([
      tokenCard('bird', {
        name: 'Bird',
        cardSubTypes: 'Bird',
        cardStats: '2/2',
        legendary: true,
        tokenColors: [ColorType.Blue],
        cardText: ['Flying'],
      }),
    ]);
    const reference = tokenReferenceFor(bird.face);
    expect(reference).toBe('legendary 2/2 blue Bird with flying');
    expect(expandTokenReferences(`Create [Token: ${reference}].`, [bird])).toBe(
      'Create a legendary 2/2 blue Bird creature token with flying.',
    );
  });

  it('writes ~ on an unnamed token card as "this creature"', () => {
    const [ooze] = getTokenCardFaces([
      tokenCard('ooze', {
        name: 'Ooze',
        cardSubTypes: 'Ooze',
        cardStats: '0/0',
        tokenColors: [ColorType.Green],
        cardText: ['~ gets +1/+1 for each land you control.'],
      }),
    ]);
    const reference = tokenReferenceFor(ooze.face);
    expect(reference).toBe(
      '0/0 green Ooze with "this creature gets +1/+1 for each land you control."',
    );
    expect(resolveTokenReference(reference, [ooze])).toEqual([ooze]);
  });

  it('quotes nested quotes and mechanics so the reference still finds its token card', () => {
    const sorcerer = tokenCard('sorcerer', {
      name: 'Wizard',
      cardSubTypes: 'Wizard',
      cardStats: '2/2',
      tokenColors: [ColorType.Blue],
      cardText: ['[Ravage {1}]', 'Other Wizards you control have "{t}: Scry 1."'],
    });
    const [match] = getTokenCardFaces([sorcerer]);
    const reference = tokenReferenceFor(match.face);
    expect(reference).toBe(
      `2/2 blue Wizard with "Ravage {1}" and "Other Wizards you control have '{t}: Scry 1.'"`,
    );
    expect(resolveTokenReference(reference, [match])).toEqual([match]);
    expect(expandTokenReferences(`Create [Token: ${reference}].`, [match])).toBe(
      `Create a 2/2 blue Wizard creature token with [Ravage {1}] and "Other Wizards you control have '{t}: Scry 1.'"`,
    );
  });
});

describe('findOpenTokenReference', () => {
  it('finds the reference the caret is in', () => {
    const text = 'Create [Token: 1/1 bl';
    expect(findOpenTokenReference(text, text.length)).toEqual({
      start: 7,
      end: text.length,
      query: '1/1 bl',
    });
  });

  it('includes the rest of a closed reference', () => {
    const text = 'Create [Token: 1/1 blue Rogue].';
    expect(findOpenTokenReference(text, 18)).toEqual({ start: 7, end: 30, query: '1/1' });
  });

  it('is null outside references', () => {
    expect(findOpenTokenReference('Create [Token: Treasure] and', 28)).toBeNull();
    expect(findOpenTokenReference('[Plunder 2', 10)).toBeNull();
  });
});

describe('maskTokenReferences', () => {
  it('keeps the line length and puts the references back', () => {
    const line = 'Create [Token: 1/1 blue Rogue] and [Token: Treasure].';
    const { masked, references } = maskTokenReferences(line);
    expect(masked).toHaveLength(line.length);
    expect(masked).not.toContain('Rogue');
    expect(unmaskTokenReferences(masked.replace('Create', 'Then create'), references)).toBe(
      'Then create [Token: 1/1 blue Rogue] and [Token: Treasure].',
    );
  });
});

describe('token references in token links and the lint', () => {
  const face = (text: string): CardFaceInterface => ({
    name: 'Test',
    cardTypes: [CardType.Creature],
    cardStats: '2/2',
    cardText: [text],
  });
  const lint = (text: string, mechanics = [{ uuid: 'm', name: 'Plunder', description: 'x' }]) =>
    lintCardFace(face(text), mechanics, { tokenCards });

  it.each([
    'Sacrifice a [Token: Treasure]: Draw a card.',
    'Whenever a [Token: 1/1 red Rogue] you control dies, draw a card.',
    'Create a Food token. Sacrifice a [Token: Treasure].',
  ])('warns about a reference that is not created: %s', text => {
    const issues = lint(text).filter(({ rule }) => rule === 'token-reference');
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/isn't created here/);
  });

  it.each([
    'Create two [Token: 1/1 red Rogue].',
    'When ~ enters, create a tapped [Token: Treasure].',
    'Create [Token: Treasure] and [Token: 1/1 red Rogue].',
    'Create your choice of [Token: Treasure] or [Token: 1/1 red Rogue].',
    'Target player creates X [Token: 1/1 red Rogue].',
  ])('does not warn about a created reference: %s', text => {
    expect(lint(text).filter(({ rule }) => rule === 'token-reference')).toEqual([]);
  });

  it('links a reference to exactly its token card', () => {
    const [link] = getTokenLinks(
      face('Create [Token: 1/1 red Rogue], then surveil 2.'),
      tokenCards,
    );
    expect(link.token.reference).toBe('1/1 red Rogue');
    expect(link.match?.card.uuid).toBe('red-rogue');
  });

  it('has no hints for a reference that finds its token card', () => {
    expect(
      lint('When this creature enters, create [Token: 1/1 red Rogue], then surveil 2.').map(
        ({ rule, message }) => `${rule}: ${message}`,
      ),
    ).toEqual([]);
  });

  it('warns about a reference without a token card and offers to create one', () => {
    const issues = lint('Create [Token: 2/2 green Bear].').filter(
      issue => issue.rule === 'token-reference',
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].missingToken).toMatchObject({ stats: '2/2', subtypes: ['Bear'] });
  });

  it('warns about a reference that fits several token cards', () => {
    const [issue] = lint('Create [Token: Rogue].').filter(({ rule }) => rule === 'token-reference');
    expect(issue.message).toMatch(/fits 2 token cards/);
    expect(issue.missingToken).toBeUndefined();
  });

  it.each([
    'When this artifact enters, create a 1/1 blue Rogue creature token with "Whenever this creature becomes tapped, surveil 1."',
    'When this creature enters, create a 1/1 red Rogue creature token, then surveil 2. Return a card with mana value less than the number of creatures you control from among the cards put into your graveyard this way to your hand.',
    'When ~ enters, create Princess, a legendary 4/4 black Dog creature token with menace and "Sacrifice another creature: Put a +1/+1 counter on Princess. Activate only as a sorcery."',
    'Create two Treasure tokens.',
  ])('suggests the token reference for %s, which reads the same', text => {
    const issues = lint(text);
    const shorthand = issues.find(({ rule }) => rule === 'token-shorthand');
    expect(shorthand?.fix?.label).toBe('Use token reference');
    const [fixed] = applyLintFix([text], shorthand!);
    expect(fixed).toMatch(/\[Token: [^\]]+\]/);
    expect(expand(fixed)).toBe(text);
  });

  it('replaces each token of a choice', () => {
    const cards = getTokenCardFaces([
      tokenCard('human', {
        name: 'Human',
        cardSubTypes: 'Human',
        cardStats: '1/1',
        tokenColors: [ColorType.White],
        cardText: ['Lifelink'],
      }),
      tokenCard('dog', {
        name: 'Dog',
        cardSubTypes: 'Dog',
        cardStats: '1/1',
        tokenColors: [ColorType.White],
        cardText: ['Vigilance'],
      }),
    ]);
    const text =
      'Create your choice of a 1/1 white Human creature token with lifelink or a 1/1 white Dog creature token with vigilance.';
    const fixes = lintCardFace(face(text), [], { tokenCards: cards })
      .filter(({ rule }) => rule === 'token-shorthand')
      .map(issue => issue.fix!.line);
    expect(fixes).toEqual([
      'Create your choice of [Token: 1/1 white Human with lifelink] or a 1/1 white Dog creature token with vigilance.',
      'Create your choice of a 1/1 white Human creature token with lifelink or [Token: 1/1 white Dog with vigilance].',
    ]);
    expect(
      expandTokenReferences(
        'Create your choice of [Token: 1/1 white Human] or [Token: 1/1 white Dog].',
        cards,
      ),
    ).toBe(text);
  });

  it("doesn't take a reference for an unknown mechanic or lowercase subtypes", () => {
    const rules = lint('Create [Token: 1/1 blue rogue].').map(({ rule }) => rule);
    expect(rules).not.toContain('unknown-mechanic');
    expect(rules).not.toContain('capitalization');
  });

  it('keeps references as typed in other fixes', () => {
    const fix = lint(
      'Create [Token: 1/1 red Rogue] for each card with converted mana cost 2 you control.',
    ).find(({ rule }) => rule === 'mana-value')?.fix;
    expect(fix?.line).toBe(
      'Create [Token: 1/1 red Rogue] for each card with mana value 2 you control.',
    );
  });

  it('offers to update a reference whose abilities the token card no longer has', () => {
    const text = 'Create [Token: 1/1 blue Rogue with "Whenever this creature attacks, scry 1."].';
    const [issue] = lint(text).filter(({ rule }) => rule === 'token-reference');
    expect(issue.message).toMatch(/lists abilities the Rogue token card doesn't have/);
    expect(issue.fix).toEqual({
      label: 'Update token reference',
      line: 'Create [Token: 1/1 blue Rogue with "Whenever this creature becomes tapped, surveil 1."].',
    });
    expect(issue.missingToken).toBeUndefined();
  });
});
