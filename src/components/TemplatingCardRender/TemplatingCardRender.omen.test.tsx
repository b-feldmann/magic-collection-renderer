import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';

import TemplatingCardRender from './TemplatingCardRender';
import { Store, StoreType } from '../../store';
import { CardType, OmenType, RarityType } from '../../interfaces/enums';
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

// A single green ({1}{G}) Omen creature. Green keeps the derived color
// single-colored so the omen pinline/rules-left resolve to the green asset
// variant (see getSpellBoxVariant / getOmenRulesLeft).
const renderOmen = (
  opts: {
    enchantment?: boolean;
    manaCost?: string;
    noOmen?: boolean;
    cardText?: string[];
    omenName?: string;
    omenCost?: string;
    omenText?: string[];
    omenType?: OmenType;
  } = {},
) =>
  render(
    <Store.Provider value={mockStoreValue}>
      <TemplatingCardRender
        name="Test Omen"
        rarity={RarityType.Common}
        cardID="test-omen"
        manaCost={opts.manaCost ?? '{1}{G}'}
        cardTypes={[
          CardType.Creature,
          ...(opts.noOmen ? [] : [CardType.Omen]),
          ...(opts.enchantment ? [CardType.Enchantment] : []),
        ]}
        cardSubTypes=""
        cardText={opts.cardText ?? []}
        omenName={opts.omenName}
        omenCost={opts.omenCost}
        omenText={opts.omenText}
        omenType={opts.omenType}
        collectionNumber={1}
        collectionSize={10}
      />
    </Store.Provider>,
  );

const allImages = () => Array.from(document.querySelectorAll('img'));

const findBySrc = (needle: string) =>
  allImages().find(img => (img.getAttribute('src') ?? '').includes(needle));

describe('TemplatingCardRender - omen frame', () => {
  it('renders the omen left-box overlay', () => {
    renderOmen();

    // The overlay is an `<img className={styles.adventureRulesLeft} .../>` whose
    // src comes from getOmenRulesLeft: the omen left box shares the adventure
    // frame geometry, so the adventure SCSS classes are reused. Its presence is
    // omen-specific: a non-omen card never emits it.
    const overlay = allImages().find(img => img.className.includes('adventureRulesLeft'));
    expect(overlay).toBeInTheDocument();
    expect(overlay?.getAttribute('src')).toContain('omenRulesLeft');
  });

  it('renders the omen mainframe and pinline assets', () => {
    renderOmen();

    // Both the mainframe and pinline must resolve to the omen asset folders;
    // these come from getOmenMainframe / getOmenPinline and would be the
    // ordinary color frames if `isOmen` were false.
    const mainframe = allImages().find(img => img.className.includes('mainframe'));
    expect(mainframe?.getAttribute('src')).toContain('mainframes/omen');

    const pinline = allImages().find(img => img.className.includes('pinline'));
    expect(pinline?.getAttribute('src')).toContain('omenPinline');
  });

  it('renders no regular rules part (the omen frame carries its own rules boxes)', () => {
    // {W}{U} would resolve a regular gold rules part on a non-omen card; the
    // omen branch must clear it like the adventure branch does.
    renderOmen({ manaCost: '{W}{U}' });

    expect(allImages().find(img => img.className.includes('rulesPart'))).toBeUndefined();
  });
});

describe('TemplatingCardRender - omen left-box color derivation', () => {
  const findLeftOverlay = () =>
    allImages().find(img => img.className.includes('adventureRulesLeft'));

  it('derives the left box color from the omenCost, not the manaCost', () => {
    // Green creature ({1}{G}) with a blue omen ({2}{U}): the left box belongs
    // to the omen spell, so it must resolve to the blue asset.
    renderOmen({ omenCost: '{2}{U}' });

    const overlay = findLeftOverlay();
    expect(overlay?.getAttribute('src')).toContain('omenRulesLeft/u');
    expect(overlay?.getAttribute('src')).not.toContain('omenRulesLeft/g');
  });

  it('a two-color omenCost resolves the two-color combo left part', () => {
    // The left box has dedicated two-color combo assets: {W}{U} must resolve
    // to wu, not the green part of the creature's manaCost.
    renderOmen({ omenCost: '{W}{U}' });

    const overlay = findLeftOverlay();
    expect(overlay?.getAttribute('src')).toContain('omenRulesLeft/wu');
    expect(overlay?.getAttribute('src')).not.toContain('omenRulesLeft/g');
  });

  it('the pinline still derives from the card manaCost, not the omenCost', () => {
    // The pinline wraps both halves of the frame, so it keeps the card's own
    // (green) color even when the omen itself is blue.
    renderOmen({ omenCost: '{2}{U}' });

    const pinline = allImages().find(img => img.className.includes('pinline'));
    expect(pinline?.getAttribute('src')).toContain('omenPinline/g');
    expect(pinline?.getAttribute('src')).not.toContain('omenPinline/u');
  });

  it('falls back to the manaCost colors when no omenCost is set', () => {
    renderOmen({ omenCost: undefined });

    expect(findLeftOverlay()?.getAttribute('src')).toContain('omenRulesLeft/g');
  });
});

describe('TemplatingCardRender - enchantment omen (nyx mainframe)', () => {
  it('renders the nyx omen mainframe but keeps regular-carved parts', () => {
    renderOmen({ enchantment: true });

    const mainframe = allImages().find(img => img.className.includes('mainframe'));
    expect(mainframe?.getAttribute('src')).toContain('mainframes/omen/nyx');

    const pinline = allImages().find(img => img.className.includes('pinline'));
    expect(pinline?.getAttribute('src')).toContain('omenPinline');
    expect(pinline?.getAttribute('src')).not.toContain('nyx');
  });

  it('CONTROL: a non-enchantment omen renders no nyx omen mainframe', () => {
    renderOmen();

    expect(findBySrc('omen/nyx')).toBeUndefined();
  });
});

describe('TemplatingCardRender - omen spell box', () => {
  it('renders the omen name, cost, type line, and text into the left box', () => {
    renderOmen({
      omenName: 'Dark Forecast',
      omenCost: '{1}{U}',
      omenType: OmenType.Instant,
      omenText: ['Scry 2, then draw a card.'],
    });

    expect(screen.getByText('Dark Forecast')).toBeInTheDocument();

    // The cost box holds the injected mana icons (ms-* elements).
    const costBox = Array.from(document.querySelectorAll('div')).find(d =>
      d.className.includes('adventureCost'),
    );
    expect(costBox).toBeDefined();
    expect(costBox!.querySelectorAll('.ms').length).toBeGreaterThan(0);

    expect(screen.getByText('Instant – Omen')).toBeInTheDocument();
    expect(screen.getByText('Scry 2, then draw a card.')).toBeInTheDocument();
  });

  it('a Sorcery omen renders a Sorcery type line', () => {
    renderOmen({
      omenName: 'Bitter End',
      omenType: OmenType.Sorcery,
      omenText: ['Destroy target creature.'],
    });

    expect(screen.getByText('Sorcery – Omen')).toBeInTheDocument();
  });

  it('renders no omen spell elements for a card without the Omen type', () => {
    // Stale face data (omen fields set but the Omen card type removed) must
    // not render the omen box.
    renderOmen({
      noOmen: true,
      omenName: 'Dark Forecast',
      omenCost: '{1}{U}',
      omenType: OmenType.Instant,
      omenText: ['Scry 2.'],
    });

    for (const cls of ['adventureName', 'adventureCost', 'adventureTypeLine', 'adventureText']) {
      expect(
        Array.from(document.querySelectorAll('div')).find(d => d.className.includes(cls)),
      ).toBeUndefined();
    }
    expect(findBySrc('omenRulesLeft')).toBeUndefined();
    expect(findBySrc('omenPinline')).toBeUndefined();
  });

  it('constrains the creature text box to the right half of the frame', () => {
    // The creature's rules text must move out of the omen box into the right
    // column; the constrained element carries the adventureRightText class
    // (the plain .text box spans the full card width).
    renderOmen({ cardText: ['Flash.'] });

    const constrained = Array.from(document.querySelectorAll('div')).find(d =>
      d.className.includes('adventureRightText'),
    );
    expect(constrained).toBeDefined();
    expect(screen.getByText('Flash.')).toBeInTheDocument();
  });

  it('CONTROL: a non-omen keeps the full-width text box', () => {
    renderOmen({ noOmen: true, cardText: ['Flash.'] });

    expect(
      Array.from(document.querySelectorAll('div')).find(d =>
        d.className.includes('adventureRightText'),
      ),
    ).toBeUndefined();
    expect(screen.getByText('Flash.')).toBeInTheDocument();
  });
});
