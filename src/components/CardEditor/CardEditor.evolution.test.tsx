import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';

import CardEditor from './CardEditor';
import { Store, StoreType } from '../../store';
import { CardArtStyles, CardState, CardType, RarityType } from '../../interfaces/enums';
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

describe('CardEditor - Evolution fields', () => {
  it('does not show level fields for other card types', () => {
    renderEditor(makeCard([CardType.Creature]));

    expect(screen.queryByText('Level 1')).toBeNull();
    expect(screen.queryByText('Level 2')).toBeNull();
    expect(screen.getByText('Power')).toBeVisible();
  });

  it('edits the P/T of the base and the levels with their text', () => {
    renderEditor(makeCard([EVOLUTION, CardType.Creature]));

    const steps = screen.getByRole('group', { name: 'Card text' });
    expect(within(steps).getByRole('textbox', { name: 'Base: power' })).toHaveValue('1');
    expect(within(steps).getByRole('textbox', { name: 'Level 1: power' })).toHaveValue('3');
    expect(within(steps).getByRole('textbox', { name: 'Level 2: text' })).toHaveValue(
      'Level 2 ability',
    );
    expect(screen.queryByRole('textbox', { name: 'Power' })).toBeNull();
  });

  it('moves the second level up when the first is removed', () => {
    renderEditor(makeCard([EVOLUTION, CardType.Creature]));

    fireEvent.click(screen.getByRole('button', { name: 'Level 1: remove' }));
    expect(screen.getByRole('textbox', { name: 'Level 1: indicator' })).toHaveValue('LEVEL 4+');
    expect(screen.getByRole('textbox', { name: 'Level 1: text' })).toHaveValue('Level 2 ability');
    expect(screen.getByRole('textbox', { name: 'Level 1: power' })).toHaveValue('4');
    expect(screen.queryByRole('textbox', { name: 'Level 2: text' })).toBeNull();
  });

  it('lists Evolution as a Card type and disables other exclusive types', () => {
    renderEditor(makeCard([EVOLUTION]));

    const typeField = screen.getByText('Card types').closest('span') as HTMLElement;
    fireEvent.mouseDown(typeField.querySelector('.ant-select-content') as Element);
    const input = typeField.querySelector('.ant-select-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Prepared' } });

    const preparedOption = Array.from(
      document.querySelectorAll('.ant-select-dropdown .ant-select-item-option'),
    ).find(option => option.getAttribute('title') === 'Prepared');
    expect(preparedOption).toHaveClass('ant-select-item-option-disabled');
  });

  it('offers exactly the Regular, Extended and Borderless art styles', () => {
    renderEditor(makeCard([EVOLUTION]));

    const options = within(screen.getByLabelText('Art style'))
      .getAllByRole('radio', { hidden: true })
      .map(input => input.getAttribute('value'));

    expect(options).toEqual([
      CardArtStyles.Regular,
      CardArtStyles.Extended,
      CardArtStyles.Borderless,
    ]);
  });
});
