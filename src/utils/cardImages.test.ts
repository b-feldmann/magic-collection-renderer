import { describe, expect, it } from 'vitest';

import CardInterface from '../interfaces/CardInterface';
import { EMPTY_CARD } from '../actions/cardActions';
import {
  CARD_IMAGE_SLOTS,
  getCardImage,
  getFaceImageSlots,
  getLoadingImageSlots,
  withCardImage,
} from './cardImages';

const makeCard = (): CardInterface => {
  const card = EMPTY_CARD();
  return {
    ...card,
    front: { ...card.front, cover: 'loading:front.png', aftermathCover: 'loading:turned.png' },
  };
};

describe('cardImages', () => {
  it('reads every slot from its face and field', () => {
    const card = makeCard();
    card.back = { ...card.front, cover: 'back', aftermathCover: 'back turned' };

    expect(CARD_IMAGE_SLOTS.map(slot => getCardImage(card, slot))).toEqual([
      'loading:front.png',
      'back',
      'loading:turned.png',
      'back turned',
    ]);
    expect(getFaceImageSlots(false).map(slot => getCardImage(card, slot))).toEqual([
      'loading:front.png',
      'loading:turned.png',
    ]);
    expect(getFaceImageSlots(true).map(slot => getCardImage(card, slot))).toEqual([
      'back',
      'back turned',
    ]);
  });

  it('replaces one image and leaves the original card alone', () => {
    const card = makeCard();
    const changed = withCardImage(card, 2, 'base64:AA==');

    expect(changed.front.aftermathCover).toBe('base64:AA==');
    expect(changed.front.cover).toBe('loading:front.png');
    expect(card.front.aftermathCover).toBe('loading:turned.png');
  });

  it('ignores the images of a back face the card does not have', () => {
    const card = makeCard();
    expect(withCardImage(card, 1, 'base64:AA==')).toBe(card);
    expect(withCardImage(card, 3, 'base64:AA==')).toBe(card);
  });

  it('lists the images that still have to be fetched', () => {
    const card = makeCard();
    expect(getLoadingImageSlots(card)).toEqual([0, 2]);
    expect(getLoadingImageSlots(withCardImage(card, 0, 'base64:AA=='))).toEqual([2]);
    card.back = { ...card.front };
    expect(getLoadingImageSlots(card)).toEqual([0, 1, 2, 3]);
    expect(getLoadingImageSlots(card, false)).toEqual([0, 2]);
    expect(getLoadingImageSlots(card, true)).toEqual([1, 3]);
  });
});
