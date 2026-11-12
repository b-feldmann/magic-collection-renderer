import { describe, expect, it } from 'vitest';

import type CardInterface from '../interfaces/CardInterface';
import type MechanicInterface from '../interfaces/MechanicInterface';
import { CardType } from '../interfaces/enums';
import { getAutomaticCardTags, getCardTags, getKnownCardTags, updateCardTags } from './cardTags';

const card = (overrides: Partial<CardInterface> = {}): CardInterface => ({
  name: 'Test Card',
  uuid: 'card-1',
  manaCost: '',
  rarity: 'Common' as CardInterface['rarity'],
  front: {
    name: 'Test Card',
    cardTypes: [],
    cardText: [],
  },
  creator: { uuid: 'user-1', name: 'User' },
  meta: {
    comment: '',
    likes: [],
    dislikes: [],
    lastUpdated: 0,
    createdAt: 0,
    state: 'Draft' as CardInterface['meta']['state'],
  },
  ...overrides,
});

const mechanic = (name: string): MechanicInterface => ({
  uuid: name,
  name,
  description: '',
});

describe('getCardTags', () => {
  it('identifies mechanic tags separately from manual tags', () => {
    expect(
      getAutomaticCardTags(
        card({ front: { name: 'Test Card', cardTypes: [], cardText: ['[Lifelink]'] } }),
        [mechanic('Lifelink'), mechanic('Flying')],
      ),
    ).toEqual(['Lifelink']);
  });

  it.each(['Flying', 'flying', 'FLYING', 'This creature has flying.', '[flying]'])(
    'finds a mechanic name without brackets and in any letter case: %s',
    cardText => {
      expect(
        getAutomaticCardTags(
          card({ front: { name: 'Test Card', cardTypes: [], cardText: [cardText] } }),
          [mechanic('Flying')],
        ),
      ).toEqual(['Flying']);
    },
  );

  it.each(['Discard a card', 'discard', 'Discards', 'Each player discards a card.'])(
    'finds a mechanic name followed by an "s": %s',
    cardText => {
      expect(
        getAutomaticCardTags(
          card({ front: { name: 'Test Card', cardTypes: [], cardText: [cardText] } }),
          [mechanic('Discard')],
        ),
      ).toEqual(['Discard']);
    },
  );

  it.each(['discarded', 'discarding', 'discardss'])(
    'does not find a mechanic name with another suffix: %s',
    cardText => {
      expect(
        getAutomaticCardTags(
          card({ front: { name: 'Test Card', cardTypes: [], cardText: [cardText] } }),
          [mechanic('Discard')],
        ),
      ).toEqual([]);
    },
  );

  it.each(['Move toward it', 'Warden', 'Awards'])(
    'does not find a mechanic name inside another word: %s',
    cardText => {
      expect(
        getAutomaticCardTags(
          card({ front: { name: 'Test Card', cardTypes: [], cardText: [cardText] } }),
          [mechanic('Ward')],
        ),
      ).toEqual([]);
    },
  );

  it('treats special characters in a mechanic name literally', () => {
    const withText = (cardText: string) =>
      card({ front: { name: 'Test Card', cardTypes: [], cardText: [cardText] } });

    expect(getAutomaticCardTags(withText('power (x)'), [mechanic('Power (X)')])).toEqual([
      'Power (X)',
    ]);
    expect(getAutomaticCardTags(withText('power x'), [mechanic('Power (X)')])).toEqual([]);
  });

  it('adds the tag when the word is typed and removes it when the word is deleted', () => {
    const empty = card({ front: { name: 'Test Card', cardTypes: [], cardText: ['Draw a card'] } });
    const typed = card({
      tags: ['manual'],
      front: { name: 'Test Card', cardTypes: [], cardText: ['Draw a card, then scry 1'] },
    });
    const mechanics = [mechanic('Scry')];

    const added = updateCardTags(empty, typed, mechanics);
    expect(added).toEqual(['manual', 'Scry']);

    expect(updateCardTags({ ...typed, tags: added }, { ...empty, tags: added }, mechanics)).toEqual(
      ['manual'],
    );
  });

  it('uses the mechanic spelling when a manual tag differs only by case', () => {
    const tagged = card({
      tags: ['flying', 'custom'],
      front: { name: 'Test Card', cardTypes: [], cardText: ['flying'] },
    });

    expect(getCardTags(tagged, [mechanic('Flying')])).toEqual(['Flying', 'custom']);
    expect(updateCardTags(tagged, tagged, [mechanic('Flying')])).toEqual(['Flying', 'custom']);
  });

  describe('mechanics referenced by a mechanic on the card', () => {
    const withText = (cardText: string) =>
      card({ front: { name: 'Test Card', cardTypes: [], cardText: [cardText] } });
    const discard: MechanicInterface = {
      ...mechanic('Discard'),
      description: 'Discard a card from your hand',
    };
    const cycling: MechanicInterface = {
      ...mechanic('Cycling'),
      description: 'discard this card and draw a card',
    };

    it.each(['[Cycling {2}]', 'cycling 2'])('adds the referenced mechanic for: %s', cardText => {
      expect(getAutomaticCardTags(withText(cardText), [discard, cycling])).toEqual([
        'Discard',
        'Cycling',
      ]);
    });

    it('does not follow references of referenced mechanics', () => {
      const madness = { ...mechanic('Madness'), description: 'Exile it instead' };
      const exiled = { ...discard, description: 'Discard a card, then use madness' };

      expect(getAutomaticCardTags(withText('Cycling'), [madness, exiled, cycling])).toEqual([
        'Discard',
        'Cycling',
      ]);
    });

    it('ignores descriptions of mechanics that are not on the card', () => {
      expect(getAutomaticCardTags(withText('Draw a card'), [discard, cycling])).toEqual([]);
    });

    it('handles mechanics that reference each other or themselves', () => {
      const first = { ...mechanic('First'), description: 'Uses second and first' };
      const second = { ...mechanic('Second'), description: 'Uses first' };

      expect(getAutomaticCardTags(withText('First'), [first, second])).toEqual(['First', 'Second']);
    });

    it('removes the referenced tag with the mechanic that references it', () => {
      const previous = card({
        tags: ['Discard', 'Cycling', 'manual'],
        front: { name: 'Test Card', cardTypes: [], cardText: ['Cycling'] },
      });
      const next = { ...previous, front: { ...previous.front, cardText: ['Draw a card'] } };

      expect(updateCardTags(previous, next, [discard, cycling])).toEqual(['manual']);
    });
  });

  it('adds rules-text tags from the rules text of each face but not from flavour text', () => {
    expect(
      getAutomaticCardTags(
        card({
          front: {
            name: 'Test Card',
            cardTypes: [CardType.Creature],
            cardText: ['{T}: Add {G}.'],
            flavourText: 'It wanted to destroy target creature.',
          },
          back: {
            name: 'Back',
            cardTypes: [CardType.Sorcery],
            cardText: ['Destroy target creature.'],
          },
        }),
        [],
      ),
    ).toEqual(['Ramp', 'Creature Removal']);
    expect(
      getAutomaticCardTags(
        card({
          front: {
            name: 'Test Card',
            cardTypes: [],
            cardText: [],
            flavourText: 'Destroy target creature.',
          },
        }),
        [],
      ),
    ).toEqual([]);
  });

  it('adds the Evolution tag for cards using the Evolution type', () => {
    expect(
      getAutomaticCardTags(
        card({ front: { name: 'Test Card', cardTypes: [CardType.Evolution], cardText: [] } }),
        [],
      ),
    ).toEqual(['Evolution']);
  });

  it('removes automatic mechanic tags when the mechanic is removed from the card', () => {
    const previous = card({
      tags: ['Test', 'manual'],
      front: { name: 'Test Card', cardTypes: [], cardText: ['[Test]'] },
    });
    const next = card({
      tags: ['Test', 'manual'],
      front: { name: 'Test Card', cardTypes: [], cardText: [] },
    });

    expect(updateCardTags(previous, next, [mechanic('Test')])).toEqual(['manual']);
  });

  it('removes Evolution when its type is removed and no Evolution keyword remains', () => {
    const previous = card({
      tags: ['Evolution'],
      front: { name: 'Test Card', cardTypes: [CardType.Evolution], cardText: [] },
    });
    const next = card({
      tags: ['Evolution'],
      front: { name: 'Test Card', cardTypes: [], cardText: [] },
    });

    expect(updateCardTags(previous, next, [])).toEqual([]);
  });

  it('keeps manual tags and adds mechanics used in card text without duplicates', () => {
    expect(
      getCardTags(
        card({
          tags: ['custom', 'Lifelink'],
          front: { name: 'Test Card', cardTypes: [], cardText: ['[Lifelink {X}]'] },
        }),
        [mechanic('Lifelink'), mechanic('Flying')],
      ),
    ).toEqual(['custom', 'Lifelink']);
  });

  it('detects mechanics on both card faces', () => {
    expect(
      getCardTags(
        card({
          front: { name: 'Test Card', cardTypes: [], cardText: [] },
          back: { name: 'Back', cardTypes: [], cardText: ['Flying creature'] },
        }),
        [mechanic('Flying')],
      ),
    ).toEqual(['Flying']);
  });
});

describe('getKnownCardTags', () => {
  it('keeps tags from the catalogue or a mechanic and drops all others', () => {
    expect(
      getKnownCardTags(
        card({ tags: ['Combo', 'Flying', 'Deleted'] }),
        ['Combo'],
        [mechanic('Flying')],
      ),
    ).toEqual(['Combo', 'Flying']);
  });

  it('keeps automatic tags that are missing from the catalogue', () => {
    expect(
      getKnownCardTags(
        card({
          tags: ['Evolution', 'Deleted'],
          front: { name: 'Test Card', cardTypes: [CardType.Evolution], cardText: [] },
        }),
        ['Combo'],
        [],
      ),
    ).toEqual(['Evolution']);
  });

  it('matches tags regardless of surrounding whitespace', () => {
    expect(getKnownCardTags(card({ tags: ['Combo '] }), ['Combo'], [])).toEqual(['Combo ']);
  });
});
