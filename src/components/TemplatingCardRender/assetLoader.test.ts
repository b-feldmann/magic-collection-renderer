import { describe, it, expect } from 'vitest';

import { getInnerBorderFrame } from './assetLoader';
import { ColorType } from '../../interfaces/enums';

describe('getInnerBorderFrame', () => {
  it('returns no border (empty string) for colorless cards with no colors', () => {
    // A colorless card produces an empty color array. It must NOT fall back to
    // the gold multicolor border.
    expect(getInnerBorderFrame([])).toBe('');
  });

  it('returns the gold border for 3+ colors', () => {
    const gold = getInnerBorderFrame([
      ColorType.White,
      ColorType.Blue,
      ColorType.Black,
    ]);
    expect(gold).not.toBe('');
    // All three-color results share the same gold asset.
    expect(
      getInnerBorderFrame([ColorType.Red, ColorType.Green, ColorType.White])
    ).toBe(gold);
  });

  it('returns a mono-color border for a single color', () => {
    const white = getInnerBorderFrame([ColorType.White]);
    const blue = getInnerBorderFrame([ColorType.Blue]);
    expect(white).not.toBe('');
    expect(blue).not.toBe('');
    expect(white).not.toBe(blue);
  });

  it('returns a two-color border for a color pair', () => {
    const wu = getInnerBorderFrame([ColorType.White, ColorType.Blue]);
    const mono = getInnerBorderFrame([ColorType.White]);
    expect(wu).not.toBe('');
    expect(wu).not.toBe(mono);
  });
});
