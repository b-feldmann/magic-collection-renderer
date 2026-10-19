import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';

import TemplatingCardRender from './TemplatingCardRender';
import { Store, StoreType } from '../../store';
import { CardType, ColorType, RarityType } from '../../interfaces/enums';
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

const renderCard = (
  cardTypes: CardType[],
  cardText: string[],
  manaCost = '',
  colorIdentity?: ColorType[],
) =>
  render(
    <Store.Provider value={mockStoreValue}>
      <TemplatingCardRender
        name="Test Land"
        rarity={RarityType.Common}
        cardID="test-land"
        manaCost={manaCost}
        cardTypes={cardTypes}
        cardSubTypes=""
        cardText={cardText}
        colorIdentity={colorIdentity}
        collectionNumber={1}
        collectionSize={10}
      />
    </Store.Provider>,
  );

const renderLand = (cardText: string[]) => renderCard([CardType.Land], cardText);

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

describe('TemplatingCardRender - no-cost card identity', () => {
  it('uses the rules-text color for a card without a mana cost', () => {
    const fromText = renderCard([CardType.Creature], ['This spell costs {G} less to cast.']);
    const textFrame = Array.from(fromText.container.querySelectorAll('img')).find(img =>
      img.className.includes('mainframe'),
    );
    const textFrameSource = textFrame?.getAttribute('src');
    fromText.unmount();

    const fromCost = renderCard([CardType.Creature], [], '{G}');
    const costFrame = Array.from(fromCost.container.querySelectorAll('img')).find(img =>
      img.className.includes('mainframe'),
    );

    expect(textFrameSource).toBeTruthy();
    expect(costFrame?.getAttribute('src')).toBe(textFrameSource);
  });

  it('renders a configured identity when there is no mana cost', () => {
    const fromIdentity = renderCard([CardType.Creature], ['{G}'], '', [ColorType.Blue]);
    const identityFrame = Array.from(fromIdentity.container.querySelectorAll('img')).find(img =>
      img.className.includes('mainframe'),
    );
    const identityFrameSource = identityFrame?.getAttribute('src');
    fromIdentity.unmount();

    const fromCost = renderCard([CardType.Creature], [], '{U}');
    const costFrame = Array.from(fromCost.container.querySelectorAll('img')).find(img =>
      img.className.includes('mainframe'),
    );

    expect(identityFrameSource).toBeTruthy();
    expect(costFrame?.getAttribute('src')).toBe(identityFrameSource);
  });

  it('ignores a configured identity when rendering a card with a mana cost', () => {
    const fromIdentity = renderCard([CardType.Creature], [], '{U}', [ColorType.Green]);
    const identityFrame = Array.from(fromIdentity.container.querySelectorAll('img')).find(img =>
      img.className.includes('mainframe'),
    );
    const identityFrameSource = identityFrame?.getAttribute('src');
    fromIdentity.unmount();

    const fromCost = renderCard([CardType.Creature], [], '{U}');
    const costFrame = Array.from(fromCost.container.querySelectorAll('img')).find(img =>
      img.className.includes('mainframe'),
    );

    expect(identityFrameSource).toBeTruthy();
    expect(costFrame?.getAttribute('src')).toBe(identityFrameSource);
  });
});

describe('TemplatingCardRender - token land frame parts', () => {
  it('a two-color token land shows the token land type part and the token rules part', () => {
    renderCard([CardType.Token, CardType.Land], ['{T}: Add {W} or {U}.']);

    const typePart = Array.from(document.querySelectorAll('img')).find(img =>
      img.className.includes('typePart'),
    );
    const rulesPart = Array.from(document.querySelectorAll('img')).find(img =>
      img.className.includes('rulesPart'),
    );
    expect(typePart?.getAttribute('src')).toContain('/tokenType/l.png');
    expect(rulesPart?.getAttribute('src')).toContain('/tokenRules/wu.png');
  });

  it('a colorless token land still shows the token land type part', () => {
    renderCard([CardType.Token, CardType.Land], ['{T}: Add {C}.']);

    const typePart = Array.from(document.querySelectorAll('img')).find(img =>
      img.className.includes('typePart'),
    );
    expect(typePart?.getAttribute('src')).toContain('/tokenType/l.png');
  });

  it('a two-color regular land shows the regular rules part, not the token one', () => {
    renderCard([CardType.Land], ['{T}: Add {W} or {U}.']);

    const rulesPart = Array.from(document.querySelectorAll('img')).find(img =>
      img.className.includes('rulesPart'),
    );
    expect(rulesPart?.getAttribute('src')).toContain('/rules/wu.png');
    expect(rulesPart?.getAttribute('src')).not.toContain('tokenRules');
  });
});
