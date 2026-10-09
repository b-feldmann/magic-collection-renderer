import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';

import TemplatingCardRender from './TemplatingCardRender';
import { Store, StoreType } from '../../store';
import { AdventureType, CardArtStyles, CardType, RarityType } from '../../interfaces/enums';
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
// single-colored so the adventure pinline/rules-left resolve to the green
// asset variant (see getAdventureVariant / getAdventureRulesLeft).
const renderAdventure = (
  opts: {
    legendary?: boolean;
    artStyle?: CardArtStyles;
    enchantment?: boolean;
    manaCost?: string;
    noAdventure?: boolean;
    cardText?: string[];
    adventureName?: string;
    adventureCost?: string;
    adventureText?: string[];
    adventureType?: AdventureType;
  } = {},
) =>
  render(
    <Store.Provider value={mockStoreValue}>
      <TemplatingCardRender
        name="Test Adventure"
        rarity={RarityType.Common}
        cardID="test-adventure"
        manaCost={opts.manaCost ?? '{1}{G}'}
        cardTypes={[
          CardType.Creature,
          ...(opts.noAdventure ? [] : [CardType.Adventure]),
          ...(opts.enchantment ? [CardType.Enchantment] : []),
        ]}
        cardSubTypes=""
        cardText={opts.cardText ?? []}
        legendary={opts.legendary}
        artStyle={opts.artStyle}
        adventureName={opts.adventureName}
        adventureCost={opts.adventureCost}
        adventureText={opts.adventureText}
        adventureType={opts.adventureType}
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

  it('a legendary adventure on regular art renders the regular crown', () => {
    renderAdventure({ legendary: true });

    // There are no dedicated adventure crown assets; a legendary adventure
    // on regular (and extended/borderless) art uses the regular crown logic
    // like any other card.
    expect(findBySrc('images/crown/')).toBeInTheDocument();
  });

  it('a non-legendary adventure renders no crown', () => {
    renderAdventure({ legendary: false });

    // The crown only renders when `legendary && !isInvention`. A non-legendary
    // adventure therefore emits no crown image at all.
    expect(findBySrc('images/crown/')).toBeUndefined();
  });
});

describe('TemplatingCardRender - adventure left-box color derivation', () => {
  const findLeftOverlay = () =>
    allImages().find(img => img.className.includes('adventureRulesLeft'));

  it('derives the left box color from the adventureCost, not the manaCost', () => {
    // Green creature ({1}{G}) with a blue adventure ({2}{U}): the left box
    // belongs to the adventure spell, so it must resolve to the blue asset.
    renderAdventure({ adventureCost: '{2}{U}' });

    const overlay = findLeftOverlay();
    expect(overlay?.getAttribute('src')).toContain('adventureRulesLeft/u');
    expect(overlay?.getAttribute('src')).not.toContain('adventureRulesLeft/g');
  });

  it('a two-color adventureCost resolves the two-color combo left part', () => {
    // Unlike the right overlay (which folds to gold), the left box has
    // dedicated two-color combo assets: {W}{U} must resolve to wu, not the
    // green part of the creature's manaCost.
    renderAdventure({ adventureCost: '{W}{U}' });

    const overlay = findLeftOverlay();
    expect(overlay?.getAttribute('src')).toContain('adventureRulesLeft/wu');
    expect(overlay?.getAttribute('src')).not.toContain('adventureRulesLeft/g');
  });

  it('the pinline still derives from the card manaCost, not the adventureCost', () => {
    // The pinline wraps both halves of the frame, so it keeps the card's own
    // (green) color even when the adventure itself is blue.
    renderAdventure({ adventureCost: '{2}{U}' });

    const pinline = allImages().find(img => img.className.includes('pinline'));
    expect(pinline?.getAttribute('src')).toContain('adventurePinline/g');
    expect(pinline?.getAttribute('src')).not.toContain('adventurePinline/u');
  });

  it('falls back to the manaCost colors when no adventureCost is set', () => {
    renderAdventure({ adventureCost: undefined });

    expect(findLeftOverlay()?.getAttribute('src')).toContain('adventureRulesLeft/g');
  });

  it('the Eld alternate left overlay derives from the adventureCost too', () => {
    renderAdventure({
      artStyle: CardArtStyles.EldAlternateArt,
      adventureCost: '{2}{U}',
    });

    const overlay = findLeftOverlay();
    expect(overlay?.getAttribute('src')).toContain('adventureAlternateRulesLeft/u');
  });
});

describe('TemplatingCardRender - enchantment adventure (nyx mainframe)', () => {
  it('an enchantment adventure on regular art renders the nyx adventure mainframe', () => {
    renderAdventure({ enchantment: true });

    const mainframe = allImages().find(img => img.className.includes('mainframe'));
    expect(mainframe?.getAttribute('src')).toContain('mainframes/adventure/nyx');
  });

  it('an enchantment adventure keeps the regular adventure pinline and rules parts', () => {
    renderAdventure({ enchantment: true });

    const pinline = allImages().find(img => img.className.includes('pinline'));
    expect(pinline?.getAttribute('src')).toContain('adventurePinline');
    expect(pinline?.getAttribute('src')).not.toContain('nyx');

    const left = allImages().find(img => img.className.includes('adventureRulesLeft'));
    expect(left?.getAttribute('src')).toContain('adventureRulesLeft');
    expect(left?.getAttribute('src')).not.toContain('nyx');
  });

  it('CONTROL: a non-enchantment adventure renders no nyx adventure mainframe', () => {
    renderAdventure();

    expect(findBySrc('adventure/nyx')).toBeUndefined();
  });
});

describe('TemplatingCardRender - ELD alternate art adventure frame', () => {
  it('renders the alternateArt adventure mainframe, pinline, rules-left, and pt assets', () => {
    renderAdventure({ artStyle: CardArtStyles.EldAlternateArt });

    // The ELD Alternate Art art style swaps every adventure asset for its
    // alternateArt counterpart: mainframe from mainframes/adventure/alternateArt,
    // pinline from adventureAlternatePinline, the rules-left overlay from
    // adventureAlternateRulesLeft, and the pt box from pt/adventureEld.
    const mainframe = allImages().find(img => img.className.includes('mainframe'));
    expect(mainframe?.getAttribute('src')).toContain('mainframes/adventure/alternateArt');

    const pinline = allImages().find(img => img.className.includes('pinline'));
    expect(pinline?.getAttribute('src')).toContain('adventureAlternatePinline');

    const overlay = allImages().find(img => img.className.includes('adventureRulesLeft'));
    expect(overlay?.getAttribute('src')).toContain('adventureAlternateRulesLeft');

    expect(findBySrc('pt/adventureEld')).toBeInTheDocument();
  });

  it('a legendary adventure on alternate art renders no crown at all', () => {
    // The Alternate Art style skips the entire crown block: no regular crown,
    // no Nyx inner crown (enchantments included — exactly the case where it
    // would otherwise appear) and no crown backing plate. All crown assets
    // live under images/crown/, the backing plate is images/black.png.
    renderAdventure({
      legendary: true,
      artStyle: CardArtStyles.EldAlternateArt,
      enchantment: true,
    });

    expect(findBySrc('images/crown/')).toBeUndefined();
    expect(findBySrc('black.png')).toBeUndefined();
  });

  it('a legendary adventure enchantment on regular art renders the Nyx crown', () => {
    renderAdventure({ legendary: true, enchantment: true });

    // Only the Alternate Art style suppresses the Nyx crown; a legendary
    // adventure enchantment on regular art keeps the regular Nyx behavior.
    expect(findBySrc('Nyx')).toBeInTheDocument();
  });

  it('CONTROL: a regular adventure renders none of the alternate art assets', () => {
    renderAdventure();

    expect(findBySrc('alternateArt')).toBeUndefined();
    expect(findBySrc('adventureAlternate')).toBeUndefined();
    expect(findBySrc('pt/adventureEld')).toBeUndefined();
  });
});

describe('TemplatingCardRender - adventure rules-right overlay (Extended/Borderless)', () => {
  const findRightOverlay = () =>
    allImages().find(img => img.className.includes('adventureRulesRight'));

  it('an Extended adventure renders the right overlay next to the left one', () => {
    renderAdventure({ artStyle: CardArtStyles.Extended });

    // The right overlay mirrors the left one: an <img> whose src comes from
    // getAdventureRulesRight. It must sit next to the left overlay, which
    // still renders in the Extended style.
    const overlay = findRightOverlay();
    expect(overlay).toBeInTheDocument();
    expect(overlay?.getAttribute('src')).toContain('adventureRulesRight');
    expect(
      allImages().find(img => img.className.includes('adventureRulesLeft')),
    ).toBeInTheDocument();
  });

  it('a single-color Extended adventure resolves the single-color right part', () => {
    renderAdventure({ artStyle: CardArtStyles.Extended });

    // {1}{G} keeps the card single green, so the right part must be the
    // green asset, not the gold multicolor part.
    const overlay = findRightOverlay();
    expect(overlay?.getAttribute('src')).toContain('adventureRulesRight/g');
    expect(overlay?.getAttribute('src')).not.toContain('adventureRulesRight/m');
  });

  it('a Borderless adventure renders the right overlay', () => {
    renderAdventure({ artStyle: CardArtStyles.Borderless });

    expect(findRightOverlay()).toBeInTheDocument();
  });

  it('a two-color Borderless adventure uses the multicolor right part, not a combo part', () => {
    renderAdventure({ artStyle: CardArtStyles.Borderless, manaCost: '{W}{U}' });

    // The right part deliberately never uses two-color combo assets: two (or
    // more) colors fold to the gold multicolor part.
    const overlay = findRightOverlay();
    expect(overlay?.getAttribute('src')).toContain('adventureRulesRight/m');
    expect(overlay?.getAttribute('src')).not.toContain('wu');
  });

  it('a regular adventure renders no right overlay', () => {
    renderAdventure();

    expect(findRightOverlay()).toBeUndefined();
  });

  it('an alternate art adventure renders no right overlay', () => {
    // AlternateArt has no right-side assets; it stays left-only.
    renderAdventure({ artStyle: CardArtStyles.EldAlternateArt });

    expect(findRightOverlay()).toBeUndefined();
  });
});

describe('TemplatingCardRender - adventure spell box', () => {
  it('renders the adventure name, cost, type line, and text into the left box', () => {
    renderAdventure({
      adventureName: 'Petty Theft',
      adventureCost: '{1}{U}',
      adventureType: AdventureType.Instant,
      adventureText: ['Until end of turn, target creature loses flying.'],
    });

    expect(screen.getByText('Petty Theft')).toBeInTheDocument();

    // The cost box holds the injected mana icons (ms-* elements).
    const costBox = Array.from(document.querySelectorAll('div')).find(d =>
      d.className.includes('adventureCost'),
    );
    expect(costBox).toBeDefined();
    expect(costBox!.querySelectorAll('.ms').length).toBeGreaterThan(0);

    expect(screen.getByText('Instant – Adventure')).toBeInTheDocument();
    expect(
      screen.getByText('Until end of turn, target creature loses flying.'),
    ).toBeInTheDocument();
  });

  it('a Sorcery adventure renders a Sorcery type line', () => {
    renderAdventure({
      adventureName: 'Chop Down',
      adventureType: AdventureType.Sorcery,
      adventureText: ['Chop.'],
    });

    expect(screen.getByText('Sorcery – Adventure')).toBeInTheDocument();
  });

  it('renders no adventure spell elements for a card without adventure data', () => {
    renderAdventure({ noAdventure: true });

    for (const cls of ['adventureName', 'adventureCost', 'adventureTypeLine', 'adventureText']) {
      expect(
        Array.from(document.querySelectorAll('div')).find(d => d.className.includes(cls)),
      ).toBeUndefined();
    }
  });

  it('constrains the creature text box to the right half of the frame', () => {
    // The creature's rules text must move out of the adventure box into the
    // right column; the constrained element carries the adventureRightText
    // class (the plain .text box spans the full card width).
    renderAdventure({ cardText: ['Flash.'] });

    const constrained = Array.from(document.querySelectorAll('div')).find(d =>
      d.className.includes('adventureRightText'),
    );
    expect(constrained).toBeDefined();
    expect(screen.getByText('Flash.')).toBeInTheDocument();
  });

  it('CONTROL: a non-adventure keeps the full-width text box', () => {
    renderAdventure({ noAdventure: true, cardText: ['Flash.'] });

    expect(
      Array.from(document.querySelectorAll('div')).find(d =>
        d.className.includes('adventureRightText'),
      ),
    ).toBeUndefined();
    expect(screen.getByText('Flash.')).toBeInTheDocument();
  });
});
