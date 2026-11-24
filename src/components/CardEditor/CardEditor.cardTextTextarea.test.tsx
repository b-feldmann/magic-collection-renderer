import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';

import CardEditor from './CardEditor';
import CardInterface from '../../interfaces/CardInterface';
import { Store, StoreType } from '../../store';
import { updateCard } from '../../actions/cardActions';
import { setStepEditor } from '../../actions/userActions';
import { CardType, CardState, RarityType } from '../../interfaces/enums';
import { EDIT_SAVE_OFFSET, EDIT_TIME_OFFSET, UNKNOWN_CREATOR } from '../../utils/constants';

vi.mock('../../actions/userActions', () => ({ setStepEditor: vi.fn() }));

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

const renderEditor = (card: CardInterface, currentUser = UNKNOWN_CREATOR) => {
  render(
    <Store.Provider value={{ ...mockStoreValue, currentUser }}>
      <CardEditor card={card} saveTmpCard={() => {}} />
    </Store.Provider>,
  );
};

const getCardTextEditor = (): HTMLTextAreaElement => {
  const label = screen.getByText('Card text');
  const textarea = label.closest('span')!.querySelector('textarea') as HTMLTextAreaElement;
  expect(textarea).not.toBeNull();
  return textarea;
};

describe('CardEditor - card text', () => {
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

  it('hides the Add instruction and Add mechanic controls', () => {
    renderEditor(makeCard({ cardText: [] }));

    expect(screen.queryByText('Add instruction')).toBeNull();
    expect(screen.queryByText('Add mechanic')).toBeNull();
  });

  it('edits planeswalkers ability by ability, and switches to the text and back', async () => {
    const user = { ...UNKNOWN_CREATOR, uuid: 'user-1' };
    renderEditor(
      makeCard({ cardTypes: [CardType.Planeswalker], cardText: ['+1: Buff.', '−2: Debuff.'] }),
      user,
    );
    const field = (name: string) => screen.getByRole<HTMLTextAreaElement>('textbox', { name });
    const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

    await typeCardText(field('Ability 2 (−2)'), 'Scry 1.');
    expect(getPersisted().front.cardText).toEqual(['+1: Buff.', '−2: Scry 1.']);

    click('Edit as text');
    expect(setStepEditor).toHaveBeenLastCalledWith(mockStoreValue.dispatch, 'text', user);
    expect(field('Card text').value).toBe('+1: Buff.\n−2: Scry 1.');
    // A hyphen typed for the minus becomes one.
    await typeCardText(field('Card text'), '+1: Buff.\n-X: Scry X.');
    expect(getPersisted().front.cardText).toEqual(['+1: Buff.', '−X: Scry X.']);

    click('Edit as steps');
    expect(setStepEditor).toHaveBeenLastCalledWith(mockStoreValue.dispatch, 'steps', user);
    expect(field('Ability 2 (−X)').value).toBe('Scry X.');
  });
});
