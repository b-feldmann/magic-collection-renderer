import { describe, expect, it } from 'vitest';

import {
  getAbilityBands,
  getDefaultDividers,
  getIconCenters,
  layoutAbilities,
  PLANESWALKER_MAX_FONT_SIZE,
} from './planeswalkerGeometry';

describe('planeswalker ability layout', () => {
  it('keeps the template dividers when every ability fits its band', () => {
    // Professor Dellian Fel at full size: 1, 1, 1 and 3 lines.
    const layout = layoutAbilities([1, 1, 1, 3], PLANESWALKER_MAX_FONT_SIZE, true);
    expect(layout.fits).toBe(true);
    expect(layout.dividers).toEqual(getDefaultDividers(4, true));
  });

  it('centers each ability in its band', () => {
    const layout = layoutAbilities([1, 1, 1, 3], PLANESWALKER_MAX_FONT_SIZE, true);
    const bands = getAbilityBands(layout.dividers, true);
    // Text tops move down band by band, in order.
    layout.textTops.forEach((top, i) => {
      expect(top).toBeGreaterThan(bands[i].top);
      expect(top).toBeLessThan(bands[i].top + bands[i].height);
    });
  });

  it('centers a single-line ability on its loyalty icon, not its band', () => {
    // Professor Dellian Fel: the 0 ability sits level with its icon, below the band center.
    const size = PLANESWALKER_MAX_FONT_SIZE;
    const layout = layoutAbilities([1, 1, 1, 3], size, true);
    const [band] = getAbilityBands(layout.dividers, true).slice(1, 2);
    const capCenter = layout.textTops[1] + (0.125 + 0.68 / 2) * size;
    expect(capCenter).toBeCloseTo(getIconCenters(4, true)[1], 5);
    expect(capCenter).toBeGreaterThan(band.top + band.height / 2);
  });

  it('grows a band into a neighbour that holds a single line', () => {
    // Chandra, Torch of Defiance: a 3-line ability above a 1-line one.
    const layout = layoutAbilities([3, 1, 2, 3], 60.18, true);
    expect(layout.fits).toBe(true);
    expect(layout.dividers[0]).toBeGreaterThan(getDefaultDividers(4, true)[0]);
  });

  it('does not take room from a band with more than one line', () => {
    // Ral Zarek at 55.96px: its 3-line -2 would need room from 2- or 3-line neighbours.
    expect(layoutAbilities([1, 2, 3, 3], 55.96, true).fits).toBe(false);
    expect(layoutAbilities([1, 2, 2, 3], 53.85, true).fits).toBe(true);
  });

  it('reports that the abilities do not fit when there is no room left', () => {
    expect(layoutAbilities([6, 6, 6, 6], PLANESWALKER_MAX_FONT_SIZE, true).fits).toBe(false);
  });

  it('starts the bands light and alternates them', () => {
    const bands = getAbilityBands(getDefaultDividers(3, false), false);
    expect(bands.map(band => band.light)).toEqual([true, false, true]);
  });
});
