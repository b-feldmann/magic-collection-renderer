import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import CardEditor from './CardEditor';
import { Store, StoreType } from '../../store';
import {
  AftermathType,
  CardArtStyles,
  CardType,
  CardState,
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
  uuid: 'aftermath-card-1',
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
  mechanics: MechanicInterface[] = [],
) =>
  render(
    <Store.Provider value={{ ...mockStoreValue, mechanics }}>
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

const DISABLED_CLASS = 'ant-select-item-option-disabled';

// Selects the given option in the Card types multi-select via the shared
// openTypeSelect / typeOption helpers above.
const selectCardType = async (typeLabel: string) => {
  openTypeSelect();
  const option = typeOption(typeLabel);
  fireEvent.click(option);
};

const aftermathDivider = (): HTMLElement | null =>
  screen.queryByRole('heading', { name: 'Aftermath' });

const fieldWrapper = (label: string): HTMLElement =>
  screen.getByText(label).closest('span') as HTMLElement;

const fieldInput = (label: string): HTMLInputElement =>
  fieldWrapper(label).querySelector('input') as HTMLInputElement;

const lastDraft = (saveTmpCard: ReturnType<typeof vi.fn>) =>
  saveTmpCard.mock.calls
    .map(call => call[0] as CardInterface | null)
    .reverse()
    .find(card => card?.front.cardTypes.includes(CardType.Aftermath));

const KEYWORD_LINE = 'Aftermath _(Cast this spell only from your graveyard. Then exile it.)_';

describe('CardEditor - Aftermath section', () => {
  it('shows the fields of the second half for an Aftermath card only', () => {
    const { unmount } = renderEditor(makeCard([CardType.Sorcery, CardType.Aftermath]));

    expect(aftermathDivider()).toBeVisible();
    for (const label of [
      'Name',
      'Cost',
      'Type',
      'Text',
      'Aftermath cover (URL)',
      'Aftermath cover fit',
    ]) {
      expect(screen.getByText(label)).toBeVisible();
    }
    expect(screen.getByRole('group', { name: 'Artwork of the Aftermath half' })).toBeVisible();
    unmount();

    renderEditor(makeCard([CardType.Sorcery]));
    expect(aftermathDivider()).toBeNull();
    expect(screen.queryByText('Aftermath cover (URL)')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Artwork of the Aftermath half' })).toBeNull();
  });

  it('persists edits to the second half on the face', async () => {
    renderEditor(
      makeCard([CardType.Sorcery, CardType.Aftermath], { aftermathType: AftermathType.Sorcery }),
    );

    fireEvent.change(fieldInput('Name'), { target: { value: 'Return' } });
    fireEvent.change(fieldInput('Cost'), { target: { value: '{3}{B}' } });
    fireEvent.change(fieldWrapper('Text').querySelector('textarea')!, {
      target: { value: 'Exile target card from a graveyard.' },
    });
    fireEvent.change(screen.getByLabelText('Aftermath cover (URL)'), {
      target: { value: 'https://example.com/art.png' },
    });

    await waitFor(
      () => {
        const saved = vi
          .mocked(updateCard)
          .mock.calls.map(call => call[1])
          .reverse()
          .find(card => card.front.aftermathCover);
        expect(saved?.front).toMatchObject({
          aftermathName: 'Return',
          aftermathCost: '{3}{B}',
          aftermathText: ['Exile target card from a graveyard.'],
          aftermathCover: 'url:https://example.com/art.png',
        });
      },
      { timeout: 4000 },
    );
  });

  it('offers to remove the uploaded art of either half', () => {
    renderEditor(
      makeCard([CardType.Sorcery, CardType.Aftermath], {
        cover: 'base64:never.png|data:image/png;base64,AA==',
        aftermathCover: 'base64:return.png|data:image/png;base64,AA==',
      }),
    );

    expect(screen.getByText('never.png')).toBeVisible();
    expect(screen.getByText('return.png')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Remove aftermath cover' }));
    expect(screen.queryByText('return.png')).toBeNull();
    expect(screen.getByText('never.png')).toBeVisible();
  });

  it('starts a new second half as a sorcery with the Aftermath keyword', async () => {
    const saveTmpCard = vi.fn();
    renderEditor(makeCard([CardType.Sorcery]), saveTmpCard);

    await selectCardType(CardType.Aftermath);

    await waitFor(() =>
      expect(lastDraft(saveTmpCard)?.front).toMatchObject({
        aftermathType: AftermathType.Sorcery,
        aftermathText: [KEYWORD_LINE],
      }),
    );
  });

  it('uses the Aftermath mechanic for the keyword when there is one', async () => {
    const saveTmpCard = vi.fn();
    renderEditor(makeCard([CardType.Sorcery]), saveTmpCard, [
      { uuid: 'mech-1', name: 'Aftermath', description: '(Cast this spell only from …)' },
    ]);

    await selectCardType(CardType.Aftermath);

    await waitFor(() =>
      expect(lastDraft(saveTmpCard)?.front.aftermathText).toEqual(['[Aftermath]']),
    );
    expect(lastDraft(saveTmpCard)?.tags).toContain('Aftermath');
  });

  it('keeps the second half of a card that already has one', async () => {
    const saveTmpCard = vi.fn();
    renderEditor(
      makeCard([CardType.Sorcery], {
        aftermathType: AftermathType.Instant,
        aftermathText: ['Draw a card.'],
      }),
      saveTmpCard,
    );

    await selectCardType(CardType.Aftermath);

    await waitFor(() =>
      expect(lastDraft(saveTmpCard)?.front).toMatchObject({
        aftermathType: AftermathType.Instant,
        aftermathText: ['Draw a card.'],
      }),
    );
  });

  it('disables the other two-part card types while Aftermath is selected', () => {
    renderEditor(makeCard([CardType.Sorcery, CardType.Aftermath]));

    openTypeSelect();

    expect(typeOption(CardType.Adventure)).toHaveClass(DISABLED_CLASS);
    expect(typeOption(CardType.Prepared)).toHaveClass(DISABLED_CLASS);
    expect(typeOption(CardType.Aftermath)).not.toHaveClass(DISABLED_CLASS);
  });

  it('only offers the Regular art style', () => {
    renderEditor(makeCard([CardType.Sorcery, CardType.Aftermath]));

    expect(screen.getByText(CardArtStyles.Regular)).toBeInTheDocument();
    for (const style of Object.values(CardArtStyles)) {
      if (style !== CardArtStyles.Regular) expect(screen.queryByText(style)).toBeNull();
    }
  });

  it('falls back to the Regular art style when the Aftermath type is added', async () => {
    const saveTmpCard = vi.fn();
    renderEditor(makeCard([CardType.Sorcery], { artStyle: CardArtStyles.Borderless }), saveTmpCard);

    await selectCardType(CardType.Aftermath);

    await waitFor(() => expect(lastDraft(saveTmpCard)?.front.artStyle).toBe(CardArtStyles.Regular));
  });
});
