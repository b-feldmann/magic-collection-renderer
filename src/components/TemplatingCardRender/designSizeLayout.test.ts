import { afterEach, describe, expect, it } from 'vitest';

import {
  AtomBox,
  CARD_ZOOM_ATTRIBUTE,
  layOutAtDesignSize,
  pinnedLines,
  pinnedMeasure,
} from './designSizeLayout';

// A word of `width` px followed by a 10px space, laid out from x.
const word = (x: number, width: number): AtomBox[] => [
  { kind: 'ink', breakAfter: false, left: x, right: x + width },
  { kind: 'space', breakAfter: false, left: x + width, right: x + width + 10 },
];

// "aaaa bbbb cccc dddd": four 100px words at 0, 110, 220, 330.
const fourWords = [...word(0, 100), ...word(110, 100), ...word(220, 100), ...word(330, 100)];

describe('pinnedLines', () => {
  it('measures each line from its own start and the unit that would follow it', () => {
    // Lines "aaaa bbbb" / "cccc dddd": the second starts at atom 4 (x = 220).
    expect(pinnedLines(fourWords, [4])).toEqual([
      { width: 210, next: 320 },
      { width: 210, next: null },
    ]);
  });

  it('starts a new segment after a forced break, which needs no next unit', () => {
    const boxes: AtomBox[] = [
      ...word(0, 100),
      { kind: 'break', breakAfter: false, left: null, right: null },
      // After the break the unbroken layout restarts at x = 0.
      ...word(0, 50),
    ];
    expect(pinnedLines(boxes, [3])).toEqual([
      { width: 100, next: null },
      { width: 50, next: null },
    ]);
  });

  it('ends the next unit after a dash the browser may break after', () => {
    const boxes: AtomBox[] = [
      ...word(0, 100),
      { kind: 'ink', breakAfter: false, left: 110, right: 150 },
      { kind: 'ink', breakAfter: true, left: 150, right: 160 },
      { kind: 'ink', breakAfter: false, left: 160, right: 260 },
    ];
    expect(pinnedLines(boxes, [2])[0]).toEqual({ width: 100, next: 160 });
  });
});

describe('pinnedMeasure', () => {
  it('picks the middle of the widths that keep every break', () => {
    expect(
      pinnedMeasure(
        [
          { width: 210, next: 320 },
          { width: 200, next: 300 },
          { width: 150, next: null },
        ],
        1000,
      ),
    ).toBe(255);
  });

  it('keeps the current width when no line has a next unit', () => {
    expect(pinnedMeasure([{ width: 100, next: null }], 300)).toBe(300);
    expect(pinnedMeasure([{ width: 100, next: null }], 50)).toBe(101);
  });

  it('gives up when no width reproduces the breaks', () => {
    expect(
      pinnedMeasure(
        [
          { width: 300, next: 400 },
          { width: 100, next: 250 },
        ],
        1000,
      ),
    ).toBeNull();
  });
});

describe('layOutAtDesignSize', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const mountCard = (zoom: string) => {
    const tilt = document.createElement('div');
    tilt.style.transform = 'rotateY(5deg)';
    tilt.style.transition = 'all 0.2s';
    const card = document.createElement('div');
    card.setAttribute(CARD_ZOOM_ATTRIBUTE, '');
    card.style.zoom = zoom;
    const frame = document.createElement('div');
    const text = document.createElement('div');
    text.innerHTML = '<p>Some rules text.</p>';
    frame.appendChild(text);
    card.appendChild(frame);
    tilt.appendChild(card);
    document.body.appendChild(tilt);
    return { tilt, card, text };
  };

  it('typesets with the card at zoom 1 and without transforms around it, then restores both', () => {
    const { tilt, card, text } = mountCard('0.2');
    let during: { zoom: string; transform: string } | null = null;
    layOutAtDesignSize([text], () => {
      during = { zoom: card.style.zoom, transform: tilt.style.transform };
    });
    expect(during).toEqual({ zoom: '1', transform: 'none' });
    expect(card.style.zoom).toBe('0.2');
    expect(tilt.style.transform).toBe('rotateY(5deg)');
    expect(tilt.style.transition).toBe('all 0.2s');
  });

  it('restores the zoom and transforms when typesetting throws', () => {
    const { tilt, card, text } = mountCard('0.2');
    expect(() =>
      layOutAtDesignSize([text], () => {
        throw new Error('fit failed');
      }),
    ).toThrow('fit failed');
    expect(card.style.zoom).toBe('0.2');
    expect(tilt.style.transform).toBe('rotateY(5deg)');
  });

  it('just typesets text outside a zoomed card', () => {
    const text = document.createElement('div');
    document.body.appendChild(text);
    let calls = 0;
    layOutAtDesignSize([text], () => {
      calls += 1;
    });
    expect(calls).toBe(1);
  });
});
