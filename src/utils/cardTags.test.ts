import { describe, expect, it } from 'vitest';

import type CardInterface from '../interfaces/CardInterface';
import type MechanicInterface from '../interfaces/MechanicInterface';
import { CardType } from '../interfaces/enums';
import { getAutomaticCardTags, getCardTags, updateCardTags } from './cardTags';

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
  creator: { uuid: 'user-1', name: 'User', seenCards: [], lastSeenVersion: 0 },
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
