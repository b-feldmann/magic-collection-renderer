import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import CardEditor from './CardEditor';
import { Store, StoreType } from '../../store';
import { CardArtStyles, CardType, CardState, RarityType } from '../../interfaces/enums';
import { UNKNOWN_CREATOR } from '../../utils/constants';
import type CardInterface from '../../interfaces/CardInterface';
import type UserInterface from '../../interfaces/UserInterface';
import { setStepEditor } from '../../actions/userActions';

vi.mock('../../actions/userActions', () => ({ setStepEditor: vi.fn() }));

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

const makeCard = (
  cardTypes: CardType[],
  frontOverrides: Partial<CardInterface['front']> = {},
): CardInterface => ({
  name: '',
  uuid: 'saga-card-1',
  manaCost: '{1}{U}',
  rarity: RarityType.Common,
  front: {
    name: 'Test',
    cardTypes,
    cardText: [],
    ...frontOverrides,
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

const renderEditor = (
  card: CardInterface,
  saveTmpCard: (card: CardInterface | null) => void = () => {},
  currentUser: UserInterface = { ...UNKNOWN_CREATOR, uuid: 'user-1' },
) =>
  render(
    <Store.Provider value={{ ...mockStoreValue, currentUser }}>
      <CardEditor card={card} saveTmpCard={saveTmpCard} />
    </Store.Provider>,
  );

// The editor renders hidden fields too (display:none), so all queries are
// scoped to the wrapper of the visible "Card types" label.
const typeField = (): HTMLElement => screen.getByText('Card types').closest('span') as HTMLElement;

const openTypeSelect = () => {
  fireEvent.mouseDown(typeField().querySelector('.ant-select-content') as Element);
};

// antd 6 exposes the visual list rows without a role, so options are matched
// by their `title` inside the single open dropdown. The list is virtualized
// (~10 rows), so each option is brought into view by typing it into the
// select's search filter first.
const typeOption = (label: string): HTMLElement => {
  const input = typeField().querySelector('.ant-select-input') as HTMLInputElement;
  if (input.value !== label) fireEvent.change(input, { target: { value: label } });
  const matches = Array.from(
    document.querySelectorAll('.ant-select-dropdown .ant-select-item-option'),
  ).filter(el => el.getAttribute('title') === label);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one option "${label}", found ${matches.length}`);
  }
  return matches[0] as HTMLElement;
};

// Selects the given option in the Card types multi-select via the shared
// openTypeSelect / typeOption helpers above.
const selectCardType = (typeLabel: string) => {
  openTypeSelect();
  fireEvent.click(typeOption(typeLabel));
};

const lastDraft = (saveTmpCard: ReturnType<typeof vi.fn>) =>
  saveTmpCard.mock.calls
    .map(call => call[0] as CardInterface | null)
    .reverse()
    .find(Boolean);

const cardText = () => screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Card text' });

const TEXT_USER: UserInterface = { ...UNKNOWN_CREATOR, uuid: 'user-1', sagaEditor: 'text' };

describe('CardEditor - Sagas', () => {
  it('starts a new Saga as an enchantment with three chapters', async () => {
    const saveTmpCard = vi.fn();
    renderEditor(makeCard([]), saveTmpCard);

    selectCardType(CardType.Saga);

    await waitFor(() =>
      expect(lastDraft(saveTmpCard)?.front).toMatchObject({
        cardTypes: [CardType.Saga, CardType.Enchantment],
        cardText: ['I — ', 'II — ', 'III — '],
      }),
    );
  });

  it('keeps the other types and the text of a card that becomes a Saga', async () => {
    const saveTmpCard = vi.fn();
    renderEditor(
      makeCard([CardType.Enchantment, CardType.Creature], { cardText: ['I — Draw a card.'] }),
      saveTmpCard,
    );

    selectCardType(CardType.Saga);

    await waitFor(() =>
      expect(lastDraft(saveTmpCard)?.front).toMatchObject({
        cardTypes: [CardType.Enchantment, CardType.Creature, CardType.Saga],
        cardText: ['I — Draw a card.'],
      }),
    );
  });

  it('drops the types a Saga cannot have', async () => {
    const saveTmpCard = vi.fn();
    renderEditor(makeCard([CardType.Instant, CardType.Creature]), saveTmpCard);

    selectCardType(CardType.Saga);

    await waitFor(() =>
      expect(lastDraft(saveTmpCard)?.front.cardTypes).toEqual([
        CardType.Creature,
        CardType.Saga,
        CardType.Enchantment,
      ]),
    );
  });

  it('only offers the types a Saga can have, and keeps it an enchantment', () => {
    const DISABLED_CLASS = 'ant-select-item-option-disabled';
    renderEditor(makeCard([CardType.Enchantment, CardType.Saga]));

    openTypeSelect();

    for (const type of [CardType.Enchantment, CardType.Instant, CardType.Sorcery]) {
      expect(typeOption(type)).toHaveClass(DISABLED_CLASS);
    }
    for (const type of [CardType.Artifact, CardType.Creature, CardType.Land, CardType.Saga]) {
      expect(typeOption(type)).not.toHaveClass(DISABLED_CLASS);
    }

    // The tag of the Enchantment type has no remove button.
    const tag = (type: CardType) =>
      typeField().querySelector(`.ant-select-selection-item[title="${type}"]`);
    expect(
      tag(CardType.Saga)?.querySelector('.ant-select-selection-item-remove'),
    ).toBeInTheDocument();
    expect(tag(CardType.Enchantment)).toBeInTheDocument();
    expect(
      tag(CardType.Enchantment)?.querySelector('.ant-select-selection-item-remove'),
    ).toBeNull();
  });

  it('adds the next chapter with a button', () => {
    renderEditor(
      makeCard([CardType.Enchantment, CardType.Creature, CardType.Saga], {
        cardText: ['I, II — Draw a card.', 'Flying'],
      }),
      undefined,
      TEXT_USER,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Chapter' }));

    expect(cardText()).toHaveValue('I, II — Draw a card.\nIII — \nFlying');
  });

  it('explains the chapters of a Saga only', () => {
    const { unmount } = renderEditor(
      makeCard([CardType.Enchantment, CardType.Saga]),
      undefined,
      TEXT_USER,
    );
    expect(cardText()).toHaveAccessibleDescription(/I, II — /);
    unmount();

    renderEditor(makeCard([CardType.Enchantment]));
    expect(cardText()).not.toHaveAccessibleDescription();
    expect(screen.queryByRole('button', { name: 'Chapter' })).toBeNull();
  });

  it('offers flavour text only for a Saga creature', () => {
    const { unmount } = renderEditor(makeCard([CardType.Enchantment, CardType.Saga]));
    expect(screen.queryByLabelText(/^Flavour text/)).toBeNull();
    unmount();

    renderEditor(makeCard([CardType.Enchantment, CardType.Creature, CardType.Saga]));
    expect(screen.getAllByLabelText(/^Flavour text/)[0]).toBeVisible();
  });

  it('falls back to the Regular art style when the Saga type is added', async () => {
    const saveTmpCard = vi.fn();
    renderEditor(
      makeCard([CardType.Enchantment], { artStyle: CardArtStyles.Borderless }),
      saveTmpCard,
    );

    selectCardType(CardType.Saga);

    await waitFor(() => expect(lastDraft(saveTmpCard)?.front.artStyle).toBe(CardArtStyles.Regular));
    expect(screen.queryByText(CardArtStyles.Borderless)).toBeNull();
  });

  it('edits a Saga step by step, and switches to the text and back', () => {
    const dispatch = mockStoreValue.dispatch;
    const user = { ...UNKNOWN_CREATOR, uuid: 'user-1' };
    renderEditor(
      makeCard([CardType.Enchantment, CardType.Saga], { cardText: ['I, II — Draw a card.'] }),
      undefined,
      user,
    );
    expect(screen.getByRole('textbox', { name: 'Step 1 (I, II)' })).toHaveValue('Draw a card.');

    fireEvent.click(screen.getByRole('button', { name: 'Edit as text' }));
    expect(setStepEditor).toHaveBeenLastCalledWith(dispatch, 'text', user);
    expect(cardText()).toHaveValue('I, II — Draw a card.');

    fireEvent.click(screen.getByRole('button', { name: 'Edit as steps' }));
    expect(setStepEditor).toHaveBeenLastCalledWith(dispatch, 'steps', user);
    expect(screen.getByRole('textbox', { name: 'Step 1 (I, II)' })).toBeVisible();
  });

  it('opens the editor the user prefers', () => {
    const { unmount } = renderEditor(
      makeCard([CardType.Enchantment, CardType.Saga]),
      undefined,
      TEXT_USER,
    );
    expect(cardText()).toBeVisible();
    unmount();

    renderEditor(makeCard([CardType.Enchantment]));
    expect(screen.queryByRole('button', { name: /^Edit as/ })).toBeNull();
  });

  it('saves what is typed into a step', async () => {
    const saveTmpCard = vi.fn();
    renderEditor(
      makeCard([CardType.Enchantment, CardType.Creature, CardType.Saga], {
        cardText: ['I — Draw a card.', 'Flying'],
      }),
      saveTmpCard,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Step 1 (I)' }), {
      target: { value: 'Scry 2.' },
    });

    await waitFor(() =>
      expect(lastDraft(saveTmpCard)?.front.cardText).toEqual(['I — Scry 2.', 'Flying']),
    );
  });
});
