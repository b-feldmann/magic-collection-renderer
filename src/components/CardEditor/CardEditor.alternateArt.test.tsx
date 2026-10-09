import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import CardEditor from './CardEditor';
import { Store, StoreType } from '../../store';
import { CardArtStyles, CardType, CardState, RarityType } from '../../interfaces/enums';
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

const makeCard = (cardTypes: CardType[], artStyle?: CardArtStyles): CardInterface => ({
  name: '',
  uuid: 'card-1',
  manaCost: '{1}{G}',
  rarity: RarityType.Common,
  front: {
    name: 'Test',
    cardTypes,
    cardText: [],
    ...(artStyle ? { artStyle } : {}),
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

// Selects the given option in the Card Types multi-select.
const selectCardType = async (typeLabel: string) => {
  const label = screen.getByText('Card Types');
  const field = label.parentElement!.parentElement!;
  fireEvent.mouseDown(field.querySelector('.ant-select') as HTMLElement);

  await waitFor(() => {
    expect(document.querySelectorAll('.ant-select-item-option').length).toBeGreaterThan(0);
  });
  // The [role="option"] elements are the virtual list's raw holders without
  // click handlers; the interactive options carry .ant-select-item-option.
  const option = Array.from(document.querySelectorAll('.ant-select-item-option')).find(
    o => o.textContent === typeLabel,
  )!;
  expect(option).toBeDefined();
  fireEvent.click(option);
};

// Removes the given type from the Card Types selection via the tag's remove
// icon (clicking an already-selected dropdown option does not deselect it in
// antd's jsdom implementation).
const deselectCardType = (typeLabel: string) => {
  const label = screen.getByText('Card Types');
  const field = label.parentElement!.parentElement!;
  const tag = Array.from(field.querySelectorAll('.ant-select-selection-item')).find(t =>
    t.textContent?.includes(typeLabel),
  );
  expect(tag).toBeDefined();
  fireEvent.click(tag!.querySelector('.ant-select-selection-item-remove')!);
};

describe('CardEditor - alternate art art style', () => {
  it('offers ELD Alternate Art for an adventure; Extended and Borderless are disabled', () => {
    render(
      <Store.Provider value={mockStoreValue}>
        <CardEditor
          card={makeCard([CardType.Creature, CardType.Adventure])}
          saveTmpCard={() => {}}
        />
      </Store.Provider>,
    );

    expect(screen.getByText('ELD Alternate Art')).toBeVisible();
    // Extended and Borderless are unavailable for adventures for now.
    expect(screen.queryByText('Borderless')).toBeNull();
    expect(screen.queryByText('Extended')).toBeNull();
  });

  it('CONTROL: a non-adventure keeps Extended and Borderless and hides the Alternate Art style', () => {
    render(
      <Store.Provider value={mockStoreValue}>
        <CardEditor card={makeCard([CardType.Creature])} saveTmpCard={() => {}} />
      </Store.Provider>,
    );

    expect(screen.queryByText('ELD Alternate Art')).toBeNull();
    expect(screen.getByText('Borderless')).toBeVisible();
    expect(screen.getByText('Extended')).toBeVisible();
  });

  it('adding the Adventure type switches a chosen Extended style to ELD Alternate Art', async () => {
    const saveTmpCard = vi.fn();
    render(
      <Store.Provider value={mockStoreValue}>
        <CardEditor
          card={makeCard([CardType.Creature], CardArtStyles.Extended)}
          saveTmpCard={saveTmpCard}
        />
      </Store.Provider>,
    );

    await selectCardType('Adventure');

    // The debounced preview path (EDIT_TIME_OFFSET = 600ms) writes the card.
    await new Promise(resolve => setTimeout(resolve, 700));

    const saved = saveTmpCard.mock.calls
      .map(call => call[0])
      .reverse()
      .find(c => c?.front?.cardTypes?.includes(CardType.Adventure));
    expect(saved?.front.cardTypes).toContain(CardType.Adventure);
    expect(saved?.front.artStyle).toBe(CardArtStyles.EldAlternateArt);
  });

  it('adding the Adventure type switches a chosen Borderless style to ELD Alternate Art', async () => {
    const saveTmpCard = vi.fn();
    render(
      <Store.Provider value={mockStoreValue}>
        <CardEditor
          card={makeCard([CardType.Creature], CardArtStyles.Borderless)}
          saveTmpCard={saveTmpCard}
        />
      </Store.Provider>,
    );

    await selectCardType('Adventure');

    await new Promise(resolve => setTimeout(resolve, 700));

    const saved = saveTmpCard.mock.calls
      .map(call => call[0])
      .reverse()
      .find(c => c?.front?.cardTypes?.includes(CardType.Adventure));
    expect(saved?.front.cardTypes).toContain(CardType.Adventure);
    expect(saved?.front.artStyle).toBe(CardArtStyles.EldAlternateArt);
  });

  it('removing the Adventure type switches ELD Alternate Art to Extended', async () => {
    const saveTmpCard = vi.fn();
    render(
      <Store.Provider value={mockStoreValue}>
        <CardEditor
          card={makeCard([CardType.Creature, CardType.Adventure], CardArtStyles.EldAlternateArt)}
          saveTmpCard={saveTmpCard}
        />
      </Store.Provider>,
    );

    deselectCardType('Adventure');

    await new Promise(resolve => setTimeout(resolve, 700));

    const saved = saveTmpCard.mock.calls
      .map(call => call[0])
      .reverse()
      .find(
        c => Array.isArray(c?.front?.cardTypes) && !c.front.cardTypes.includes(CardType.Adventure),
      );
    expect(saved?.front.cardTypes).toEqual([CardType.Creature]);
    expect(saved?.front.artStyle).toBe(CardArtStyles.Extended);
  });

  it('a style that becomes unavailable for another reason falls back to Regular', async () => {
    const saveTmpCard = vi.fn();
    render(
      <Store.Provider value={mockStoreValue}>
        <CardEditor
          card={makeCard([CardType.Creature], CardArtStyles.Extended)}
          saveTmpCard={saveTmpCard}
        />
      </Store.Provider>,
    );

    // Basic lands only offer the basic-land art styles, so Extended must fall
    // back to Regular. ('Token' would cover this too, but it sits below the
    // dropdown's virtualized render window, so we use the visible 'Basic Land'.)
    await selectCardType('Basic Land');

    await new Promise(resolve => setTimeout(resolve, 700));

    const saved = saveTmpCard.mock.calls
      .map(call => call[0])
      .reverse()
      .find(c => c?.front?.cardTypes?.includes(CardType.BasicLand));
    expect(saved?.front.cardTypes).toContain(CardType.BasicLand);
    expect(saved?.front.artStyle).toBe(CardArtStyles.Regular);
  });
});
