import { describe, expect, it } from 'vitest';

import {
  placePrintedRules,
  PRINTED_RULES_SIZES,
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

// placePrintedRules tries the 'high' placement first and reads the overflow
// that placement causes (the stylesheet adds a spacer below the text).
const box = (shrunk: boolean, overflowsWhenHigh: boolean) => {
  const el = document.createElement('div');
  el.dataset.shrunk = String(shrunk);
  Object.defineProperty(el, 'clientHeight', { value: 600 });
  Object.defineProperty(el, 'scrollHeight', {
    get: () => (el.dataset.placement === 'high' && overflowsWhenHigh ? 610 : 600),
  });
  return el;
};

describe('placePrintedRules', () => {
  it('centers shrunk text high when it fits there', () => {
    const el = box(true, false);
    placePrintedRules(el);
    expect(el.dataset.placement).toBe('high');
  });

  it('centers longer shrunk text in the whole box', () => {
    const el = box(true, true);
    placePrintedRules(el);
    expect(el.dataset.placement).toBe('box');
  });

  it('centers text that only shrank a little in the whole box, even when it fits high', () => {
    // Mica, Reader of Ruins (SOS, 2026) at 70.7px is centered; Armus at 68.6px sits high.
    const mica = box(true, false);
    mica.style.fontSize = `${PRINTED_RULES_SIZES[3]}px`;
    placePrintedRules(mica);
    expect(mica.dataset.placement).toBe('box');

    const armus = box(true, false);
    armus.style.fontSize = `${PRINTED_RULES_SIZES[4]}px`;
    placePrintedRules(armus);
    expect(armus.dataset.placement).toBe('high');
  });

  it('leaves full-size text unplaced', () => {
    const el = box(false, false);
    el.dataset.placement = 'high';
    placePrintedRules(el);
    expect(el.dataset.placement).toBeUndefined();
  });

  it('resets the placement so fitting measures top-aligned text', () => {
    const el = box(true, false);
    placePrintedRules(el);
    resetPrintedRulesPlacement(el);
    expect(el.dataset.placement).toBeUndefined();
  });
});
