import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';

import TemplatingCardRender from './TemplatingCardRender';
import { Store, StoreType } from '../../store';
import { CardMainType, RarityType } from '../../interfaces/enums';
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

const renderLand = (cardText: string[]) =>
  render(
    <Store.Provider value={mockStoreValue}>
      <TemplatingCardRender
        name="Test Land"
        rarity={RarityType.Common}
        cardID="test-land"
        manaCost=""
        cardMainType={CardMainType.Land}
        cardSubTypes=""
        cardText={cardText}
        collectionNumber={1}
        collectionSize={10}
      />
    </Store.Provider>,
  );

const getPinlineImage = () => {
  const images = Array.from(document.querySelectorAll('img'));
  return images.find(img => img.className.includes('pinline'));
};

describe('TemplatingCardRender - land pinlines (colors from card text)', () => {
  it('a two-color land shows the two-color pinline', () => {
    renderLand(['{T}: Add {W} or {U}.']);

    const pinline = getPinlineImage();
    expect(pinline).toBeInTheDocument();
    expect(pinline?.getAttribute('src')).toContain('wu');
  });

  it('a single-color land shows no pinline', () => {
    renderLand(['{T}: Add {W}.']);

    expect(getPinlineImage()).toBeUndefined();
  });

  it('a 3+ color land shows no pinline', () => {
    renderLand(['{T}: Add {W} or {U} or {B}.']);

    expect(getPinlineImage()).toBeUndefined();
  });

  it('a colorless land shows no pinline', () => {
    renderLand(['{T}: Add {C}.']);

    expect(getPinlineImage()).toBeUndefined();
  });
});
