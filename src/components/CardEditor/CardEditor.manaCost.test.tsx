import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import CardEditor from './CardEditor';
import { updateCard } from '../../actions/cardActions';
import { Store, StoreType } from '../../store';
import { CardState, CardType, RarityType } from '../../interfaces/enums';
import { EDIT_SAVE_OFFSET, UNKNOWN_CREATOR } from '../../utils/constants';
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

const card: CardInterface = {
  name: 'Test',
  uuid: 'card-1',
  manaCost: '{1}',
  rarity: RarityType.Common,
  front: { name: 'Test', cardTypes: [CardType.Creature], cardText: [] },
  creator: UNKNOWN_CREATOR,
  meta: {
    comment: '',
    likes: [],
    dislikes: [],
    lastUpdated: 0,
    createdAt: 0,
    state: CardState.Draft,
  },
};

const storeValue: StoreType = {
  cards: [card],
  mechanics: [],
  annotationAccessor: {},
  user: [UNKNOWN_CREATOR],
  currentUser: UNKNOWN_CREATOR,
  dispatch: () => {},
};

const typeManaCost = (value: string) => {
  render(
    <Store.Provider value={storeValue}>
      <CardEditor card={card} saveTmpCard={() => {}} />
    </Store.Provider>,
  );
  const input = screen.getByLabelText('Mana cost');
  fireEvent.change(input, { target: { value } });
  return input;
};

const finishAutosaveDelay = (delay = EDIT_SAVE_OFFSET) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(delay);
  });

describe('CardEditor - mana cost correction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(updateCard).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps what was typed until the autosave, then shows the corrected cost', async () => {
    const input = typeManaCost('2{b}');

    await finishAutosaveDelay(EDIT_SAVE_OFFSET - 1);
    expect(input).toHaveValue('2{b}');
    expect(updateCard).not.toHaveBeenCalled();

    await finishAutosaveDelay(1);
    expect(input).toHaveValue('{2}{b}');
    expect(updateCard).toHaveBeenCalledTimes(1);
  });

  it('leaves a cost the renderer cannot parse in the field', async () => {
    const input = typeManaCost('{');

    await finishAutosaveDelay();

    expect(input).toHaveValue('{');
    expect(updateCard).toHaveBeenCalledTimes(1);
  });
});
