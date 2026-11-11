// Cards are scaled with CSS `zoom` (sharp edges and text at every size), which
// lays them out at their displayed size. Glyph advances round differently at
// small sizes, so a line that only just fits in the 1500px design can wrap one
// word earlier in a 200px grid cell than in the modal, and a text that only
// just fits a size step can end up a step smaller. To make every size show the
// same text, text is fitted with the card laid out at its design size (zoom 1,
// as `npm run render:card` captures it). The line breaks found there are then
// pinned at the displayed size: each paragraph gets the measure (via an inline
// right padding, or a negative right margin to widen it) at which the browser
// breaks it exactly there. The React-managed text nodes stay untouched.

/** Marks the element that carries a card's `zoom`. */
export const CARD_ZOOM_ATTRIBUTE = 'data-card-zoom';

/** The text blocks whose lines are pinned by default: paragraphs and the flavour text. */
export const TEXT_BLOCKS = 'p, [data-flavour]';

const PINNED = 'data-pinned-lines';
const PINNED_PADDING = 'data-pinned-padding';
const PINNED_MARGIN = 'data-pinned-margin';

// Break opportunities: collapsible spaces (incl. the thin spaces of a printed
// ellipsis; not no-break spaces), and dashes the browser may break after.
const SPACE = /[ \t\n\r\u2009]/;
const BREAK_AFTER = /[-\u2010\u2013\u2014]/;

type AtomKind = 'ink' | 'space' | 'break';

/** One character, inline symbol (`<i>`, an icon font glyph) or forced break of a block. */
interface Atom {
  kind: AtomKind;
  node: Node;
  /** Character offset in a text node; -1 for elements. */
  offset: number;
  breakAfter: boolean;
}

/** An atom's horizontal extent in CSS px from the block's content box left edge. */
export interface AtomBox {
  kind: AtomKind;
  breakAfter: boolean;
  /** Null when the atom renders nothing (e.g. a collapsed space). */
  left: number | null;
  right: number | null;
}

/** One pinned line: how wide its ink is, and how wide it gets with the next unbreakable unit. */
export interface PinnedLine {
  width: number;
  /** Null for a segment's last line (nothing follows it on the same segment). */
  next: number | null;
}

const collectAtoms = (block: HTMLElement): Atom[] => {
  const atoms: Atom[] = [];
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      for (let i = 0; i < text.length; i += 1) {
        atoms.push({
          kind: SPACE.test(text[i]) ? 'space' : 'ink',
          node,
          offset: i,
          breakAfter: BREAK_AFTER.test(text[i]),
        });
      }
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === 'BR') {
      atoms.push({ kind: 'break', node, offset: -1, breakAfter: false });
      return;
    }
    if (node.tagName === 'I') {
      atoms.push({ kind: 'ink', node, offset: -1, breakAfter: false });
      return;
    }
    node.childNodes.forEach(visit);
  };
  block.childNodes.forEach(visit);
  return atoms;
};

const atomRect = (atom: Atom, range: Range): DOMRect | null => {
  if (atom.kind === 'break') return null;
  if (atom.offset < 0) {
    const rect = (atom.node as HTMLElement).getBoundingClientRect();
    return rect.width || rect.height ? rect : null;
  }
  // Without layout (jsdom) there is nothing to measure, so nothing gets pinned.
  if (typeof range.getClientRects !== 'function') return null;
  range.setStart(atom.node, atom.offset);
  range.setEnd(atom.node, atom.offset + 1);
  const rect = range.getClientRects()[0];
  return rect && (rect.width || rect.height) ? rect : null;
};

/**
 * Viewport px per CSS px of the card: its zoom times any transform around it
 * (e.g. a modal's opening animation). The card's 1500px frame has an exact
 * integer layout width, so the ratio carries no rounding error.
 */
const cardScale = (card: HTMLElement) => {
  const frame = (card.firstElementChild as HTMLElement | null) ?? card;
  return frame.offsetWidth ? frame.getBoundingClientRect().width / frame.offsetWidth : 1;
};

/**
 * Indices of the ink atoms that start a new line (the block's first line
 * excluded), read from the wrapped layout.
 */
const readLineStarts = (atoms: Atom[], range: Range): number[] => {
  const starts: number[] = [];
  let lineMiddle: number | null = null;
  let tolerance = 0;
  atoms.forEach((atom, i) => {
    if (atom.kind !== 'ink') return;
    const rect = atomRect(atom, range);
    if (!rect) return;
    const middle = (rect.top + rect.bottom) / 2;
    if (lineMiddle === null) {
      lineMiddle = middle;
      tolerance = rect.height / 2;
    } else if (middle > lineMiddle + tolerance) {
      starts.push(i);
      lineMiddle = middle;
      tolerance = rect.height / 2;
    }
  });
  return starts;
};

/**
 * The lines the reference breaks make out of a block laid out unbroken (each
 * forced break starts a new segment at x = 0; a first line keeps its indent).
 */
export const pinnedLines = (boxes: AtomBox[], starts: number[]): PinnedLine[] => {
  const startSet = new Set(starts);
  const lines: PinnedLine[] = [];

  let segmentStart = 0;
  for (let i = 0; i <= boxes.length; i += 1) {
    if (i < boxes.length && boxes[i].kind !== 'break') continue;
    // Atoms [segmentStart, i) form one segment.
    const lineStarts = [segmentStart];
    for (let a = segmentStart; a < i; a += 1) if (startSet.has(a)) lineStarts.push(a);

    lineStarts.forEach((from, k) => {
      const to = k + 1 < lineStarts.length ? lineStarts[k + 1] : i;
      const origin = k === 0 ? 0 : (boxes[from].left ?? 0);
      let right = -Infinity;
      for (let a = from; a < to; a += 1) {
        if (boxes[a].kind === 'ink' && boxes[a].right !== null) {
          right = Math.max(right, boxes[a].right!);
        }
      }
      if (right === -Infinity) return;

      let next: number | null = null;
      if (to < i) {
        // The next unbreakable unit: up to the next space, or through a dash.
        let nextRight = right;
        for (let a = to; a < i; a += 1) {
          if (boxes[a].kind === 'space') break;
          if (boxes[a].right !== null) nextRight = Math.max(nextRight, boxes[a].right!);
          if (boxes[a].breakAfter) break;
        }
        next = nextRight - origin;
      }
      lines.push({ width: right - origin, next });
    });
    segmentStart = i + 1;
  }
  return lines;
};

/**
 * The content width at which greedy breaking keeps every line as it is: wide
 * enough for each line, narrower than any line plus its next unit. Picks the
 * middle of that range (the farthest from either edge, so sub-pixel layout
 * differences can't flip a break), or `current` when no line has a next unit.
 * Null when no width works.
 */
export const pinnedMeasure = (lines: PinnedLine[], current: number): number | null => {
  if (!lines.length) return null;
  const low = Math.max(...lines.map(line => line.width));
  const nexts = lines.flatMap(line => (line.next === null ? [] : [line.next]));
  if (!nexts.length) return Math.max(current, low + 1);
  const high = Math.min(...nexts);
  return low < high ? (low + high) / 2 : null;
};

const unpin = (block: HTMLElement) => {
  if (!block.hasAttribute(PINNED)) return;
  block.style.paddingRight = block.getAttribute(PINNED_PADDING) ?? '';
  block.style.marginRight = block.getAttribute(PINNED_MARGIN) ?? '';
  block.removeAttribute(PINNED);
  block.removeAttribute(PINNED_PADDING);
  block.removeAttribute(PINNED_MARGIN);
};

const sameStarts = (a: number[], b: number[]) =>
  a.length === b.length && a.every((value, i) => value === b[i]);

/** Pins every block's reference line starts at the current (zoomed) layout. */
const pinLines = (
  blocks: { block: HTMLElement; atoms: Atom[]; starts: number[] }[],
  scale: number,
) => {
  const range = document.createRange();

  // Read every block unbroken first, then write, so the blocks share layouts.
  blocks.forEach(({ block }) => {
    block.style.whiteSpace = 'nowrap';
  });
  const plans = blocks.map(({ block, atoms, starts }) => {
    const style = getComputedStyle(block);
    const rect = block.getBoundingClientRect();
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    const borderLeft = parseFloat(style.borderLeftWidth) || 0;
    const borderRight = parseFloat(style.borderRightWidth) || 0;
    const contentLeft = rect.left + (borderLeft + paddingLeft) * scale;
    const boxes: AtomBox[] = atoms.map(atom => {
      const atomBox = atomRect(atom, range);
      return {
        kind: atom.kind,
        breakAfter: atom.breakAfter,
        left: atomBox ? (atomBox.left - contentLeft) / scale : null,
        right: atomBox ? (atomBox.right - contentLeft) / scale : null,
      };
    });
    const borderBox = rect.width / scale;
    const content = borderBox - borderLeft - paddingLeft - paddingRight - borderRight;
    const measure = pinnedMeasure(pinnedLines(boxes, starts), content);
    return {
      measure,
      // Padding that leaves `measure` for the content (negative: widen instead).
      padding: borderBox - borderLeft - paddingLeft - borderRight - (measure ?? 0),
      marginRight: parseFloat(style.marginRight) || 0,
    };
  });
  blocks.forEach(({ block }) => {
    block.style.whiteSpace = '';
  });

  blocks.forEach(({ block }, i) => {
    const { measure, padding, marginRight } = plans[i];
    if (measure === null) return;
    block.setAttribute(PINNED, '');
    block.setAttribute(PINNED_PADDING, block.style.paddingRight);
    block.setAttribute(PINNED_MARGIN, block.style.marginRight);
    block.style.paddingRight = `${Math.max(0, padding)}px`;
    if (padding < 0) block.style.marginRight = `${marginRight + padding}px`;
  });

  // A break the model doesn't know (the browser breaking elsewhere than at a
  // space or after a dash) keeps the browser's own breaks for that block.
  blocks.forEach(({ block, atoms, starts }) => {
    if (block.hasAttribute(PINNED) && !sameStarts(readLineStarts(atoms, range), starts)) {
      unpin(block);
    }
  });
};

const TRANSFORM_PROPERTIES = ['transform', 'rotate', 'scale', 'translate'] as const;
const FLATTENED_PROPERTIES = [...TRANSFORM_PROPERTIES, 'transition'];

/**
 * Takes the transforms off the card's ancestors (e.g. RotateToMouse's tilt,
 * whose 50px perspective distorts a card laid out at 1500px far more than at
 * its displayed size), so fitting measures undistorted text. Their
 * transitions are suspended too, so the change and its undoing start none.
 * Returns the undo; nothing is painted in between.
 */
const flattenAncestors = (card: HTMLElement) => {
  const flattened: { el: HTMLElement; saved: [string, string, string][] }[] = [];
  for (let el = card.parentElement; el; el = el.parentElement) {
    const style = getComputedStyle(el);
    if (TRANSFORM_PROPERTIES.every(property => !style[property] || style[property] === 'none')) {
      continue;
    }
    flattened.push({
      el,
      saved: FLATTENED_PROPERTIES.map(property => [
        property,
        el.style.getPropertyValue(property),
        el.style.getPropertyPriority(property),
      ]),
    });
  }
  flattened.forEach(({ el }) => {
    FLATTENED_PROPERTIES.forEach(property => el.style.setProperty(property, 'none', 'important'));
  });

  return () => {
    flattened.forEach(({ el, saved }) => {
      saved.forEach(([property, value, priority]) => {
        if (property !== 'transition') el.style.setProperty(property, value, priority);
      });
    });
    // Apply the restored transforms while transitions are still off, so
    // restoring them starts no transition.
    flattened.forEach(({ el }) => {
      void getComputedStyle(el).transform;
    });
    flattened.forEach(({ el, saved }) => {
      const [, value, priority] = saved.find(([property]) => property === 'transition')!;
      el.style.setProperty('transition', value, priority);
    });
  };
};

/**
 * Runs `typeset` (fitting, balancing, placing text inside `roots`) with the
 * card laid out at its design size, then restores the card's zoom and pins
 * the line breaks of the text blocks (`blockSelector`) inside `roots`, so the
 * text reads the same at every displayed size.
 */
export const layOutAtDesignSize = (
  roots: HTMLElement[],
  typeset: () => void,
  blockSelector: string = TEXT_BLOCKS,
) => {
  const blocks = roots.flatMap(root =>
    Array.from(root.querySelectorAll<HTMLElement>(blockSelector)),
  );
  blocks.forEach(unpin);

  const card = roots[0]?.closest<HTMLElement>(`[${CARD_ZOOM_ATTRIBUTE}]`);
  if (!card) {
    typeset();
    return;
  }

  const unflatten = flattenAncestors(card);
  try {
    const zoom = card.style.zoom;
    if (!zoom || parseFloat(zoom) === 1) {
      typeset();
      return;
    }

    const range = document.createRange();
    let reference: { block: HTMLElement; atoms: Atom[]; starts: number[] }[];
    card.style.zoom = '1';
    try {
      typeset();
      reference = blocks.map(block => {
        const atoms = collectAtoms(block);
        return { block, atoms, starts: readLineStarts(atoms, range) };
      });
    } finally {
      card.style.zoom = zoom;
    }
    pinLines(reference, cardScale(card));
  } finally {
    unflatten();
  }
};

/** A TextResize `layout` that fits the text at the card's design size. */
export const fitAtDesignSize = (el: HTMLElement, typeset: () => void) =>
  layOutAtDesignSize([el], typeset);
