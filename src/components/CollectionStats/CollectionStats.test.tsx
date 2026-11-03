import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CardInterface from '../../interfaces/CardInterface';
import CollectionStats, { buildManaCurveData } from './CollectionStats';

const card = (
  name: string,
  manaCost: string,
  rarity: string,
  cardTypes: string[],
  tags: string[] = [],
): CardInterface =>
  ({
    name,
    manaCost,
    rarity,
    uuid: name,
    tags,
    creator: { name: 'Tester', uuid: 'tester' },
    meta: { comment: '', likes: [], dislikes: [], lastUpdated: 0, createdAt: 0, state: 'Approved' },
    front: { name, cardText: [], cardTypes },
  }) as CardInterface;

describe('CollectionStats', () => {
  it('groups each filtered card by converted mana cost, color, rarity, and creature status', () => {
    const data = buildManaCurveData([
      card('Free Creature', '', 'Common', ['Creature']),
      card('White Creature', '{2}{W}', 'Rare', ['Creature']),
      card('Blue Spell', '{2}{U}', 'Mythic Rare', ['Instant']),
      card('Green Enchantment', '{1}{G}', 'Uncommon', ['Enchantment']),
    ]);

    expect(data.colors).toEqual([
      { cmc: 0, white: 0, blue: 0, black: 0, red: 0, green: 0, colorless: 1, multicolor: 0 },
      { cmc: 1, white: 0, blue: 0, black: 0, red: 0, green: 0, colorless: 0, multicolor: 0 },
      { cmc: 2, white: 0, blue: 0, black: 0, red: 0, green: 1, colorless: 0, multicolor: 0 },
      { cmc: 3, white: 1, blue: 1, black: 0, red: 0, green: 0, colorless: 0, multicolor: 0 },
    ]);
    expect(data.rarities).toEqual([
      { cmc: 0, Common: 1, Uncommon: 0, Rare: 0, 'Mythic Rare': 0 },
      { cmc: 1, Common: 0, Uncommon: 0, Rare: 0, 'Mythic Rare': 0 },
      { cmc: 2, Common: 0, Uncommon: 1, Rare: 0, 'Mythic Rare': 0 },
      { cmc: 3, Common: 0, Uncommon: 0, Rare: 1, 'Mythic Rare': 1 },
    ]);
    expect(data.types).toEqual([
      { cmc: 0, Creature: 1, 'Instant / Sorcery': 0, Other: 0 },
      { cmc: 1, Creature: 0, 'Instant / Sorcery': 0, Other: 0 },
      { cmc: 2, Creature: 0, 'Instant / Sorcery': 0, Other: 1 },
      { cmc: 3, Creature: 1, 'Instant / Sorcery': 1, Other: 0 },
    ]);
  });

  it('counts only the first member of each variant family', () => {
    const firstVariant = {
      ...card('First variant', '{1}{W}', 'Common', ['Creature'], ['Canonical']),
      uuid: 'first',
      variantIds: ['alternate'],
      meta: {
        ...card('First variant', '{1}{W}', 'Common', ['Creature']).meta,
        createdAt: 1,
      },
    };
    const alternate = {
      ...card('Alternate', '{4}{U}', 'Rare', ['Alternate']),
      uuid: 'alternate',
      variantIds: ['first'],
      meta: {
        ...card('Alternate', '{4}{U}', 'Rare', ['Instant']).meta,
        createdAt: 2,
      },
    };

    const data = buildManaCurveData([firstVariant, alternate], [firstVariant, alternate]);

    expect(data.colors).toEqual([
      { cmc: 2, white: 1, blue: 0, black: 0, red: 0, green: 0, colorless: 0, multicolor: 0 },
    ]);
  });

  it('excludes lands and groups instants and sorceries together', () => {
    const data = buildManaCurveData([
      card('Creature land', '{1}{G}', 'Rare', ['Creature', 'Land']),
      card('Basic land', '', 'Common', ['Basic Land']),
      card('Creature', '{2}{W}', 'Uncommon', ['Creature']),
      card('Instant', '{1}{U}', 'Common', ['Instant']),
      card('Sorcery', '{1}{B}', 'Common', ['Sorcery']),
      card('Enchantment', '{1}', 'Common', ['Enchantment']),
    ]);

    expect(data.types).toEqual([
      { cmc: 1, Creature: 0, 'Instant / Sorcery': 0, Other: 1 },
      { cmc: 2, Creature: 0, 'Instant / Sorcery': 2, Other: 0 },
      { cmc: 3, Creature: 1, 'Instant / Sorcery': 0, Other: 0 },
    ]);
  });

  it('counts a card once for each tag assigned to its first variant', () => {
    const data = buildManaCurveData([
      card('Tagged creature', '{1}{R}', 'Common', ['Creature'], ['Aggro', 'Flying']),
      card('Tagged spell', '{2}{G}', 'Rare', ['Sorcery'], ['Aggro']),
    ]);

    expect(data.tagCategories.map(({ label }) => label)).toEqual(['Aggro', 'Flying']);
    expect(data.tags).toEqual([
      { cmc: 2, 'tag-0': 1, 'tag-1': 1 },
      { cmc: 3, 'tag-0': 1, 'tag-1': 0 },
    ]);
  });

  it('uses only the first variant tags when another variant matches the active collection', () => {
    const firstVariant = {
      ...card('First variant', '{1}{W}', 'Common', ['Creature'], ['Canonical']),
      uuid: 'first',
      variantIds: ['alternate'],
      meta: { ...card('First variant', '{1}{W}', 'Common', ['Creature']).meta, createdAt: 1 },
    };
    const alternate = {
      ...card('Alternate', '{4}{U}', 'Rare', ['Instant'], ['Alternate']),
      uuid: 'alternate',
      variantIds: ['first'],
      meta: { ...card('Alternate', '{4}{U}', 'Rare', ['Instant']).meta, createdAt: 2 },
    };

    const data = buildManaCurveData([alternate], [firstVariant, alternate]);

    expect(data.tagCategories.map(({ label }) => label)).toEqual(['Canonical']);
    expect(data.tags[0]).toEqual({ cmc: 2, 'tag-0': 1 });
  });

  it('omits empty CMC buckets at either end but preserves gaps between populated buckets', () => {
    const data = buildManaCurveData([
      card('Two drop', '{1}{W}', 'Common', ['Creature']),
      card('Four drop', '{3}{U}', 'Rare', ['Instant']),
    ]);

    expect(data.colors.map(({ cmc }) => cmc)).toEqual([2, 3, 4]);
    expect(data.types.map(({ cmc }) => cmc)).toEqual([2, 3, 4]);
    expect(data.tags).toEqual([]);
  });

  it('shows four labeled mana-curve charts with counts inside the bars', () => {
    render(
      <CollectionStats collection={[card('White Creature', '{2}{W}', 'Rare', ['Creature'])]} />,
    );

    expect(screen.getByRole('region', { name: 'Collection mana curves' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mana curve' })).not.toBeInTheDocument();
    expect(screen.queryByText(/cards? in view/)).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /mana curve by color/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /mana curve by rarity/i })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /mana curve by nonland card types/i }),
    ).toBeInTheDocument();
    const tagChart = screen.getByRole('img', { name: /mana curve by tags/i });
    expect(tagChart).toBeInTheDocument();
    expect(tagChart.querySelectorAll('[title^="CMC"]')).toHaveLength(0);
    expect(screen.queryByText('CMC')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('group', { name: 'Card count axis' })).toHaveLength(0);
    const colorChart = screen.getByRole('img', { name: /mana curve by color/i });
    expect(within(colorChart).getByText('1')).toBeInTheDocument();
  });

  it('labels every colored segment in a stacked CMC bar', () => {
    render(
      <CollectionStats
        collection={[
          card('White card', '{1}{W}', 'Common', ['Creature']),
          card('Blue card', '{1}{U}', 'Rare', ['Instant']),
        ]}
      />,
    );

    const colorChart = screen.getByRole('img', { name: 'Mana curve by color: 2 cards' });
    expect(within(colorChart).getAllByText('1')).toHaveLength(2);
  });
});
