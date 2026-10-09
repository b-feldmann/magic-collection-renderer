import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import CardEditor from './CardEditor';
import { Store, StoreType } from '../../store';
import { AdventureType, CardType, CardState, RarityType } from '../../interfaces/enums';
import { UNKNOWN_CREATOR } from '../../utils/constants';
import type MechanicInterface from '../../interfaces/MechanicInterface';
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
  mechanics: [{ uuid: 'mech-1', name: 'Lifelink', description: 'Heals you' } as MechanicInterface],
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
  uuid: 'adventure-card-1',
  manaCost: '{1}{G}',
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

const renderEditor = (card: CardInterface, saveTmpCard = () => {}) =>
  render(
    <Store.Provider value={mockStoreValue}>
      <CardEditor card={card} saveTmpCard={saveTmpCard} />
    </Store.Provider>,
  );

const adventureDivider = (): HTMLElement | null => document.querySelector('.ant-divider');

const fieldWrapper = (label: string): HTMLElement => {
  const el = screen.getByText(label).closest('span') as HTMLElement;
  expect(el).not.toBeNull();
  return el;
};

const fieldInput = (label: string): HTMLInputElement =>
  fieldWrapper(label).querySelector('input') as HTMLInputElement;

// Selects the given option in the Adventure Type single-select.
const selectAdventureType = async (label: string) => {
  fireEvent.mouseDown(fieldWrapper('Type').querySelector('.ant-select') as HTMLElement);

  await waitFor(() => {
    expect(document.querySelectorAll('.ant-select-item-option').length).toBeGreaterThan(0);
  });
  const option = Array.from(document.querySelectorAll('.ant-select-item-option')).find(
    o => o.textContent === label,
  )!;
  expect(option).toBeDefined();
  fireEvent.click(option);
};

// Selects the given option in the Card Types multi-select (see the alternate
// art tests for the dropdown-traversal details).
const selectCardType = async (typeLabel: string) => {
  const label = screen.getByText('Card Types');
  const field = label.parentElement!.parentElement!;
  fireEvent.mouseDown(field.querySelector('.ant-select') as HTMLElement);

  await waitFor(() => {
    expect(document.querySelectorAll('.ant-select-item-option').length).toBeGreaterThan(0);
  });
  const option = Array.from(document.querySelectorAll('.ant-select-item-option')).find(
    o => o.textContent === typeLabel,
  )!;
  expect(option).toBeDefined();
  fireEvent.click(option);
};

describe('CardEditor - Adventure section', () => {
  it('shows the Adventure section with its four fields for an Adventure card', () => {
    renderEditor(makeCard([CardType.Creature, CardType.Adventure]));

    expect(adventureDivider()).not.toBeNull();
    expect(adventureDivider()!.textContent).toBe('Adventure');
    expect(adventureDivider()).toBeVisible();

    for (const label of ['Name', 'Cost', 'Text', 'Type']) {
      expect(screen.getByText(label)).toBeVisible();
    }
  });

  it('CONTROL: renders no Adventure section for a non-adventure card', () => {
    // The section is spliced out entirely (not merely hidden): a hidden
    // text-list would still render a second "Add Mechanic" placeholder and
    // break generic text queries.
    renderEditor(makeCard([CardType.Creature]));

    expect(adventureDivider()).toBeNull();
    for (const label of ['Name', 'Cost', 'Text', 'Type']) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });

  it('offers no Add Mechanic select on the Adventure Text field', () => {
    // The store carries a mechanic (see mockStoreValue), so Card Text renders
    // its "Add Mechanic" select; the Adventure Text footer must not add a
    // second one.
    renderEditor(makeCard([CardType.Creature, CardType.Adventure]));

    expect(fieldWrapper('Card Text').querySelector('.ant-select')).not.toBeNull();
    expect(fieldWrapper('Text').querySelector('.ant-select')).toBeNull();
  });

  it('offers exactly Instant and Sorcery as adventure types', async () => {
    renderEditor(
      makeCard([CardType.Creature, CardType.Adventure], { adventureType: AdventureType.Instant }),
    );

    fireEvent.mouseDown(fieldWrapper('Type').querySelector('.ant-select') as HTMLElement);

    await waitFor(() => {
      expect(document.querySelectorAll('.ant-select-item-option').length).toBeGreaterThan(0);
    });

    const options = Array.from(document.querySelectorAll('.ant-select-item-option')).map(
      o => o.textContent,
    );
    expect(options.sort()).toEqual([AdventureType.Instant, AdventureType.Sorcery]);
  });

  it('persists edits to the adventure fields on the face', async () => {
    const saveTmpCard = vi.fn();
    renderEditor(
      makeCard([CardType.Creature, CardType.Adventure], { adventureType: AdventureType.Instant }),
      saveTmpCard,
    );

    fireEvent.change(fieldInput('Name'), { target: { value: 'Petty Theft' } });
    fireEvent.change(fieldInput('Cost'), { target: { value: '{1}{U}' } });
    const textarea = fieldWrapper('Text').querySelector('textarea')!;
    fireEvent.change(textarea, {
      target: { value: 'Until end of turn, target creature loses flying.' },
    });
    await selectAdventureType(AdventureType.Sorcery);

    // The debounced preview path (EDIT_TIME_OFFSET = 600ms) writes the card.
    await new Promise(resolve => setTimeout(resolve, 700));

    const saved = saveTmpCard.mock.calls
      .map(call => call[0])
      .reverse()
      .find(c => c?.front?.adventureName === 'Petty Theft');
    expect(saved?.front.adventureName).toBe('Petty Theft');
    expect(saved?.front.adventureCost).toBe('{1}{U}');
    expect(saved?.front.adventureText).toEqual([
      'Until end of turn, target creature loses flying.',
    ]);
    expect(saved?.front.adventureType).toBe(AdventureType.Sorcery);
  });

  it('adding the Adventure card type defaults the adventure type to Instant', async () => {
    const saveTmpCard = vi.fn();
    renderEditor(makeCard([CardType.Creature]), saveTmpCard);

    await selectCardType('Adventure');

    await new Promise(resolve => setTimeout(resolve, 700));

    const saved = saveTmpCard.mock.calls
      .map(call => call[0])
      .reverse()
      .find(c => c?.front?.cardTypes?.includes(CardType.Adventure));
    expect(saved?.front.cardTypes).toContain(CardType.Adventure);
    expect(saved?.front.adventureType).toBe(AdventureType.Instant);
  });
});
