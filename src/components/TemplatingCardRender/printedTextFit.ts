import { balancePrintedLines, resetPrintedLines } from './printedLineBreaks';

// How printed M15 rules text shrinks, measured on 2026 prints (TRK, SOS) in
// the 1500x2100 design space.

const FULL_SIZE = 76;
// One 0.25pt step. Shrunk text only lands on this grid, half a step off the
// full size: Armus 68.6, Dawning Archaic 66.5, Brad Boimler 64.4,
// Holo-Engineer 62.3.
const STEP = 2.11;

/** The font sizes printed rules text may shrink to (full size first). */
export const PRINTED_RULES_SIZES: number[] = [
  FULL_SIZE,
  ...Array.from({ length: 18 }, (_, n) => Math.round((FULL_SIZE - STEP * (n + 0.5)) * 100) / 100),
];

/**
 * The font sizes for the two half-width boxes of a Prepared frame (largest
 * first). They sit on whole 0.25pt steps: on Emeritus of Truce (SOS, 2026) the
 * spell text is 7pt (59.1px) although its box would hold more, and the
 * creature's text had to shrink to 6.25pt (52.8px).
 */
export const PRINTED_HALF_BOX_SIZES: number[] = Array.from(
  { length: 11 },
  (_, n) => Math.round((FULL_SIZE - STEP * (n + 8)) * 100) / 100,
);

// The lowest ink of the last line, descenders included, stays this far above
// the bottom of the rules box (1917px). Print keeps flavour text clear of the
// bottom: Brad Boimler (no descender on its last line) fits with its ink 19px
// above it, while Armus at the next size up (70.7) would end ≈13px above it
// (≈14.7px in our render) and was printed a step smaller.
const FLAVOUR_INK_BOTTOM_INSET = 16;
// Rules text may run much closer to it: Captain Benjamin Sisko is printed at
// 66.5px with "mana costs." ending ≈8px above it (≈5px in our render, whose
// last line box then reaches past the box).
const RULES_INK_BOTTOM_INSET = 2;

/**
 * Undoes `placePrintedRules`, so fitting measures top-aligned shrunk text.
 */
export const resetPrintedRulesPlacement = (el: HTMLDivElement) => {
  delete el.dataset.placement;
};

/**
 * Positions fitted shrunk rules text like print (2026 TRK/SOS): centered high
 * in the box (y≈1607) when it fits there, otherwise centered in the whole box
 * like full-size text (Brad Boimler), and top-aligned when it doesn't even fit
 * that (Captain Benjamin Sisko). The CSS for each placement is keyed on
 * `data-placement`.
 */
export const placePrintedRules = (el: HTMLDivElement) => {
  if (el.dataset.shrunk !== 'true') {
    delete el.dataset.placement;
    return;
  }
  el.dataset.placement = 'high';
  if (el.scrollHeight > el.clientHeight) el.dataset.placement = 'box';
};

/** TextResize `beforeFit` for printed rules text: measure unbalanced, top-aligned text. */
export const beforePrintedRulesFit = (el: HTMLDivElement) => {
  resetPrintedLines(el);
  resetPrintedRulesPlacement(el);
};

/**
 * TextResize `afterFit` for printed rules text: re-break the lines like print
 * (keeping their count, so the fitted size still holds), then place the text.
 */
export const afterPrintedRulesFit = (el: HTMLDivElement) => {
  balancePrintedLines(el);
  placePrintedRules(el);
};

let measureContext: CanvasRenderingContext2D | null | undefined;

const getMeasureContext = () => {
  if (measureContext === undefined) {
    // jsdom has no canvas; skip the ink check there.
    const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
    measureContext = isJsdom ? null : document.createElement('canvas').getContext('2d');
  }
  return measureContext;
};

const lastTextNode = (el: HTMLElement) => {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let last: Text | null = null;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.textContent?.trim()) last = node as Text;
  }
  return last;
};

/**
 * Collects the characters of the last rendered line (across text nodes) by
 * walking backwards from the end until a character sits on an earlier line.
 */
const lastLineText = (el: HTMLElement, lastRect: DOMRect) => {
  // Line boxes overlap at this leading, so compare tops, with a tolerance
  // that scales with the (possibly zoomed) line.
  const earlierLine = lastRect.top - lastRect.height / 3;
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node as Text);

  const range = document.createRange();
  let text = '';
  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    const content = nodes[i].textContent ?? '';
    for (let c = content.length - 1; c >= 0; c -= 1) {
      if (content[c].trim()) {
        range.setStart(nodes[i], c);
        range.setEnd(nodes[i], c + 1);
        const rect = range.getClientRects()[0];
        if (rect && rect.top < earlierLine) return text;
      }
      text = content[c] + text;
    }
  }
  return text;
};

/**
 * TextResize `boxFits` check for printed rules text. Full-size text has to fit
 * the box. Shrunk text only has to fit its width: its height is limited by the
 * ink check (`printedRulesInkFits`), since the last line box of tightly set
 * rules text may reach past the box while its ink stays inside.
 */
export const printedRulesBoxFits = (el: HTMLDivElement): boolean =>
  el.scrollWidth <= el.clientWidth &&
  (el.dataset.shrunk === 'true' || el.scrollHeight <= el.clientHeight);

/**
 * TextResize `fits` check for printed rules text: once the text has to shrink,
 * the last line's ink, descenders included, must stay above the box bottom by
 * FLAVOUR_INK_BOTTOM_INSET when it is flavour text, by RULES_INK_BOTTOM_INSET
 * otherwise. Full-size text only has to fit the box (Assault Drone's centered
 * "—The Borg" reaches as low as Armus would have).
 */
export const printedRulesInkFits = (el: HTMLDivElement): boolean => {
  if (el.dataset.shrunk !== 'true') return true;
  const ctx = getMeasureContext();
  if (!ctx) return true;

  const last = lastTextNode(el);
  if (!last) return true;
  const range = document.createRange();
  range.selectNodeContents(last);
  const rects = range.getClientRects();
  if (!rects.length) return true;
  const lastRect = rects[rects.length - 1];

  const box = el.getBoundingClientRect();
  // Rects are in (zoomed) viewport px, font metrics in CSS px.
  const scale = el.offsetHeight ? box.height / el.offsetHeight : 1;
  if (!scale) return true;

  const style = getComputedStyle(last.parentElement ?? el);
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const metrics = ctx.measureText(lastLineText(el, lastRect) || last.textContent || '');

  const baseline = (lastRect.bottom - box.top) / scale - metrics.fontBoundingBoxDescent;
  const inkBottom = baseline + Math.max(0, metrics.actualBoundingBoxDescent);
  const inset = last.parentElement?.closest('[data-flavour]')
    ? FLAVOUR_INK_BOTTOM_INSET
    : RULES_INK_BOTTOM_INSET;
  return inkBottom <= el.clientHeight - inset;
};
