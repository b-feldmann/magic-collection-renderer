import React from 'react';
import { render } from '@testing-library/react';
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

// A single green ({1}{G}) Adventure creature. Green keeps the derived color
// single-colored so the adventure pinline/rules-left/crown all resolve to the
// green asset variant (see getAdventureVariant / getAdventureRulesLeft).
const renderAdventure = (opts: { legendary?: boolean } = {}) =>
  render(
    <Store.Provider value={mockStoreValue}>
      <TemplatingCardRender
        name="Test Adventure"
        rarity={RarityType.Common}
        cardID="test-adventure"
        manaCost="{1}{G}"
        cardTypes={[CardType.Creature, CardType.Adventure]}
        cardSubTypes=""
        cardText={[]}
        legendary={opts.legendary}
        collectionNumber={1}
        collectionSize={10}
      />
    </Store.Provider>,
  );

const allImages = () => Array.from(document.querySelectorAll('img'));

const findBySrc = (needle: string) =>
  allImages().find(img => (img.getAttribute('src') ?? '').includes(needle));

describe('TemplatingCardRender - adventure frame', () => {
  it('renders the decorative adventure left-box overlay', () => {
    renderAdventure();

    // The overlay is an `<img className={styles.adventureRulesLeft} .../>` whose
    // src comes from getAdventureRulesLeft. Locating it by class mirrors how the
    // land tests locate typePart/rulesPart overlays by className substring. Its
    // presence is adventure-specific: a non-adventure card never emits it, so
    // this assertion fails if the adventure branch regresses.
    const overlay = allImages().find(img => img.className.includes('adventureRulesLeft'));
    expect(overlay).toBeInTheDocument();
    expect(overlay?.getAttribute('src')).toContain('adventureRulesLeft');
  });

  it('renders the adventure mainframe and pinline assets', () => {
    renderAdventure();

    // Both the mainframe and pinline must resolve to the adventure asset
    // folders; these come from getAdventureMainframe / getAdventurePinline and
    // would be the ordinary color frames if `isAdventure` were false.
    const mainframe = allImages().find(img => img.className.includes('mainframe'));
    expect(mainframe?.getAttribute('src')).toContain('mainframes/adventure');

    const pinline = allImages().find(img => img.className.includes('pinline'));
    expect(pinline?.getAttribute('src')).toContain('adventurePinline');
  });

  it('a legendary adventure renders the adventure crown', () => {
    renderAdventure({ legendary: true });

    // getCrown(..., isAdventure=true) selects the dedicated adventure crown
    // asset under images/crown/adventure. We locate it by that src path rather
    // than by the `crown` className, because the `crownBlack` overlay also
    // matches a `crown` className substring; the adventure crown path is
    // unambiguous and specific to the adventure crown branch.
    expect(findBySrc('crown/adventure')).toBeInTheDocument();
  });

  it('a non-legendary adventure renders no crown', () => {
    renderAdventure({ legendary: false });

    // The crown only renders when `legendary && !isInvention`. A non-legendary
    // adventure therefore emits no adventure crown asset at all.
    expect(findBySrc('crown/adventure')).toBeUndefined();
  });
});
