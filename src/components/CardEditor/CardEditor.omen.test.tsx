import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import CardEditor from './CardEditor';
import { Store, StoreType } from '../../store';
import { CardType, CardState, RarityType } from '../../interfaces/enums';
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

const mockStoreValue: StoreType = {
  cards: [],
  mechanics: [],
  annotationAccessor: {},
  user: [UNKNOWN_CREATOR],
  currentUser: UNKNOWN_CREATOR,
  dispatch: () => {},
};

const makeCard = (cardTypes: CardType[]): CardInterface => ({
  name: '',
  uuid: 'omen-card-1',
  manaCost: '{2}',
  rarity: RarityType.Common,
  front: {
    name: 'Test',
    cardTypes,
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

const renderEditor = (card: CardInterface) =>
  render(
    <Store.Provider value={mockStoreValue}>
      <CardEditor card={card} saveTmpCard={() => {}} />
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

const optionTitles = (): string[] =>
  Array.from(document.querySelectorAll('.ant-select-dropdown .ant-select-item-option')).map(
    el => el.getAttribute('title') as string,
  );

describe('CardEditor - hidden card types', () => {
  it('does not list Omen, Split Card or Aftermath among the card type options', () => {
    renderEditor(makeCard([CardType.Creature]));

    openTypeSelect();

    const titles = optionTitles();
    expect(titles).not.toContain(CardType.Omen);
    expect(titles).not.toContain('Split Card');
    expect(titles).not.toContain(CardType.Aftermath);
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
