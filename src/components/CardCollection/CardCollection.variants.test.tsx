import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CardCollection from './CardCollection';
import { EMPTY_CARD } from '../../actions/cardActions';
import { getImage } from '../../actions/imageActions';
import CardInterface from '../../interfaces/CardInterface';

// jsdom has no measured layout or canvas; retain the real grid and interactions.
vi.mock('react-virtualized-auto-sizer', () => ({
  AutoSizer: ({
    renderProp,
  }: {
    renderProp: (size: { width: number; height: number }) => React.ReactNode;
  }) => renderProp({ width: 800, height: 1200 }),
}));
vi.mock('../TemplatingCardRender/index', () => ({
  default: ({
    cardID,
    name,
    collectionSize,
  }: {
    cardID: string;
    name: string;
    collectionSize: number;
  }) => (
    <span data-testid={`render-${cardID}`} data-collection-size={collectionSize}>
      {name}
    </span>
  ),
}));
vi.mock('../../actions/imageActions', () => ({ getImage: vi.fn(), createImage: vi.fn() }));

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const makeCard = (uuid: string, variantIds?: string[]): CardInterface => ({
  ...EMPTY_CARD(),
  uuid,
  variantIds,
  front: { name: uuid, cardText: [], cardTypes: [] },
  meta: { ...EMPTY_CARD().meta, createdAt: 0 },
});

const a = makeCard('a', ['b']);
const b = {
  ...makeCard('b', ['a']),
  favorite: true,
  back: { name: 'back-b', cardText: [], cardTypes: [] },
  front: { name: 'b', cardText: [], cardTypes: [], cover: 'loading:b.png' },
};

describe('collection variant carousel', () => {
  beforeEach(() => vi.clearAllMocks());
  const props = {
    editCard: vi.fn(),
    addSeenCard: vi.fn(),
    seenCardUuids: {},
    currentEditId: '',
    colSpanSetting: 2,
  };

  it('requests synchronized editor selection and waits for the accepted editor ID', () => {
    const onSelectVariant = vi.fn();
    const { rerender } = render(
      <CardCollection
        {...props}
        cards={[a, b]}
        currentEditId="a"
        onSelectVariant={onSelectVariant}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next variant' }));
    expect(onSelectVariant).toHaveBeenCalledWith('b');
    expect(screen.getByTestId('render-a')).toBeVisible();
    expect(screen.queryByTestId('render-b')).not.toBeInTheDocument();
    rerender(
      <CardCollection
        {...props}
        cards={[a, b]}
        currentEditId="b"
        onSelectVariant={onSelectVariant}
      />,
    );
    expect(screen.getByTestId('render-b')).toBeVisible();
    expect(props.editCard).not.toHaveBeenCalled();
  });

  it('renders one tile per family and no controls for ordinary cards', () => {
    render(<CardCollection {...props} cards={[a, b, makeCard('ordinary')]} />);
    expect(screen.getByTestId('render-a')).toHaveAttribute('data-collection-size', '2');
    expect(screen.queryByTestId('render-b')).not.toBeInTheDocument();
    expect(screen.getByTestId('render-ordinary')).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Next variant' })).toHaveLength(1);
  });

  it('switches variants without opening the editor and targets selected-member interactions', async () => {
    render(<CardCollection {...props} cards={[a, b]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next variant' }));
    expect(props.editCard).not.toHaveBeenCalled();
    expect(screen.getByTestId('render-b')).toBeVisible();
    expect(screen.getByText('2 / 2')).toBeVisible();
    expect(screen.getByRole('img', { name: 'Favorite card' })).toBeVisible();
    fireEvent.mouseEnter(
      screen.getByTestId('render-b').parentElement!.parentElement!.parentElement!,
    );
    fireEvent.click(screen.getByTestId('render-b'));
    expect(props.editCard).toHaveBeenLastCalledWith('b');
    expect(props.addSeenCard).toHaveBeenLastCalledWith('b');
    await waitFor(() =>
      expect(getImage).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ uuid: 'b' }),
        0,
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show other face' }));
    expect(screen.getByText('back-b')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Previous variant' }));
    expect(screen.getByTestId('render-a')).toBeVisible();
  });

  it.each([false, true])('groups variant and face controls in one row (mobile: %s)', mobile => {
    render(<CardCollection {...props} cards={[a, b]} mobile={mobile} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next variant' }));

    const controls = screen.getByRole('group', { name: 'Card controls' });
    expect(within(controls).getByRole('group', { name: 'Card variants' })).toBeVisible();
    fireEvent.click(within(controls).getByRole('button', { name: 'Show other face' }));
    expect(screen.getByText('back-b')).toBeVisible();
    expect(props.editCard).not.toHaveBeenCalled();

    fireEvent.click(within(controls).getByRole('button', { name: 'Previous variant' }));
    expect(screen.queryByRole('button', { name: 'Show other face' })).not.toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeVisible();
  });

  it('admits a matching variant and retains the full family under filtering', () => {
    render(<CardCollection {...props} cards={[b]} allCards={[a, b, makeCard('hidden')]} />);
    expect(screen.getByText('1 / 2')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Next variant' }));
    expect(screen.getByTestId('render-b')).toBeVisible();
    expect(screen.queryByTestId('render-hidden')).not.toBeInTheDocument();
  });

  it('keeps selection with its family when grid positions change and falls back after deletion', () => {
    const other = makeCard('other');
    const { rerender } = render(<CardCollection {...props} cards={[a, b, other]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next variant' }));
    rerender(<CardCollection {...props} cards={[other, b, a]} />);
    expect(screen.getByTestId('render-b')).toBeVisible();
    expect(screen.getByTestId('render-other')).toBeVisible();
    rerender(<CardCollection {...props} cards={[other, { ...a, variantIds: [] }]} />);
    expect(screen.getByTestId('render-a')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Next variant' })).not.toBeInTheDocument();
  });

  it('loads covers in every visible column, including the last column of the final row', async () => {
    const cards = ['one', 'two', 'three', 'four'].map(id => ({
      ...makeCard(id),
      front: { name: id, cardText: [], cardTypes: [], cover: `loading:${id}.png` },
    }));
    render(<CardCollection {...props} cards={cards} />);
    await waitFor(() =>
      expect(getImage).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ uuid: 'four' }),
        0,
      ),
    );
  });

  it('preserves a surviving selection when the first family member is deleted', () => {
    const first = { ...a, variantIds: ['b', 'c'] };
    const second = { ...b, variantIds: ['a', 'c'] };
    const third = makeCard('c', ['a', 'b']);
    const { rerender } = render(<CardCollection {...props} cards={[first, second, third]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Previous variant' }));
    expect(screen.getByTestId('render-c')).toBeVisible();
    rerender(
      <CardCollection
        {...props}
        cards={[
          { ...second, variantIds: ['c'] },
          { ...third, variantIds: ['b'] },
        ]}
      />,
    );
    expect(screen.getByTestId('render-c')).toBeVisible();
    expect(screen.getByText('2 / 2')).toBeVisible();
  });

  it('selects a newly edited member without overriding later manual carousel choices', () => {
    const { rerender } = render(<CardCollection {...props} cards={[a, b]} />);
    rerender(<CardCollection {...props} cards={[a, b]} currentEditId="b" />);
    expect(screen.getByTestId('render-b')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Previous variant' }));
    rerender(<CardCollection {...props} cards={[{ ...a }, { ...b }]} currentEditId="b" />);
    expect(screen.getByTestId('render-a')).toBeVisible();
  });
});
