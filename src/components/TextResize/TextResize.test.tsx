import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import TextResize from './TextResize';
import TemplatingCardRender from '../TemplatingCardRender/TemplatingCardRender';
import { MechanicsContext, Store, StoreType } from '../../store';
import { CardType, RarityType } from '../../interfaces/enums';
import { UNKNOWN_CREATOR } from '../../utils/constants';
import MechanicInterface from '../../interfaces/MechanicInterface';

// jsdom has no layout: content "needs" 2px of height per pixel of font size, and
// each scrollHeight read stands in for one forced layout.
const BOX_HEIGHT = 100;
let boxHeight = BOX_HEIGHT;
let measurements = 0;
let resizeCallbacks: (() => void)[] = [];
const fontListeners: (() => void)[] = [];

const define = (prop: string, get: (this: HTMLElement) => number) =>
  Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, get });

beforeEach(() => {
  boxHeight = BOX_HEIGHT;
  measurements = 0;
  resizeCallbacks = [];
  define('clientHeight', () => boxHeight);
  define('clientWidth', () => 100);
  define('scrollWidth', () => 100);
  define('scrollHeight', function scrollHeight(this: HTMLElement) {
    measurements += 1;
    return parseFloat(this.style.fontSize) * 2;
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resizeCallbacks.push(callback);
      }

      observe() {}

      disconnect() {}
    },
  );
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { addEventListener: (_: string, listener: () => void) => fontListeners.push(listener) },
  });
});

afterEach(() => {
  ['clientHeight', 'clientWidth', 'scrollWidth', 'scrollHeight'].forEach(prop => {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>)[prop];
  });
  vi.unstubAllGlobals();
});

const fitted = (text: string) => screen.getByText(text).closest('div')!;

const renderText = (text = 'Some text') => (
  <TextResize maxFontSize={80} minFontSize={20}>
    <p>{text}</p>
  </TextResize>
);

describe('TextResize', () => {
  it('uses the largest font size that fits', () => {
    render(renderText());
    expect(fitted('Some text')).toHaveStyle({ fontSize: '50px' });
  });

  it('falls back to the minimum size when the text never fits', () => {
    boxHeight = 10;
    render(renderText());
    expect(fitted('Some text')).toHaveStyle({ fontSize: '20px' });
  });

  it('flags text that had to shrink, and only that text', () => {
    const { unmount } = render(renderText());
    expect(fitted('Some text').dataset.shrunk).toBe('true');
    unmount();

    boxHeight = 200;
    render(renderText());
    expect(fitted('Some text').dataset.shrunk).toBe('false');
  });

  it('keeps line height and paragraph margins when fixedSpacing is set', () => {
    render(
      <TextResize maxFontSize={80} minFontSize={20} lineHeight={0.97} fixedSpacing>
        <p>Some text</p>
      </TextResize>,
    );
    const box = fitted('Some text');
    expect(box).toHaveStyle({ fontSize: '50px', lineHeight: '0.97' });
    // The stylesheet's paragraph margins stay in charge (no scaled override).
    expect(screen.getByText('Some text').style.marginTop).toBe('');
  });

  it('uses the full-size line height only while the text fits at the maximum size', () => {
    const renderFullSize = () =>
      render(
        <TextResize
          maxFontSize={80}
          minFontSize={20}
          lineHeight={0.97}
          fullSizeLineHeight={0.985}
          fixedSpacing
        >
          <p>Some text</p>
        </TextResize>,
      );
    const { unmount } = renderFullSize();
    // Shrunk to 50px: the regular leading.
    expect(fitted('Some text')).toHaveStyle({ fontSize: '50px', lineHeight: '0.97' });
    unmount();

    boxHeight = 200;
    renderFullSize();
    expect(fitted('Some text')).toHaveStyle({ fontSize: '80px', lineHeight: '0.985' });
  });

  it('tightens line height and paragraph margins while shrinking by default', () => {
    render(
      <TextResize maxFontSize={80} minFontSize={20} lineHeight={0.97}>
        <p>Some text</p>
      </TextResize>,
    );
    expect(fitted('Some text').style.lineHeight).not.toBe('0.97');
    expect(screen.getByText('Some text').style.marginTop).not.toBe('');
  });

  it('does not re-measure when a re-render leaves the content unchanged', () => {
    const { rerender } = render(renderText());
    measurements = 0;
    rerender(renderText());
    expect(measurements).toBe(0);
  });

  it('re-measures when the content changes', () => {
    const { rerender } = render(renderText());
    measurements = 0;
    rerender(renderText('Other text'));
    expect(measurements).toBeGreaterThan(0);
  });

  it('re-fits only when the box actually changed size', () => {
    render(renderText());
    measurements = 0;
    act(() => resizeCallbacks.forEach(callback => callback()));
    expect(measurements).toBe(0);

    boxHeight = 60;
    act(() => resizeCallbacks.forEach(callback => callback()));
    expect(fitted('Some text')).toHaveStyle({ fontSize: '30px' });
  });

  it('re-fits when a web font finishes loading', () => {
    render(renderText());
    measurements = 0;
    act(() => fontListeners.forEach(listener => listener()));
    expect(measurements).toBeGreaterThan(0);
  });

  it('only shrinks to the given size steps', () => {
    // 50px would fit, but the steps jump from 52.5 straight to 47.5.
    render(
      <TextResize maxFontSize={80} minFontSize={20} sizeSteps={[80, 57.5, 52.5, 47.5, 42.5]}>
        <p>Some text</p>
      </TextResize>,
    );
    expect(fitted('Some text')).toHaveStyle({ fontSize: '47.5px' });
  });

  it('falls back to the smallest step when no step fits', () => {
    boxHeight = 10;
    render(
      <TextResize maxFontSize={80} minFontSize={20} sizeSteps={[80, 60, 40]}>
        <p>Some text</p>
      </TextResize>,
    );
    expect(fitted('Some text')).toHaveStyle({ fontSize: '40px' });
  });

  it('also requires the extra fit check to pass', () => {
    // The box alone would allow 50px.
    render(
      <TextResize
        maxFontSize={80}
        minFontSize={20}
        fits={el => parseFloat(el.style.fontSize) <= 40}
      >
        <p>Some text</p>
      </TextResize>,
    );
    expect(fitted('Some text')).toHaveStyle({ fontSize: '40px' });
  });

  it('lets boxFits replace the box overflow check', () => {
    // The box alone would allow 50px; this check allows text twice as tall.
    render(
      <TextResize
        maxFontSize={80}
        minFontSize={20}
        boxFits={el => el.scrollHeight <= el.clientHeight * 2}
      >
        <p>Some text</p>
      </TextResize>,
    );
    expect(fitted('Some text')).toHaveStyle({ fontSize: '80px' });
  });

  it('runs beforeFit ahead of measuring and afterFit once the final size is applied', () => {
    const calls: string[] = [];
    render(
      <TextResize
        maxFontSize={80}
        minFontSize={20}
        beforeFit={el => calls.push(`before ${el.dataset.shrunk ?? 'unfitted'}`)}
        afterFit={el => calls.push(`after ${el.style.fontSize} ${el.dataset.shrunk}`)}
      >
        <p>Some text</p>
      </TextResize>,
    );
    expect(calls).toEqual(['before unfitted', 'after 50px true']);
  });

  it('runs every fit inside the layout, and only once per content and zoom', () => {
    let zoom = 0.2;
    define('currentCSSZoom', () => zoom);
    const calls: string[] = [];
    const layout = (el: HTMLDivElement, typeset: () => void) => {
      calls.push('layout');
      typeset();
      calls.push(`fitted ${el.style.fontSize}`);
    };
    const tree = () => (
      <TextResize maxFontSize={80} minFontSize={20} layout={layout}>
        <p>Some text</p>
      </TextResize>
    );
    try {
      const { rerender } = render(tree());
      expect(calls).toEqual(['layout', 'fitted 50px']);

      rerender(tree());
      expect(calls).toHaveLength(2);

      // The card shown at another size: its pinned line breaks are refitted.
      zoom = 0.5;
      rerender(tree());
      expect(calls).toEqual(['layout', 'fitted 50px', 'layout', 'fitted 50px']);
    } finally {
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).currentCSSZoom;
    }
  });
});

describe('TemplatingCardRender store subscription', () => {
  const store: StoreType = {
    cards: [],
    mechanics: [],
    annotationAccessor: {},
    user: [UNKNOWN_CREATOR],
    currentUser: UNKNOWN_CREATOR,
    dispatch: () => {},
  };
  const lifelink = { uuid: 'm1', name: 'Lifelink', description: 'Heals you' } as MechanicInterface;
  const cardTypes = [CardType.Creature];
  const cardText = ['[Lifelink]'];

  const tree = (value: StoreType, mechanics: MechanicInterface[]) => (
    <Store.Provider value={value}>
      <MechanicsContext.Provider value={mechanics}>
        <TemplatingCardRender
          name="Test Card"
          rarity={RarityType.Common}
          cardID="card"
          manaCost="{1}{W}"
          cardTypes={cardTypes}
          cardText={cardText}
          cardStats="2/2"
          collectionNumber={1}
          collectionSize={10}
        />
      </MechanicsContext.Provider>
    </Store.Provider>
  );

  it('does not re-measure the card when unrelated store state changes', () => {
    const mechanics: MechanicInterface[] = [];
    const { rerender } = render(tree(store, mechanics));
    measurements = 0;
    rerender(tree({ ...store, user: [] }, mechanics));
    expect(measurements).toBe(0);
  });

  it('updates the card text when the mechanics change', () => {
    const { rerender, container } = render(tree(store, []));
    const before = container.innerHTML;
    rerender(tree(store, [lifelink]));
    expect(container.innerHTML).not.toBe(before);
  });
});
