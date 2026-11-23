import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';

import TemplatingCardRender from './TemplatingCardRender';
import { AftermathType, CardArtStyles, CardType, RarityType } from '../../interfaces/enums';

// jsdom polyfills required by TextResize.
if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = class {
    observe() {}

    unobserve() {}

    disconnect() {}
  };
}

const renderAftermath = (props: Partial<React.ComponentProps<typeof TemplatingCardRender>> = {}) =>
  render(
    <TemplatingCardRender
      name="Destined"
      rarity={RarityType.Uncommon}
      cardID="test-aftermath"
      manaCost="{1}{B}"
      cardTypes={[CardType.Instant, CardType.Aftermath]}
      cardText={['Target creature gets +1/+0.']}
      aftermathName="Lead"
      aftermathCost="{3}{G}"
      aftermathType={AftermathType.Sorcery}
      aftermathText={['Aftermath', 'All creatures able to block this turn do so.']}
      collectionNumber={1}
      collectionSize={10}
      {...props}
    />,
  );

type Half = 'aftermathFrameUpright' | 'aftermathFrameTurned';

const imagesOf = (className: string) =>
  Array.from(document.querySelectorAll('img')).filter(img => img.className.includes(className));

const frameOf = (half: Half) =>
  imagesOf(half)
    .find(img => img.className.includes('mainframe'))
    ?.getAttribute('src');

const partsOf = (half: Half) =>
  imagesOf(half)
    .find(img => img.className.includes('aftermathParts'))
    ?.getAttribute('src');

const sourcesOf = (alt: string) =>
  screen.getAllByAltText(alt).map(image => image.getAttribute('src'));

describe('TemplatingCardRender - aftermath frame', () => {
  it('renders the second half with its name, cost, type and text', () => {
    renderAftermath();

    const half = screen.getByTestId('aftermath-half');
    expect(within(half).getByText('Lead')).toBeInTheDocument();
    expect(within(half).getByText('Sorcery')).toBeInTheDocument();
    expect(half).toHaveTextContent('All creatures able to block this turn do so.');
    expect(half.querySelector('.ms-g')).not.toBeNull();
  });

  it('keeps the marker out of the type line', () => {
    renderAftermath();

    expect(screen.getByText('Instant')).toBeInTheDocument();
    expect(screen.queryByText(/Instant.*Aftermath/)).toBeNull();
  });

  it('refers to the half itself with ~ in its text', () => {
    renderAftermath({ aftermathText: ['Exile ~.'] });

    expect(screen.getByTestId('aftermath-half')).toHaveTextContent('Exile Lead.');
  });

  it('colors each half by its own cost', () => {
    renderAftermath();

    expect(frameOf('aftermathFrameUpright')).toMatch(/aftermath\/b/);
    expect(frameOf('aftermathFrameTurned')).toMatch(/aftermath\/g/);
    expect(imagesOf('aftermathParts')).toHaveLength(0);
  });

  it("uses the card's color for a second half without a cost", () => {
    renderAftermath({ aftermathCost: undefined });

    expect(frameOf('aftermathFrameTurned')).toMatch(/aftermath\/b/);
  });

  it('gives a two-color half a gold frame with two-color parts, in any order', () => {
    renderAftermath({ manaCost: '{R}{U}', aftermathCost: '{W}{G}' });

    expect(frameOf('aftermathFrameUpright')).toMatch(/aftermath\/m/);
    expect(partsOf('aftermathFrameUpright')).toMatch(/aftermathParts\/ur/);
    expect(frameOf('aftermathFrameTurned')).toMatch(/aftermath\/m/);
    expect(partsOf('aftermathFrameTurned')).toMatch(/aftermathParts\/gw/);
  });

  it('shows separate art in both halves', () => {
    renderAftermath({ cover: 'url:top.png', aftermathCover: 'url:turned.png' });

    expect(sourcesOf('cover')).toContain('top.png');
    expect(sourcesOf('aftermath cover')).toContain('turned.png');
  });

  it('keeps the aftermath frame whatever art style is stored on the card', () => {
    renderAftermath({ artStyle: CardArtStyles.Borderless });

    expect(frameOf('aftermathFrameUpright')).toMatch(/aftermath\/b/);
  });

  it('draws no second half on other cards', () => {
    renderAftermath({ cardTypes: [CardType.Instant] });

    expect(screen.queryByTestId('aftermath-half')).toBeNull();
    expect(screen.queryByAltText('aftermath cover')).toBeNull();
  });
});
