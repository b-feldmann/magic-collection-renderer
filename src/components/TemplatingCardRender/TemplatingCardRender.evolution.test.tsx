import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';

import TemplatingCardRender from './TemplatingCardRender';
import { Store, StoreType } from '../../store';
import { CardType, RarityType } from '../../interfaces/enums';
import { UNKNOWN_CREATOR } from '../../utils/constants';

const EVOLUTION = CardType.Evolution;

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

const renderEvolution = (
  evolution = true,
  indicators: { level1Indicator?: string; level2Indicator?: string } = {
    level1Indicator: 'LEVEL 2-3',
    level2Indicator: 'LEVEL 4+',
  },
) =>
  render(
    <Store.Provider value={mockStoreValue}>
      <TemplatingCardRender
        name="Test Evolution"
        rarity={RarityType.Common}
        cardID="test-evolution"
        manaCost="{1}{G}"
        cardTypes={evolution ? [EVOLUTION, CardType.Creature] : [CardType.Creature]}
        cardText={[]}
        cardStats="1/1"
        {...({
          ...indicators,
          level1Text: ['Level 1 ability'],
          level2Text: ['Level 2 ability'],
          level1Stats: '3/3',
          level2Stats: '4/4',
        } as any)}
        collectionNumber={1}
        collectionSize={10}
      />
    </Store.Provider>,
  );

const allImages = () => Array.from(document.querySelectorAll('img'));

describe('TemplatingCardRender - Evolution frame', () => {
  it('uses the regular frame with level overlays, indicators, and all three P/T rows', () => {
    renderEvolution();

    expect(allImages().some(img => img.getAttribute('src')?.includes('mainframes/m15/'))).toBe(
      true,
    );
    expect(
      allImages().some(img => img.getAttribute('src')?.includes('parts/levelerLevelMid/regular/')),
    ).toBe(true);
    expect(
      allImages().some(img =>
        img.getAttribute('src')?.includes('parts/levelerLevelBottom/regular/'),
      ),
    ).toBe(true);
    expect(allImages().some(img => img.className.includes('levelerPt'))).toBe(true);
    expect(
      allImages()
        .find(img => img.className.includes('levelerPt'))
        ?.getAttribute('src'),
    ).toContain('pt/levelers/g.png');
    // Only real (carved) parts render: no debug-colored overlay masks.
    for (const cls of ['levelerRulesTop', 'levelerRulesMid', 'levelerRulesBottom']) {
      expect(allImages().some(img => img.className.includes(cls))).toBe(false);
    }
    expect(screen.getByText('LEVEL 2-3')).toBeInTheDocument();
    expect(screen.getByText('LEVEL 4+')).toBeInTheDocument();
    expect(
      screen.getByText('Level 1 ability').closest('[class*="levelerLevel1Text"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Level 2 ability').closest('[class*="levelerLevel2Text"]'),
    ).toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument();
    expect(screen.getByText('3/3')).toBeInTheDocument();
    expect(screen.getByText('4/4')).toBeInTheDocument();
  });

  it('keeps ordinary cards on the regular frame without level indicators', () => {
    renderEvolution(false);

    expect(allImages().some(img => img.getAttribute('src')?.includes('mainframes/levelers'))).toBe(
      false,
    );
    expect(screen.queryByText('LEVEL 2-3')).toBeNull();
    expect(screen.queryByText('LEVEL 4+')).toBeNull();
    expect(screen.getByText('1/1')).toBeInTheDocument();
  });

  it('does not render the level 2 indicator plate when its indicator is unset', () => {
    renderEvolution(true, { level1Indicator: 'LEVEL 2-3' });

    expect(screen.getByText('LEVEL 2-3')).toBeInTheDocument();
    expect(screen.queryByText('LEVEL 4+')).toBeNull();
    expect(
      allImages().some(img => img.getAttribute('src')?.includes('parts/levelerLevelMid/regular/')),
    ).toBe(true);
    expect(
      allImages().some(img =>
        img.getAttribute('src')?.includes('parts/levelerLevelBottom/regular/'),
      ),
    ).toBe(false);
  });

  it('does not render the level 1 indicator plate when its indicator is unset', () => {
    renderEvolution(true, { level2Indicator: 'LEVEL 4+' });

    expect(screen.queryByText('LEVEL 2-3')).toBeNull();
    expect(screen.getByText('LEVEL 4+')).toBeInTheDocument();
    expect(
      allImages().some(img => img.getAttribute('src')?.includes('parts/levelerLevelMid/regular/')),
    ).toBe(false);
    expect(
      allImages().some(img =>
        img.getAttribute('src')?.includes('parts/levelerLevelBottom/regular/'),
      ),
    ).toBe(true);
  });
});
