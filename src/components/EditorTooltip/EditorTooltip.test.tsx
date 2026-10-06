import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';

import EditorTooltip from './EditorTooltip';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom does not implement ResizeObserver, which antd's Popover requires.
class ResizeObserverStub {
  observe(): void {}

  unobserve(): void {}

  disconnect(): void {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// jsdom does not implement matchMedia, which antd's responsiveObserver needs.
globalThis.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof globalThis.matchMedia;

describe('EditorTooltip', () => {
  // Regression: mana-font composes two-color hybrid symbols (e.g. `{rg}`) from
  // two half-glyphs, and the positioning/sizing rules for that composite exist
  // only for elements carrying BOTH `ms-cost` and `ms-<hybrid>` classes. The
  // card renderer (`injectManaIcons`) always passes `cost`, so hybrids render
  // correctly there; the tooltip must do the same or the halves overlap into
  // a garbled glyph.
  it('renders mana-cost mode for every mana symbol, including hybrids like {rg}', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<EditorTooltip className="" />);
    });

    await act(async () => {
      const trigger = container.querySelector('.anticon-question-circle')!;
      expect(trigger).not.toBeNull();
      trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      trigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      trigger.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    });

    // Popover opens after the default mouseEnterDelay (100ms) plus animation.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    const manaIcons = Array.from(document.body.querySelectorAll('i.ms'));
    const hybridSymbols = ['wu', 'wb', 'ub', 'ur', 'br', 'bg', 'rg', 'rw', 'gw', 'gu'];
    hybridSymbols.forEach(symbol => {
      const icon = manaIcons.find(el => el.classList.contains(`ms-${symbol}`));
      expect(icon, `symbol {${symbol}} missing from tooltip`).toBeDefined();
      expect(icon?.classList.contains('ms-cost'), `{${symbol}} missing ms-cost class`).toBe(true);
    });

    root.unmount();
    container.remove();
  });
});
