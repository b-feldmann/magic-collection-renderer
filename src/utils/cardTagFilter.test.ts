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
