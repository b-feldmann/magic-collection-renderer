import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';

import TemplatingCardRender from './TemplatingCardRender';
import { Store, StoreType } from '../../store';
import { CardArtStyles, CardType, RarityType } from '../../interfaces/enums';
import { UNKNOWN_CREATOR } from '../../utils/constants';

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

const renderCard = (
  manaCost: string,
  cardTypes: CardType[] = [CardType.Creature],
  artStyle?: CardArtStyles,
) => {
  const { container } = render(
    <Store.Provider value={mockStoreValue}>
      <TemplatingCardRender
        name="Test Card"
        rarity={RarityType.Common}
        cardID="test-card"
        manaCost={manaCost}
        cardTypes={cardTypes}
        cardSubTypes="Human"
        cardText={['Some rules text.']}
        cardStats="2/2"
        collectionNumber={1}
        collectionSize={10}
        artStyle={artStyle}
      />
    </Store.Provider>,
  );
  const sources = Array.from(container.querySelectorAll('img')).map(
    image => image.getAttribute('src') ?? '',
  );
  return {
    sources,
    has: (path: string) => sources.some(source => source.includes(path)),
  };
};

describe('TemplatingCardRender - two-color hybrid frame', () => {
  it('uses the two-color frame and parts for a hybrid-only cost', () => {
    const card = renderCard('{2}{ur}{ur}');

    expect(card.has('mainframes/m15/regular/ur')).toBe(true);
    expect(card.has('parts/title/ur')).toBe(true);
    expect(card.has('parts/type/ur')).toBe(true);
    expect(card.has('parts/rules/ur')).toBe(true);
    expect(card.has('/m.png')).toBe(false);
  });

  it('uses the Nyx two-color frame for enchantment creatures', () => {
    const card = renderCard('{ur}', [CardType.Enchantment, CardType.Creature]);

    expect(card.has('mainframes/m15/nyx/ur')).toBe(true);
  });

  it('uses the extended two-color frame in the extended art style', () => {
    const card = renderCard('{ur}', [CardType.Creature], CardArtStyles.Extended);

    expect(card.has('mainframes/extended/ur')).toBe(true);
    expect(card.has('parts/title/ur')).toBe(true);
  });

  it('uses the extended Nyx two-color frame for extended enchantment creatures', () => {
    const card = renderCard(
      '{ur}',
      [CardType.Enchantment, CardType.Creature],
      CardArtStyles.Extended,
    );

    expect(card.has('mainframes/extended/nyx/ur')).toBe(true);
  });

  it('keeps the artifact frame but shows two-color parts on a hybrid artifact', () => {
    const card = renderCard('{ur}', [CardType.Artifact]);

    expect(card.has('mainframes/m15/regular/a')).toBe(true);
    expect(card.has('parts/title/ur')).toBe(true);
  });

  it.each([
    ['pips next to the hybrid', '{u}{ur}'],
    ['plain two-color pips', '{u}{r}'],
    ['a hybrid spanning three colors', '{ur}{ub}'],
  ])('keeps the gold frame for %s', (_, cost) => {
    const card = renderCard(cost);

    expect(card.has('mainframes/m15/regular/m')).toBe(true);
    expect(card.has('mainframes/m15/regular/ur')).toBe(false);
  });

  it('shows the two-color rules part on a gold two-color card', () => {
    const card = renderCard('{u}{r}');

    expect(card.has('mainframes/m15/regular/m')).toBe(true);
    expect(card.has('parts/title/m')).toBe(true);
    expect(card.has('parts/type/m')).toBe(true);
    expect(card.has('parts/rules/ur')).toBe(true);
    expect(card.has('parts/rules/m')).toBe(false);
  });

  it('shows the two-color rules part on an extended two-color card', () => {
    const card = renderCard('{u}{r}', [CardType.Creature], CardArtStyles.Extended);

    expect(card.has('mainframes/extended/m')).toBe(true);
    expect(card.has('parts/rules/ur')).toBe(true);
  });

  it('shows no rules part on a card with three colors', () => {
    const card = renderCard('{u}{r}{g}');

    expect(card.sources.some(source => source.includes('parts/rules/'))).toBe(false);
  });
});
