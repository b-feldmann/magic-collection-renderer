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

const getSectionHeading = (label: string) =>
  screen.getAllByText(label).find(element => element.classList.contains('ant-divider-inner-text'))!;

const getLevelTextField = (label: string) =>
  screen
    .getAllByText(label)
    .map(element => element.closest('span'))
    .find(field => field?.querySelector('input[placeholder="Indicator"]')) as HTMLElement;

describe('CardEditor - Evolution fields', () => {
  it('shows combined indicator and text fields plus P/T fields for an Evolution card', () => {
    renderEditor(makeCard([EVOLUTION, CardType.Creature]));

    for (const label of [
      'Level 1 Power',
      'Level 1 Toughness',
      'Level 2 Power',
      'Level 2 Toughness',
    ]) {
      expect(screen.getByText(label)).toBeVisible();
    }
    for (const label of ['Level 1', 'Level 2']) {
      const field = getLevelTextField(label);
      expect(field.querySelector('input[placeholder="Indicator"]')).toBeInTheDocument();
      expect(field.querySelector('textarea[placeholder="Card Text"]')).toBeInTheDocument();
    }
    expect(screen.getByText('Power')).toBeVisible();
    expect(screen.getByText('Toughness')).toBeVisible();
  });

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

  it('saves edits to level indicators and level stats on the face', async () => {
    const saveTmpCard = vi.fn();
    render(
      <Store.Provider value={mockStoreValue}>
        <CardEditor card={makeCard([EVOLUTION, CardType.Creature])} saveTmpCard={saveTmpCard} />
      </Store.Provider>,
    );

    const levelField = getLevelTextField('Level 1');
    fireEvent.change(levelField.querySelector('input') as HTMLInputElement, {
      target: { value: 'LEVEL 3-5' },
    });
    fireEvent.change(levelField.querySelector('textarea') as HTMLTextAreaElement, {
      target: { value: 'Level 1 updated ability' },
    });
    const statsField = screen.getByText('Level 1 Power').closest('span') as HTMLElement;
    fireEvent.change(statsField.querySelector('input') as HTMLInputElement, {
      target: { value: '5' },
    });

    await new Promise(resolve => setTimeout(resolve, 700));

    const savedCalls = saveTmpCard.mock.calls;
    const saved = savedCalls[savedCalls.length - 1][0];
    expect(saved.front.level1Indicator).toBe('LEVEL 3-5');
    expect(saved.front.level1Text).toEqual(['Level 1 updated ability']);
    expect(saved.front.level1Stats).toBe('5/3');
  });
});
