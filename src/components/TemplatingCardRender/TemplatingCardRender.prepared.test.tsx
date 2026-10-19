import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';

import TemplatingCardRender from './TemplatingCardRender';
import { Store, StoreType } from '../../store';
import { CardType, PreparedType, RarityType } from '../../interfaces/enums';
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

// A single green ({1}{G}) Prepared creature. Green keeps the derived color
// single-colored so the prepare pinline/rules-right resolve to the green asset
// variant (see getSpellBoxVariant / getPrepareRulesRight).
const renderPrepared = (
  opts: {
    enchantment?: boolean;
    manaCost?: string;
    noPrepared?: boolean;
    cardText?: string[];
    prepareName?: string;
    prepareCost?: string;
    prepareText?: string[];
    prepareType?: PreparedType;
  } = {},
) =>
  render(
    <Store.Provider value={mockStoreValue}>
      <TemplatingCardRender
        name="Test Prepared"
        rarity={RarityType.Common}
        cardID="test-prepared"
        manaCost={opts.manaCost ?? '{1}{G}'}
        cardTypes={[
          CardType.Creature,
          ...(opts.noPrepared ? [] : [CardType.Prepared]),
          ...(opts.enchantment ? [CardType.Enchantment] : []),
        ]}
        cardSubTypes=""
        cardText={opts.cardText ?? []}
        prepareName={opts.prepareName}
        prepareCost={opts.prepareCost}
        prepareText={opts.prepareText}
        prepareType={opts.prepareType}
        collectionNumber={1}
        collectionSize={10}
      />
    </Store.Provider>,
  );

const allImages = () => Array.from(document.querySelectorAll('img'));

const findBySrc = (needle: string) =>
  allImages().find(img => (img.getAttribute('src') ?? '').includes(needle));

describe('TemplatingCardRender - prepared frame', () => {
  it('renders the prepared right-box overlay', () => {
    renderPrepared();

    // The overlay is an `<img className={styles.prepareRulesRight} .../>` whose
    // src comes from getPrepareRulesRight: the prepare frame mirrors the
    // adventure/omen geometry across the centerline, so the carved rules box
    // is the RIGHT one (adventures/omens carve the left one). Its presence is
    // prepared-specific: a non-prepared card never emits it.
    const overlay = allImages().find(img => img.className.includes('prepareRulesRight'));
    expect(overlay).toBeInTheDocument();
    expect(overlay?.getAttribute('src')).toContain('prepareRulesRight');
  });

  it('renders the prepare mainframe and pinline assets', () => {
    renderPrepared();

    // Both the mainframe and pinline must resolve to the prepare asset
    // folders; these come from getPrepareMainframe / getPreparePinline and
    // would be the ordinary color frames if `isPrepared` were false.
    const mainframe = allImages().find(img => img.className.includes('mainframe'));
    expect(mainframe?.getAttribute('src')).toContain('mainframes/prepare');

    const pinline = allImages().find(img => img.className.includes('pinline'));
    expect(pinline?.getAttribute('src')).toContain('preparePinline');
  });
});

describe('TemplatingCardRender - prepared right-box color derivation', () => {
  const findRightOverlay = () =>
    allImages().find(img => img.className.includes('prepareRulesRight'));

  it('derives the right box color from the prepareCost, not the manaCost', () => {
    // Green creature ({1}{G}) with a blue prepare ({2}{U}): the right box
    // belongs to the prepare spell, so it must resolve to the blue asset.
    renderPrepared({ prepareCost: '{2}{U}' });

    const overlay = findRightOverlay();
    expect(overlay?.getAttribute('src')).toContain('prepareRulesRight/u');
    expect(overlay?.getAttribute('src')).not.toContain('prepareRulesRight/g');
  });

  it('a two-color prepareCost resolves the two-color combo right part', () => {
    // The right box has dedicated two-color combo assets: {W}{U} must resolve
    // to wu, not the green part of the creature's manaCost.
    renderPrepared({ prepareCost: '{W}{U}' });

    const overlay = findRightOverlay();
    expect(overlay?.getAttribute('src')).toContain('prepareRulesRight/wu');
    expect(overlay?.getAttribute('src')).not.toContain('prepareRulesRight/g');
  });

  it('the pinline still derives from the card manaCost, not the prepareCost', () => {
    // The pinline wraps both halves of the frame, so it keeps the card's own
    // (green) color even when the prepare spell itself is blue.
    renderPrepared({ prepareCost: '{2}{U}' });

    const pinline = allImages().find(img => img.className.includes('pinline'));
    expect(pinline?.getAttribute('src')).toContain('preparePinline/g');
    expect(pinline?.getAttribute('src')).not.toContain('preparePinline/u');
  });

  it('falls back to the manaCost colors when no prepareCost is set', () => {
    renderPrepared({ prepareCost: undefined });

    expect(findRightOverlay()?.getAttribute('src')).toContain('prepareRulesRight/g');
  });
});

describe('TemplatingCardRender - enchantment prepared (nyx mainframe)', () => {
  it('renders the nyx prepare mainframe but keeps regular-carved parts', () => {
    renderPrepared({ enchantment: true });

    const mainframe = allImages().find(img => img.className.includes('mainframe'));
    expect(mainframe?.getAttribute('src')).toContain('mainframes/prepare/nyx');

    const pinline = allImages().find(img => img.className.includes('pinline'));
    expect(pinline?.getAttribute('src')).toContain('preparePinline');
    expect(pinline?.getAttribute('src')).not.toContain('nyx');
  });

  it('CONTROL: a non-enchantment prepared renders no nyx prepare mainframe', () => {
    renderPrepared();

    expect(findBySrc('prepare/nyx')).toBeUndefined();
  });
});

describe('TemplatingCardRender - prepared spell box', () => {
  it('renders the prepare name, cost, type line, and text into the right box', () => {
    renderPrepared({
      prepareName: 'Boil Away',
      prepareCost: '{1}{U}',
      prepareType: PreparedType.Instant,
      prepareText: ['Scry 2, then draw a card.'],
    });

    expect(screen.getByText('Boil Away')).toBeInTheDocument();

    // The cost box holds the injected mana icons (ms-* elements).
    const costBox = Array.from(document.querySelectorAll('div')).find(d =>
      d.className.includes('prepareCost'),
    );
    expect(costBox).toBeDefined();
    expect(costBox!.querySelectorAll('.ms').length).toBeGreaterThan(0);

    // The prepare type line carries no suffix (user decision).
    expect(screen.getByText('Instant')).toBeInTheDocument();
    expect(screen.queryByText('Instant – Prepared')).toBeNull();
    expect(screen.getByText('Scry 2, then draw a card.')).toBeInTheDocument();
  });

  it('a Sorcery prepared renders a Sorcery type line', () => {
    renderPrepared({
      prepareName: 'Bitter Reckoning',
      prepareType: PreparedType.Sorcery,
      prepareText: ['Destroy target creature.'],
    });

    expect(screen.getByText('Sorcery')).toBeInTheDocument();
    expect(screen.queryByText('Sorcery – Prepared')).toBeNull();
  });

  it('renders no prepare spell elements for a card without the Prepared type', () => {
    // Stale face data (prepare fields set but the Prepared card type removed)
    // must not render the prepare box.
    renderPrepared({
      noPrepared: true,
      prepareName: 'Boil Away',
      prepareCost: '{1}{U}',
      prepareType: PreparedType.Instant,
      prepareText: ['Scry 2.'],
    });

    for (const cls of ['prepareName', 'prepareCost', 'prepareTypeLine', 'prepareText']) {
      expect(
        Array.from(document.querySelectorAll('div')).find(d => d.className.includes(cls)),
      ).toBeUndefined();
    }
    expect(findBySrc('prepareRulesRight')).toBeUndefined();
    expect(findBySrc('preparePinline')).toBeUndefined();
  });

  it('constrains the main text box to the left half of the frame', () => {
    // The creature's rules text must move out of the prepare box into the left
    // column; the constrained element carries the prepareLeftText class (the
    // plain .text box spans the full card width).
    renderPrepared({ cardText: ['Flash.'] });

    const constrained = Array.from(document.querySelectorAll('div')).find(d =>
      d.className.includes('prepareLeftText'),
    );
    expect(constrained).toBeDefined();
    expect(screen.getByText('Flash.')).toBeInTheDocument();
  });

  it('keeps whitespace-indented double-hyphen lines as indented em-dash paragraphs', () => {
    renderPrepared({ cardText: ['  --Indented paragraph.'] });

    const paragraph = screen.getByText('—Indented paragraph.').closest('p');
    expect(paragraph?.getAttribute('style')).toBe('margin-left: 0.5em;');
  });

  it('CONTROL: a non-prepared keeps the full-width text box', () => {
    renderPrepared({ noPrepared: true, cardText: ['Flash.'] });

    expect(
      Array.from(document.querySelectorAll('div')).find(d =>
        d.className.includes('prepareLeftText'),
      ),
    ).toBeUndefined();
    expect(screen.getByText('Flash.')).toBeInTheDocument();
  });
});
