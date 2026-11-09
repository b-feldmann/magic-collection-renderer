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

// The lowest ink of the last line, descenders included, stays this far above
// the bottom of the rules box: Brad Boimler (no descender on its last line)
// fits with its ink 19px above it, while Armus at the next size up would end
// 8px above it and was printed a step smaller.
const INK_BOTTOM_INSET = 14;

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
 * TextResize `fits` check for printed rules text: once the text has to shrink,
 * the last line's ink, descenders included, must stay INK_BOTTOM_INSET above
 * the box bottom. Full-size text only has to fit the box (Assault Drone's
 * centered "—The Borg" reaches as low as Armus would have).
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
  return inkBottom <= el.clientHeight - INK_BOTTOM_INSET;
};
