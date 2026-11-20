import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CardInterface from '../../interfaces/CardInterface';
import BalancePreview from './BalancePreview';
import CollectionStats from './CollectionStats';

const card = (name: string, manaCost: string, tags: string[] = []): CardInterface =>
  ({
    name,
    uuid: name,
    manaCost,
    rarity: 'Common',
    tags,
    creator: { name: 'Tester', uuid: 'tester' },
    meta: { comment: '', likes: [], dislikes: [], createdAt: 0, lastUpdated: 0, state: 'Approved' },
    front: { name, cardTypes: ['Creature'], cardText: [], cardStats: '2/2' },
  }) as CardInterface;

const collection = [
  card('Shock Trooper', '{R}', ['Creature Removal']),
  card('Cloud Sprite', '{U}', ['Evasion', 'Card Draw']),
  card('Sky Knight', '{1}{U}', ['Evasion']),
];

// The count for a role (row) and color (column).
const cell = (role: string, color: string) => {
  const columns = screen.getAllByRole('columnheader').map(header => header.textContent);
  const row = screen.getByRole('rowheader', { name: role }).closest('tr') as HTMLElement;
  return within(row).getAllByRole('cell')[columns.indexOf(color)];
};

describe('BalancePreview', () => {
  it('shows the five colors against creatures, removal, evasion and card draw', () => {
    render(<BalancePreview collection={collection} />);

    expect(screen.getAllByRole('columnheader').map(header => header.textContent)).toEqual([
      'W',
      'U',
      'B',
      'R',
      'G',
    ]);
    expect(screen.getAllByRole('rowheader').map(header => header.textContent)).toEqual([
      'Creatures',
      'Removal',
      'Evasion',
      'Card draw',
    ]);
    expect(cell('Evasion', 'U').textContent).toBe('2');
    expect(cell('Evasion', 'U').getAttribute('title')).toBe(
      'Blue evasion: Cloud Sprite, Sky Knight',
    );
    expect(cell('Removal', 'R').textContent).toBe('1');
    expect(cell('Removal', 'U').getAttribute('title')).toBe('No blue removal');
  });

  it('opens the full table', () => {
    const onOpen = vi.fn();
    render(<BalancePreview collection={collection} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Full table' }));
    expect(onOpen).toHaveBeenCalled();
  });

  it('replaces the tag curve in the collapsed statistics and expands to the full table', () => {
    localStorage.clear();
    render(<CollectionStats collection={collection} />);

    const previews = screen.getByRole('group', { name: 'Statistics previews' });
    expect(
      within(previews)
        .getAllByRole('figure')
        .map(figure => within(figure).getByRole('heading').textContent),
    ).toEqual(['Color', 'Card type', 'Limited balance']);

    fireEvent.click(within(previews).getByRole('button', { name: 'Full table' }));
    expect(screen.getByRole('button', { name: 'Collapse statistics' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Limited balance' })).toBeInTheDocument();
  });
});
