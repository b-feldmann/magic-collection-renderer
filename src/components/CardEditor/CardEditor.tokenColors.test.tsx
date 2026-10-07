import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import CardEditor from './CardEditor';
import { Store, StoreType } from '../../store';
import { CardMainType, CardState, ColorType, RarityType } from '../../interfaces/enums';
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
if (!(HTMLElement.prototype as any).scrollIntoView) {
  (HTMLElement.prototype as any).scrollIntoView = () => {};
}

const mockStoreValue: StoreType = {
  cards: [],
  mechanics: [],
  annotationAccessor: {},
  user: [UNKNOWN_CREATOR],
  currentUser: UNKNOWN_CREATOR,
  dispatch: () => {},
};

const makeCard = (cardMainType: CardMainType, tokenColors?: ColorType[]): CardInterface => ({
  name: '',
  uuid: 'card-1',
  manaCost: '',
  rarity: RarityType.Common,
  front: {
    name: 'Test',
    cardMainType,
    cardText: [],
    ...(tokenColors ? { tokenColors } : {}),
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

describe('CardEditor - token colors', () => {
  it('shows the Token Colors multi-select for a creature token', () => {
    render(
      <Store.Provider value={mockStoreValue}>
        <CardEditor card={makeCard(CardMainType.CreatureToken)} saveTmpCard={() => {}} />
      </Store.Provider>,
    );

    expect(screen.getByText('Token Colors')).toBeVisible();
  });

  it('CONTROL: hides the Token Colors select for a regular creature', () => {
    render(
      <Store.Provider value={mockStoreValue}>
        <CardEditor card={makeCard(CardMainType.Creature)} saveTmpCard={() => {}} />
      </Store.Provider>,
    );

    expect(screen.getByText('Token Colors')).not.toBeVisible();
  });

  it('saves selected colors to the card face', async () => {
    const saveTmpCard = vi.fn();
    render(
      <Store.Provider value={mockStoreValue}>
        <CardEditor card={makeCard(CardMainType.CreatureToken)} saveTmpCard={saveTmpCard} />
      </Store.Provider>,
    );

    const label = screen.getByText('Token Colors');
    const field = label.parentElement!.parentElement!;
    const selectRoot = field.querySelector('.ant-select') as HTMLElement;
    expect(selectRoot).not.toBeNull();
    fireEvent.mouseDown(selectRoot);

    await waitFor(() => {
      expect(document.querySelectorAll('[role="option"]').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByText('White'));

    // The debounced preview path (EDIT_TIME_OFFSET = 600ms) writes the array
    // into the face and calls saveTmpCard with the tmp card.
    await new Promise(resolve => setTimeout(resolve, 700));

    const calls = saveTmpCard.mock.calls.map(call => call[0]);
    const saved = calls.reverse().find(c => c?.front?.tokenColors?.length);
    expect(saved?.front.tokenColors).toEqual([ColorType.White]);
  });
});
