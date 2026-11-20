import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';

import TemplatingCardRender from './TemplatingCardRender';
import { Store, StoreType, TokenCardsContext } from '../../store';
import CardInterface from '../../interfaces/CardInterface';
import { CardType, ColorType, RarityType } from '../../interfaces/enums';
import { UNKNOWN_CREATOR } from '../../utils/constants';
import { getTokenCardFaces } from '../../utils/tokenLinks';

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

const tokenCards = getTokenCardFaces([
  {
    uuid: 'rogue',
    name: 'Rogue',
    front: {
      name: 'Rogue',
      cardTypes: [CardType.Token, CardType.Creature],
      cardSubTypes: 'Rogue',
      cardStats: '1/1',
      tokenColors: [ColorType.Blue],
      cardText: ['Whenever this creature becomes tapped, surveil 1.'],
    },
  } as unknown as CardInterface,
]);

const renderCard = (cardText: string[]) =>
  render(
    <Store.Provider value={mockStoreValue}>
      <TokenCardsContext.Provider value={tokenCards}>
        <TemplatingCardRender
          name="Rogue Maker"
          rarity={RarityType.Common}
          cardID="maker"
          manaCost="{1}{u}"
          cardTypes={[CardType.Artifact]}
          cardText={cardText}
          collectionNumber={1}
          collectionSize={10}
        />
      </TokenCardsContext.Provider>
    </Store.Provider>,
  );

describe('TemplatingCardRender - token references', () => {
  it('shows a token reference written out from its token card', () => {
    const { container } = renderCard([
      'When this artifact enters, create two [Token: 1/1 blue Rogue].',
    ]);
    expect(container.textContent).toContain(
      'When this artifact enters, create two 1/1 blue Rogue creature tokens with',
    );
    expect(container.textContent).toContain('Whenever this creature becomes tapped, surveil 1.');
    expect(container.textContent).not.toContain('[Token');
  });
});
