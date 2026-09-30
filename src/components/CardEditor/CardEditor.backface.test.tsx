import React, { useRef, useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import cloneDeep from 'lodash/cloneDeep';

import CardEditor from './CardEditor';
import CardInterface from '../../interfaces/CardInterface';
import { Store, StoreType } from '../../store';
import { CardMainType, CardState, RarityType } from '../../interfaces/enums';
import { UNKNOWN_CREATOR, EDIT_SAVE_OFFSET } from '../../utils/constants';
import { updateCard } from '../../actions/cardActions';

vi.mock('../../actions/cardActions', () => ({
  updateCard: vi.fn(),
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

const makeCard = (uuid: string): CardInterface => ({
  name: '',
  uuid,
  manaCost: '',
  rarity: RarityType.Common,
  front: {
    name: '',
    cardMainType: CardMainType.Creature,
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

const mockStoreValue: StoreType = {
  cards: [],
  mechanics: [],
  annotationAccessor: {},
  user: [UNKNOWN_CREATOR],
  currentUser: UNKNOWN_CREATOR,
  dispatch: () => {},
};

// Faithfully mirrors App.tsx: the CardEditor's `card` prop comes from the
// merged collection (server `cards` with the in-flight `tmpCard` overlaid by
// uuid), and `saveTmpCard` is App's setter. `updateCard` stands in for the
// server round-trip: it writes the persisted card into `cards`.
let serverUpdate: (card: CardInterface) => void = () => {};
// Records every value CardEditor pushes to the parent via `saveTmpCard`.
// App treats a non-null `tmpCard` as "this card has unsaved changes".
let saveTmpCardCalls: (CardInterface | null)[] = [];

const Harness: React.FC<{ initialCard: CardInterface }> = ({ initialCard }) => {
  const [cards, setCards] = useState<CardInterface[]>([initialCard]);
  const [tmpCard, setTmpCard] = useState<CardInterface | null>(null);
  const editId = initialCard.uuid;

  const setCardsRef = useRef(setCards);
  setCardsRef.current = setCards;
  serverUpdate = (card: CardInterface) =>
    setCardsRef.current((prev) => [
      ...prev.filter((c) => c.uuid !== card.uuid),
      cloneDeep(card),
    ]);

  const saveTmpCard = (value: CardInterface | null) => {
    saveTmpCardCalls.push(value);
    setTmpCard(value);
  };

  const merged = cards
    .filter((c) => c.uuid !== (tmpCard ? tmpCard.uuid : ''))
    .concat(tmpCard ? [tmpCard] : []);
  const card = merged.find((c) => c.uuid === editId);

  return (
    <Store.Provider value={mockStoreValue}>
      <CardEditor card={card} saveTmpCard={saveTmpCard} />
    </Store.Provider>
  );
};

// Mirrors App.mergedCollection: a non-null tmpCard means App will warn about
// unsaved changes. After a save completes the editor must clear it back to null.
const parentThinksUnsaved = () =>
  saveTmpCardCalls.length > 0 && saveTmpCardCalls[saveTmpCardCalls.length - 1] !== null;

const getPersisted = (uuid: string): CardInterface | undefined => {
  const calls = (updateCard as Mock).mock.calls;
  if (calls.length === 0) return undefined;
  const last = calls[calls.length - 1][1] as CardInterface;
  return last.uuid === uuid ? last : undefined;
};

describe('CardEditor - saving after adding a back face as the first action', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    saveTmpCardCalls = [];
    (updateCard as Mock).mockReset();
    (updateCard as Mock).mockImplementation((_dispatch, card: CardInterface) => {
      serverUpdate(card);
      return Promise.resolve({});
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  const typeName = (value: string) => {
    const label = screen.getByText('Card Name');
    const input = label.closest('span')!.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value } });
  };

  it('CONTROL: after a normal edit saves, the editor reports a clean (saved) state', async () => {
    render(<Harness initialCard={makeCard('card-1')} />);

    typeName('Foo');

    await act(async () => {
      vi.advanceTimersByTime(EDIT_SAVE_OFFSET + 100);
    });

    const persisted = getPersisted('card-1');
    expect(persisted).toBeDefined();
    expect(persisted!.front.name).toBe('Foo');
    // After the debounced save completes the parent must be told there are no
    // unsaved changes (saveTmpCard(null)).
    expect(parentThinksUnsaved()).toBe(false);
  });

  it('BUG: adding a back face as the first action must not leave the card permanently "unsaved"', async () => {
    render(<Harness initialCard={makeCard('card-2')} />);

    // First (and only) action after "creating": add a back face.
    fireEvent.click(screen.getByText('Add Back Face'));

    // Let the updateCard round-trip resolve.
    await act(async () => {
      vi.advanceTimersByTime(EDIT_SAVE_OFFSET + 100);
    });

    // The back face must have been persisted.
    const persisted = getPersisted('card-2');
    expect(persisted).toBeDefined();
    expect(persisted!.back).toBeDefined();

    // ...and, like a normal edit, the editor must reconcile to a saved state so
    // App does not keep warning about (already-saved) unsaved changes.
    expect(parentThinksUnsaved()).toBe(false);
  });
});
