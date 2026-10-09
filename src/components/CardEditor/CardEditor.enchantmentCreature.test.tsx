import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import CardEditor from './CardEditor';
import { Store, StoreType } from '../../store';
import { CardType, CardState, RarityType } from '../../interfaces/enums';
import { UNKNOWN_CREATOR } from '../../utils/constants';
import type CardInterface from '../../interfaces/CardInterface';

vi.mock('../../actions/cardActions', () => ({
  updateCard: vi.fn(() => Promise.resolve({})),
  deleteCard: vi.fn(() => Promise.resolve({})),
}));

// jsdom polyfills required by antd components.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
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

const makeCard = (cardTypes: CardType[]): CardInterface => ({
  name: '',
  uuid: 'card-1',
  manaCost: '{1}{W}',
  rarity: RarityType.Common,
  front: {
    name: 'Test',
    cardTypes,
    cardText: [],
  },
  creator: UNKNOWN_CREATOR,
  meta: {
    comment: '',
    likes: [],
    dislikes: [],
    lastUpdated: 0,
    createdAt: 0,
    state: CardState.Draft,
  },
});

describe('CardEditor - Enchantment Creature main type', () => {
  it('shows the Power/Toughness input like other creature types', () => {
    render(
      <Store.Provider value={mockStoreValue}>
        <CardEditor
          card={makeCard([CardType.Enchantment, CardType.Creature])}
          saveTmpCard={() => {}}
        />
      </Store.Provider>,
    );

    expect(screen.getByText('Power')).toBeVisible();
    expect(screen.getByText('Toughness')).toBeVisible();
  });

  it('CONTROL: a plain Enchantment hides the Power/Toughness input', () => {
    render(
      <Store.Provider value={mockStoreValue}>
        <CardEditor card={makeCard([CardType.Enchantment])} saveTmpCard={() => {}} />
      </Store.Provider>,
    );

    expect(screen.getByText('Power')).not.toBeVisible();
    expect(screen.getByText('Toughness')).not.toBeVisible();
  });
});
