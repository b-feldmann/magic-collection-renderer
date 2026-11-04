import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import dayjs from 'dayjs';

import CardEditor from './CardEditor';
import { Store, StoreType } from '../../store';
import { CardType, CardState, RarityType } from '../../interfaces/enums';
import { UNKNOWN_CREATOR } from '../../utils/constants';
import type CardInterface from '../../interfaces/CardInterface';

vi.mock('../../actions/cardActions', () => ({
  updateCard: vi.fn(() => Promise.resolve({})),
  deleteCard: vi.fn(() => Promise.resolve({})),
}));

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

const makeCard = (createdAt?: number): CardInterface => ({
  name: 'Test Card',
  uuid: 'card-1',
  manaCost: '',
  rarity: RarityType.Common,
  front: { name: 'Test Card', cardTypes: [CardType.Creature], cardText: [] },
  creator: UNKNOWN_CREATOR,
  meta: {
    comment: '',
    likes: [],
    dislikes: [],
    lastUpdated: 0,
    createdAt: createdAt as number,
    state: CardState.Draft,
  },
});

const renderEditor = (card: CardInterface) => {
  const store: StoreType = {
    cards: [],
    mechanics: [],
    annotationAccessor: {},
    user: [UNKNOWN_CREATOR],
    currentUser: UNKNOWN_CREATOR,
    dispatch: () => {},
  };

  return render(
    <Store.Provider value={store}>
      <CardEditor card={card} saveTmpCard={() => {}} />
    </Store.Provider>,
  );
};

describe('CardEditor creation date', () => {
  it('shows the creation date as plain read-only text under organization & credits', () => {
    const createdAt = dayjs('2024-03-15T10:30:00').valueOf();
    renderEditor(makeCard(createdAt));

    const term = screen.getByRole('term');
    expect(term).toHaveTextContent('Created');
    expect(term.closest('details')).toHaveTextContent('Organization & credits');
    expect(screen.getByRole('definition')).toHaveTextContent('15.03.2024 10:30');
    expect(screen.queryByRole('textbox', { name: 'Created' })).not.toBeInTheDocument();
  });

  it('does not pretend a card without a stored creation date was created just now', () => {
    renderEditor(makeCard(undefined));

    expect(screen.getByRole('definition')).toHaveTextContent('Unknown');
  });
});
