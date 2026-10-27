import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import CardEditor from './CardEditor';
import { Store, StoreType } from '../../store';
import { CardArtStyles, CardType, CardState, OmenType, RarityType } from '../../interfaces/enums';
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

const mockStoreValue: StoreType = {
  cards: [],
  // A mechanic so the Card Text field renders its "Add Mechanic" select; the
  // Omen Text footer must not add a second one (see the adventure tests).
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
  uuid: 'omen-card-1',
  manaCost: '{2}',
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

// Scope selection queries to the Card Types control.
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

const optionTitles = (): string[] =>
  Array.from(document.querySelectorAll('.ant-select-dropdown .ant-select-item-option')).map(
    el => el.getAttribute('title') as string,
  );

describe('CardEditor - hidden card types', () => {
  it('lists Omen and Prepared among the card type options; Split Card and Aftermath stay hidden', () => {
    renderEditor(makeCard([CardType.Creature]));

    openTypeSelect();

    const titles = optionTitles();
    expect(titles).not.toContain('Split Card');
    expect(titles).not.toContain(CardType.Aftermath);
    // Search rather than depending on how many rows fit in the virtual viewport.
    expect(typeOption(CardType.Omen)).not.toBeNull();
    expect(typeOption(CardType.Prepared)).not.toBeNull();
  });

  it('disables group alternatives while Adventure is selected', () => {
    renderEditor(makeCard([CardType.Creature, CardType.Adventure]));

    openTypeSelect();

    expect(typeOption(CardType.Planeswalker)).toHaveClass(DISABLED_CLASS);
    expect(typeOption(CardType.Adventure)).not.toHaveClass(DISABLED_CLASS);
  });

  it('disables nothing but the group members while Planeswalker is selected', () => {
    renderEditor(makeCard([CardType.Planeswalker]));

    openTypeSelect();

    expect(typeOption(CardType.Adventure)).toHaveClass(DISABLED_CLASS);
    expect(typeOption(CardType.Creature)).not.toHaveClass(DISABLED_CLASS);
  });

  it('disables group alternatives while Token is selected', () => {
    renderEditor(makeCard([CardType.Token, CardType.Creature]));

    openTypeSelect();

    expect(typeOption(CardType.Adventure)).toHaveClass(DISABLED_CLASS);
    expect(typeOption(CardType.Planeswalker)).toHaveClass(DISABLED_CLASS);
    expect(typeOption(CardType.Token)).not.toHaveClass(DISABLED_CLASS);
    expect(typeOption(CardType.Creature)).not.toHaveClass(DISABLED_CLASS);
  });

  it('keeps the Invention art style available for a plain artifact', () => {
    renderEditor(makeCard([CardType.Artifact]));

    expect(screen.getByText('Invention')).toBeInTheDocument();
  });

  it('removes the Invention art style once a group type is selected', () => {
    renderEditor(makeCard([CardType.Artifact, CardType.Omen]));

    expect(screen.queryByText('Invention')).toBeNull();
  });
});

// --- Omen section (mirrors the Adventure section tests) ---

const omenDivider = (): HTMLElement | null => screen.queryByRole('heading', { name: 'Omen' });

const fieldWrapper = (label: string): HTMLElement => {
  const el = screen.getByText(label).closest('span') as HTMLElement;
  expect(el).not.toBeNull();
  return el;
};

const fieldInput = (label: string): HTMLInputElement =>
  fieldWrapper(label).querySelector('input') as HTMLInputElement;

// Selects the given option in the Omen Type single-select.
const selectOmenType = async (label: string) => {
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

// Selects the given option in the Card Types multi-select via the shared
// openTypeSelect / typeOption helpers above.
const selectCardType = async (typeLabel: string) => {
  openTypeSelect();
  const option = typeOption(typeLabel);
  fireEvent.click(option);
};

describe('CardEditor - Omen section', () => {
  it('shows the Omen section with its four fields for an Omen card', () => {
    renderEditor(makeCard([CardType.Creature, CardType.Omen]));

    expect(omenDivider()).not.toBeNull();
    expect(omenDivider()!.textContent).toBe('Omen');
    expect(omenDivider()).toBeVisible();

    for (const label of ['Name', 'Cost', 'Text', 'Type']) {
      expect(screen.getByText(label)).toBeVisible();
    }
  });

  it('CONTROL: renders no Omen section for a non-omen card', () => {
    // The section is spliced out entirely (not merely hidden): a hidden
    // text-list would still render a second "Add Mechanic" placeholder and
    // break generic text queries.
    renderEditor(makeCard([CardType.Creature]));

    expect(omenDivider()).toBeNull();
    for (const label of ['Name', 'Cost', 'Text', 'Type']) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });

  it('does not render mechanic selects in Card Text or Omen Text', () => {
    renderEditor(makeCard([CardType.Creature, CardType.Omen]));

    expect(fieldWrapper('Card Text').querySelector('.ant-select')).toBeNull();
    expect(fieldWrapper('Text').querySelector('.ant-select')).toBeNull();
  });

  it('offers exactly Instant and Sorcery as omen types', async () => {
    renderEditor(makeCard([CardType.Creature, CardType.Omen], { omenType: OmenType.Instant }));

    fireEvent.mouseDown(fieldWrapper('Type').querySelector('.ant-select') as HTMLElement);

    await waitFor(() => {
      expect(document.querySelectorAll('.ant-select-item-option').length).toBeGreaterThan(0);
    });

    const options = Array.from(document.querySelectorAll('.ant-select-item-option')).map(
      o => o.textContent,
    );
    expect(options.sort()).toEqual([OmenType.Instant, OmenType.Sorcery]);
  });

  it('persists edits to the omen fields on the face', async () => {
    const saveTmpCard = vi.fn();
    renderEditor(
      makeCard([CardType.Creature, CardType.Omen], { omenType: OmenType.Instant }),
      saveTmpCard,
    );

    fireEvent.change(fieldInput('Name'), { target: { value: 'Dark Forecast' } });
    fireEvent.change(fieldInput('Cost'), { target: { value: '{1}{U}' } });
    const textarea = fieldWrapper('Text').querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'Scry 2, then draw a card.' } });
    await selectOmenType(OmenType.Sorcery);

    // The debounced preview path (EDIT_TIME_OFFSET = 600ms) writes the card.
    await new Promise(resolve => setTimeout(resolve, 700));

    const saved = saveTmpCard.mock.calls
      .map(call => call[0])
      .reverse()
      .find(c => c?.front?.omenName === 'Dark Forecast');
    expect(saved?.front.omenName).toBe('Dark Forecast');
    expect(saved?.front.omenCost).toBe('{1}{U}');
    expect(saved?.front.omenText).toEqual(['Scry 2, then draw a card.']);
    expect(saved?.front.omenType).toBe(OmenType.Sorcery);
  });

  it('adding the Omen card type defaults the omen type to Instant', async () => {
    const saveTmpCard = vi.fn();
    renderEditor(makeCard([CardType.Creature]), saveTmpCard);

    await selectCardType('Omen');

    await new Promise(resolve => setTimeout(resolve, 700));

    const saved = saveTmpCard.mock.calls
      .map(call => call[0])
      .reverse()
      .find(c => c?.front?.cardTypes?.includes(CardType.Omen));
    expect(saved?.front.cardTypes).toContain(CardType.Omen);
    expect(saved?.front.omenType).toBe(OmenType.Instant);
  });

  it('offers the Regular and Extended art styles for an Omen card', () => {
    renderEditor(makeCard([CardType.Creature, CardType.Omen]));

    expect(screen.getByText(CardArtStyles.Regular)).toBeInTheDocument();
    expect(screen.getByText(CardArtStyles.Extended)).toBeInTheDocument();
    expect(screen.queryByText(CardArtStyles.Borderless)).toBeNull();
    expect(screen.queryByText(CardArtStyles.EldAlternateArt)).toBeNull();
    expect(screen.queryByText(CardArtStyles.Invention)).toBeNull();
    expect(screen.queryByText(CardArtStyles.Invocation)).toBeNull();
  });

  it('adding the Omen type keeps a chosen Extended style', async () => {
    const saveTmpCard = vi.fn();
    renderEditor(makeCard([CardType.Creature], { artStyle: CardArtStyles.Extended }), saveTmpCard);

    await selectCardType('Omen');

    await new Promise(resolve => setTimeout(resolve, 700));

    const saved = saveTmpCard.mock.calls
      .map(call => call[0])
      .reverse()
      .find(c => c?.front?.cardTypes?.includes(CardType.Omen));
    expect(saved?.front.cardTypes).toContain(CardType.Omen);
    // Extended is available for omens, so it is kept as-is.
    expect(saved?.front.artStyle).toBe(CardArtStyles.Extended);
  });

  it('adding the Omen type switches a chosen Borderless style to Regular', async () => {
    const saveTmpCard = vi.fn();
    renderEditor(
      makeCard([CardType.Creature], { artStyle: CardArtStyles.Borderless }),
      saveTmpCard,
    );

    await selectCardType('Omen');

    await new Promise(resolve => setTimeout(resolve, 700));

    const saved = saveTmpCard.mock.calls
      .map(call => call[0])
      .reverse()
      .find(c => c?.front?.cardTypes?.includes(CardType.Omen));
    expect(saved?.front.cardTypes).toContain(CardType.Omen);
    expect(saved?.front.artStyle).toBe(CardArtStyles.Regular);
  });
});
