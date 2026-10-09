import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';

import TemplatingCardRender from './TemplatingCardRender';
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

const renderCard = (cardTypes: CardType[], vehicle: boolean) =>
  render(
    <Store.Provider value={mockStoreValue}>
      <TemplatingCardRender
        name="Sky Copter"
        rarity={RarityType.Common}
        cardID="test-vehicle"
        manaCost="{2}"
        vehicle={vehicle}
        cardTypes={cardTypes}
        cardSubTypes="Copter"
        cardText={['Some rules text.']}
        cardStats="3/2"
        collectionNumber={1}
        collectionSize={10}
      />
    </Store.Provider>,
  );

describe('TemplatingCardRender - Vehicle (artifact + vehicle flag)', () => {
  it('renders power/toughness stats for an artifact vehicle', () => {
    renderCard([CardType.Artifact], true);

    expect(screen.getByText('3/2')).toBeInTheDocument();
  });

  it('renders the type line as "Artifact – Vehicle"', () => {
    renderCard([CardType.Artifact], true);

    expect(screen.getByText(/Vehicle/)).toBeInTheDocument();
  });

  it('CONTROL: a plain Artifact without the vehicle flag does not show power/toughness', () => {
    renderCard([CardType.Artifact], false);

    expect(screen.queryByText('3/2')).not.toBeInTheDocument();
  });
});
