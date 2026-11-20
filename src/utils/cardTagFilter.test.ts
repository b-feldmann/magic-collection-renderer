import { describe, expect, it } from 'vitest';
import {
  getAvailableCardTags,
  getInitialTagFilterState,
  matchesSelectedTags,
} from './cardTagFilter';

describe('card tag filtering', () => {
  it('returns only available tags with their card counts', () => {
    const cards = [
      { tags: ['Artifact', 'Favorite'] },
      { tags: ['Favorite'] },
      { tags: ['Unused'] },
    ];

    expect(getAvailableCardTags(cards, ['Artifact', 'Favorite', 'Missing'])).toEqual([
      { name: 'Artifact', count: 1 },
      { name: 'Favorite', count: 2 },
    ]);
  });

  it('lists automatic tags on cards even though they are not in the catalogue', () => {
    const cards = [{ tags: ['Ramp', 'Favorite'] }, { tags: ['Ramp', 'Evolution'] }];

    expect(getAvailableCardTags(cards, ['Favorite', 'Ramp'])).toEqual([
      { name: 'Evolution', count: 1 },
      { name: 'Favorite', count: 1 },
      { name: 'Ramp', count: 2 },
    ]);
  });

  it('sorts the tags alphabetically regardless of letter case', () => {
    const cards = [{ tags: ['Token Creation', 'combo', 'Flying', 'Card Draw'] }];

    expect(getAvailableCardTags(cards, ['combo', 'Flying']).map(({ name }) => name)).toEqual([
      'Card Draw',
      'combo',
      'Flying',
      'Token Creation',
    ]);
  });

  it('matches cards containing any selected tag', () => {
    expect(matchesSelectedTags(['Artifact'], ['Artifact', 'Favorite'])).toBe(true);
    expect(matchesSelectedTags(['Favorite'], ['Artifact', 'Favorite'])).toBe(true);
    expect(matchesSelectedTags(['Creature'], ['Artifact', 'Favorite'])).toBe(false);
    expect(matchesSelectedTags(['Creature'], [])).toBe(true);
  });

  it('starts available tag filters unchecked', () => {
    expect(getInitialTagFilterState(['Artifact', 'Favorite'])).toEqual({
      Artifact: false,
      Favorite: false,
    });
  });
});
