import { describe, expect, it } from 'vitest';

import { LineSegment, balancedBreaks, balancedMeasure, greedyBreaks } from './printedLineBreaks';

// Builds a segment from word widths, set with 10px spaces from x = 0.
const segment = (words: number[]): LineSegment => {
  const spaces: LineSegment['spaces'] = [];
  let x = 0;
  words.forEach((width, i) => {
    x += width;
    if (i < words.length - 1) {
      spaces.push({ before: x, after: x + 10 });
      x += 10;
    }
  });
  return { end: x, spaces };
};

// Greedy at 100px: [30 30 20] (100) / [60] (60) / [50 10] (70): the full first
// line leaves a 40px gap on the second (cost 0 + 1600). Moving "20" down gives
// [30 30] (70) / [20 60] (90) / [50 10]: cost 900 + 100. Like Grapple with
// Death's "…watched Professor / Fel in action…".
const RAGGED = segment([30, 30, 20, 60, 50, 10]);

// Greedy at 100px: [40 50] (100) / [30]: nothing to even out (the last line
// doesn't count), like Holo-Engineer's "…that the final / product…".
const FULL = segment([40, 50, 30]);

describe('greedyBreaks', () => {
  it('fills each line as far as it goes', () => {
    expect(greedyBreaks(RAGGED, 100)).toEqual([3, 4, 6]);
  });

  it('gives up on a word wider than the measure', () => {
    expect(greedyBreaks(segment([40, 120]), 100)).toBeNull();
  });
});

describe('balancedBreaks', () => {
  it('evens out the right edge over the whole paragraph', () => {
    expect(balancedBreaks(RAGGED, 100, 3)).toEqual([2, 4, 6]);
  });

  it('keeps greedy breaks that are already the evenest', () => {
    expect(balancedBreaks(FULL, 100, 2)).toEqual([2, 3]);
  });

  it('uses exactly the given number of lines', () => {
    expect(balancedBreaks(RAGGED, 100, 4)).toHaveLength(4);
    expect(balancedBreaks(RAGGED, 100, 2)).toBeNull();
  });
});

describe('balancedMeasure', () => {
  it('narrows the measure so greedy breaking lands on the balanced breaks', () => {
    const measure = balancedMeasure([RAGGED], 100)!;
    expect(measure).toBeLessThan(100);
    expect(greedyBreaks(RAGGED, measure)).toEqual([2, 4, 6]);
  });

  it('leaves text alone when greedy breaking is already balanced', () => {
    expect(balancedMeasure([FULL], 100)).toBeNull();
  });

  it('balances each part of a paragraph split by a forced break with one measure', () => {
    const measure = balancedMeasure([RAGGED, segment([40])], 100)!;
    expect(greedyBreaks(RAGGED, measure)).toEqual([2, 4, 6]);
  });

  it('gives up when the last line is too wide for the narrower measure', () => {
    // Balanced: [30 30] / [20 60] / [50 40]: the 100px last line would need
    // the full measure, which greedily refills the first line.
    expect(balancedMeasure([segment([30, 30, 20, 60, 50, 40])], 100)).toBeNull();
  });
});
