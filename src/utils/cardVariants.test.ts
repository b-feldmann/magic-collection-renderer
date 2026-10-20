import { describe, expect, it } from 'vitest';
import { EMPTY_CARD } from '../actions/cardActions';
import CardInterface from '../interfaces/CardInterface';
import { getVariantFamily, getVariantGroups, withLatestVariantIds } from './cardVariants';

const card = (uuid: string, variantIds?: string[], createdAt = 0): CardInterface => ({
  ...EMPTY_CARD(),
  uuid,
  variantIds,
  meta: { ...EMPTY_CARD().meta, createdAt },
});
const ids = (groups: CardInterface[][]) => groups.map(group => group.map(member => member.uuid));

describe('card variant families', () => {
  it('keeps ordinary cards separate and preserves collection order', () => {
    expect(ids(getVariantGroups([card('b'), card('a')]))).toEqual([['b'], ['a']]);
  });

  it('groups reciprocal, one-way and transitive links without changing the cards', () => {
    const cards = [card('c', ['b'], 3), card('a', ['b'], 1), card('b', ['a'], 2)];
    const before = JSON.stringify(cards);
    expect(ids(getVariantGroups(cards))).toEqual([['a', 'b', 'c']]);
    expect(getVariantFamily(cards[2], cards).map(member => member.uuid)).toEqual(['a', 'b', 'c']);
    expect(JSON.stringify(cards)).toBe(before);
  });

  it('ignores self links, duplicate IDs, and missing members without merging unrelated cards', () => {
    expect(
      ids(
        getVariantGroups([
          card('a', ['a', 'b', 'b', 'missing']),
          card('b'),
          card('c', ['missing']),
        ]),
      ),
    ).toEqual([['a', 'b'], ['c']]);
  });

  it('uses stable creation-time and ID ordering within each family', () => {
    expect(
      ids(getVariantGroups([card('c', ['a', 'b'], 1), card('b', ['c'], 0), card('a', ['c'], 0)])),
    ).toEqual([['a', 'b', 'c']]);
  });

  it('includes all family members when only one matches the collection filter', () => {
    const a = card('a', ['b']);
    const b = card('b', ['a']);
    expect(ids(getVariantGroups([b], [a, b, card('other')]))).toEqual([['a', 'b']]);
    expect(getVariantGroups([], [a, b])).toEqual([]);
  });

  it('prefers the current filtered snapshot and accepts a source not yet in the collection', () => {
    const a = card('a', ['b']);
    const updated = { ...a, name: 'Unsaved name' };
    expect(getVariantGroups([updated], [a, card('b')])[0][0].name).toBe('Unsaved name');
    expect(getVariantFamily(a, [card('b')]).map(member => member.uuid)).toEqual(['a', 'b']);
  });

  it('keeps unsaved content but uses current membership, including removed links', () => {
    const draft = { ...card('a', ['old']), name: 'Unsaved' };
    expect(withLatestVariantIds(draft, [card('a', ['b'])])).toMatchObject({
      name: 'Unsaved',
      variantIds: ['b'],
    });
    expect(withLatestVariantIds(draft, [card('a', [])]).variantIds).toEqual([]);
    expect(withLatestVariantIds(draft, [card('a')]).variantIds).toBeUndefined();
    expect(withLatestVariantIds(draft, [])).toEqual(draft);
    expect(draft.variantIds).toEqual(['old']);
  });
});
