import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';

import PlaneswalkerCardRender from './PlaneswalkerCardRender';
import { Store, StoreType } from '../../store';
import { CardType, RarityType } from '../../interfaces/enums';
import { UNKNOWN_CREATOR } from '../../utils/constants';

// jsdom polyfills required by TextResize.
if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = class {
    observe() {}

    unobserve() {}

    disconnect() {}
  };
}

const mockStoreValue: StoreType = {
  cards: [],
  mechanics: [],
  annotationAccessor: {},
  user: [UNKNOWN_CREATOR],
  currentUser: UNKNOWN_CREATOR,
  dispatch: () => {},
};

const renderPlaneswalker = () =>
  render(
    <Store.Provider value={mockStoreValue}>
      <PlaneswalkerCardRender
        name="Test Walker"
        rarity={RarityType.MythicRare}
        cardID="test-walker"
        manaCost="{2}{W}"
        legendary
        cardTypes={[CardType.Planeswalker]}
        cardSubTypes="Jace"
        cardText={['+1: Do a thing.']}
        cardStats="4"
        collectionNumber={1}
        collectionSize={10}
      />
    </Store.Provider>,
  );

// The `.type` box. It must contain a TextResize wrapper (a div with an inline
// font-size) so long type lines shrink instead of colliding with the rarity
// icon. Without measurable overflow in jsdom, TextResize stays at its default
// size, which must be the current CSS size (2em on the 33.33px base = 67px).
const getTypeBox = () =>
  Array.from(document.querySelectorAll<HTMLElement>('div')).find(
    el => el.className.includes('type') && el.textContent?.includes('Planeswalker'),
  );

const getTypeResizeWrapper = (): HTMLElement | null => {
  const box = getTypeBox();
  const wrapper = box?.firstElementChild as HTMLElement | null;
  return wrapper && wrapper.style.fontSize ? wrapper : null;
};

describe('PlaneswalkerCardRender - type line auto-resize', () => {
  it('wraps the type line in a TextResize box', () => {
    renderPlaneswalker();

    expect(getTypeResizeWrapper()).not.toBeNull();
  });

  it('keeps the current font size (67px) as the default and max size', () => {
    renderPlaneswalker();

    expect(getTypeResizeWrapper()?.style.fontSize).toBe('67px');
  });

  it('renders the full type line inside the resize wrapper', () => {
    renderPlaneswalker();

    expect(getTypeResizeWrapper()?.textContent).toBe('Legendary Planeswalker – Jace');
  });
});
