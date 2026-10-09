import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';

import CardEditor from './CardEditor';
import CardInterface from '../../interfaces/CardInterface';
import { Store, StoreType } from '../../store';
import { updateCard } from '../../actions/cardActions';
import { CardType, CardState, RarityType } from '../../interfaces/enums';
import { EDIT_SAVE_OFFSET, EDIT_TIME_OFFSET, UNKNOWN_CREATOR } from '../../utils/constants';

vi.mock('../../actions/cardActions', () => ({
  updateCard: vi.fn().mockResolvedValue({}),
  deleteCard: vi.fn(),
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

const makeCard = (overrides?: Partial<CardInterface['front']>): CardInterface => ({
  name: '',
  uuid: 'card-text-test',
  manaCost: '',
  rarity: RarityType.Common,
  front: {
    name: '',
    cardTypes: [CardType.Creature],
    cardText: [],
    ...overrides,
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

const mechanic = { uuid: 'mech-1', name: 'Lifelink', description: 'Heals you' };

const mockStoreValue: StoreType = {
  cards: [],
  mechanics: [mechanic],
  annotationAccessor: {},
  user: [UNKNOWN_CREATOR],
  currentUser: UNKNOWN_CREATOR,
  dispatch: () => {},
};

const renderEditor = (card: CardInterface) => {
  render(
    <Store.Provider value={mockStoreValue}>
      <CardEditor card={card} saveTmpCard={() => {}} />
    </Store.Provider>,
  );
};

const getCardTextEditor = (): HTMLTextAreaElement => {
  const label = screen.getByText('Card Text');
  const textarea = label.closest('span')!.querySelector('textarea') as HTMLTextAreaElement;
  expect(textarea).not.toBeNull();
  return textarea;
};

describe('CardEditor - card text textarea for non-planeswalker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (updateCard as Mock).mockClear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  // The DB save is debounced by EDIT_SAVE_OFFSET; type and let it fire.
  const typeCardText = (textarea: HTMLTextAreaElement, value: string) => {
    fireEvent.change(textarea, { target: { value } });
    return act(async () => {
      vi.advanceTimersByTime(EDIT_SAVE_OFFSET + EDIT_TIME_OFFSET + 100);
    });
  };

  const getPersisted = (): CardInterface =>
    (updateCard as Mock).mock.calls.slice(-1)[0][1] as CardInterface;

  it('renders a single TextArea prefilled with joined instructions', () => {
    renderEditor(
      makeCard({ cardText: ['First ability.', 'Second ability.', '[Some Mechanic X]'] }),
    );

    const textarea = getCardTextEditor();
    expect(textarea.value).toBe('First ability.\nSecond ability.\n[Some Mechanic X]');
  });

  it('maps every line 1:1 to an element', async () => {
    renderEditor(makeCard({ cardText: [] }));

    await typeCardText(getCardTextEditor(), 'First ability.\nSecond ability.');

    expect(getPersisted().front.cardText).toEqual(['First ability.', 'Second ability.']);
  });

  it('keeps empty lines as empty elements (incl. trailing newlines)', async () => {
    renderEditor(makeCard({ cardText: [] }));

    await typeCardText(getCardTextEditor(), 'One.\n\nTwo.\n');

    expect(getPersisted().front.cardText).toEqual(['One.', '', 'Two.', '']);
  });

  it('hides the Add Instruction button and keeps Add Mechanic', () => {
    renderEditor(makeCard({ cardText: [] }));

    expect(screen.queryByText('Add Instruction')).toBeNull();
    expect(screen.getByText('Add Mechanic')).toBeDefined();
  });

  it('keeps the per-instruction list UI for planeswalkers', () => {
    renderEditor(makeCard({ cardTypes: [CardType.Planeswalker], cardText: ['+1: Buff.'] }));

    const label = screen.getByText('Card Text');
    const splitList = label.closest('span')!;
    expect(splitList.querySelectorAll('textarea').length).toBeGreaterThan(0);
    expect(screen.getByText('Add Instruction')).toBeDefined();
  });
});
