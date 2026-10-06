import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';

import TemplatingCardRender from './TemplatingCardRender';
import { Store, StoreType } from '../../store';
import { CardArtStyles, CardMainType, RarityType } from '../../interfaces/enums';
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

const renderBorderlessCard = (cardMainType: CardMainType, manaCost: string, cardText: string[]) =>
  render(
    <Store.Provider value={mockStoreValue}>
      <TemplatingCardRender
        name="Test Card"
        rarity={RarityType.Common}
        cardID="test-card"
        manaCost={manaCost}
        cardMainType={cardMainType}
        cardSubTypes=""
        cardText={cardText}
        artStyle={CardArtStyles.Borderless}
        collectionNumber={1}
        collectionSize={10}
      />
    </Store.Provider>,
  );

const getImageByPartClass = (partClass: string) => {
  const images = Array.from(document.querySelectorAll('img'));
  return images.find(img => img.className.includes(partClass));
};

describe('TemplatingCardRender - borderless cards get no title/type/rules parts', () => {
  it('borderless two-color land: no parts, but pinline still present', () => {
    renderBorderlessCard(CardMainType.Land, '', ['{T}: Add {W} or {U}.']);

    expect(getImageByPartClass('titlePart')).toBeUndefined();
    expect(getImageByPartClass('typePart')).toBeUndefined();
    expect(getImageByPartClass('rulesPart')).toBeUndefined();
    expect(getImageByPartClass('pinline')?.getAttribute('src')).toContain('wu');
  });

  it('borderless two-color non-artifact: no parts, but pinline still present', () => {
    renderBorderlessCard(CardMainType.Creature, '{W}{U}', ['Some rules text.']);

    expect(getImageByPartClass('titlePart')).toBeUndefined();
    expect(getImageByPartClass('typePart')).toBeUndefined();
    expect(getImageByPartClass('rulesPart')).toBeUndefined();
    expect(getImageByPartClass('pinline')?.getAttribute('src')).toContain('wu');
  });

  it('borderless artifact: no parts', () => {
    renderBorderlessCard(CardMainType.Artifact, '{1}{W}', ['Some rules text.']);

    expect(getImageByPartClass('titlePart')).toBeUndefined();
    expect(getImageByPartClass('typePart')).toBeUndefined();
    expect(getImageByPartClass('rulesPart')).toBeUndefined();
  });
});
