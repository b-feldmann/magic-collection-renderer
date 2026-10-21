import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BigCardRenderModal from './BigCardRenderModal';
import { Store, StoreType } from '../../store';
import { EMPTY_CARD, updateCard } from '../../actions/cardActions';
import { createAnnotation } from '../../actions/annotationActions';
import { getImage } from '../../actions/imageActions';
import { UNKNOWN_CREATOR } from '../../utils/constants';
import CardInterface from '../../interfaces/CardInterface';
import { CardState } from '../../interfaces/enums';

// Keep the real modal/interactions, but disable CSS transitions unsupported by jsdom.
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

vi.mock('../TemplatingCardRender/index', () => ({
  NonMemoCardRender: ({
    cardID,
    name,
    backFace,
  }: {
    cardID: string;
    name: string;
    backFace?: boolean;
  }) => (
    <div data-testid={`rendered-${cardID}`} data-back-face={!!backFace}>
      {name}
    </div>
  ),
}));
vi.mock('../../actions/cardActions', async importOriginal => ({
  ...(await importOriginal<typeof import('../../actions/cardActions')>()),
  updateCard: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../actions/annotationActions', () => ({ createAnnotation: vi.fn() }));
vi.mock('../../actions/imageActions', () => ({ getImage: vi.fn(), createImage: vi.fn() }));

if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    onchange: null,
    dispatchEvent: () => false,
  });
}
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const makeCard = (uuid: string, variantIds: string[] = []): CardInterface => {
  const card = EMPTY_CARD();
  return {
    ...card,
    uuid,
    name: `Card ${uuid}`,
    variantIds,
    front: { ...card.front, name: `Face ${uuid}` },
    meta: { ...card.meta, createdAt: 0 },
  };
};
const a = makeCard('a', ['b']);
const b = { ...makeCard('b', ['a']), favorite: true, back: { ...a.front, name: 'Back b' } };
const store = (cards: CardInterface[] = [a, b]): StoreType => ({
  cards,
  mechanics: [],
  user: [UNKNOWN_CREATOR],
  currentUser: UNKNOWN_CREATOR,
  annotationAccessor: {
    a: [
      {
        uuid: 'comment-a',
        content: 'Comment a',
        author: UNKNOWN_CREATOR.uuid,
        cardReference: 'a',
        datetime: 0,
        edited: false,
      },
    ],
    b: [
      {
        uuid: 'comment-b',
        content: 'Comment b',
        author: UNKNOWN_CREATOR.uuid,
        cardReference: 'b',
        datetime: 0,
        edited: false,
      },
    ],
  },
  dispatch: vi.fn(),
});

beforeEach(() => {
  vi.clearAllMocks();
  const getStyle = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => getStyle(element));
});
afterEach(() => vi.restoreAllMocks());

describe.each([false, true])('modal variant navigation (mobile: %s)', mobile => {
  const props = { visible: true, hide: vi.fn(), collectionNumber: 1, collectionSize: 1, mobile };

  it('starts at the opened variant and cycles both ways without closing the modal', async () => {
    render(
      <Store.Provider value={store()}>
        <BigCardRenderModal {...props} card={b} />
      </Store.Provider>,
    );
    await waitFor(() => expect(screen.getAllByTestId('rendered-b')[0]).toBeVisible());
    expect(screen.getAllByTestId('rendered-b')).toHaveLength(mobile ? 1 : 2);
    expect(screen.getByText('2 / 2')).toBeVisible();
    const navigation = screen.getByRole('group', { name: 'Card variants' });
    screen.getAllByTestId('rendered-b').forEach(face => {
      expect(
        face.compareDocumentPosition(navigation) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next variant' }));
    expect(screen.getByTestId('rendered-a')).toBeVisible();
    expect(screen.queryByTestId('rendered-b')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous variant' }));
    expect(screen.getAllByTestId('rendered-b')).toHaveLength(mobile ? 1 : 2);
    expect(screen.getAllByRole('img', { name: 'Favorite card' })).toHaveLength(mobile ? 1 : 2);
    expect(props.hide).not.toHaveBeenCalled();
  });

  it('hides controls for ordinary cards and missing variant IDs', async () => {
    render(
      <Store.Provider value={store()}>
        <BigCardRenderModal {...props} card={makeCard('other', ['missing'])} />
      </Store.Provider>,
    );
    await waitFor(() => expect(screen.getByTestId('rendered-other')).toBeVisible());
    expect(screen.queryByRole('button', { name: 'Next variant' })).not.toBeInTheDocument();
  });

  it('requests synchronized editor selection without switching before confirmation', async () => {
    const onSelectVariant = vi.fn();
    const value = store();
    const { rerender } = render(
      <Store.Provider value={value}>
        <BigCardRenderModal {...props} card={a} onSelectVariant={onSelectVariant} />
      </Store.Provider>,
    );
    await waitFor(() => expect(screen.getByTestId('rendered-a')).toBeVisible());
    fireEvent.click(screen.getByRole('button', { name: 'Next variant' }));
    expect(onSelectVariant).toHaveBeenCalledWith('b');
    expect(screen.getByTestId('rendered-a')).toBeVisible();
    expect(screen.queryByTestId('rendered-b')).not.toBeInTheDocument();
    rerender(
      <Store.Provider value={value}>
        <BigCardRenderModal {...props} card={b} onSelectVariant={onSelectVariant} />
      </Store.Provider>,
    );
    expect(screen.getAllByTestId('rendered-b')).toHaveLength(mobile ? 1 : 2);
  });

  it('shows live selected-member data and falls back safely when that member is deleted', async () => {
    const { rerender } = render(
      <Store.Provider value={store()}>
        <BigCardRenderModal {...props} card={a} />
      </Store.Provider>,
    );
    await waitFor(() => expect(screen.getByTestId('rendered-a')).toBeVisible());
    fireEvent.click(screen.getByRole('button', { name: 'Next variant' }));
    const changed = { ...b, front: { ...b.front, name: 'Updated b' } };
    rerender(
      <Store.Provider value={store([a, changed])}>
        <BigCardRenderModal {...props} card={a} />
      </Store.Provider>,
    );
    expect(screen.getByText('Updated b')).toBeVisible();
    const remaining = { ...a, variantIds: [] };
    rerender(
      <Store.Provider value={store([remaining])}>
        <BigCardRenderModal {...props} card={remaining} />
      </Store.Provider>,
    );
    expect(screen.getByTestId('rendered-a')).toBeVisible();
    expect(screen.queryByTestId('rendered-b')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next variant' })).not.toBeInTheDocument();
  });

  it('resets to the requested card when reopened or when a different card is opened', async () => {
    const renderModal = (card: CardInterface, visible = true) => (
      <Store.Provider value={store()}>
        <BigCardRenderModal {...props} card={card} visible={visible} />
      </Store.Provider>
    );
    const { rerender } = render(renderModal(a));
    await waitFor(() => expect(screen.getByTestId('rendered-a')).toBeVisible());
    fireEvent.click(screen.getByRole('button', { name: 'Next variant' }));
    rerender(renderModal(a, false));
    rerender(renderModal(a));
    await waitFor(() => expect(screen.getByTestId('rendered-a')).toBeVisible());
    rerender(renderModal(b));
    expect(screen.getAllByTestId('rendered-b')).toHaveLength(mobile ? 1 : 2);
    expect(screen.getByText('2 / 2')).toBeVisible();
  });

  it('loads both uploaded faces only when the selected variant is visible', async () => {
    const uploaded = {
      ...b,
      front: { ...b.front, cover: 'loading:front.png' },
      back: { ...b.back, cover: 'loading:back.png' },
    };
    const value = store([a, uploaded]);
    const { rerender } = render(
      <Store.Provider value={value}>
        <BigCardRenderModal {...props} card={a} />
      </Store.Provider>,
    );
    await waitFor(() => expect(screen.getByTestId('rendered-a')).toBeVisible());
    expect(getImage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Next variant' }));
    expect(getImage).toHaveBeenCalledWith(
      value.dispatch,
      expect.objectContaining({ uuid: 'b' }),
      0,
    );
    expect(getImage).toHaveBeenCalledWith(
      value.dispatch,
      expect.objectContaining({ uuid: 'b' }),
      1,
    );
    vi.mocked(getImage).mockClear();
    rerender(
      <Store.Provider value={value}>
        <BigCardRenderModal {...props} visible={false} card={a} />
      </Store.Provider>,
    );
    expect(getImage).not.toHaveBeenCalled();
  });
});

describe('mobile card face switching', () => {
  const props = {
    visible: true,
    mobile: true,
    hide: vi.fn(),
    collectionNumber: 1,
    collectionSize: 1,
  };

  it('shows one face at a time and switches both ways with the collection swap button', async () => {
    render(
      <Store.Provider value={store()}>
        <BigCardRenderModal {...props} card={b} />
      </Store.Provider>,
    );
    expect(await screen.findByText('Face b')).toBeVisible();
    expect(screen.queryByText('Back b')).not.toBeInTheDocument();
    const flip = screen.getByRole('button', { name: 'Show other face' });
    const controls = screen.getByRole('group', { name: 'Card controls' });
    expect(controls).toContainElement(flip);
    expect(controls).toContainElement(screen.getByRole('group', { name: 'Card variants' }));
    expect(screen.getByRole('img', { name: 'swap' })).toBeVisible();
    fireEvent.change(screen.getByPlaceholderText('Your comment'), {
      target: { value: 'Comment draft stays while flipping' },
    });

    fireEvent.click(flip);
    expect(screen.getByText('Back b')).toBeVisible();
    expect(screen.getByTestId('rendered-b')).toHaveAttribute('data-back-face', 'true');
    expect(screen.queryByText('Face b')).not.toBeInTheDocument();
    expect(screen.getByText('Comment b')).toBeVisible();
    expect(screen.getByPlaceholderText('Your comment')).toHaveValue(
      'Comment draft stays while flipping',
    );

    fireEvent.click(flip);
    expect(screen.getByText('Face b')).toBeVisible();
    expect(screen.getByTestId('rendered-b')).toHaveAttribute('data-back-face', 'false');
    expect(screen.queryByText('Back b')).not.toBeInTheDocument();
    expect(props.hide).not.toHaveBeenCalled();
  });

  it('resets to the front face after switching variants or reopening the card', async () => {
    const value = store();
    const renderModal = (visible = true) => (
      <Store.Provider value={value}>
        <BigCardRenderModal {...props} visible={visible} card={b} />
      </Store.Provider>
    );
    const { rerender } = render(renderModal());
    fireEvent.click(await screen.findByRole('button', { name: 'Show other face' }));
    expect(screen.getByText('Back b')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Next variant' }));
    expect(screen.getByText('Face a')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Show other face' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous variant' }));
    expect(screen.getByText('Face b')).toBeVisible();
    expect(screen.queryByText('Back b')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show other face' }));
    rerender(renderModal(false));
    rerender(renderModal());
    expect(await screen.findByText('Face b')).toBeVisible();
    expect(screen.queryByText('Back b')).not.toBeInTheDocument();
  });
});

it.each([false, true])(
  'binds comments, comment drafts and workflow actions to the displayed variant (mobile: %s)',
  async mobile => {
    const value = store();
    render(
      <Store.Provider value={value}>
        <BigCardRenderModal
          card={a}
          mobile={mobile}
          visible
          hide={() => {}}
          collectionNumber={1}
          collectionSize={1}
        />
      </Store.Provider>,
    );
    await waitFor(() => expect(screen.getByText('Comment a')).toBeVisible());
    expect(
      screen.getByTestId('rendered-a').compareDocumentPosition(screen.getByText('Comment a')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Your comment'), {
      target: { value: 'Draft for a' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next variant' }));
    expect(screen.getByText('Comment b')).toBeVisible();
    expect(screen.queryByText('Comment a')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your comment')).toHaveValue('');
    fireEvent.change(screen.getByPlaceholderText('Your comment'), {
      target: { value: 'New b comment' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }));
    expect(createAnnotation).toHaveBeenCalledWith(
      value.dispatch,
      'New b comment',
      UNKNOWN_CREATOR,
      'b',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Release for Rating!' }));
    expect(updateCard).toHaveBeenCalledWith(value.dispatch, expect.objectContaining({ uuid: 'b' }));
  },
);

it('returns the displayed rating variant to Draft and clears ratings without mutating the original', async () => {
  const ratingCard = {
    ...b,
    meta: { ...b.meta, state: CardState.Rate, likes: ['user-1'], dislikes: ['user-2'] },
  };
  const value = store([a, ratingCard]);
  render(
    <Store.Provider value={value}>
      <BigCardRenderModal
        card={a}
        visible
        hide={() => {}}
        collectionNumber={1}
        collectionSize={1}
      />
    </Store.Provider>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Next variant' }));
  fireEvent.click(screen.getByRole('button', { name: 'Return to Draft' }));

  expect(updateCard).toHaveBeenCalledWith(value.dispatch, {
    ...ratingCard,
    meta: { ...ratingCard.meta, state: CardState.Draft, likes: [], dislikes: [] },
  });
  expect(ratingCard.meta.state).toBe(CardState.Rate);
  expect(ratingCard.meta.likes).toEqual(['user-1']);
  expect(ratingCard.meta.dislikes).toEqual(['user-2']);
  expect(a.meta.state).toBe(CardState.Draft);
  expect(screen.getByText('Comment b')).toBeVisible();
  expect(createAnnotation).not.toHaveBeenCalled();
});

it.each([CardState.Draft, CardState.Approved])(
  'does not offer Return to Draft for cards outside rating (state: %s)',
  async state => {
    const card = { ...a, meta: { ...a.meta, state } };
    render(
      <Store.Provider value={store([card])}>
        <BigCardRenderModal
          card={card}
          visible
          hide={() => {}}
          collectionNumber={1}
          collectionSize={1}
        />
      </Store.Provider>,
    );
    await waitFor(() => expect(screen.getByText('Comment a')).toBeVisible());
    expect(screen.queryByRole('button', { name: 'Return to Draft' })).not.toBeInTheDocument();
  },
);

describe('collection-based approval threshold', () => {
  it('updates approval availability when collection membership changes and waits for users to load', async () => {
    const members = Array.from({ length: 7 }, (_, index) => ({
      ...UNKNOWN_CREATOR,
      uuid: `member-${index}`,
      name: `Member ${index}`,
    }));
    const card = {
      ...makeCard('rating'),
      creator: members[0],
      meta: { ...a.meta, state: CardState.Rate, likes: ['member-1', 'member-2'], dislikes: [] },
    };
    const renderModal = (user: StoreType['user']) => (
      <Store.Provider value={{ ...store([card]), user, currentUser: members[1] }}>
        <BigCardRenderModal
          card={card}
          visible
          hide={() => {}}
          collectionNumber={1}
          collectionSize={1}
        />
      </Store.Provider>
    );
    const { rerender } = render(renderModal([]));
    expect(await screen.findByRole('button', { name: /^Approve!/ })).toBeDisabled();

    rerender(renderModal(members.slice(0, 5)));
    expect(screen.getByRole('button', { name: /^Approve!/ })).toBeEnabled();

    rerender(renderModal(members));
    expect(screen.getByRole('button', { name: /^Approve!/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Approve!/ })).toHaveTextContent('need 1 more');
  });

  // Catch a fixed threshold, incorrect rounding, or ignoring dislikes at the UI boundary.
  it.each([
    { users: 5, likes: 0, dislikes: 0, needed: 2 },
    { users: 5, likes: 1, dislikes: 0, needed: 1 },
    { users: 5, likes: 2, dislikes: 0, needed: 0 },
    { users: 6, likes: 2, dislikes: 0, needed: 1 },
    { users: 6, likes: 3, dislikes: 0, needed: 0 },
    { users: 5, likes: 2, dislikes: 1, needed: 1 },
    { users: 5, likes: 3, dislikes: 1, needed: 0 },
    { users: 3, likes: 2, dislikes: 0, needed: 0 },
    { users: 1, likes: 0, dislikes: 0, needed: 0 },
  ])(
    'requires $needed more net likes with $users users, $likes likes and $dislikes dislikes',
    async ({ users, likes, dislikes, needed }) => {
      const members = Array.from({ length: users }, (_, index) => ({
        ...UNKNOWN_CREATOR,
        uuid: `member-${index}`,
        name: `Member ${index}`,
      }));
      const card = {
        ...makeCard('rating'),
        creator: members[0],
        meta: {
          ...a.meta,
          state: CardState.Rate,
          likes: members.slice(1, likes + 1).map(member => member.uuid),
          dislikes: members.slice(likes + 1, likes + dislikes + 1).map(member => member.uuid),
        },
      };
      const value = { ...store([card]), user: members, currentUser: members[1] || members[0] };
      render(
        <Store.Provider value={value}>
          <BigCardRenderModal
            card={card}
            visible
            hide={() => {}}
            collectionNumber={1}
            collectionSize={1}
          />
        </Store.Provider>,
      );

      const approve = await screen.findByRole('button', { name: /^Approve!/ });
      if (needed > 0) {
        expect(approve).toBeDisabled();
        expect(approve).toHaveTextContent(`need ${needed} more`);
      } else {
        expect(approve).toBeEnabled();
        fireEvent.click(approve);
        expect(updateCard).toHaveBeenCalledWith(value.dispatch, {
          ...card,
          meta: { ...card.meta, state: CardState.Approved },
        });
      }
    },
  );
});

describe.each([false, true])('rating toggles (mobile: %s)', mobile => {
  it.each([
    { initial: 'none', click: 'like', likes: ['other-like', 'voter'], dislikes: ['other-dislike'] },
    {
      initial: 'none',
      click: 'dislike',
      likes: ['other-like'],
      dislikes: ['other-dislike', 'voter'],
    },
    { initial: 'like', click: 'like', likes: ['other-like'], dislikes: ['other-dislike'] },
    { initial: 'dislike', click: 'dislike', likes: ['other-like'], dislikes: ['other-dislike'] },
    {
      initial: 'dislike',
      click: 'like',
      likes: ['other-like', 'voter'],
      dislikes: ['other-dislike'],
    },
    {
      initial: 'like',
      click: 'dislike',
      likes: ['other-like'],
      dislikes: ['other-dislike', 'voter'],
    },
  ])('toggles $initial by clicking $click without changing other votes', async scenario => {
    const voter = { ...UNKNOWN_CREATOR, uuid: 'voter', name: 'Voter' };
    const originalLikes = scenario.initial === 'like' ? ['other-like', 'voter'] : ['other-like'];
    const originalDislikes =
      scenario.initial === 'dislike' ? ['other-dislike', 'voter'] : ['other-dislike'];
    const card = {
      ...makeCard('rating-toggle'),
      meta: {
        ...a.meta,
        state: CardState.Rate,
        likes: [...originalLikes],
        dislikes: [...originalDislikes],
      },
    };
    const value = { ...store([card]), currentUser: voter };
    const renderModal = (displayedCard: CardInterface) => (
      <Store.Provider value={{ ...value, cards: [displayedCard] }}>
        <BigCardRenderModal
          card={displayedCard}
          mobile={mobile}
          visible
          hide={() => {}}
          collectionNumber={1}
          collectionSize={1}
        />
      </Store.Provider>
    );
    const { rerender } = render(renderModal(card));
    fireEvent.click(await screen.findByRole('img', { name: scenario.click }));

    expect(updateCard).toHaveBeenCalledExactlyOnceWith(value.dispatch, {
      ...card,
      meta: { ...card.meta, likes: scenario.likes, dislikes: scenario.dislikes },
    });
    expect(card.meta.likes).toEqual(originalLikes);
    expect(card.meta.dislikes).toEqual(originalDislikes);

    const updatedCard = vi.mocked(updateCard).mock.calls[0][1];
    rerender(renderModal(updatedCard));
    expect(screen.getByRole('img', { name: 'like' }).parentElement).toHaveTextContent(
      String(scenario.likes.length),
    );
    expect(screen.getByRole('img', { name: 'dislike' }).parentElement).toHaveTextContent(
      String(scenario.dislikes.length),
    );
  });
});
