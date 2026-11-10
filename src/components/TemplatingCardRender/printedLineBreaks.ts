// Printed rules and flavour text is set with a paragraph composer (InDesign's),
// not line by line: it picks the breaks that leave the least ragged right edge
// over the whole paragraph. On 2026 prints Grapple with Death breaks
// "…watched Professor / Fel in action…" although "Fel" would fit on the first
// line, and Captain Benjamin Sisko "…create / a 1/1 red Officer…". Where
// greedy breaking already gives the evenest edge, print keeps it, however
// uneven the lines are (Holo-Engineer's "…that the final / product…").
//
// The model: a Knuth-Plass style search that minimizes the squared space left
// at the end of every line except the last one of a paragraph (or of a part
// before a forced break), keeping the number of lines greedy breaking gives, so
// the text's size and height stay what fitting chose.

/** One unbroken run of text (a paragraph, or its part before a forced break). */
export interface LineSegment {
  /**
   * Where the segment ends if set on one line. All positions are measured from
   * the left edge of the content box, so a first line pulled out by a hanging
   * indent starts at a negative position and every later line starts at 0.
   */
  end: number;
  /** Break opportunities (spaces): where the text before and after them ends and starts. */
  spaces: { before: number; after: number }[];
}

const EPSILON = 0.5;

// Break points: 0 is the segment start, 1..n the spaces, n + 1 the segment end.
const lineEnd = (segment: LineSegment, from: number, to: number) => {
  const end = to > segment.spaces.length ? segment.end : segment.spaces[to - 1].before;
  // The first line keeps its indent (its positions are already absolute);
  // later lines move to the left edge.
  const start = from === 0 ? 0 : segment.spaces[from - 1].after;
  return end - start;
};

/** Greedy breaks (what the browser does) for a measure; null if a word overflows it. */
export const greedyBreaks = (segment: LineSegment, width: number): number[] | null => {
  const last = segment.spaces.length + 1;
  const breaks: number[] = [];
  let from = 0;
  while (from < last) {
    let to = from + 1;
    if (lineEnd(segment, from, to) > width + EPSILON) return null;
    while (to < last && lineEnd(segment, from, to + 1) <= width + EPSILON) to += 1;
    breaks.push(to);
    from = to;
  }
  return breaks;
};

/**
 * The breaks with the least squared shortfall (all lines but the last), using
 * exactly `lines` lines. Returns the break point ending each line.
 */
export const balancedBreaks = (
  segment: LineSegment,
  width: number,
  lines: number,
): number[] | null => {
  const last = segment.spaces.length + 1;
  // cost[k][b]: least cost of k lines ending at break b.
  const cost: number[][] = Array.from({ length: lines + 1 }, () => Array(last + 1).fill(Infinity));
  const prev: number[][] = Array.from({ length: lines + 1 }, () => Array(last + 1).fill(-1));
  cost[0][0] = 0;
  for (let k = 1; k <= lines; k += 1) {
    for (let to = 1; to <= last; to += 1) {
      for (let from = to - 1; from >= 0; from -= 1) {
        const used = lineEnd(segment, from, to);
        if (used > width + EPSILON) break;
        if (cost[k - 1][from] === Infinity) continue;
        const shortfall = to === last ? 0 : width - used;
        const total = cost[k - 1][from] + shortfall * shortfall;
        if (total < cost[k][to]) {
          cost[k][to] = total;
          prev[k][to] = from;
        }
      }
    }
  }
  if (cost[lines][last] === Infinity) return null;
  const breaks: number[] = [];
  for (let k = lines, to = last; k > 0; k -= 1) {
    breaks.unshift(to);
    to = prev[k][to];
  }
  return breaks;
};

const sameBreaks = (a: number[] | null, b: number[] | null) =>
  !!a && !!b && a.length === b.length && a.every((value, i) => value === b[i]);

const widestLine = (segment: LineSegment, breaks: number[]) =>
  breaks.reduce(
    (widest, to, i) => Math.max(widest, lineEnd(segment, i ? breaks[i - 1] : 0, to)),
    0,
  );

/**
 * The narrower measure that makes greedy breaking produce the balanced breaks
 * of every segment, or null when the greedy breaks are already balanced (or no
 * single measure reproduces the balanced ones).
 */
export const balancedMeasure = (segments: LineSegment[], width: number): number | null => {
  const greedy = segments.map(segment => greedyBreaks(segment, width));
  if (greedy.some(breaks => !breaks)) return null;
  const balanced = segments.map((segment, i) => balancedBreaks(segment, width, greedy[i]!.length));
  if (balanced.some(breaks => !breaks)) return null;
  if (balanced.every((breaks, i) => sameBreaks(breaks, greedy[i]))) return null;

  const measure =
    Math.max(...segments.map((segment, i) => widestLine(segment, balanced[i]!))) + EPSILON;
  const reproduced = segments.every((segment, i) =>
    sameBreaks(greedyBreaks(segment, measure), balanced[i]),
  );
  return reproduced ? measure : null;
};

// --- DOM measuring --------------------------------------------------------

const textNodes = (el: HTMLElement) => {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node as Text);
  return nodes;
};

/**
 * Lays the paragraph out on unbroken lines (forced breaks still break) and
 * reads its segments in CSS px from the content box's left edge.
 */
const measureSegments = (p: HTMLElement, scale: number): LineSegment[] | null => {
  const style = getComputedStyle(p);
  const contentLeft =
    p.getBoundingClientRect().left +
    (parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft)) * scale;
  const toX = (viewportX: number) => (viewportX - contentLeft) / scale;

  const range = document.createRange();
  range.selectNodeContents(p);
  // One entry per line: its top and right edge.
  const lines: { top: number; right: number }[] = [];
  for (const rect of Array.from(range.getClientRects())) {
    if (!rect.width) continue;
    const line = lines.find(l => Math.abs(l.top - rect.top) < rect.height / 2);
    if (line) line.right = Math.max(line.right, rect.right);
    else lines.push({ top: rect.top, right: rect.right });
  }
  if (!lines.length) return null;
  lines.sort((a, b) => a.top - b.top);

  const segments: LineSegment[] = lines.map(line => ({ end: toX(line.right), spaces: [] }));
  for (const node of textNodes(p)) {
    const text = node.textContent ?? '';
    for (let i = 0; i < text.length; i += 1) {
      if (text[i] !== ' ') continue;
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const rect = range.getBoundingClientRect();
      if (!rect.width) continue; // collapsed
      const index = lines.findIndex(l => Math.abs(l.top - rect.top) < rect.height);
      if (index < 0) return null;
      segments[index].spaces.push({ before: toX(rect.left), after: toX(rect.right) });
    }
  }
  segments.forEach(segment => segment.spaces.sort((a, b) => a.before - b.before));
  return segments;
};

const BALANCED = 'data-balanced';

/** Undoes `balancePrintedLines` (the paragraphs get their full measure back). */
export const resetPrintedLines = (el: HTMLElement) => {
  el.querySelectorAll<HTMLElement>(`[${BALANCED}]`).forEach(p => {
    p.style.paddingRight = '';
    p.removeAttribute(BALANCED);
  });
};

/**
 * Re-breaks every paragraph (and the flavour text) of the fitted rules text
 * like print's paragraph composer. Each paragraph keeps its line count; the
 * balanced breaks are applied by narrowing it with an inline right padding, so
 * the React-managed text nodes stay untouched.
 */
export const balancePrintedLines = (el: HTMLElement) => {
  const box = el.getBoundingClientRect();
  const scale = el.offsetHeight ? box.height / el.offsetHeight : 1;
  if (!scale) return;

  el.querySelectorAll<HTMLElement>('p, [data-flavour]').forEach(p => {
    const style = getComputedStyle(p);
    const paddingRight = parseFloat(style.paddingRight) || 0;
    const width = p.clientWidth - (parseFloat(style.paddingLeft) || 0) - paddingRight;
    const heightBefore = p.offsetHeight;
    if (width <= 0 || !heightBefore) return;

    p.style.whiteSpace = 'nowrap';
    const segments = measureSegments(p, scale);
    p.style.whiteSpace = '';
    if (!segments) return;

    const measure = balancedMeasure(segments, width);
    if (measure === null) return;
    p.setAttribute(BALANCED, '');
    p.style.paddingRight = `${paddingRight + width - measure}px`;
    // The model missed something (e.g. a break opportunity it doesn't know):
    // keep the browser's breaks.
    if (p.offsetHeight !== heightBefore) {
      p.style.paddingRight = '';
      p.removeAttribute(BALANCED);
    }
  });
};
