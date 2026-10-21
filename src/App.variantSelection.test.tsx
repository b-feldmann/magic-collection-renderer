import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Modal } from 'antd';
import App from './App';
import MobileApp from './MobileApp';
import { Store, StoreType } from './store';
import { EMPTY_CARD } from './actions/cardActions';
import CardInterface from './interfaces/CardInterface';
import { UNKNOWN_CREATOR } from './utils/constants';

// Test app-level selection/confirmation state; expensive presentation is covered separately.
vi.mock('antd', async importOriginal => {
  const actual = await importOriginal<typeof import('antd')>();
  return { ...actual, Modal: Object.assign(actual.Modal, { confirm: vi.fn() }) };
});
vi.mock('./components/CardCollection/CardCollection', () => ({
  default: ({
    editCard,
    onSelectVariant,
  }: {
    editCard: (id: string) => void;
    onSelectVariant?: (id: string) => void;
  }) => (
    <div>
      <button onClick={() => editCard('a')}>Open a</button>
      <button onClick={() => onSelectVariant?.('b')}>Collection next variant</button>
    </div>
  ),
}));
vi.mock('./components/BigCardRenderModal/BigCardRenderModal', () => ({
  default: ({
    card,
    visible,
    hide,
    onSelectVariant,
  }: {
    card: CardInterface;
    visible: boolean;
    hide: () => void;
    onSelectVariant?: (id: string) => void;
  }) => (
    <div role="dialog" hidden={!visible}>
      <output aria-label="Viewed card">{card.uuid}</output>
      <button onClick={() => onSelectVariant?.('b')}>Modal next variant</button>
      <button onClick={hide}>Close card modal</button>
    </div>
  ),
}));
vi.mock('./components/CardEditor/CardEditor', () => ({
  default: ({
    card,
    saveTmpCard,
    onDraftChange,
  }: {
    card?: CardInterface;
    saveTmpCard: (card: CardInterface | null) => void;
    onDraftChange?: (card: CardInterface | null) => void;
  }) => (
    <div>
      <output aria-label="Edited card">{card?.uuid || 'none'}</output>
      <button onClick={() => card && saveTmpCard({ ...card, name: 'Unsaved draft' })}>
        Edit draft
      </button>
      <button onClick={() => card && onDraftChange?.({ ...card, name: 'Fresh draft' })}>
        Edit fresh draft
      </button>
    </div>
  ),
}));
vi.mock('./components/CollectionFilterControls/CollectionFilterControls', () => ({
  default: () => null,
}));
vi.mock('./components/ChangeLogModal/ChangeLogModal', () => ({ default: () => null }));
vi.mock('./components/MechanicModal/MechanicModal', () => ({ default: () => null }));
vi.mock('./utils/accessService', () => ({
  hasAccessToken: () => true,
  getAccessToken: () => 'token',
  updateAccessToken: vi.fn(),
}));
vi.mock('./actions/cardActions', async importOriginal => ({
  ...(await importOriginal<typeof import('./actions/cardActions')>()),
  refreshCollection: vi.fn(),
  createCard: vi.fn(),
}));
vi.mock('./actions/userActions', async importOriginal => ({
  ...(await importOriginal<typeof import('./actions/userActions')>()),
  getUser: vi.fn(),
  addSeenCard: vi.fn(),
  hasStoredUser: () => true,
}));
vi.mock('./actions/mechanicActions', () => ({ getMechanics: vi.fn() }));
vi.mock('./actions/tagActions', () => ({ getTags: vi.fn() }));
vi.mock('./actions/annotationActions', () => ({ getAnnotations: vi.fn() }));

if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
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

const user = { ...UNKNOWN_CREATOR, uuid: 'creator', name: 'Creator' };
const a = { ...EMPTY_CARD(), uuid: 'a', name: 'Card a', creator: user, variantIds: ['b'] };
const b = { ...EMPTY_CARD(), uuid: 'b', name: 'Card b', creator: user, variantIds: ['a'] };
const store: StoreType = {
  cards: [a, b],
  user: [user],
  currentUser: user,
  annotationAccessor: {},
  mechanics: [],
  dispatch: vi.fn(),
};

beforeEach(() => {
  vi.mocked(Modal.confirm).mockClear();
  localStorage.removeItem('mtg-funset:ActiveCardTab:v1');
});

describe.each([
  ['desktop', App],
  ['mobile', MobileApp],
] as const)('%s variant/editor synchronization', (_name, Component) => {
  const showApp = () =>
    render(
      <Store.Provider value={store}>
        <Component />
      </Store.Provider>,
    );

  it.each(['All', 'Card Drafts / Idea Dump', 'Cards to Rate', 'Approved Cards'])(
    'remembers the %s tab after remounting',
    tab => {
      const { unmount } = showApp();
      fireEvent.click(screen.getByRole('tab', { name: /^All/ }));
      fireEvent.click(screen.getByRole('tab', { name: new RegExp(tab) }));
      expect(localStorage.getItem('mtg-funset:ActiveCardTab:v1')).toBe(`tab-key-${tab}`);
      unmount();

      showApp();
      expect(screen.getByRole('tab', { name: new RegExp(tab) })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    },
  );

  it('falls back to Card Drafts when the saved tab is invalid', () => {
    localStorage.setItem('mtg-funset:ActiveCardTab:v1', 'tab-key-removed');
    showApp();
    expect(screen.getByRole('tab', { name: /Card Drafts/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('selects a collection variant in the editor without opening a hidden modal', () => {
    showApp();
    fireEvent.click(screen.getByRole('button', { name: 'Collection next variant' }));
    expect(screen.getByLabelText('Edited card')).toHaveTextContent('b');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('selects a modal variant in both the modal and editor', () => {
    showApp();
    fireEvent.click(screen.getByRole('button', { name: 'Open a' }));
    expect(screen.getByLabelText('Edited card')).toHaveTextContent('a');
    fireEvent.click(screen.getByRole('button', { name: 'Modal next variant' }));
    expect(screen.getByLabelText('Edited card')).toHaveTextContent('b');
    expect(screen.getByLabelText('Viewed card')).toHaveTextContent('b');
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  it.each(['collection', 'modal'])(
    'protects a fresh edit before its preview debounce during a %s switch',
    async origin => {
      showApp();
      fireEvent.click(screen.getByRole('button', { name: 'Open a' }));
      fireEvent.click(screen.getByRole('button', { name: 'Edit fresh draft', hidden: true }));
      if (origin === 'collection')
        fireEvent.click(screen.getByRole('button', { name: 'Close card modal' }));
      fireEvent.click(
        screen.getByRole('button', {
          name: origin === 'collection' ? 'Collection next variant' : 'Modal next variant',
        }),
      );
      expect(Modal.confirm).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText('Edited card')).toHaveTextContent('a');
      expect(screen.getByLabelText('Viewed card')).toHaveTextContent('a');
      const confirmation = vi.mocked(Modal.confirm).mock.calls[0][0];
      await act(async () => {
        confirmation.onOk?.();
      });
      expect(screen.getByLabelText('Edited card')).toHaveTextContent('b');
      expect(screen.getByLabelText('Viewed card')).toHaveTextContent('b');
      expect(screen.queryByRole('dialog') !== null).toBe(origin === 'modal');
    },
  );

  it.each(['collection', 'modal'])(
    'keeps both selections unchanged until a dirty-editor %s switch is confirmed',
    async origin => {
      showApp();
      fireEvent.click(screen.getByRole('button', { name: 'Open a' }));
      // Mobile keeps the editor mounted in a zero-width column; exercise its state callback too.
      fireEvent.click(screen.getByRole('button', { name: 'Edit draft', hidden: true }));
      if (origin === 'collection')
        fireEvent.click(screen.getByRole('button', { name: 'Close card modal' }));
      fireEvent.click(
        screen.getByRole('button', {
          name: origin === 'collection' ? 'Collection next variant' : 'Modal next variant',
        }),
      );
      expect(Modal.confirm).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText('Edited card')).toHaveTextContent('a');
      expect(screen.getByLabelText('Viewed card')).toHaveTextContent('a');
      const confirmation = vi.mocked(Modal.confirm).mock.calls[0][0];
      await act(async () => {
        confirmation.onCancel?.();
      });
      expect(screen.getByLabelText('Edited card')).toHaveTextContent('a');
      await act(async () => {
        confirmation.onOk?.();
      });
      expect(screen.getByLabelText('Edited card')).toHaveTextContent('b');
      expect(screen.getByLabelText('Viewed card')).toHaveTextContent('b');
      expect(screen.queryByRole('dialog') !== null).toBe(origin === 'modal');
    },
  );
});
