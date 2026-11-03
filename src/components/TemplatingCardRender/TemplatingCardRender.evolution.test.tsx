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
  indicators: {
    level1Indicator?: string;
    level2Indicator?: string;
    level2Text?: string[];
    level1Stats?: string;
    level2Stats?: string;
  } = {
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
          level1Text: ['Level 1 ability'],
          level2Text: ['Level 2 ability'],
          level1Stats: '3/3',
          level2Stats: '4/4',
          ...indicators,
        } as any)}
        collectionNumber={1}
        collectionSize={10}
      />
    </Store.Provider>,
  );

const allImages = () => Array.from(document.querySelectorAll('img'));

const expectStandardPtOnFallback = (levelStats: { level1Stats?: string; level2Stats?: string }) => {
  const evolutionRender = renderEvolution(true, levelStats);
  const evolutionPt = allImages().find(img => img.getAttribute('src')?.includes('/pt/'));
  const evolutionStatsClass = screen.getByText('1/1').className;

  expect(evolutionPt).toBeDefined();
  expect(allImages().filter(img => img.className.includes('levelerPt'))).toHaveLength(0);
  expect(document.querySelector('[class*="levelerStatsMid"]')).toBeNull();
  expect(document.querySelector('[class*="levelerStatsBottom"]')).toBeNull();
  expect(document.querySelector('[class*="evolutionWithoutLevelPt"]')).toBeInTheDocument();
  expect(evolutionStatsClass).not.toContain('levelerStatsTop');

  evolutionRender.unmount();
  renderEvolution(false);

  const standardPt = allImages().find(img => img.getAttribute('src')?.includes('/pt/'));
  expect(evolutionPt?.getAttribute('src')).toBe(standardPt?.getAttribute('src'));
  expect(evolutionPt?.className).toBe(standardPt?.className);
  expect(evolutionStatsClass).toBe(screen.getByText('1/1').className);
};

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
    const ptImages = allImages().filter(img => img.className.includes('levelerPt'));
    expect(ptImages).toHaveLength(3);
    expect(document.querySelector('[class*="evolutionWithoutLevelPt"]')).toBeNull();
    expect(ptImages.map(img => img.getAttribute('src'))).toEqual([
      expect.stringContaining('pt/levelers/top/g.png'),
      expect.stringContaining('pt/levelers/mid/g.png'),
      expect.stringContaining('pt/levelers/bottom/g.png'),
    ]);
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
    expect(allImages().filter(img => img.className.includes('levelerPt'))).toHaveLength(0);
  });

  it('renders only two separate P/T images when there is no second evolution', () => {
    renderEvolution(true, { level1Indicator: 'LEVEL 2+', level2Text: [] });

    const ptImages = allImages().filter(img => img.className.includes('levelerPt'));
    expect(ptImages).toHaveLength(2);
    expect(ptImages.map(img => img.getAttribute('src'))).toEqual([
      expect.stringContaining('pt/levelers/top/g.png'),
      expect.stringContaining('pt/levelers/mid/g.png'),
    ]);
    expect(screen.getByText('1/1')).toBeInTheDocument();
    expect(screen.getByText('3/3')).toBeInTheDocument();
    expect(screen.queryByText('4/4')).not.toBeInTheDocument();
  });

  it('renders only the standard P/T when a displayed level has empty P/T', () => {
    expectStandardPtOnFallback({ level1Stats: '' });
  });

  it.each([
    { description: 'level 1 P/T is unset', level1Stats: undefined, level2Stats: '4/4' },
    { description: 'level 2 P/T is unset', level1Stats: '3/3', level2Stats: undefined },
    { description: 'level 1 power is empty', level1Stats: '/0', level2Stats: '4/4' },
    { description: 'level 1 toughness is empty', level1Stats: '0/', level2Stats: '4/4' },
    { description: 'level 2 power is empty', level1Stats: '3/3', level2Stats: '/0' },
    { description: 'level 2 toughness is empty', level1Stats: '3/3', level2Stats: '0/' },
  ])('uses standard P/T when $description', ({ level1Stats, level2Stats }) => {
    expectStandardPtOnFallback({ level1Stats, level2Stats });
  });

  it('renders only the standard P/T when a displayed level matches the default P/T', () => {
    expectStandardPtOnFallback({ level1Stats: '1/1' });
  });

  it.each([
    { description: 'the second level has empty P/T', level2Stats: '' },
    { description: 'the second level matches the default P/T', level2Stats: '1/1' },
  ])('renders only the standard P/T when $description', ({ level2Stats }) => {
    expectStandardPtOnFallback({ level2Stats });
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
