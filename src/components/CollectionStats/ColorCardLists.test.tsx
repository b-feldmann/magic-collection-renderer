import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CardInterface from '../../interfaces/CardInterface';
import CollectionStats from './CollectionStats';
import { buildColorCardLists } from './collectionStatsData';

// The card render in the hover preview measures itself; jsdom has no ResizeObserver.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const card = (
  name: string,
  manaCost: string,
  cardTypes = ['Creature'],
  tags: string[] = [],
  creator = 'Tester',
): CardInterface =>
  ({
    name,
    uuid: name,
    manaCost,
    rarity: 'Common',
    tags,
    creator: { name: creator, uuid: creator },
    meta: { comment: '', likes: [], dislikes: [], lastUpdated: 0, createdAt: 0, state: 'Approved' },
    front: { name, cardText: [], cardTypes },
  }) as CardInterface;

describe('buildColorCardLists', () => {
  it('groups cards by color and sorts them by draft role, then name', () => {
    const lists = buildColorCardLists([
      card('Zebra', '{W}'),
      card('Big angel', '{5}{W}{W}'),
      card('Apprentice', '{W}'),
      card('Free relic', '', ['Artifact']),
      card('Plains', '', ['Land']),
      card('Knight', '{2}{W}'),
      card('Hybrid', '{W}{U}'),
    ]);
    const white = lists.find(list => list.category.key === 'white' && list.tier === 'common')!;
    expect(white.cards.map(entry => [entry.name, entry.draftRole])).toEqual([
      ['Apprentice', '1-Drop'],
      ['Zebra', '1-Drop'],
      ['Knight', '3-Drop'],
      ['Big angel', 'Late-Drop'],
    ]);
    expect(white.roleCounts).toMatchObject({ '1-Drop': 2, '3-Drop': 1, 'Late-Drop': 1 });
    const colorless = lists.find(list => list.category.key === 'colorless')!;
    expect(colorless.cards.map(entry => entry.draftRole)).toEqual(['1-Drop', 'Land']);
    expect(lists.find(list => list.category.key === 'multicolor')!.cards).toHaveLength(1);
  });

  it('splits each color into Commons, Uncommons and Rares & Mythics', () => {
    const withRarity = (rarity: string, name: string) =>
      ({ ...card(name, '{W}'), rarity }) as CardInterface;
    const white = buildColorCardLists([
      withRarity('Common', 'C'),
      withRarity('Uncommon', 'U'),
      withRarity('Rare', 'R'),
      withRarity('Mythic Rare', 'M'),
    ]).filter(list => list.category.key === 'white');
    expect(white.map(list => [list.tierLabel, list.cards.map(entry => entry.name)])).toEqual([
      ['Commons', ['C']],
      ['Uncommons', ['U']],
      ['Rares & Mythics', ['M', 'R']],
    ]);
  });
});

describe('CollectionStats color card lists', () => {
  it('lists name, draft role, creator and tags per color when expanded', () => {
    render(
      <CollectionStats
        fillHeight
        collection={[
          card('Tadpole', '{U}', ['Artifact', 'Creature'], ['Evolve', 'Counters'], 'Benni'),
        ]}
      />,
    );
    const lists = screen.getByRole('region', { name: 'Cards by color' });
    const blue = within(lists).getByRole('region', { name: 'Blue Commons (1)' });
    expect(
      within(blue)
        .getAllByRole('columnheader')
        .map(header => header.textContent),
    ).toEqual(['Name', 'Card type', 'Draft role', 'Creator', 'Tags']);
    const row = within(blue).getByRole('row', { name: /Tadpole/ });
    expect(within(row).getByText('Artifact Creature')).toBeInTheDocument();
    expect(within(row).getByText('1-Drop')).toBeInTheDocument();
    expect(within(row).getByText('Benni')).toBeInTheDocument();
    expect(within(row).getByText('Evolve, Counters')).toBeInTheDocument();
    // Colors without cards get no table.
    expect(within(lists).queryByRole('region', { name: /^White/ })).not.toBeInTheDocument();
  });

  it('shows the rendered card in a popup while hovering its row', async () => {
    render(<CollectionStats fillHeight collection={[card('Tadpole', '{U}')]} />);
    const lists = screen.getByRole('region', { name: 'Cards by color' });
    const row = within(lists).getByRole('row', { name: /Tadpole/ });
    expect(screen.queryByRole('img', { name: 'Preview of Tadpole' })).not.toBeInTheDocument();
    fireEvent.mouseEnter(row);
    expect(await screen.findByRole('img', { name: 'Preview of Tadpole' })).toBeInTheDocument();
  });
});
