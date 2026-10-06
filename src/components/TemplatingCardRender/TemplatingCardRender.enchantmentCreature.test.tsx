import React from 'react';
import { render, screen } from '@testing-library/react';
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

const renderCard = (cardMainType: CardMainType) =>
  render(
    <Store.Provider value={mockStoreValue}>
      <TemplatingCardRender
        name="Test Card"
        rarity={RarityType.Common}
        cardID="test-card"
        manaCost="{1}{W}"
        cardMainType={cardMainType}
        cardSubTypes="Human"
        cardText={['Some rules text.']}
        cardStats="2/2"
        collectionNumber={1}
        collectionSize={10}
      />
    </Store.Provider>,
  );

describe('TemplatingCardRender - Enchantment Creature main type', () => {
  it('renders the type line as "Enchantment Creature"', () => {
    renderCard(CardMainType.EnchantmentCreature);

    // The type line is composed of several text nodes (legendary prefix,
    // main type, sub types), so match on the combined text.
    expect(screen.getByText(/Enchantment Creature/)).toBeInTheDocument();
  });

  it('renders power/toughness stats like other creature types', () => {
    renderCard(CardMainType.EnchantmentCreature);

    expect(screen.getByText('2/2')).toBeInTheDocument();
  });

  it('CONTROL: a plain Enchantment does not show power/toughness', () => {
    renderCard(CardMainType.Enchantment);

    expect(screen.queryByText('2/2')).not.toBeInTheDocument();
  });
});
