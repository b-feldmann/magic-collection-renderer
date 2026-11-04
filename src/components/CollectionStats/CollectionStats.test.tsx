import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CardInterface from '../../interfaces/CardInterface';
import CollectionStats from './CollectionStats';

const card = (
  name: string,
  manaCost = '{2}{U}',
  cardTypes = ['Creature'],
  tags: string[] = [],
): CardInterface =>
  ({
    name,
    uuid: name,
    manaCost,
    rarity: 'Common',
    tags,
    creator: { name: 'Tester', uuid: 'tester' },
    meta: { comment: '', likes: [], dislikes: [], lastUpdated: 0, createdAt: 0, state: 'Approved' },
    front: { name, cardText: [], cardTypes },
  }) as CardInterface;

describe('CollectionStats expanded charts', () => {
  it('includes zero-mana lands in the color charts in preview, individual and stacked views', () => {
    render(
      <CollectionStats
        collection={[card('Land', '', ['Land']), card('Free spell', '', ['Artifact'])]}
      />,
    );
    expect(screen.getByRole('img', { name: 'Mana curve by color: 2 cards' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Expand statistics' }));
    const colors = screen.getByRole('region', { name: 'Mana curve by color' });
    const colorless = within(colors).getByRole('img', { name: 'Mana curve by colorless: 2 cards' });
    expect(within(colorless).getByTitle('Mana value 0: 2 Colorless')).toBeInTheDocument();
    expect(
      screen.getByText(/other curves and summary statistics exclude lands/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stacked' }));
    expect(screen.getByRole('img', { name: 'Mana curve by color: 2 cards' })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Mana curve by card type: 1 card' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Mana curve by rarity: 1 card' })).toBeInTheDocument();
  });

  it('shows every color, separate card types, tags and expanded-only rarities', () => {
    render(
      <CollectionStats
        fillHeight
        collection={[
          card('Creature', '{2}{U}', ['Creature'], ['Flying']),
          card('Walker', '{4}', ['Planeswalker']),
        ]}
      />,
    );
    const colors = screen.getByRole('region', { name: 'Mana curve by color' });
    expect(within(colors).getAllByRole('figure')).toHaveLength(7);
    expect(within(colors).getByRole('heading', { name: 'Colorless' })).toBeInTheDocument();
    expect(within(colors).getByRole('heading', { name: 'Multicolor' })).toBeInTheDocument();
    const types = screen.getByRole('region', { name: 'Mana curve by card type' });
    for (const name of [
      'Creature',
      'Instant',
      'Sorcery',
      'Enchantment',
      'Artifact',
      'Planeswalker',
    ]) {
      expect(within(types).getByRole('heading', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('heading', { name: 'Flying' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Mana curve by rarity' })).getAllByRole('figure'),
    ).toHaveLength(4);
  });

  it('describes shared scales and updates them with the filtered data', () => {
    const collection = [card('Blue 1'), card('Blue 2'), card('Blue 3'), card('Red', '{2}{R}')];
    const { rerender } = render(<CollectionStats fillHeight collection={collection} />);
    const colors = screen.getByRole('region', { name: 'Mana curve by color' });
    expect(
      within(colors).getByText('Shared scale: 0–3 cards · mana values 0–7+'),
    ).toBeInTheDocument();
    rerender(<CollectionStats fillHeight collection={[collection[0]]} />);
    expect(
      within(colors).getByText('Shared scale: 0–1 cards · mana values 0–7+'),
    ).toBeInTheDocument();
  });

  it('shows nonland average and the 2–3 mana percentage with its denominator', () => {
    render(
      <CollectionStats
        fillHeight
        collection={[
          card('Two', '{2}'),
          card('Three', '{3}'),
          card('Eight', '{8}'),
          card('Land', '', ['Land']),
        ]}
      />,
    );
    expect(screen.getByText('4.33')).toBeInTheDocument();
    expect(screen.getByText('67%')).toBeInTheDocument();
    expect(screen.getByText(/2 of 3/)).toBeInTheDocument();
    expect(screen.getByText('Nonland cards · 1 land')).toBeInTheDocument();
    expect(screen.queryByText(/3 nonlands · 1 land/)).not.toBeInTheDocument();
  });

  it('shows a clear tag empty state and finite statistics for an all-land collection', () => {
    render(<CollectionStats fillHeight collection={[card('Land', '', ['Basic Land'])]} />);
    expect(screen.getByText('0.00')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('No tagged nonland cards')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Collection mana curves' })).not.toHaveTextContent(
      'NaN',
    );
  });

  it('labels overlapping tags without claiming they are unique card totals', () => {
    render(
      <CollectionStats
        fillHeight
        collection={[card('Tagged', '{2}', ['Creature'], ['Aggro', 'Flying'])]}
      />,
    );
    const tags = screen.getByRole('region', { name: 'Mana curve by tag' });
    expect(within(tags).getAllByText('1 tag match')).toHaveLength(2);
    expect(within(tags).getByText(/Cards can match multiple tags/)).toBeInTheDocument();
  });
});

const pointer = (element: HTMLElement, type: string, x: number, y: number) => {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  fireEvent(element, event);
};

describe('CollectionStats bottom sheet', () => {
  it('supports mostly hidden and preview closed states and persists the preferred state', () => {
    localStorage.clear();
    const { unmount } = render(<CollectionStats collection={[card('Blue')]} />);
    expect(
      screen.getByRole('button', { name: 'Expand statistics; drag up to expand' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Expand statistics; drag up to expand' }));
    fireEvent.click(screen.getByRole('button', { name: 'Collapse statistics' }));
    expect(screen.getByRole('heading', { name: 'Collection statistics' })).toBeInTheDocument();
    expect(screen.getByText('1 nonlands · 0 lands')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Collection statistics' }).closest('header'),
    ).toHaveTextContent('Average 3.00 mana · 100% at 2–3 mana');
    fireEvent.click(screen.getByRole('button', { name: 'Hidden' }));
    expect(
      screen.getByRole('button', { name: 'Expand statistics; drag up to expand' }),
    ).toBeInTheDocument();
    expect(localStorage.getItem('mtg-funset:CollectionStatsClosedState')).toBe('hidden');
    fireEvent.click(screen.getByRole('button', { name: 'Expand statistics; drag up to expand' }));
    fireEvent.click(screen.getByRole('button', { name: 'Collapse statistics' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(
      screen.getByRole('button', { name: 'Expand statistics; drag up to expand' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('figure')).toHaveLength(3);
    expect(localStorage.getItem('mtg-funset:CollectionStatsClosedState')).toBe('preview');
    unmount();
    render(<CollectionStats collection={[card('Blue')]} />);
    expect(
      screen.getByRole('button', { name: 'Expand statistics; drag up to expand' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('figure')).toHaveLength(3);
  });

  it('shows the mana curve of all filtered cards only in the hidden state', () => {
    localStorage.clear();
    const curveName = /^Mana curve of all cards/;
    const collection = [card('Three'), card('Other three', '{3}'), card('Land', '', ['Land'])];
    const { rerender } = render(<CollectionStats collection={collection} />);
    expect(screen.queryByRole('img', { name: curveName })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hidden' }));
    const curve = screen.getByRole('img', { name: 'Mana curve of all cards: 3 cards' });
    expect(within(curve).getByTitle('Mana value 3: 2 cards')).toBeInTheDocument();
    expect(within(curve).getByTitle('Mana value 0: 1 card')).toBeInTheDocument();
    expect(within(curve).getByTitle('Mana value 7+: 0 cards')).toBeInTheDocument();

    rerender(<CollectionStats collection={[collection[0]]} />);
    expect(
      screen.getByRole('img', { name: 'Mana curve of all cards: 1 card' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand statistics' }));
    expect(screen.queryByRole('img', { name: curveName })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse statistics' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.queryByRole('img', { name: curveName })).not.toBeInTheDocument();
    localStorage.clear();
  });

  it('starts with only the three stacked previews and opens to individual charts', () => {
    render(<CollectionStats collection={[card('Blue')]} />);
    expect(screen.getAllByRole('figure')).toHaveLength(3);
    expect(screen.queryByRole('heading', { name: 'Rarity' })).not.toBeInTheDocument();
    const expand = screen.getByRole('button', { name: 'Expand statistics' });
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(expand);
    expect(screen.getByRole('button', { name: 'Collapse statistics' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Individual' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('region', { name: 'Mana curve by rarity' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Mana curve by color' })).toBeInTheDocument();
  });

  it('switches all expanded charts to stacked and resets to individual on reopening', () => {
    render(<CollectionStats collection={[card('Blue')]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand statistics' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stacked' }));
    expect(screen.getAllByRole('figure')).toHaveLength(4);
    expect(screen.getByRole('img', { name: 'Mana curve by rarity: 1 card' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse statistics' }));
    expect(screen.getAllByRole('figure')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Expand statistics' }));
    expect(screen.getByRole('button', { name: 'Individual' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('collapses on Escape and restores focus to the expansion control', () => {
    render(<CollectionStats collection={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand statistics' }));
    fireEvent.keyDown(screen.getByRole('button', { name: 'Stacked' }), { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Expand statistics' })).toHaveFocus();
    expect(screen.queryByRole('region', { name: 'Mana curve by rarity' })).not.toBeInTheDocument();
  });

  it.each(['Enter', ' ', 'ArrowUp'])('opens using the handle keyboard action %s', key => {
    render(<CollectionStats collection={[]} />);
    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Expand statistics; drag up to expand' }),
      { key },
    );
    expect(screen.getByRole('button', { name: 'Collapse statistics' })).toBeInTheDocument();
    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Collapse statistics; drag down to collapse' }),
      { key: 'ArrowDown' },
    );
    expect(screen.getByRole('button', { name: 'Expand statistics' })).toBeInTheDocument();
  });

  it('expands and collapses on vertical handle drags without a trailing click reversing the gesture', () => {
    render(<CollectionStats collection={[card('Blue')]} />);
    const grip = screen.getByRole('button', { name: 'Expand statistics; drag up to expand' });
    grip.setPointerCapture = vi.fn();
    grip.releasePointerCapture = vi.fn();
    pointer(grip, 'pointerdown', 100, 200);
    pointer(grip, 'pointerup', 100, 100);
    fireEvent.click(grip);
    expect(screen.getByRole('button', { name: 'Collapse statistics' })).toBeInTheDocument();
    pointer(grip, 'pointerdown', 100, 100);
    pointer(grip, 'pointerup', 100, 200);
    fireEvent.click(grip);
    expect(screen.getByRole('button', { name: 'Expand statistics' })).toBeInTheDocument();
  });

  it.each([
    { name: 'short', endX: 100, endY: 180, cancel: false },
    { name: 'horizontal', endX: 240, endY: 150, cancel: false },
    { name: 'cancelled', endX: 100, endY: 100, cancel: true },
  ])('ignores $name gestures', ({ endX, endY, cancel }) => {
    render(<CollectionStats collection={[]} />);
    const grip = screen.getByRole('button', { name: 'Expand statistics; drag up to expand' });
    grip.setPointerCapture = vi.fn();
    grip.releasePointerCapture = vi.fn();
    pointer(grip, 'pointerdown', 100, 200);
    if (cancel) pointer(grip, 'pointercancel', endX, endY);
    pointer(grip, 'pointerup', endX, endY);
    expect(screen.getByRole('button', { name: 'Expand statistics' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('embeds expanded content in the existing mobile drawer without a nested sheet', () => {
    render(<CollectionStats fillHeight collection={[card('Blue')]} />);
    expect(
      screen.queryByRole('button', { name: /Expand statistics|Collapse statistics/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Mana curve by rarity' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stacked' }));
    expect(screen.getAllByRole('figure')).toHaveLength(4);
  });

  it('keeps the expanded selection when live filtered data changes', () => {
    const { rerender } = render(<CollectionStats collection={[card('Blue')]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand statistics' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stacked' }));
    rerender(<CollectionStats collection={[]} />);
    expect(screen.getByRole('button', { name: 'Stacked' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: 'Mana curve by color: 0 cards' })).toBeInTheDocument();
  });
});
