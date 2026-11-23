import { describe, expect, it } from 'vitest';

import { CHAPTER_ICON_HEIGHT, getSagaArea, layoutSaga, SagaAbility } from './sagaGeometry';

const area = getSagaArea(false);

const ability = (textHeight: number, chapterCount = 1): SagaAbility => ({
  textHeight,
  chapterCount,
});

describe('layoutSaga', () => {
  it('starts at the top of the column and gives longer abilities more room', () => {
    const { abilities, fits } = layoutSaga([ability(300), ability(60), ability(240)], area);
    const [first, second, third] = abilities.map(({ dividerTop }) => dividerTop);

    expect(fits).toBe(true);
    expect(first).toBe(area.top);
    expect(second - first).toBeGreaterThan(third - second);
    // The same space around every ability's text.
    expect(second - first - 300).toBeCloseTo(third - second - 60);
  });

  it('keeps every text inside its row', () => {
    const texts = [300, 60, 240];
    const { abilities } = layoutSaga(
      texts.map(text => ability(text)),
      area,
    );

    abilities.forEach(({ dividerTop, textTop }, i) => {
      expect(textTop).toBeGreaterThan(dividerTop);
      expect(textTop + texts[i]).toBeLessThan(abilities[i + 1]?.dividerTop ?? area.bottom);
    });
  });

  it('makes room for the numbers of an ability shared by several chapters', () => {
    const { abilities } = layoutSaga([ability(60, 4), ability(400)], area);
    const [first, second] = abilities;

    expect(first.iconTops).toHaveLength(4);
    expect(second.dividerTop).toBeGreaterThanOrEqual(first.iconTops[3] + CHAPTER_ICON_HEIGHT - 10);
    first.iconTops.slice(1).forEach((top, i) => {
      expect(top - first.iconTops[i]).toBeGreaterThanOrEqual(CHAPTER_ICON_HEIGHT);
    });
  });

  it('lays out an ability without chapters like the others, without numbers', () => {
    const { abilities, fits } = layoutSaga([ability(560, 0), ability(380, 3)], area);

    expect(fits).toBe(true);
    expect(abilities[0].iconTops).toEqual([]);
    expect(abilities[1].iconTops).toHaveLength(3);
    expect(abilities[1].dividerTop).toBeGreaterThan(abilities[0].textTop + 560);
  });

  it('does not fit when the texts are taller than the column', () => {
    const { abilities, fits } = layoutSaga([ability(700), ability(700)], area);

    expect(fits).toBe(false);
    expect(abilities[1].dividerTop).toBeLessThan(area.bottom);
  });

  it('lays out a text without chapters', () => {
    expect(layoutSaga([], area)).toEqual({ abilities: [], fits: true });
  });
});
