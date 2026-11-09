import { describe, expect, it } from 'vitest';

import snapCardWidth from './snapCardWidth';
import { CARD_HEIGHT, CARD_WIDTH } from './constants';

describe('snapCardWidth', () => {
  it.each([1, 1.25, 1.5, 2, 3])(
    'puts both card edges on whole device pixels at a %fx pixel ratio',
    devicePixelRatio => {
      for (const width of [155.3, 257.14, 429.59, 628.57, 1001]) {
        const snapped = snapCardWidth(width, devicePixelRatio);
        const height = (snapped * CARD_HEIGHT) / CARD_WIDTH;

        expect(snapped).toBeLessThanOrEqual(width);
        expect(width - snapped).toBeLessThan(5 / devicePixelRatio);
        expect(snapped * devicePixelRatio).toBeCloseTo(Math.round(snapped * devicePixelRatio), 9);
        expect(height * devicePixelRatio).toBeCloseTo(Math.round(height * devicePixelRatio), 9);
      }
    },
  );

  it('never returns a negative width', () => {
    expect(snapCardWidth(-10, 1)).toBe(0);
    expect(snapCardWidth(3, 1)).toBe(0);
  });
});
