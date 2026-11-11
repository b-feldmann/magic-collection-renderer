import { describe, expect, it } from 'vitest';

import {
  beforePrintedRulesFit,
  printedRulesInkFits,
  placePrintedRules,
  printedRulesBoxFits,
  resetPrintedRulesPlacement,
} from './printedTextFit';

const overflowingBox = (shrunk: boolean, { tall = false, wide = false } = {}) => {
  const el = document.createElement('div');
  el.dataset.shrunk = String(shrunk);
  Object.defineProperty(el, 'clientHeight', { value: 600 });
  Object.defineProperty(el, 'clientWidth', { value: 1200 });
  Object.defineProperty(el, 'scrollHeight', { value: tall ? 605 : 600 });
  Object.defineProperty(el, 'scrollWidth', { value: wide ? 1210 : 1200 });
  return el;
};

describe('printedRulesBoxFits', () => {
  it('requires full-size text to fit the box', () => {
    expect(printedRulesBoxFits(overflowingBox(false))).toBe(true);
    expect(printedRulesBoxFits(overflowingBox(false, { tall: true }))).toBe(false);
  });

  it("leaves shrunk text's height to the ink check, but not its width", () => {
    expect(printedRulesBoxFits(overflowingBox(true, { tall: true }))).toBe(true);
    expect(printedRulesBoxFits(overflowingBox(true, { wide: true }))).toBe(false);
  });
});

const box = (shrunk: boolean) => {
  const el = document.createElement('div');
  el.dataset.shrunk = String(shrunk);
  return el;
};

describe('placePrintedRules', () => {
  it.each([62.3, 68.61, 70.72])('centers shrunk text at %spx in the whole box', size => {
    const el = box(true);
    el.style.fontSize = `${size}px`;
    placePrintedRules(el);
    expect(el.dataset.placement).toBe('center');
  });

  it('leaves full-size text unplaced', () => {
    const el = box(false);
    el.dataset.placement = 'center';
    placePrintedRules(el);
    expect(el.dataset.placement).toBeUndefined();
  });

  it('resets the placement so fitting measures top-aligned text', () => {
    const el = box(true);
    placePrintedRules(el);
    resetPrintedRulesPlacement(el);
    expect(el.dataset.placement).toBeUndefined();
  });
});

describe('first line lowering', () => {
  it('drops the padding left over from earlier fit attempts', () => {
    const el = box(true);
    el.style.paddingTop = '9px';
    beforePrintedRulesFit(el);
    expect(el.style.paddingTop).toBe('');

    el.style.paddingTop = '9px';
    printedRulesInkFits(el);
    expect(el.style.paddingTop).toBe('');
  });
});
