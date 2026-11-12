import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';

import PlaneswalkerCardRender from './PlaneswalkerCardRender';
import { Store, StoreType } from '../../store';
import { CardType, RarityType } from '../../interfaces/enums';
import { UNKNOWN_CREATOR } from '../../utils/constants';
import { PLANESWALKER_LINE_HEIGHT } from './planeswalkerGeometry';

// Records every ResizeObserver so the test can report a resize itself.
const observers: { callback: ResizeObserverCallback; targets: Element[] }[] = [];

class RecordingResizeObserver {
  private entry: { callback: ResizeObserverCallback; targets: Element[] };

  constructor(callback: ResizeObserverCallback) {
    this.entry = { callback, targets: [] };
    observers.push(this.entry);
  }

  observe(target: Element) {
    this.entry.targets.push(target);
  }

  unobserve() {}

  disconnect() {
    this.entry.targets = [];
  }
}

const mockStoreValue: StoreType = {
  cards: [],
  mechanics: [],
  annotationAccessor: {},
  user: [UNKNOWN_CREATOR],
  currentUser: UNKNOWN_CREATOR,
  dispatch: () => {},
};

const LONG_ABILITY = 'You get an emblem with a very long text.';

// Layout stand-ins: whether the card is laid out, and the long ability
// wrapping to three lines (every other ability takes one).
let laidOut = false;
const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
const originalResizeObserver = globalThis.ResizeObserver;

beforeEach(() => {
  laidOut = false;
  observers.length = 0;
  (globalThis as any).ResizeObserver = RecordingResizeObserver;
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return laidOut ? 1500 : 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get(this: HTMLElement) {
      if (!laidOut || !this.hasAttribute('data-ability-text')) return 0;
      const container = this.parentElement!.parentElement!;
      const lines = this.textContent?.includes(LONG_ABILITY) ? 3 : 1;
      return lines * PLANESWALKER_LINE_HEIGHT * parseFloat(container.style.fontSize);
    },
  });
});

afterEach(() => {
  (globalThis as any).ResizeObserver = originalResizeObserver;
  if (originalOffsetWidth) {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth);
  }
  if (originalOffsetHeight) {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
  }
});

const cardText = [
  '+2|You gain 3 life.',
  '0|Draw a card.',
  '-3|Destroy target creature.',
  `-6|${LONG_ABILITY}`,
];

const renderPlaneswalker = () =>
  render(
    <Store.Provider value={mockStoreValue}>
      <PlaneswalkerCardRender
        name="Test Walker"
        rarity={RarityType.MythicRare}
        cardID="test-walker"
        manaCost="{2}{B}{G}"
        legendary
        cardTypes={[CardType.Planeswalker]}
        cardSubTypes="Test"
        cardText={cardText}
        cardStats="5"
        collectionNumber={1}
        collectionSize={10}
      />
    </Store.Provider>,
  );

const abilityTops = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-ability-text]')).map(
    block => block.style.top,
  );

const fitWhileLaidOut = () => {
  laidOut = true;
  const { container } = renderPlaneswalker();
  const tops = abilityTops();
  container.remove();
  return tops;
};

describe('PlaneswalkerCardRender - ability fit', () => {
  it('fits the abilities once a card first rendered hidden is shown', () => {
    const expected = fitWhileLaidOut();

    laidOut = false;
    renderPlaneswalker();
    const hiddenTops = abilityTops();
    // Hidden, nothing is measured: the long ability is not placed as one line.
    expect(hiddenTops).not.toEqual(expected);

    laidOut = true;
    act(() => {
      observers.forEach(({ callback, targets }) => {
        if (targets.length) callback([], {} as ResizeObserver);
      });
    });

    expect(abilityTops()).toEqual(expected);
  });
});
