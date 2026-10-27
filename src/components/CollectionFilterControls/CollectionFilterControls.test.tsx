import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CollectionFilterControls from './CollectionFilterControls';
import { EMPTY_CARD } from '../../actions/cardActions';
import { CardType, RarityType } from '../../interfaces/enums';
import { UNKNOWN_CREATOR } from '../../utils/constants';

if (!window.matchMedia) {
  window.matchMedia = (media: string) => ({
    matches: false,
    media,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  });
}

const alice = { ...UNKNOWN_CREATOR, uuid: 'alice', name: 'Alice' };
const bob = { ...UNKNOWN_CREATOR, uuid: 'bob', name: 'Bob' };
const first = { ...EMPTY_CARD(), uuid: 'first', name: 'First', creator: alice, tags: ['Control'] };
const second = {
  ...EMPTY_CARD(),
  uuid: 'second',
  name: 'Second',
  creator: bob,
  tags: ['Aggro'],
  rarity: RarityType.MythicRare,
};
const collection = [first, second];
const availableTags = ['Control', 'Aggro'];

describe('compact collection filters', () => {
  it('keeps mobile search working without optional filter callbacks or tags', () => {
    const setNameFilter = vi.fn();
    render(<CollectionFilterControls collection={[]} setNameFilter={setNameFilter} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Filter by card name' }), {
      target: { value: 'Dragon' },
    });
    expect(setNameFilter).toHaveBeenLastCalledWith('Dragon');
    expect(screen.queryByText('Card types')).not.toBeInTheDocument();
    expect(screen.queryByText('Display settings')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset all' }));
    expect(setNameFilter).toHaveBeenLastCalledWith('');
  });

  it('shows readable rarity names and counts and emits checkbox changes', () => {
    const setCollectionFilter = vi.fn();
    render(
      <CollectionFilterControls
        collection={collection}
        setCollectionFilter={setCollectionFilter}
        setNameFilter={vi.fn()}
      />,
    );
    const common = screen.getByRole('checkbox', { name: 'Common rarity' });
    expect(common.closest('label')).toHaveTextContent('Common');
    expect(common.closest('label')).toHaveTextContent('1');
    expect(
      screen.getByRole('checkbox', { name: 'Mythic Rare rarity' }).closest('label'),
    ).toHaveTextContent('Mythic Rare');
    expect(
      screen.getByRole('checkbox', { name: 'Creature type' }).closest('label'),
    ).toHaveTextContent('2');
    fireEvent.click(common);
    expect(setCollectionFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({
        rarity: expect.objectContaining({ Common: false, 'Mythic Rare': true }),
      }),
    );
  });

  it('starts secondary groups collapsed and makes their real options available on expansion', () => {
    render(
      <CollectionFilterControls
        collection={collection}
        availableTags={availableTags}
        setCollectionFilter={vi.fn()}
        setCollectionColSpan={vi.fn()}
        setNameFilter={vi.fn()}
      />,
    );
    for (const title of ['Creators', 'Tags', 'Display settings']) {
      expect(screen.getByText(title).closest('details')).not.toHaveAttribute('open');
      fireEvent.click(screen.getByText(title));
      expect(screen.getByText(title).closest('details')).toHaveAttribute('open');
    }
    expect(screen.getByRole('checkbox', { name: 'Alice creator' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Control tag' })).not.toBeChecked();
    expect(screen.getByRole('slider', { name: 'Cards per row' })).toBeInTheDocument();
    expect(screen.queryByText('All filters included')).not.toBeInTheDocument();
    expect(screen.queryByText('Live filtering')).not.toBeInTheDocument();
  });

  it('resets search and all filter groups to actual defaults without changing density or sort', () => {
    const setCollectionFilter = vi.fn();
    const setNameFilter = vi.fn();
    const setCollectionColSpan = vi.fn();
    render(
      <CollectionFilterControls
        collection={collection}
        availableTags={availableTags}
        setCollectionFilter={setCollectionFilter}
        setCollectionColSpan={setCollectionColSpan}
        setNameFilter={setNameFilter}
        sortControls={
          <select aria-label="Primary sort" defaultValue="Name">
            <option>Name</option>
            <option>Color</option>
          </select>
        }
      />,
    );
    const reset = screen.getByRole('button', { name: 'Reset all' });
    expect(reset).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Filter by card name' }), {
      target: { value: 'First' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Creature type' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Colorless color' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Common rarity' }));
    fireEvent.click(screen.getByText('Creators'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Alice creator' }));
    fireEvent.click(screen.getByText('Tags'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Control tag' }));
    expect(reset).not.toBeDisabled();
    fireEvent.click(reset);
    expect(screen.getByRole('textbox', { name: 'Filter by card name' })).toHaveValue('');
    expect(setNameFilter).toHaveBeenLastCalledWith('');
    expect(setCollectionFilter).toHaveBeenLastCalledWith({
      colors: expect.objectContaining({ colorless: true }),
      types: expect.objectContaining({ [CardType.Creature]: true }),
      rarity: expect.objectContaining({ Common: true, 'Mythic Rare': true }),
      creators: { alice: true, bob: true },
      tags: { Control: false, Aggro: false },
    });
    expect(screen.getByRole('combobox', { name: 'Primary sort' })).toHaveValue('Name');
    expect(setCollectionColSpan).not.toHaveBeenCalled();
    expect(reset).toBeDisabled();
  });

  it('reconciles creators and tags when the active collection changes', () => {
    const setCollectionFilter = vi.fn();
    const props = { availableTags, setCollectionFilter, setNameFilter: vi.fn() };
    const { rerender } = render(<CollectionFilterControls {...props} collection={collection} />);
    fireEvent.click(screen.getByText('Creators'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Alice creator' }));
    fireEvent.click(screen.getByText('Tags'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Control tag' }));
    rerender(<CollectionFilterControls {...props} collection={[first]} />);
    expect(screen.getByRole('checkbox', { name: 'Alice creator' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Control tag' })).toBeChecked();
    expect(screen.queryByRole('checkbox', { name: 'Bob creator' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Aggro tag' })).not.toBeInTheDocument();
    rerender(<CollectionFilterControls {...props} collection={collection} />);
    expect(screen.getByRole('checkbox', { name: 'Bob creator' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Aggro tag' })).not.toBeChecked();
  });

  it('renders empty collections without phantom options or an enabled reset', () => {
    render(
      <CollectionFilterControls
        collection={[]}
        availableTags={availableTags}
        setCollectionFilter={vi.fn()}
        setNameFilter={vi.fn()}
      />,
    );
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset all' })).toBeDisabled();
  });

  it('preserves complete accessible labels and separate counts for long names and tags', () => {
    const longName = 'A very long creator name that should never push counts out of the panel';
    const longTag = 'AReallyLongUnbrokenTagNameThatNeedsToStayInsideThePanel';
    render(
      <CollectionFilterControls
        collection={[{ ...first, creator: { ...alice, name: longName }, tags: [longTag] }]}
        availableTags={[longTag]}
        setCollectionFilter={vi.fn()}
        setNameFilter={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Creators'));
    fireEvent.click(screen.getByText('Tags'));
    for (const [name, suffix] of [
      [longName, 'creator'],
      [longTag, 'tag'],
    ]) {
      const option = screen.getByRole('checkbox', { name: `${name} ${suffix}` }).closest('label')!;
      expect(within(option).getByText(name)).toHaveAttribute('title', name);
      expect(within(option).getByText('1')).toBeInTheDocument();
    }
  });
});
