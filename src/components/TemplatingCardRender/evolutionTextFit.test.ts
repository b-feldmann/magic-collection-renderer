import { describe, expect, it } from 'vitest';

import { EVOLUTION_TEXT_SIZES, fitEvolutionText } from './evolutionTextFit';

// A box whose content only fits below `fitsBelow` px.
const box = (fitsBelow: number) => {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientHeight', { value: 100 });
  Object.defineProperty(el, 'scrollHeight', {
    get: () => (parseFloat(el.style.fontSize) < fitsBelow ? 100 : 101),
  });
  return el;
};

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
