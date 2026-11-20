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

const renderToken = (tokenColors?: ColorType[], manaCost = '') =>
  render(
    <Store.Provider value={mockStoreValue}>
      <TemplatingCardRender
        name="Test Token"
        rarity={RarityType.Common}
        cardID="test-token"
        manaCost={manaCost}
        cardTypes={[CardType.Token, CardType.Creature]}
        cardSubTypes=""
        cardText={[]}
        tokenColors={tokenColors}
        collectionNumber={1}
        collectionSize={10}
      />
    </Store.Provider>,
  );

const getMainframe = () => {
  const images = Array.from(document.querySelectorAll('img'));
  return images.find(img => img.className.includes('mainframe'));
};

describe('TemplatingCardRender - token colors', () => {
  it('renders the mono-color token mainframe from tokenColors', () => {
    renderToken([ColorType.White]);

    const mainframe = getMainframe();
    expect(mainframe).toBeInTheDocument();
    expect(mainframe?.getAttribute('src')).toContain('tokenFrameW');
  });

  it('renders the gold token mainframe for two selected colors', () => {
    renderToken([ColorType.White, ColorType.Blue]);

    const mainframe = getMainframe();
    expect(mainframe).toBeInTheDocument();
    expect(mainframe?.getAttribute('src')).toContain('tokenFrameM');
  });

  it('renders the colorless token mainframe when tokenColors is missing', () => {
    renderToken(undefined);

    const mainframe = getMainframe();
    expect(mainframe).toBeInTheDocument();
    expect(mainframe?.getAttribute('src')).toContain('frameC');
  });

  it('renders the colorless token mainframe when tokenColors is an empty array', () => {
    renderToken([]);

    const mainframe = getMainframe();
    expect(mainframe).toBeInTheDocument();
    expect(mainframe?.getAttribute('src')).toContain('frameC');
  });

  it('never derives token colors from the mana cost', () => {
    renderToken(undefined, '{2}{W}');

    const mainframe = getMainframe();
    expect(mainframe).toBeInTheDocument();
    expect(mainframe?.getAttribute('src')).toContain('frameC');
  });

  it('renders the two-color token pinline for a two-color token', () => {
    renderToken([ColorType.White, ColorType.Blue]);

    const pinline = Array.from(document.querySelectorAll('img')).find(img =>
      img.className.includes('pinline'),
    );
    expect(pinline).toBeInTheDocument();
    expect(pinline?.getAttribute('src')).toContain('/tokenPinline/wu');
  });

  it('renders two-color name and type plates for a two-color token', () => {
    renderToken([ColorType.White, ColorType.Blue]);

    const partSrc = (part: string) =>
      Array.from(document.querySelectorAll('img'))
        .find(img => img.className.includes(part))
        ?.getAttribute('src');
    expect(partSrc('titlePart')).toContain('/tokenTitle/wu');
    expect(partSrc('typePart')).toContain('/tokenType/wu');
  });

  it('prints the name in white on the dark banner of the token frame', () => {
    const nameOnDark = () =>
      Boolean(
        document.querySelector('[class*="tokenTitleOnDark"]')?.textContent?.includes('Test Token'),
      );

    // Only mono-white tokens keep the black name of their light banner.
    const white = renderToken([ColorType.White]);
    expect(nameOnDark()).toBe(false);
    white.unmount();

    [
      [ColorType.Blue],
      [ColorType.White, ColorType.Blue],
      [ColorType.Blue, ColorType.Black],
      [ColorType.White, ColorType.Black],
      [ColorType.White, ColorType.Blue, ColorType.Black],
      undefined,
    ].forEach(colors => {
      const token = renderToken(colors);
      expect(nameOnDark()).toBe(true);
      token.unmount();
    });
  });
});
