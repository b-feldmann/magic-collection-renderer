import { describe, expect, it } from 'vitest';
import reducer, { CardActionType } from './reducer';
import { EMPTY_CARD } from './actions/cardActions';
import { UNKNOWN_CREATOR } from './utils/constants';

describe('variant deletion in the store', () => {
  it('removes the deleted ID from every surviving card without mutating the previous state', () => {
    const a = { ...EMPTY_CARD(), uuid: 'a', variantIds: ['b', 'c'] };
    const b = { ...EMPTY_CARD(), uuid: 'b', variantIds: ['a', 'c'] };
    const c = { ...EMPTY_CARD(), uuid: 'c', variantIds: ['a', 'b'] };
    const state = {
      cards: [a, b, c],
      mechanics: [],
      tags: [],
      annotationAccessor: {},
      user: [],
      currentUser: UNKNOWN_CREATOR,
    };
    const next = reducer(state, { type: CardActionType.DeleteCard, payload: { uuid: 'b' } });
    expect(next.cards.map(card => [card.uuid, card.variantIds])).toEqual([
      ['a', ['c']],
      ['c', ['a']],
    ]);
    expect(a.variantIds).toEqual(['b', 'c']);
    expect(state.cards).toHaveLength(3);
  });
});
