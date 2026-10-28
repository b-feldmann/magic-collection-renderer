import React, { useReducer } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Cell, { CellProps } from './Cell';
import BigCardRenderModal from '../BigCardRenderModal/BigCardRenderModal';
import { Store, StoreType } from '../../store';
import { UNKNOWN_CREATOR } from '../../utils/constants';
import { CardState, CardType, RarityType } from '../../interfaces/enums';
import CardInterface from '../../interfaces/CardInterface';
import UserInterface from '../../interfaces/UserInterface';
import reducer from '../../reducer';
import axios from 'axios';

vi.mock('axios', () => ({ default: { put: vi.fn(), get: vi.fn() } }));

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

const UserStore = ({ value, children }: { value: StoreType; children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, { ...value, tags: value.tags || [] });
  return (
    <Store.Provider
      value={{ ...value, currentUser: state.currentUser, user: state.user, dispatch }}
    >
      {children}
    </Store.Provider>
  );
};

const view = (value: StoreType, visible = false, mobile = false, selectedCard = card) => (
  <UserStore key={value.currentUser.uuid} value={value}>
    <Cell {...cellProps} cards={[selectedCard]} mobile={mobile} />
    <BigCardRenderModal
      card={selectedCard}
      visible={visible}
      hide={() => {}}
      collectionNumber={1}
      collectionSize={1}
      mobile={mobile}
    />
  </UserStore>
);
const bubble = () => screen.queryByRole('img', { name: 'New comments' });
const savedUsers = new Map<string, UserInterface>();

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  savedUsers.clear();
  localStorage.setItem('api_key', 'test-access-key');
  vi.mocked(axios.put).mockReset();
  vi.mocked(axios.put).mockImplementation(async (_url, body: unknown) => {
    const { user } = body as { user: UserInterface };
    savedUsers.set(user.uuid, user);
    return { data: { user } };
  });
  const getStyle = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => getStyle(element));
});
afterEach(() => vi.restoreAllMocks());

describe('new-comment indicator', () => {
  it('uses read-comment IDs from the user loaded from the backend', () => {
    const value = makeStore();
    render(
      view({
        ...value,
        currentUser: { ...value.currentUser, seenComments: ['comment-1'] },
      }),
    );
    expect(bubble()).not.toBeInTheDocument();
  });

  it('preserves existing read comments and other user fields when saving', async () => {
    const value = makeStore();
    value.currentUser = {
      ...value.currentUser,
      seenCards: ['seen-card'],
      seenComments: ['earlier-comment'],
      lastSeenVersion: 5,
    };
    render(view(value, true));
    await waitFor(() => expect(bubble()).not.toBeInTheDocument());
    expect(savedUsers.get('reader')).toEqual({
      ...value.currentUser,
      seenComments: ['earlier-comment', 'comment-1'],
    });
    expect(value.currentUser.seenComments).toEqual(['earlier-comment']);
  });

  it('does not save again when all comments are already read', () => {
    const value = makeStore();
    render(
      view(
        {
          ...value,
          currentUser: { ...value.currentUser, seenComments: ['comment-1'] },
        },
        true,
      ),
    );
    expect(bubble()).not.toBeInTheDocument();
    expect(axios.put).not.toHaveBeenCalled();
  });

  it('stays on hover and clears only after opening, then returns for later comments', async () => {
    const value = makeStore();
    const { rerender, unmount } = render(view(value));
    expect(bubble()).toBeVisible();
    fireEvent.mouseEnter(screen.getByText('Card preview'));
    expect(bubble()).toBeVisible();
    // Requesting an opening is not enough if navigation is blocked by unsaved edits.
    fireEvent.click(screen.getByText('Card preview'));
    expect(bubble()).toBeVisible();
    expect(axios.put).not.toHaveBeenCalled();
    rerender(view(value, true));
    await waitFor(() => expect(bubble()).not.toBeInTheDocument());
    expect(axios.put).toHaveBeenCalledWith('http://localhost:8080/user', {
      user: { ...value.currentUser, seenComments: ['comment-1'] },
      accessKey: 'test-access-key',
    });
    unmount();
    // A fresh browser session gets its read state from the saved user, not localStorage.
    localStorage.clear();
    const reloaded = { ...value, currentUser: savedUsers.get('reader')! };
    const next = render(view(reloaded));
    expect(bubble()).not.toBeInTheDocument();
    next.rerender(
      view({
        ...reloaded,
        annotationAccessor: { [card.uuid]: [comment, { ...comment, uuid: 'comment-2' }] },
      }),
    );
    expect(bubble()).toBeVisible();
  });

  it('keeps read state separate for each user and card', async () => {
    const value = makeStore();
    const { rerender } = render(view(value, true));
    await waitFor(() => expect(bubble()).not.toBeInTheDocument());
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

  it('does not mark another card as read when opening a card', async () => {
    const value = makeStore();
    const { rerender } = render(view(value, true));
    await waitFor(() => expect(bubble()).not.toBeInTheDocument());
    const otherCard = { ...card, uuid: 'another-card' };
    rerender(
      view(
        {
          ...value,
          cards: [card, otherCard],
          annotationAccessor: {
            ...value.annotationAccessor,
            [otherCard.uuid]: [
              { ...comment, uuid: 'other-comment', cardReference: otherCard.uuid },
            ],
          },
        },
        false,
        false,
        otherCard,
      ),
    );
    expect(bubble()).toBeVisible();
  });

  it('marks the shared family thread read when any variant is opened', async () => {
    const otherCard = { ...card, uuid: 'other-variant', variantIds: [card.uuid] };
    const value = makeStore();
    value.cards = [{ ...card, variantIds: [otherCard.uuid] }, otherCard];
    value.annotationAccessor[otherCard.uuid] = [
      {
        ...comment,
        uuid: 'variant-comment',
        cardReference: otherCard.uuid,
      },
    ];
    const requestSelection = vi.fn();
    const variantView = (openedCard: CardInterface) => (
      <UserStore value={value}>
        <Cell {...cellProps} cards={[otherCard]} />
        <BigCardRenderModal
          card={openedCard}
          visible
          hide={() => {}}
          collectionNumber={1}
          collectionSize={2}
          onSelectVariant={requestSelection}
        />
      </UserStore>
    );
    const { rerender } = render(variantView(value.cards[0]));
    await waitFor(() =>
      expect(savedUsers.get('reader')?.seenComments).toEqual(['comment-1', 'variant-comment']),
    );
    expect(bubble()).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next variant' }));
    expect(requestSelection).toHaveBeenCalledWith(otherCard.uuid);
    expect(bubble()).not.toBeInTheDocument();
    expect(savedUsers.get('reader')?.seenComments).toEqual(['comment-1', 'variant-comment']);
    rerender(variantView(otherCard));
    await waitFor(() => expect(bubble()).not.toBeInTheDocument());
    expect(savedUsers.get('reader')?.seenComments).toEqual(['comment-1', 'variant-comment']);
  });

  it('marks comments arriving while the card is open as read', async () => {
    const value = makeStore();
    const { rerender } = render(view({ ...value, annotationAccessor: {} }, true));
    rerender(view(value, true));
    await waitFor(() => expect(bubble()).not.toBeInTheDocument());
    rerender(view(value));
    expect(bubble()).not.toBeInTheDocument();
  });

  it('tracks comment identities rather than counts or edits', async () => {
    const value = makeStore();
    const { rerender } = render(view(value, true));
    await waitFor(() => expect(bubble()).not.toBeInTheDocument());
    rerender(
      view({
        ...value,
        annotationAccessor: { [card.uuid]: [{ ...comment, edited: true, content: 'Updated' }] },
      }),
    );
    expect(bubble()).not.toBeInTheDocument();
    rerender(
      view({
        ...value,
        annotationAccessor: { [card.uuid]: [{ ...comment, uuid: 'replacement-comment' }] },
      }),
    );
    expect(bubble()).toBeVisible();
  });

  it('keeps comments unread when saving fails and retries on reopening', async () => {
    vi.mocked(axios.put).mockRejectedValueOnce(new Error('Offline'));
    const value = makeStore();
    const { rerender } = render(view(value, true));
    await waitFor(() => expect(axios.put).toHaveBeenCalledTimes(1));
    expect(bubble()).toBeVisible();
    rerender(view(value));
    rerender(view(value, true));
    await waitFor(() => expect(bubble()).not.toBeInTheDocument());
  });

  it('does not use browser-only read state instead of the saved user', () => {
    localStorage.setItem(
      'mtg-funset:read-comments:v1:["reader","commented-card"]',
      '["comment-1"]',
    );
    render(view(makeStore()));
    expect(bubble()).toBeVisible();
  });

  it('does not try to save read state without a selected user', () => {
    render(view({ ...makeStore(), currentUser: UNKNOWN_CREATOR }, true));
    expect(axios.put).not.toHaveBeenCalled();
  });

  it('shows unread comments on mobile and clears the bubble after opening the card', async () => {
    const value = makeStore();
    const { rerender } = render(view(value, false, true));
    expect(bubble()).toBeVisible();
    rerender(view(value, true, true));
    await waitFor(() => expect(bubble()).not.toBeInTheDocument());
    expect(savedUsers.get('reader')?.seenComments).toEqual(['comment-1']);
  });

  it.each([false, true])(
    'does not show a bubble on cards without comments (mobile: %s)',
    mobile => {
      render(view({ ...makeStore(), annotationAccessor: {} }, false, mobile));
      expect(bubble()).not.toBeInTheDocument();
    },
  );
});
