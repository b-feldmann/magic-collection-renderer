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
    expect(screen.getAllByTestId('rendered-b')).toHaveLength(2);
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
    expect(screen.getAllByTestId('rendered-b')).toHaveLength(2);
    expect(screen.getAllByRole('img', { name: 'Favorite card' })).toHaveLength(2);
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
    expect(screen.getAllByTestId('rendered-b')).toHaveLength(2);
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
    expect(screen.getAllByTestId('rendered-b')).toHaveLength(2);
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

it('binds comments, comment drafts and workflow actions to the displayed desktop variant', async () => {
  const value = store();
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
  await waitFor(() => expect(screen.getByText('Comment a')).toBeVisible());
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
});
