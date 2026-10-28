import React, { useReducer } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

import MobileApp from './MobileApp';
import { Store } from './store';
import reducer from './reducer';
import { EMPTY_CARD } from './actions/cardActions';
import CardInterface from './interfaces/CardInterface';
import { UNKNOWN_CREATOR } from './utils/constants';

// Keep the modal, editor, reducer, creation and persistence real. Stub only
// expensive collection/card rendering and unrelated initial data requests.
vi.mock('axios');
vi.mock('./components/TemplatingCardRender/index', () => ({
  NonMemoCardRender: ({ name }: { name: string }) => <div aria-label="Card preview">{name}</div>,
}));
vi.mock('./components/CardCollection/CardCollection', () => ({
  default: ({ cards, editCard }: { cards: CardInterface[]; editCard: (id: string) => void }) => (
    <div>
      {cards.map(card => (
        <button key={card.uuid} onClick={() => editCard(card.uuid)}>
          Open {card.uuid}
        </button>
      ))}
    </div>
  ),
}));
vi.mock('./components/CollectionFilterControls/CollectionFilterControls', () => ({
  default: () => null,
}));
vi.mock('./components/ChangeLogModal/ChangeLogModal', () => ({ default: () => null }));
vi.mock('./utils/accessService', () => ({
  hasAccessToken: () => true,
  getAccessToken: () => 'token',
  updateAccessToken: vi.fn(),
}));
vi.mock('./actions/cardActions', async importOriginal => ({
  ...(await importOriginal<typeof import('./actions/cardActions')>()),
  refreshCollection: vi.fn(),
}));
vi.mock('./actions/userActions', async importOriginal => ({
  ...(await importOriginal<typeof import('./actions/userActions')>()),
  getUser: vi.fn(),
  addSeenCard: vi.fn(),
  hasStoredUser: () => true,
}));
vi.mock('./actions/mechanicActions', () => ({ getMechanics: vi.fn() }));
vi.mock('./actions/tagActions', () => ({ getTags: vi.fn(), createTag: vi.fn() }));
vi.mock('./actions/annotationActions', () => ({ getAnnotations: vi.fn() }));

window.matchMedia ??= (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => false,
});
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const user = { ...UNKNOWN_CREATOR, uuid: 'creator', name: 'Creator' };
const a = {
  ...EMPTY_CARD(),
  uuid: 'a',
  name: 'Card a',
  front: { ...EMPTY_CARD().front, name: 'Card a' },
  creator: user,
  variantIds: ['b'],
};
const b = {
  ...EMPTY_CARD(),
  uuid: 'b',
  name: 'Card b',
  front: { ...EMPTY_CARD().front, name: 'Card b' },
  creator: user,
  variantIds: ['a'],
};
const created = { ...EMPTY_CARD(), uuid: 'new-card', creator: user };

function Example() {
  const [state, dispatch] = useReducer(reducer, {
    cards: [a, b],
    mechanics: [],
    tags: [],
    annotationAccessor: {},
    user: [user],
    currentUser: user,
  });
  return (
    <Store.Provider value={{ ...state, dispatch }}>
      <MobileApp />
    </Store.Provider>
  );
}

const openCard = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Open a' }));
};
const expandEditor = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Edit card' }));
  return screen.getByRole('region', { name: 'Card editor' });
};
const closeCard = async () => {
  const wrapper = document.querySelector('.ant-modal-wrap.card-view')!;
  fireEvent.mouseDown(wrapper);
  fireEvent.click(wrapper);
  await waitFor(() => expect(window.history.state).toBeNull());
};

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/');
  localStorage.removeItem('mtg-funset:ActiveCardTab:v1');
  const getStyle = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => getStyle(element));
  vi.mocked(axios.post).mockResolvedValue({ data: { card: created } });
  vi.mocked(axios.put).mockImplementation(async (_url, data) => ({
    data: { card: (data as { card: CardInterface }).card },
  }));
  vi.mocked(axios.patch).mockResolvedValue({
    data: {
      card: {
        ...a,
        name: 'Edited on mobile',
        front: { ...a.front, name: 'Edited on mobile' },
      },
    },
  });
});

afterEach(async () => {
  cleanup();
  await waitFor(() => expect(window.history.state).toBeNull());
  vi.restoreAllMocks();
});

describe('mobile card editing flow', () => {
  it('renders the Create card control at the same compact size as the other mobile controls', () => {
    render(<Example />);

    expect(screen.getByRole('button', { name: 'Create card' })).not.toHaveClass('ant-btn-lg');
  });

  it('opens existing cards with editing collapsed and exposes the real editor on demand', () => {
    render(<Example />);
    openCard();
    expect(screen.queryByRole('region', { name: 'Card editor' })).not.toBeInTheDocument();
    const editor = expandEditor();
    expect(within(editor).getByDisplayValue('Card a')).toBeInTheDocument();
    expect(screen.getByLabelText('Card preview')).toHaveTextContent('Card a');
  });

  it('keeps pending edits and autosave alive when hidden using the main toggle', async () => {
    render(<Example />);
    openCard();
    const toggle = screen.getByRole('button', { name: 'Edit card' });
    const editor = expandEditor();
    fireEvent.change(within(editor).getByDisplayValue('Card a'), {
      target: { value: 'Edited on mobile' },
    });
    fireEvent.click(toggle);
    expect(toggle).toHaveAccessibleName('Edit card');
    expect(screen.queryByRole('region', { name: 'Card editor' })).not.toBeInTheDocument();
    await waitFor(
      () =>
        expect(axios.patch).toHaveBeenCalledWith(
          'http://localhost:8080/cards/a',
          expect.objectContaining({
            set: expect.objectContaining({ name: 'Edited on mobile' }),
          }),
        ),
      { timeout: 3500 },
    );
    fireEvent.click(toggle);
    expect(
      within(screen.getByRole('region', { name: 'Card editor' })).getByDisplayValue(
        'Edited on mobile',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Card preview')).toHaveTextContent('Edited on mobile');
  });

  it('resets editing to hidden when another card or the same card is opened', async () => {
    render(<Example />);
    openCard();
    expandEditor();
    await closeCard();
    fireEvent.click(screen.getByRole('button', { name: 'Open b' }));
    expect(screen.getByLabelText('Card preview')).toHaveTextContent('Card b');
    expect(screen.queryByRole('region', { name: 'Card editor' })).not.toBeInTheDocument();
    expandEditor();
    await closeCard();
    fireEvent.click(screen.getByRole('button', { name: 'Open b' }));
    expect(screen.queryByRole('region', { name: 'Card editor' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit card' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('collapses the editor when switching to another variant and synchronizes its fields', () => {
    render(<Example />);
    openCard();
    expandEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Next variant' }));
    expect(screen.getByLabelText('Card preview')).toHaveTextContent('Card b');
    expect(screen.queryByRole('region', { name: 'Card editor' })).not.toBeInTheDocument();
    expect(within(expandEditor()).getByDisplayValue('Card b')).toBeInTheDocument();
  });

  it('keeps the current editor when a dirty switch is cancelled and hides after acceptance', async () => {
    render(<Example />);
    openCard();
    const editor = expandEditor();
    fireEvent.change(within(editor).getByDisplayValue('Card a'), {
      target: { value: 'Unsaved mobile name' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next variant' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit old card' }));
    expect(screen.getByRole('region', { name: 'Card editor' })).toBeInTheDocument();
    expect(within(editor).getByDisplayValue('Unsaved mobile name')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next variant' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Yes discard all changes' }));
    expect(screen.getByLabelText('Card preview')).toHaveTextContent('Card b');
    expect(screen.queryByRole('region', { name: 'Card editor' })).not.toBeInTheDocument();
  });

  it('creates a card for the current user and opens its editor automatically', async () => {
    render(<Example />);
    fireEvent.click(screen.getByRole('button', { name: 'Create card' }));
    const editor = await screen.findByRole('region', { name: 'Card editor' });
    expect(axios.post).toHaveBeenCalledWith('http://localhost:8080/cards', {
      accessKey: 'token',
      creator: { name: user.name, uuid: user.uuid },
    });
    expect(screen.getByLabelText('Card preview')).toBeInTheDocument();
    expect(within(editor).getByText('Card Name')).toBeInTheDocument();
    expect(within(editor).queryByDisplayValue('Card a')).not.toBeInTheDocument();
  });

  it('does not open a placeholder editor when creating a card fails', async () => {
    vi.mocked(axios.post).mockRejectedValue(new Error('Offline'));
    render(<Example />);
    fireEvent.click(screen.getByRole('button', { name: 'Create card' }));
    await act(async () => {});
    expect(axios.post).toHaveBeenCalledOnce();
    expect(screen.queryByRole('region', { name: 'Card editor' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Card preview')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open a' })).toBeInTheDocument();
  });
});
