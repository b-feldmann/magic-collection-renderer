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
// The first line's ink, mana symbols included, starts at least this far below
// the top of the text area (the light box starts there, under a 7px inner
// shadow). Print leaves about as much: Captain Benjamin Sisko's caps (66.5px,
// first baseline 1372) start ≈6px below it.
const INK_TOP_INSET = 4;

/**
 * Undoes `placePrintedRules`, so fitting measures top-aligned shrunk text.
 */
export const resetPrintedRulesPlacement = (el: HTMLDivElement) => {
  delete el.dataset.placement;
};

/**
 * Positions fitted shrunk rules text: centered in the whole box like
 * full-size text (Brad Boimler, Mica), and top-aligned when it doesn't fit
 * that (Captain Benjamin Sisko). The CSS is keyed on `data-placement`, which
 * is only set after fitting so the fit measures top-aligned text.
 */
export const placePrintedRules = (el: HTMLDivElement) => {
  if (el.dataset.shrunk !== 'true') {
    delete el.dataset.placement;
    return;
  }
  el.dataset.placement = 'center';
};

/** Undoes `lowerPrintedRulesTop`. */
export const resetPrintedRulesTop = (el: HTMLDivElement) => {
  el.style.paddingTop = '';
};

/** TextResize `beforeFit` for printed rules text: measure unbalanced, top-aligned text. */
export const beforePrintedRulesFit = (el: HTMLDivElement) => {
  resetPrintedLines(el);
  resetPrintedRulesPlacement(el);
  resetPrintedRulesTop(el);
};

/**
 * TextResize `afterFit` for printed rules text: re-break the lines like print
 * (keeping their count, so the fitted size still holds), then place the text.
 */
export const afterPrintedRulesFit = (el: HTMLDivElement) => {
  balancePrintedLines(el);
  // The last size tried while fitting may not be the final one, and centered
  // text may already sit low enough: lower the text where it ends up.
  resetPrintedRulesTop(el);
  placePrintedRules(el);
  // Centered text moves down by only half the added padding.
  for (let i = 0; i < 4 && lowerPrintedRulesTop(el); i += 1);
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
 * The highest ink of the first line, in viewport px: the glyphs (measured per
 * character, so italic reminder text and brackets count with their own font)
 * and inline symbols such as mana costs, which rise above the cap height.
 * Returns null when there is nothing to measure.
 */
const firstLineInkTop = (el: HTMLElement, ctx: CanvasRenderingContext2D, scale: number) => {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let lineTop: number | null = null;
  let lineHeight = 0;
  let inkTop = Infinity;

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const content = node.textContent ?? '';
    const parent = node.parentElement ?? el;
    let font: string | null = null;
    for (let c = 0; c < content.length; c += 1) {
      if (!content[c].trim()) continue;
      range.setStart(node, c);
      range.setEnd(node, c + 1);
      const rect = range.getClientRects()[0];
      if (!rect) continue;
      if (lineTop === null) {
        lineTop = rect.top;
        lineHeight = rect.height;
      } else if (rect.top > lineTop + lineHeight / 3) {
        node = null;
        break;
      }
      if (font === null) {
        const style = getComputedStyle(parent);
        font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        ctx.font = font;
      }
      const metrics = ctx.measureText(content[c]);
      const baseline = rect.top + metrics.fontBoundingBoxAscent * scale;
      inkTop = Math.min(inkTop, baseline - metrics.actualBoundingBoxAscent * scale);
    }
    if (!node) break;
  }
  if (lineTop === null) return null;

  // Symbols are empty elements (icon fonts), so they have no text to walk.
  const firstLineBottom = lineTop + lineHeight;
  el.querySelectorAll('i').forEach(icon => {
    const rect = icon.getBoundingClientRect();
    if (rect.height && rect.top < firstLineBottom - lineHeight / 3) {
      inkTop = Math.min(inkTop, rect.top);
    }
  });
  return inkTop;
};

/**
 * Shrunk text starts at a fixed first baseline (see the stylesheet), measured
 * on 62–68px prints. Text that only shrank a step or two is taller above its
 * baseline, and inline mana symbols rise higher still: "[In]voluntary Organ
 * Donation" at 74.9px put its {1}{W} 3.5px into the frame above the box. This
 * moves such text down until its first line's ink starts INK_TOP_INSET inside
 * the text area (the box's parent). The bottom ink check then decides whether
 * it still fits at that size.
 */
const lowerPrintedRulesTop = (el: HTMLDivElement): boolean => {
  if (el.dataset.shrunk !== 'true') return false;
  const ctx = getMeasureContext();
  const area = el.parentElement;
  if (!ctx || !area) return false;

  const box = el.getBoundingClientRect();
  const scale = el.offsetHeight ? box.height / el.offsetHeight : 1;
  if (!scale) return false;
  const inkTop = firstLineInkTop(el, ctx, scale);
  if (inkTop === null) return false;

  const overlap = (area.getBoundingClientRect().top - inkTop) / scale + INK_TOP_INSET;
  if (overlap <= 0.5) return false;
  const padding = parseFloat(getComputedStyle(el).paddingTop) || 0;
  el.style.paddingTop = `${padding + Math.ceil(overlap)}px`;
  return true;
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
  resetPrintedRulesTop(el);
  if (el.dataset.shrunk !== 'true') return true;
  const ctx = getMeasureContext();
  if (!ctx) return true;
  lowerPrintedRulesTop(el);

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
