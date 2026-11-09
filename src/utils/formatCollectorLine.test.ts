import { describe, expect, it } from 'vitest';

import formatCollectorLine from './formatCollectorLine';

describe('formatCollectorLine', () => {
  it('prints the rarity letter, then the number padded to four digits', () => {
    expect(formatCollectorLine(5, 'U')).toBe('U 0005');
    expect(formatCollectorLine(272, 'L')).toBe('L 0272');
    expect(formatCollectorLine(12345, 'R')).toBe('R 12345');
  });

  it('falls back to 0000 for a missing or invalid number', () => {
    expect(formatCollectorLine(Number.NaN, 'C')).toBe('C 0000');
    expect(formatCollectorLine(-3, 'C')).toBe('C 0000');
  });
});
