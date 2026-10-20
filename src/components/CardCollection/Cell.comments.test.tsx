import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Cell, { CellProps } from './Cell';
import BigCardRenderModal from '../BigCardRenderModal/BigCardRenderModal';
import { Store, StoreType } from '../../store';
import { UNKNOWN_CREATOR } from '../../utils/constants';
import { CardState, CardType, RarityType } from '../../interfaces/enums';
import CardInterface from '../../interfaces/CardInterface';

// Card art is unrelated to the unread-comment lifecycle.
vi.mock('../TemplatingCardRender/index', () => ({
  default: () => <span>Card preview</span>,
  NonMemoCardRender: () => null,
}));
vi.mock('antd', async importOriginal => {
  const actual = await importOriginal<typeof import('antd')>();
  const Modal = actual.Modal;
  return {
    ...actual,
    Modal: (props: React.ComponentProps<typeof Modal>) => (
      <Modal {...props} transitionName="" maskTransitionName="" />
    ),
  };
});

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const card: CardInterface = {
  uuid: 'commented-card',
  name: 'Commented card',
  creator: UNKNOWN_CREATOR,
  manaCost: '',
  rarity: RarityType.Common,
  front: { name: 'Commented card', cardTypes: [CardType.Creature], cardText: [] },
  meta: {
    comment: '',
    likes: [],
    dislikes: [],
    createdAt: 0,
    lastUpdated: 0,
    state: CardState.Draft,
  },
};
const comment = {
  uuid: 'comment-1',
  datetime: 1,
  content: 'Hello',
  author: 'other-user',
  cardReference: card.uuid,
  edited: false,
};
const makeStore = (): StoreType => ({
  cards: [card],
  mechanics: [],
  user: [],
  currentUser: { ...UNKNOWN_CREATOR, uuid: 'reader' },
  annotationAccessor: { [card.uuid]: [comment] },
  dispatch: vi.fn(),
});
const cellProps: CellProps = {
  ariaAttributes: { 'aria-colindex': 1, role: 'gridcell' },
  style: {},
  columnIndex: 0,
  rowIndex: 0,
  cards: [card],
  columnCount: 1,
  seenCardUuids: { [card.uuid]: true },
  currentEditId: '',
  addSeenCard: vi.fn(),
  editCard: vi.fn(),
  downloadCard: vi.fn(),
  toggleShowBackConfig: vi.fn(),
  width: 200,
  showBackFaceConfig: {},
};

const view = (value: StoreType, visible = false, mobile = false) => (
  <Store.Provider value={value}>
    <Cell {...cellProps} mobile={mobile} />
    <BigCardRenderModal
      card={card}
      visible={visible}
      hide={() => {}}
      collectionNumber={1}
      collectionSize={1}
      mobile={mobile}
    />
  </Store.Provider>
);
const bubble = () => screen.queryByRole('img', { name: 'New comments' });

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('new-comment indicator', () => {
  it('stays on hover and clears only after opening, then returns for later comments', () => {
    const value = makeStore();
    const { rerender, unmount } = render(view(value));
    expect(bubble()).toBeVisible();
    fireEvent.mouseEnter(screen.getByText('Card preview'));
    expect(bubble()).toBeVisible();
    // Requesting an opening is not enough if navigation is blocked by unsaved edits.
    fireEvent.click(screen.getByText('Card preview'));
    expect(bubble()).toBeVisible();
    rerender(view(value, true));
    expect(bubble()).not.toBeInTheDocument();
    unmount();
    const next = render(view(value));
    expect(bubble()).not.toBeInTheDocument();
    next.rerender(
      view({
        ...value,
        annotationAccessor: { [card.uuid]: [comment, { ...comment, uuid: 'comment-2' }] },
      }),
    );
    expect(bubble()).toBeVisible();
  });

  it('keeps read state separate for each user and card', () => {
    const value = makeStore();
    const { rerender } = render(view(value, true));
    expect(bubble()).not.toBeInTheDocument();
    rerender(view({ ...value, currentUser: { ...value.currentUser, uuid: 'another-reader' } }));
    expect(bubble()).toBeVisible();
    rerender(
      view({
        ...value,
        annotationAccessor: { unrelated: [comment] },
      }),
    );
    expect(bubble()).not.toBeInTheDocument();
  });

  it('does not show the bubble on mobile', () => {
    render(view(makeStore(), false, true));
    expect(bubble()).not.toBeInTheDocument();
  });

  it('does not show a bubble on cards without comments', () => {
    render(view({ ...makeStore(), annotationAccessor: {} }));
    expect(bubble()).not.toBeInTheDocument();
  });
});
