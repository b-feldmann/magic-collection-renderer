import { describe, expect, it } from 'vitest';
import {
  CARD_RATIO,
  MAX_PACK_CARD_WIDTH,
  PACK_GAP,
  packLayout,
  SLOT_LABEL_HEIGHT,
} from './packLayout';

// Width and height the grid takes up with that layout.
const gridSize = (count: number, columns: number, cardWidth: number) => {
  const rows = Math.ceil(count / columns);
  return {
    width: columns * cardWidth + (columns - 1) * PACK_GAP,
    height: rows * (cardWidth * CARD_RATIO + SLOT_LABEL_HEIGHT) + (rows - 1) * PACK_GAP,
  };
};

describe('packLayout', () => {
  it.each([
    [15, 1340, 730],
    [15, 1900, 1300],
    [15, 360, 640],
    [14, 800, 300],
    [1, 500, 500],
  ])('fits %i cards into %ix%i', (count, width, height) => {
    const { columns, cardWidth } = packLayout(count, width, height);
    const grid = gridSize(count, columns, cardWidth);
    expect(grid.width).toBeLessThanOrEqual(width);
    expect(grid.height).toBeLessThanOrEqual(height);
    expect(cardWidth).toBeGreaterThan(0);
  });

  it('uses more columns in a wide, short space', () => {
    expect(packLayout(15, 2000, 400).columns).toBeGreaterThan(packLayout(15, 800, 1200).columns);
  });

  it('caps the card size on very large screens', () => {
    expect(packLayout(1, 5000, 5000).cardWidth).toBe(MAX_PACK_CARD_WIDTH);
  });
});
