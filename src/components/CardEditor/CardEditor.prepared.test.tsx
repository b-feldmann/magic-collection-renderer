import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import CardEditor from './CardEditor';
import { Store, StoreType } from '../../store';
import {
  CardArtStyles,
  CardType,
  CardState,
  PreparedType,
  RarityType,
} from '../../interfaces/enums';
import { updateCard } from '../../actions/cardActions';
import { UNKNOWN_CREATOR } from '../../utils/constants';
import type CardInterface from '../../interfaces/CardInterface';
import type MechanicInterface from '../../interfaces/MechanicInterface';

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
  // A mechanic so the Card Text field renders its "Add Mechanic" select; the
  // Prepared Text footer must not add a second one (see the adventure tests).
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
  uuid: 'prepared-card-1',
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

const renderEditor = (card: CardInterface, saveTmpCard = () => {}) =>
  render(
    <Store.Provider value={mockStoreValue}>
      <CardEditor card={card} saveTmpCard={saveTmpCard} />
    </Store.Provider>,
  );

// The editor renders hidden fields too (display:none), so all queries are
// scoped to the wrapper of the visible "Card Types" label.
const typeField = (): HTMLElement => screen.getByText('Card Types').closest('span') as HTMLElement;

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

const DISABLED_CLASS = 'ant-select-item-option-disabled';

// Selects the given option in the Card Types multi-select via the shared
// openTypeSelect / typeOption helpers above.
const selectCardType = async (typeLabel: string) => {
  openTypeSelect();
  const option = typeOption(typeLabel);
  fireEvent.click(option);
};

// --- Prepared section (mirrors the Adventure/Omen section tests) ---

const preparedDivider = (): HTMLElement | null => document.querySelector('.ant-divider');

const fieldWrapper = (label: string): HTMLElement => {
  const el = screen.getByText(label).closest('span') as HTMLElement;
  expect(el).not.toBeNull();
  return el;
};

const fieldInput = (label: string): HTMLInputElement =>
  fieldWrapper(label).querySelector('input') as HTMLInputElement;

// Selects the given option in the Prepared Type single-select.
const selectPreparedType = async (label: string) => {
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

describe('CardEditor - Prepared section', () => {
  it('shows the Prepared section with its four fields for a Prepared card', () => {
    renderEditor(makeCard([CardType.Creature, CardType.Prepared]));

    expect(preparedDivider()).not.toBeNull();
    expect(preparedDivider()!.textContent).toBe('Prepared');
    expect(preparedDivider()).toBeVisible();

    for (const label of ['Name', 'Cost', 'Type', 'Text']) {
      expect(screen.getByText(label)).toBeVisible();
    }
  });

  it('CONTROL: renders no Prepared section for a non-prepared card', () => {
    // The section is spliced out entirely (not merely hidden): a hidden
    // text-list would still render a second "Add Mechanic" placeholder and
    // break generic text queries.
    renderEditor(makeCard([CardType.Creature]));

    expect(preparedDivider()).toBeNull();
    for (const label of ['Name', 'Cost', 'Type', 'Text']) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });

  it('offers no Add Mechanic select on the Prepared Text field', () => {
    // The store carries a mechanic (see mockStoreValue), so Card Text renders
    // its "Add Mechanic" select; the Prepared Text footer must not add a
    // second one.
    renderEditor(makeCard([CardType.Creature, CardType.Prepared]));

    expect(fieldWrapper('Card Text').querySelector('.ant-select')).not.toBeNull();
    expect(fieldWrapper('Text').querySelector('.ant-select')).toBeNull();
  });

  it('offers exactly Instant and Sorcery as prepare types', async () => {
    renderEditor(
      makeCard([CardType.Creature, CardType.Prepared], { prepareType: PreparedType.Instant }),
    );

    fireEvent.mouseDown(fieldWrapper('Type').querySelector('.ant-select') as HTMLElement);

    await waitFor(() => {
      expect(document.querySelectorAll('.ant-select-item-option').length).toBeGreaterThan(0);
    });

    const options = Array.from(document.querySelectorAll('.ant-select-item-option')).map(
      o => o.textContent,
    );
    expect(options.sort()).toEqual([PreparedType.Instant, PreparedType.Sorcery]);
  });

  it('persists edits to the prepare fields on the face', async () => {
    const saveTmpCard = vi.fn();
    renderEditor(
      makeCard([CardType.Creature, CardType.Prepared], { prepareType: PreparedType.Instant }),
      saveTmpCard,
    );

    fireEvent.change(fieldInput('Name'), { target: { value: 'Heist the Plans' } });
    fireEvent.change(fieldInput('Cost'), { target: { value: '{1}{U}' } });
    const textarea = fieldWrapper('Text').querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'Counter target spell.' } });
    await selectPreparedType(PreparedType.Sorcery);

    // The debounced DB-save path (EDIT_SAVE_OFFSET = 2000ms) writes the card.
    await new Promise(resolve => setTimeout(resolve, 2100));

    const saved = vi
      .mocked(updateCard)
      .mock.calls.map(call => call[1])
      .reverse()
      .find(c => c.front.prepareName === 'Heist the Plans');
    expect(saved?.front.prepareName).toBe('Heist the Plans');
    expect(saved?.front.prepareCost).toBe('{1}{U}');
    expect(saved?.front.prepareText).toEqual(['Counter target spell.']);
    expect(saved?.front.prepareType).toBe(PreparedType.Sorcery);
  });

  it('adding the Prepared card type defaults the prepare type to Instant', async () => {
    const saveTmpCard = vi.fn();
    renderEditor(makeCard([CardType.Creature]), saveTmpCard);

    await selectCardType('Prepared');

    await new Promise(resolve => setTimeout(resolve, 700));

    const saved = saveTmpCard.mock.calls
      .map(call => call[0])
      .reverse()
      .find(c => c?.front?.cardTypes?.includes(CardType.Prepared));
    expect(saved?.front.cardTypes).toContain(CardType.Prepared);
    expect(saved?.front.prepareType).toBe(PreparedType.Instant);
  });

  it('disables group alternatives while Prepared is selected', () => {
    renderEditor(makeCard([CardType.Creature, CardType.Prepared]));

    openTypeSelect();

    expect(typeOption(CardType.Adventure)).toHaveClass(DISABLED_CLASS);
    expect(typeOption(CardType.Omen)).toHaveClass(DISABLED_CLASS);
    expect(typeOption(CardType.Planeswalker)).toHaveClass(DISABLED_CLASS);
    expect(typeOption(CardType.Prepared)).not.toHaveClass(DISABLED_CLASS);
  });
});

describe('CardEditor - Prepared art styles', () => {
  it('offers only the Regular art style for a Prepared card', () => {
    renderEditor(makeCard([CardType.Creature, CardType.Prepared]));

    expect(screen.getByText(CardArtStyles.Regular)).toBeInTheDocument();
    expect(screen.queryByText(CardArtStyles.Extended)).toBeInTheDocument();
    expect(screen.queryByText(CardArtStyles.Borderless)).toBeNull();
    expect(screen.queryByText(CardArtStyles.EldAlternateArt)).toBeNull();
    expect(screen.queryByText(CardArtStyles.Invention)).toBeNull();
    expect(screen.queryByText(CardArtStyles.Invocation)).toBeNull();
  });
});
