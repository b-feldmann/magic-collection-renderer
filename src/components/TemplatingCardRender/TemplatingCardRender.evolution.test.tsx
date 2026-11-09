import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';

import TemplatingCardRender from './TemplatingCardRender';
import { Store, StoreType } from '../../store';
import { CardArtStyles, CardType, RarityType } from '../../interfaces/enums';
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
    level1Text?: string[];
    level2Text?: string[];
    level1Stats?: string;
    level2Stats?: string;
  } = {
    level1Indicator: 'LEVEL 2-3',
    level2Indicator: 'LEVEL 4+',
  },
  artStyle?: CardArtStyles,
  manaCost = '{1}{G}',
) =>
  render(
    <Store.Provider value={mockStoreValue}>
      <TemplatingCardRender
        name="Test Evolution"
        rarity={RarityType.Common}
        cardID="test-evolution"
        manaCost={manaCost}
        cardTypes={evolution ? [EVOLUTION, CardType.Creature] : [CardType.Creature]}
        cardText={[]}
        cardStats="1/1"
        artStyle={artStyle}
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

describe('TemplatingCardRender - Evolution level backgrounds', () => {
  const level1Background = () => document.querySelector('[class*="levelerLevel1TextBackground"]');
  const level2Background = () => document.querySelector('[class*="levelerLevel2TextBackground"]');

  it('renders the backgrounds for filled indicators without level text', () => {
    renderEvolution(true, {
      level1Indicator: 'LEVEL 2-3',
      level2Indicator: 'LEVEL 4+',
      level1Text: [],
      level2Text: [],
    });

    expect(level1Background()).toBeInTheDocument();
    expect(level2Background()).toBeInTheDocument();
    expect(screen.getByText('LEVEL 2-3')).toBeInTheDocument();
    expect(screen.getByText('LEVEL 4+')).toBeInTheDocument();
  });

  it('renders only the background of the level with a filled indicator', () => {
    renderEvolution(true, { level1Indicator: 'LEVEL 2+', level1Text: [], level2Text: [] });

    expect(level1Background()).toBeInTheDocument();
    expect(level2Background()).toBeNull();
  });

  it('renders no backgrounds without indicators or level text', () => {
    renderEvolution(true, { level1Text: [], level2Text: [] });

    expect(level1Background()).toBeNull();
    expect(level2Background()).toBeNull();
  });

  it('still renders the level text next to its indicator', () => {
    renderEvolution();

    expect(level1Background()).toBeInTheDocument();
    expect(level2Background()).toBeInTheDocument();
    expect(screen.getByText('Level 1 ability')).toBeInTheDocument();
    expect(screen.getByText('Level 2 ability')).toBeInTheDocument();
  });
});

describe('TemplatingCardRender - Evolution colors on multicolor cards', () => {
  const renderWithCost = (manaCost: string) => {
    renderEvolution(true, undefined, undefined, manaCost);
    const sources = allImages().map(img => img.getAttribute('src') ?? '');
    return (path: string) => sources.some(source => source.includes(path));
  };

  it('uses the first color for the indicators and the second for the P/T on a hybrid card', () => {
    const has = renderWithCost('{1}{ur}');

    expect(has('parts/levelerLevelMid/regular/u')).toBe(true);
    expect(has('parts/levelerLevelBottom/regular/u')).toBe(true);
    expect(has('pt/levelers/top/r')).toBe(true);
    expect(has('pt/levelers/mid/r')).toBe(true);
    expect(has('pt/levelers/bottom/r')).toBe(true);
  });

  it('follows the frame order rather than the order in the mana cost', () => {
    const has = renderWithCost('{ru}');

    expect(has('parts/levelerLevelMid/regular/u')).toBe(true);
    expect(has('pt/levelers/mid/r')).toBe(true);
  });

  it.each([
    ['plain two-color pips', '{u}{r}'],
    ['pips next to a hybrid', '{u}{ur}'],
    ['a hybrid spanning three colors', '{ur}{ub}'],
    ['three colors', '{u}{r}{g}'],
  ])('keeps the gold indicators and P/T for %s', (_, manaCost) => {
    const has = renderWithCost(manaCost);

    expect(has('parts/levelerLevelMid/regular/m')).toBe(true);
    expect(has('parts/levelerLevelBottom/regular/m')).toBe(true);
    expect(has('pt/levelers/top/m')).toBe(true);
    expect(has('pt/levelers/mid/m')).toBe(true);
    expect(has('pt/levelers/bottom/m')).toBe(true);
  });
});

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
    expect(ptImages.map(img => img.getAttribute('src'))).toEqual(
      expect.arrayContaining([
        expect.stringContaining('pt/levelers/top/g.png'),
        expect.stringContaining('pt/levelers/mid/g.png'),
        expect.stringContaining('pt/levelers/bottom/g.png'),
      ]),
    );
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

  it.each([
    { artStyle: CardArtStyles.Extended, frame: 'mainframes/extended/' },
    { artStyle: CardArtStyles.Borderless, frame: 'mainframes/borderless/' },
  ])('keeps the level overlays on the $artStyle frame', ({ artStyle, frame }) => {
    renderEvolution(true, { level1Indicator: 'LEVEL 2-3', level2Indicator: 'LEVEL 4+' }, artStyle);

    expect(allImages().some(img => img.getAttribute('src')?.includes(frame))).toBe(true);
    expect(allImages().some(img => img.getAttribute('src')?.includes('mainframes/m15/'))).toBe(
      false,
    );
    expect(
      allImages().some(img => img.getAttribute('src')?.includes('parts/levelerLevelMid/regular/')),
    ).toBe(true);
    expect(
      allImages().some(img =>
        img.getAttribute('src')?.includes('parts/levelerLevelBottom/regular/'),
      ),
    ).toBe(true);
    expect(allImages().filter(img => img.className.includes('levelerPt'))).toHaveLength(3);
    expect(screen.getByText('Level 1 ability')).toBeInTheDocument();
    expect(screen.getByText('Level 2 ability')).toBeInTheDocument();
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
    expect(ptImages.map(img => img.getAttribute('src'))).toEqual(
      expect.arrayContaining([
        expect.stringContaining('pt/levelers/top/g.png'),
        expect.stringContaining('pt/levelers/mid/g.png'),
      ]),
    );
    expect(screen.getByText('1/1')).toBeInTheDocument();
    expect(screen.getByText('3/3')).toBeInTheDocument();
    expect(screen.queryByText('4/4')).not.toBeInTheDocument();
  });

  it.each([
    { description: 'unset', level1Stats: undefined },
    { description: 'empty', level1Stats: '' },
    { description: 'blank', level1Stats: '   ' },
    { description: 'missing its power', level1Stats: '/0' },
    { description: 'missing its toughness', level1Stats: '0/' },
  ])(
    'still renders the level P/T and shows 0/0 for level 1 when its P/T is $description',
    ({ level1Stats }) => {
      renderEvolution(true, {
        level1Indicator: 'LEVEL 2-3',
        level2Indicator: 'LEVEL 4+',
        level1Stats,
      });

      expect(allImages().filter(img => img.className.includes('levelerPt'))).toHaveLength(3);
      expect(screen.getByText('1/1').className).toContain('levelerStatsTop');
      expect(screen.getByText('0/0').className).toContain('levelerStatsMid');
      expect(screen.getByText('4/4')).toBeInTheDocument();
    },
  );

  it('keeps the level P/T when level 1 matches the default P/T', () => {
    renderEvolution(true, {
      level1Indicator: 'LEVEL 2-3',
      level2Indicator: 'LEVEL 4+',
      level1Stats: '1/1',
    });

    expect(allImages().filter(img => img.className.includes('levelerPt'))).toHaveLength(3);
    expect(screen.getAllByText('1/1')).toHaveLength(2);
    expect(screen.getByText('4/4')).toBeInTheDocument();
  });

  it.each([
    { description: 'unset', level2Stats: undefined },
    { description: 'empty', level2Stats: '' },
    { description: 'blank', level2Stats: '   ' },
    { description: 'missing its power', level2Stats: '/0' },
    { description: 'missing its toughness', level2Stats: '0/' },
  ])('shows 0/0 for level 2 when its P/T is $description', ({ level2Stats }) => {
    renderEvolution(true, {
      level1Indicator: 'LEVEL 2-3',
      level2Indicator: 'LEVEL 4+',
      level2Stats,
    });

    expect(allImages().filter(img => img.className.includes('levelerPt'))).toHaveLength(3);
    expect(screen.getByText('1/1')).toBeInTheDocument();
    expect(screen.getByText('3/3')).toBeInTheDocument();
    expect(screen.getByText('0/0').className).toContain('levelerStatsBottom');
  });

  it('keeps the level P/T when only level 2 matches the default P/T', () => {
    renderEvolution(true, {
      level1Indicator: 'LEVEL 2-3',
      level2Indicator: 'LEVEL 4+',
      level2Stats: '1/1',
    });

    expect(allImages().filter(img => img.className.includes('levelerPt'))).toHaveLength(3);
    expect(screen.getByText('3/3')).toBeInTheDocument();
    expect(screen.getAllByText('1/1')).toHaveLength(2);
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
