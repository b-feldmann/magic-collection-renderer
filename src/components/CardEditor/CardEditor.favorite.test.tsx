import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

import CardEditor from './CardEditor';
import { Store, StoreType } from '../../store';
import { CardType, CardState, RarityType } from '../../interfaces/enums';
import { UNKNOWN_CREATOR } from '../../utils/constants';
import type CardInterface from '../../interfaces/CardInterface';
import { updateCard } from '../../actions/cardActions';

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

const CREATOR = { ...UNKNOWN_CREATOR, name: 'Creator', uuid: 'creator-1' };
const OTHER_USER = { ...UNKNOWN_CREATOR, name: 'Other', uuid: 'other-1' };

const makeCard = (favorite = false, creator = CREATOR): CardInterface => ({
  name: 'Test Card',
  uuid: 'card-1',
  manaCost: '',
  rarity: RarityType.Common,
  front: { name: 'Test Card', cardTypes: [CardType.Creature], cardText: [] },
  creator,
  favorite,
  meta: {
    comment: '',
    likes: [],
    dislikes: [],
    lastUpdated: 0,
    createdAt: 0,
    state: CardState.Draft,
  },
});

const renderEditor = (currentUser = CREATOR, card = makeCard()) => {
  const store: StoreType = {
    cards: [],
    mechanics: [],
    annotationAccessor: {},
    user: [CREATOR, OTHER_USER],
    currentUser,
    dispatch: () => {},
  };

  return render(
    <Store.Provider value={store}>
      <CardEditor card={card} saveTmpCard={() => {}} />
    </Store.Provider>,
  );
};

describe('CardEditor favorite button', () => {
  beforeEach(() => vi.mocked(updateCard).mockClear());

  it('lets the card creator mark and unmark their card as favorite', () => {
    renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Mark as favorite' }));

    expect(updateCard).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ uuid: 'card-1', favorite: true }),
    );
    expect(screen.getByRole('button', { name: 'Unmark as favorite' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Unmark as favorite' }));

    expect(updateCard).toHaveBeenLastCalledWith(
      expect.any(Function),
      expect.objectContaining({ uuid: 'card-1', favorite: false }),
    );
    expect(screen.getByRole('button', { name: 'Mark as favorite' })).toBeVisible();
  });

  it('shows the unmark action when the creator already favorited the card', () => {
    renderEditor(CREATOR, makeCard(true));

    expect(screen.getByRole('button', { name: 'Unmark as favorite' })).toBeVisible();
  });

  it('does not show the favorite action to someone who did not create the card', () => {
    renderEditor(OTHER_USER);

    expect(screen.queryByRole('button', { name: /mark as favorite/i })).not.toBeInTheDocument();
  });
});
