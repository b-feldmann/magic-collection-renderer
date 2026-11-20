import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CardInterface from '../../interfaces/CardInterface';
import { Store, StoreType } from '../../store';
import { UNKNOWN_CREATOR } from '../../utils/constants';
import CollectionActions from '../CollectionActions/CollectionActions';
import SamplePackModal from './SamplePackModal';

// The card renders measure themselves; jsdom has no ResizeObserver.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
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

const card = (name: string, rarity: string, manaCost = '{1}', cardTypes = ['Creature']) =>
  ({
    name,
    uuid: name,
    manaCost,
    rarity,
    creator: UNKNOWN_CREATOR,
    meta: { comment: '', likes: [], dislikes: [], createdAt: 0, lastUpdated: 0, state: 'Approved' },
    front: { name, cardTypes, cardText: [], cardStats: '2/2' },
  }) as unknown as CardInterface;

const colors = ['{W}', '{U}', '{B}', '{R}', '{G}'];
const cards = [
  ...Array.from({ length: 12 }, (_, i) => card(`Common ${i}`, 'Common', colors[i % 5])),
  ...Array.from({ length: 4 }, (_, i) => card(`Uncommon ${i}`, 'Uncommon')),
  card('Only rare', 'Rare'),
];

const store: StoreType = {
  cards,
  mechanics: [],
  annotationAccessor: {},
  user: [UNKNOWN_CREATOR],
  currentUser: UNKNOWN_CREATOR,
  dispatch: () => {},
};

const renderModal = (onClose = vi.fn()) =>
  render(
    <Store.Provider value={store}>
      <SamplePackModal open onClose={onClose} cards={cards} />
    </Store.Provider>,
  );

describe('SamplePackModal', () => {
  it('shows the pack by slot and what the set cannot fill yet', () => {
    renderModal();

    const dialog = screen.getByRole('dialog', { name: 'Sample draft pack' });
    const pack = within(within(dialog).getByRole('list', { name: 'Pack' })).getAllByRole(
      'listitem',
    );
    // In pack order: the rare, then uncommons, then commons.
    expect(pack[0]).toHaveAccessibleName('Only rare, Rare');
    expect(
      pack.slice(1, 5).every(item => /, Uncommon$/.test(item.getAttribute('aria-label')!)),
    ).toBe(true);
    expect(pack.slice(5).every(item => /, Common$/.test(item.getAttribute('aria-label')!))).toBe(
      true,
    );
    expect(pack).toHaveLength(14);
    expect(
      within(dialog).getByText(/14 cards opened from the 17 draftable cards/),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('list', { name: 'Missing cards' })).toHaveTextContent(
      'There are no common Colony lands or basic lands, so the land slot is empty.',
    );
  });

  it('opens another pack', () => {
    const random = vi.spyOn(Math, 'random');
    renderModal();
    const callsForFirstPack = random.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /Open another pack/ }));
    expect(random.mock.calls.length).toBeGreaterThan(callsForFirstPack);
    expect(
      within(screen.getByRole('list', { name: 'Pack' })).getAllByRole('listitem'),
    ).toHaveLength(14);
    random.mockRestore();
  });
});

describe('SamplePackModal preview hint', () => {
  it.each([
    [false, 'Hover a card to see it larger.'],
    [true, 'Long-press a card to see it larger.'],
  ])('mobile=%s says how to preview a card', (mobile, hint) => {
    render(
      <Store.Provider value={store}>
        <SamplePackModal open onClose={vi.fn()} cards={cards} mobile={mobile} />
      </Store.Provider>,
    );
    expect(screen.getByText(hint, { exact: false })).toBeInTheDocument();
    expect(screen.queryByText(/long-press it/)).not.toBeInTheDocument();
  });
});

describe('SamplePackModal covers', () => {
  it('shows covers that load after the pack was opened', () => {
    const { rerender } = renderModal();
    const cover = 'https://example.com/cover.png';
    const withCovers = cards.map(c => ({ ...c, front: { ...c.front, cover: `url:${cover}` } }));
    rerender(
      <Store.Provider value={{ ...store, cards: withCovers }}>
        <SamplePackModal open onClose={vi.fn()} cards={withCovers} />
      </Store.Provider>,
    );
    const pack = screen.getByRole('list', { name: 'Pack' });
    const covers = within(pack)
      .getAllByRole('img', { name: 'cover' })
      .filter(img => img.getAttribute('src') === cover);
    expect(covers).toHaveLength(14);
  });
});

describe('CollectionActions sample pack', () => {
  it('shows the sample pack as a visible button, not in the overflow menu', async () => {
    const onOpenSamplePack = vi.fn();
    render(
      <CollectionActions
        currentUser={{ ...UNKNOWN_CREATOR, seenCards: [], lastSeenVersion: 0 }}
        users={[]}
        onCreate={() => {}}
        onEditMechanics={() => {}}
        onSwitchUser={() => {}}
        onReload={() => {}}
        onOpenSamplePack={onOpenSamplePack}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Open sample pack/ }));
    expect(onOpenSamplePack).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'More collection actions' }));
    expect(await screen.findByRole('menuitem', { name: /Reload collection/ })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Open sample pack/ })).not.toBeInTheDocument();
  });
});
