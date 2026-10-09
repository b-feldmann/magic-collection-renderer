import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import CardEditor from './CardEditor';
import { Store, StoreType } from '../../store';
import { CardType, CardState, RarityType } from '../../interfaces/enums';
import { UNKNOWN_CREATOR, BJENNWARE } from '../../utils/constants';
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

const SOMEONE_ELSE = {
  ...UNKNOWN_CREATOR,
  name: 'SomeoneElse',
  uuid: 'user-2',
};

const makeCard = (creator: typeof UNKNOWN_CREATOR): CardInterface => ({
  name: '',
  uuid: 'card-1',
  manaCost: '{2}',
  rarity: RarityType.Common,
  front: {
    name: 'Test',
    cardTypes: [CardType.Artifact],
    cardText: [],
  },
  creator,
  meta: {
    comment: '',
    likes: [],
    dislikes: [],
    lastUpdated: 0,
    createdAt: 0,
    state: CardState.Draft,
  },
});

const renderEditor = (currentUser: typeof UNKNOWN_CREATOR, card: CardInterface) => {
  const mockStoreValue: StoreType = {
    cards: [],
    mechanics: [],
    annotationAccessor: {},
    user: [UNKNOWN_CREATOR, currentUser],
    currentUser,
    dispatch: () => {},
  };

  render(
    <Store.Provider value={mockStoreValue}>
      <CardEditor card={card} saveTmpCard={() => {}} />
    </Store.Provider>,
  );
};

describe('CardEditor - delete permission', () => {
  const user = { ...UNKNOWN_CREATOR, name: 'LoginUser', uuid: 'user-1' };

  it('shows the delete button for the card creator', () => {
    renderEditor(user, makeCard(user));

    expect(screen.getByText('Delete Card')).toBeVisible();
  });

  it('hides the delete button for a user who did not create the card', () => {
    renderEditor(user, makeCard(SOMEONE_ELSE));

    expect(screen.queryByText('Delete Card')).not.toBeInTheDocument();
  });

  it('shows the delete button for BJennWare on any card', () => {
    const bjennware = { ...UNKNOWN_CREATOR, name: BJENNWARE, uuid: 'user-b' };

    renderEditor(bjennware, makeCard(SOMEONE_ELSE));

    expect(screen.getByText('Delete Card')).toBeVisible();
  });
});
