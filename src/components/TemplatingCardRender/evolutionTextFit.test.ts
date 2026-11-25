import { describe, expect, it } from 'vitest';

import { EvolutionSplit } from '../../interfaces/enums';
import { chooseEvolutionSplit, EVOLUTION_TEXT_SIZES, fitEvolutionText } from './evolutionTextFit';

// A box whose content only fits below `fitsBelow` px.
const box = (fitsBelow: number) => {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientHeight', { value: 100 });
  Object.defineProperty(el, 'scrollHeight', {
    get: () => (parseFloat(el.style.fontSize) < fitsBelow ? 100 : 101),
  });
  return el;
};

describe('chooseEvolutionSplit', () => {
  const { Even, TallBase, TallLevel } = EvolutionSplit;

  // Chooses for a box whose content only fits below a size that depends on the split.
  const choose = (fitsBelow: Partial<Record<EvolutionSplit, number>>) => {
    let applied: EvolutionSplit | undefined;
    const el = document.createElement('div');
    Object.defineProperty(el, 'clientHeight', { value: 100 });
    Object.defineProperty(el, 'scrollHeight', {
      get: () => (parseFloat(el.style.fontSize) < (fitsBelow[applied!] ?? 0) ? 100 : 101),
    });
    const chosen = chooseEvolutionSplit([el], split => {
      applied = split;
    });
    expect(applied).toBe(chosen);
    return chosen;
  };

  it('chooses the split with the largest text', () => {
    expect(choose({ [Even]: 60, [TallBase]: 70, [TallLevel]: 50 })).toBe(TallBase);
    expect(choose({ [Even]: 60, [TallBase]: 50, [TallLevel]: 70 })).toBe(TallLevel);
    expect(choose({ [Even]: 70, [TallBase]: 50, [TallLevel]: 60 })).toBe(Even);
  });

  it('keeps the even split when another one allows no larger text', () => {
    expect(choose({ [Even]: Infinity, [TallBase]: Infinity, [TallLevel]: Infinity })).toBe(Even);
    expect(choose({ [Even]: 60, [TallBase]: 60, [TallLevel]: 60 })).toBe(Even);
    expect(choose({})).toBe(Even);
  });

  it('prefers a split whose text fits at the smallest size', () => {
    const smallest = EVOLUTION_TEXT_SIZES[EVOLUTION_TEXT_SIZES.length - 1];
    expect(choose({ [TallLevel]: smallest + 0.01 })).toBe(TallLevel);
  });
});

describe('fitEvolutionText', () => {
  it('keeps every box at full size when all of them fit', () => {
    const boxes = [box(Infinity), box(Infinity)];
    expect(fitEvolutionText(boxes)).toBe(EVOLUTION_TEXT_SIZES[0]);
    boxes.forEach(el => expect(el.style.fontSize).toBe(`${EVOLUTION_TEXT_SIZES[0]}px`));
  });

  it('gives every box the largest printed size at which all of them fit', () => {
    const boxes = [box(Infinity), box(70), box(66)];
    const size = fitEvolutionText(boxes);
    expect(size).toBe(EVOLUTION_TEXT_SIZES.find(s => s < 66));
    boxes.forEach(el => expect(el.style.fontSize).toBe(`${size}px`));
  });

  it('uses print leading: looser at full size than once shrunk', () => {
    const [full] = [box(Infinity)];
    fitEvolutionText([full]);
    const shrunk = box(60);
    fitEvolutionText([shrunk]);
    expect(Number(full.style.lineHeight)).toBeGreaterThan(Number(shrunk.style.lineHeight));
  });
});
