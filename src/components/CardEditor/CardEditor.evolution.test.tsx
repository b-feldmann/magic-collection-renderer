import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import CardEditor from './CardEditor';
import { Store, StoreType } from '../../store';
import { CardState, CardType, RarityType } from '../../interfaces/enums';
import { UNKNOWN_CREATOR } from '../../utils/constants';
import type CardInterface from '../../interfaces/CardInterface';

const EVOLUTION = CardType.Evolution;

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
  uuid: 'evolution-card-1',
  manaCost: '{1}{G}',
  rarity: RarityType.Common,
  front: {
    name: 'Test Evolution',
    cardTypes,
    cardText: [],
    level1Indicator: 'LEVEL 2-3',
    level2Indicator: 'LEVEL 4+',
    level1Text: ['Level 1 ability'],
    level2Text: ['Level 2 ability'],
    cardStats: '1/1',
    level1Stats: '3/3',
    level2Stats: '4/4',
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

const getLevelTextField = (label: string) =>
  screen
    .getAllByText(label)
    .map(element => element.closest('span'))
    .find(field => field?.querySelector('input[placeholder="Indicator"]')) as HTMLElement;

describe('CardEditor - Evolution fields', () => {
  it('does not show level fields for other card types', () => {
    renderEditor(makeCard([CardType.Creature]));

    expect(screen.queryByText('Level 1')).toBeNull();
    expect(screen.queryByText('Level 2')).toBeNull();
    expect(screen.queryByText('Level 1 Power')).toBeNull();
    expect(screen.getByText('Power')).toBeVisible();
  });

  it('lists Evolution as a Card Type and disables other exclusive types', () => {
    renderEditor(makeCard([EVOLUTION]));

    const typeField = screen.getByText('Card Types').closest('span') as HTMLElement;
    fireEvent.mouseDown(typeField.querySelector('.ant-select-content') as Element);
    const input = typeField.querySelector('.ant-select-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Prepared' } });

    const preparedOption = Array.from(
      document.querySelectorAll('.ant-select-dropdown .ant-select-item-option'),
    ).find(option => option.getAttribute('title') === 'Prepared');
    expect(preparedOption).toHaveClass('ant-select-item-option-disabled');
  });
});
