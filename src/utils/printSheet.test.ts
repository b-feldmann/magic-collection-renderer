import { describe, expect, it } from 'vitest';

import {
  A4_HEIGHT,
  A4_WIDTH,
  CARD_SPACING,
  CARDS_PER_SHEET,
  CUT_MARKS,
  PRINT_CARD_HEIGHT,
  PRINT_CARD_WIDTH,
  SHEET_SLOTS,
} from './printSheet';

const gridLeft = Math.min(...SHEET_SLOTS.map(slot => slot.x));
const gridTop = Math.min(...SHEET_SLOTS.map(slot => slot.y));
const gridRight = Math.max(...SHEET_SLOTS.map(slot => slot.x + slot.width));
const gridBottom = Math.max(...SHEET_SLOTS.map(slot => slot.y + slot.height));

describe('A4 print sheet', () => {
  it('holds nine real-size cards with the render ratio', () => {
    expect(SHEET_SLOTS).toHaveLength(CARDS_PER_SHEET);
    expect(PRINT_CARD_WIDTH / PRINT_CARD_HEIGHT).toBeCloseTo(1500 / 2100, 3);
  });

  it('centers the grid with empty margins for the printer', () => {
    expect(gridLeft).toBeCloseTo(A4_WIDTH - gridRight);
    expect(gridTop).toBeCloseTo(A4_HEIGHT - gridBottom);
    expect(gridLeft).toBeGreaterThan(5);
    expect(gridTop).toBeGreaterThan(5);
  });

  it('lays the cards out row by row with a small space between them', () => {
    expect(CARD_SPACING).toBeGreaterThan(0);
    expect(SHEET_SLOTS[1].x).toBeCloseTo(SHEET_SLOTS[0].x + PRINT_CARD_WIDTH + CARD_SPACING);
    expect(SHEET_SLOTS[3].y).toBeCloseTo(SHEET_SLOTS[0].y + PRINT_CARD_HEIGHT + CARD_SPACING);
    expect(SHEET_SLOTS[3].x).toBeCloseTo(SHEET_SLOTS[0].x);
  });

  it('puts a cut mark at both ends of every grid line, only in the margins', () => {
    // Both edges of 3 columns and 3 rows, two marks each.
    expect(CUT_MARKS).toHaveLength(24);
    for (const { x1, y1, x2, y2 } of CUT_MARKS) {
      for (const [x, y] of [
        [x1, y1],
        [x2, y2],
      ]) {
        expect(x).toBeGreaterThanOrEqual(4);
        expect(x).toBeLessThanOrEqual(A4_WIDTH - 4);
        expect(y).toBeGreaterThanOrEqual(4);
        expect(y).toBeLessThanOrEqual(A4_HEIGHT - 4);
        const insideGrid = x > gridLeft && x < gridRight && y > gridTop && y < gridBottom;
        expect(insideGrid).toBe(false);
      }
    }
    const verticalXs = new Set(CUT_MARKS.filter(m => m.x1 === m.x2).map(m => m.x1.toFixed(2)));
    const columnEdges = SHEET_SLOTS.slice(0, 3).flatMap(s => [s.x, s.x + s.width]);
    expect([...verticalXs].sort()).toEqual(columnEdges.map(x => x.toFixed(2)).sort());
  });
});
