import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';

import TemplatingCardRender from './TemplatingCardRender';
import { Store, StoreType } from '../../store';
import { CardArtStyles, CardType, RarityType } from '../../interfaces/enums';
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

const renderCard = ({
  rarity,
  cardTypes = [CardType.Creature],
  manaCost = '{2}{G}{G}',
  artStyle,
}: {
  rarity: RarityType;
  cardTypes?: CardType[];
  manaCost?: string;
  artStyle?: CardArtStyles;
}) =>
  render(
    <Store.Provider value={mockStoreValue}>
      <TemplatingCardRender
        name="Holo-Engineer"
        rarity={rarity}
        cardID="holo"
        manaCost={manaCost}
        cardTypes={cardTypes}
        cardText={['Text']}
        cardStats="3/3"
        artStyle={artStyle}
        collectionNumber={1}
        collectionSize={10}
      />
    </Store.Provider>,
  );

const stamp = () => screen.queryByTestId('holo-stamp');

describe('TemplatingCardRender - holo stamp', () => {
  it.each([RarityType.Rare, RarityType.MythicRare])('stamps %s cards', rarity => {
    renderCard({ rarity });
    expect(stamp()).toBeInTheDocument();
  });

  it.each([RarityType.Common, RarityType.Uncommon])('does not stamp %s cards', rarity => {
    renderCard({ rarity });
    expect(stamp()).not.toBeInTheDocument();
  });

  it('uses the stamp in the frame color', () => {
    renderCard({ rarity: RarityType.Rare });
    expect(stamp()?.getAttribute('src')).toMatch(/holoStamp\/g\.png/);
  });

  it('uses the artifact stamp on artifacts', () => {
    renderCard({
      rarity: RarityType.Rare,
      cardTypes: [CardType.Artifact],
      manaCost: '{3}',
    });
    expect(stamp()?.getAttribute('src')).toMatch(/holoStamp\/a\.png/);
  });

  it('shows only the oval on borderless cards', () => {
    renderCard({ rarity: RarityType.Rare, artStyle: CardArtStyles.Borderless });
    expect(stamp()?.getAttribute('src')).toMatch(/holoStamp\/stamp\.png/);
  });

  it('never stamps tokens', () => {
    renderCard({ rarity: RarityType.Rare, cardTypes: [CardType.Token, CardType.Creature] });
    expect(stamp()).not.toBeInTheDocument();
  });
});
