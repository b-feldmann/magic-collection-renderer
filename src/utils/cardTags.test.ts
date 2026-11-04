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
