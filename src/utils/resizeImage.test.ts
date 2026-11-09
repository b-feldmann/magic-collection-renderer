import { describe, it, expect } from 'vitest';
import { getTargetSize, MAX_DIMENSION } from './resizeImage';

describe('getTargetSize', () => {
  it('keeps images that already fit', () => {
    expect(getTargetSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('never upscales small images', () => {
    expect(getTargetSize(100, 140)).toEqual({ width: 100, height: 140 });
  });

  it('scales the longest edge of landscape images down to the limit', () => {
    expect(getTargetSize(4000, 3000)).toEqual({ width: MAX_DIMENSION, height: 1200 });
  });

  it('scales the longest edge of portrait images down to the limit', () => {
    expect(getTargetSize(3000, 4000)).toEqual({ width: 1200, height: MAX_DIMENSION });
  });

  it('keeps the aspect ratio for a custom limit', () => {
    expect(getTargetSize(1000, 500, 100)).toEqual({ width: 100, height: 50 });
  });
});
