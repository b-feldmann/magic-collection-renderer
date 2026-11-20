import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CardInterface from '../../interfaces/CardInterface';
import LimitedBalance from './LimitedBalance';

const card = (name: string, manaCost: string, tags: string[], rarity = 'Common'): CardInterface =>
  ({
    name,
    uuid: name,
    manaCost,
    rarity,
    tags,
    creator: { name: 'Tester', uuid: 'tester' },
    meta: { comment: '', likes: [], dislikes: [], createdAt: 0, lastUpdated: 0, state: 'Approved' },
    front: { name, cardTypes: ['Creature'], cardText: [], cardStats: '2/2' },
  }) as CardInterface;

const collection = [
  card('Shock Trooper', '{R}', ['Creature Removal']),
  card('Fireball Mage', '{2}{R}', ['Creature Removal'], 'Rare'),
  card('Cloud Sprite', '{U}', ['Evasion']),
];

const rowOf = (label: string) =>
  screen.getByRole('rowheader', { name: label }).closest('tr') as HTMLElement;
const removalCell = (label: string) => {
  const headers = screen.getAllByRole('columnheader').map(header => header.textContent);
  return within(rowOf(label)).getAllByRole('cell')[headers.indexOf('Removal') - 1];
};

describe('LimitedBalance', () => {
  it('shows a row per color with role counts and the cards behind them', () => {
    render(<LimitedBalance collection={collection} />);

    expect(screen.getByRole('table')).toBeDefined();
    expect(removalCell('Red').textContent).toBe('2');
    expect(removalCell('Red').getAttribute('title')).toBe('Removal: Fireball Mage, Shock Trooper');
    expect(removalCell('Blue').textContent).toBe('0');
    expect(removalCell('Total').textContent).toBe('2');
  });

  it('narrows the counts to a rarity', () => {
    render(<LimitedBalance collection={collection} />);

    const rarity = screen.getByRole('group', { name: 'Rarity' });
    fireEvent.click(within(rarity).getByRole('button', { name: 'Commons' }));

    expect(
      within(rarity).getByRole('button', { name: 'Commons' }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(removalCell('Red').textContent).toBe('1');
  });

  it('describes the power spread for screen readers', () => {
    render(<LimitedBalance collection={collection} />);
    expect(
      within(rowOf('Red')).getByRole('img', {
        name: 'power 0–1: 0, power 2: 2, power 3: 0, power 4: 0, power 5+: 0',
      }),
    ).toBeDefined();
  });

  it('says so when there are no cards', () => {
    render(<LimitedBalance collection={[]} />);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('No cards to compare.')).toBeDefined();
  });
});
