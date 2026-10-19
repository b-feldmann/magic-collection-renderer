import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import Cell from './Cell';
import type CardInterface from '../../interfaces/CardInterface';
import { CardState, CardType, RarityType } from '../../interfaces/enums';
import { UNKNOWN_CREATOR } from '../../utils/constants';

vi.mock('../TemplatingCardRender/index', () => ({ default: () => null }));

const card: CardInterface = {
  name: 'Favorite Card',
  uuid: 'favorite-card',
  manaCost: '',
  rarity: RarityType.Common,
  front: { name: 'Favorite Card', cardTypes: [CardType.Creature], cardText: [] },
  creator: UNKNOWN_CREATOR,
  favorite: true,
  meta: {
    comment: '',
    likes: [],
    dislikes: [],
    lastUpdated: 0,
    createdAt: 0,
    state: CardState.Draft,
  },
};

describe('CardCollection Cell favorite indicator', () => {
  it('shows a heart on favorited cards in the grid', () => {
    render(
      <Cell
        ariaAttributes={{ 'aria-colindex': 1, role: 'gridcell' }}
        style={{}}
        columnIndex={0}
        rowIndex={0}
        cards={[card]}
        columnCount={1}
        seenCardUuids={{ [card.uuid]: true }}
        currentEditId=""
        addSeenCard={() => {}}
        editCard={() => {}}
        downloadCard={() => {}}
        toggleShowBackConfig={() => {}}
        width={200}
        showBackFaceConfig={{}}
      />,
    );

    expect(screen.getByRole('img', { name: 'Favorite card' })).toBeVisible();
  });
});
