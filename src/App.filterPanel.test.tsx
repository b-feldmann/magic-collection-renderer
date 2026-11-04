import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Modal from 'antd/es/modal';
import { compile } from 'sass';
import { resolve } from 'node:path';
import fileDownload from 'js-file-download';
import App from './App';
import MobileApp from './MobileApp';
import { Store, StoreType } from './store';
import { createCard, EMPTY_CARD, refreshCollection } from './actions/cardActions';
import { setCurrentUser } from './actions/userActions';
import { UNKNOWN_CREATOR } from './utils/constants';
import CardInterface from './interfaces/CardInterface';
import { CardState, SortByType } from './interfaces/enums';
import { PHONE_LAYOUT_MEDIA_QUERY } from './utils/usePhoneLayout';
import appStyles from './App.module.scss';

vi.mock('antd/es/modal', async importOriginal => {
  const actual = await importOriginal<typeof import('antd/es/modal')>();
  return { ...actual, default: Object.assign(actual.default, { confirm: vi.fn() }) };
});
vi.mock('js-file-download', () => ({ default: vi.fn() }));
vi.mock('./components/CardCollection/CardCollection', () => ({
  default: ({ cards }: { cards: CardInterface[] }) => (
    <output aria-label="Visible cards">{cards.map(card => card.name).join(', ')}</output>
  ),
}));
vi.mock('./components/CardEditor/CardEditor', () => ({ default: () => null }));
vi.mock('./components/BigCardRenderModal/BigCardRenderModal', () => ({ default: () => null }));
vi.mock('./components/ChangeLogModal/ChangeLogModal', () => ({ default: () => null }));
vi.mock('./components/MechanicModal/MechanicModal', () => ({
  default: ({ visible }: { visible: boolean }) =>
    visible ? <div role="dialog" aria-label="Mechanics editor" /> : null,
}));
vi.mock('./utils/accessService', () => ({
  hasAccessToken: () => true,
  getAccessToken: () => 'test-token',
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
  setCurrentUser: vi.fn(),
}));
vi.mock('./actions/mechanicActions', () => ({ getMechanics: vi.fn() }));
vi.mock('./actions/tagActions', () => ({ getTags: vi.fn() }));
vi.mock('./actions/annotationActions', () => ({ getAnnotations: vi.fn() }));

// jsdom lacks matchMedia. Default to the phone layout so the mobile suites
// exercise the slide-up filter sheet; the tablet side column has its own test.
window.matchMedia ??= (media: string) => ({
  matches: media === PHONE_LAYOUT_MEDIA_QUERY,
  media,
  onchange: null,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => false,
});
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const benjamin = { ...UNKNOWN_CREATOR, uuid: 'benjamin', name: 'Benjamin' };
const alex = { ...UNKNOWN_CREATOR, uuid: 'alex', name: 'Alex' };
const admin = { ...UNKNOWN_CREATOR, uuid: 'admin', name: 'ADMIN' };
const card = { ...EMPTY_CARD(), uuid: 'test-card', name: 'Test creature', creator: benjamin };
const store: StoreType = {
  cards: [card],
  user: [benjamin, alex, admin],
  currentUser: benjamin,
  annotationAccessor: {},
  mechanics: [],
  tags: [],
  dispatch: vi.fn(),
};
const showApp = () =>
  render(
    <Store.Provider value={store}>
      <App />
    </Store.Provider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('modern collection sidebar', () => {
  it.each(['hidden', 'preview'] as const)(
    'gives the grid more visible room in Hidden than Preview, including after a %s reload',
    initialState => {
      const sheet = document.createElement('style');
      sheet.textContent = compile(resolve('src/App.module.scss')).css.replace(
        /\.([a-zA-Z_]\w*)/g,
        (selector, name: string) => (appStyles[name] ? `.${appStyles[name]}` : selector),
      );
      document.head.append(sheet);
      try {
        localStorage.setItem('mtg-funset:CollectionStatsClosedState', initialState);
        const initial = showApp();
        const reserve = () =>
          Number.parseFloat(
            getComputedStyle(
              screen.getByRole('region', { name: 'Collection mana curves' }).parentElement!,
            ).paddingBottom,
          );
        fireEvent.click(screen.getByRole('button', { name: 'Hidden' }));
        const hiddenReserve = reserve();
        fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
        const previewReserve = reserve();
        expect(hiddenReserve).toBeLessThan(previewReserve);
        fireEvent.click(screen.getByRole('button', { name: 'Expand statistics' }));
        expect(reserve()).toBe(previewReserve);
        initial.unmount();

        const previewReload = showApp();
        expect(reserve()).toBe(previewReserve);
        fireEvent.click(screen.getByRole('button', { name: 'Hidden' }));
        previewReload.unmount();

        showApp();
        expect(reserve()).toBe(hiddenReserve);
        expect(
          screen.queryByRole('group', { name: 'Statistics previews' }),
        ).not.toBeInTheDocument();
      } finally {
        sheet.remove();
      }
    },
  );

  it.each(['hidden', 'preview'] as const)(
    'restores the selected %s statistics state after reloading, even after expanding',
    preferred => {
      localStorage.setItem(
        'mtg-funset:CollectionStatsClosedState',
        preferred === 'hidden' ? 'preview' : 'hidden',
      );
      const initial = showApp();
      fireEvent.click(
        screen.getByRole('button', {
          name: preferred === 'hidden' ? 'Hidden' : 'Preview',
        }),
      );
      expect(localStorage.getItem('mtg-funset:CollectionStatsClosedState')).toBe(preferred);
      fireEvent.click(screen.getByRole('button', { name: 'Expand statistics' }));
      expect(localStorage.getItem('mtg-funset:CollectionStatsClosedState')).toBe(preferred);
      initial.unmount();

      showApp();
      expect(
        screen.getByRole('button', {
          name: preferred === 'hidden' ? 'Hidden' : 'Preview',
        }),
      ).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Expand statistics' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
      if (preferred === 'preview') {
        expect(screen.getByRole('group', { name: 'Statistics previews' })).toBeInTheDocument();
      } else {
        expect(
          screen.queryByRole('group', { name: 'Statistics previews' }),
        ).not.toBeInTheDocument();
      }
    },
  );

  it('right-aligns shared confirmation actions', () => {
    const css = compile(resolve('src/confirmationModal.module.scss')).css;
    expect(css).toContain('justify-content: flex-end');
  });

  it('keeps create and mechanics actions outside the scrolling filters', () => {
    showApp();
    const filters = screen.getByRole('region', { name: 'Collection filters' });
    const create = screen.getByRole('button', { name: 'Create card' });
    const mechanics = screen.getByRole('button', { name: 'Edit mechanics' });
    expect(filters).not.toContainElement(create);
    expect(filters).not.toContainElement(mechanics);
    fireEvent.click(create);
    expect(createCard).toHaveBeenCalledWith(store.dispatch, benjamin);
    fireEvent.click(mechanics);
    expect(screen.getByRole('dialog', { name: 'Mechanics editor' })).toBeInTheDocument();
  });

  it('switches to a real user only after confirmation and leaves cancellation unchanged', async () => {
    showApp();
    const selector = screen.getByRole('combobox', { name: 'Switch current user' });
    expect(selector.closest('.ant-select')).toBeInTheDocument();
    expect(selector.closest('.ant-select')).toHaveTextContent('Benjamin');
    fireEvent.mouseDown(selector);
    expect(
      await screen.findByText('Alex', { selector: '.ant-select-item-option-content' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('ADMIN', { selector: '.ant-select-item-option-content' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Alex', { selector: '.ant-select-item-option-content' }));
    expect(Modal.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Switch user?',
        content: 'You’ll switch the active collection to Alex.',
        className: expect.any(String),
      }),
    );
    expect(setCurrentUser).not.toHaveBeenCalled();
    expect(selector.closest('.ant-select')).toHaveTextContent('Benjamin');
    const cancelled = vi.mocked(Modal.confirm).mock.lastCall![0];
    await act(async () => {
      await cancelled.onCancel?.();
    });
    expect(setCurrentUser).not.toHaveBeenCalled();
    fireEvent.mouseDown(selector);
    fireEvent.click(
      await screen.findByText('Alex', { selector: '.ant-select-item-option-content' }),
    );
    const confirmed = vi.mocked(Modal.confirm).mock.lastCall![0];
    await act(async () => {
      await confirmed.onOk?.();
    });
    expect(setCurrentUser).toHaveBeenCalledWith(store.dispatch, alex);
  });

  it('retains export and reload in the compact overflow menu', async () => {
    showApp();
    const moreActions = screen.getByRole('button', { name: 'More collection actions' });
    expect(within(moreActions).getByRole('img', { name: 'ellipsis' })).toBeInTheDocument();
    fireEvent.click(moreActions);
    fireEvent.click(await screen.findByRole('menuitem', { name: /Download JSON/ }));
    expect(fileDownload).toHaveBeenCalledWith(expect.any(String), 'magic-collection.json');
    expect(JSON.parse(vi.mocked(fileDownload).mock.lastCall![0] as string)).toEqual([card]);
    vi.mocked(refreshCollection).mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'More collection actions' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Reload collection/ }));
    expect(refreshCollection).toHaveBeenCalledWith(store.dispatch);
  });

  it('keeps filtering wired to the actual collection and reset restores the cards', () => {
    showApp();
    expect(screen.getByLabelText('Visible cards')).toHaveTextContent('Test creature');
    expect(screen.getByRole('region', { name: 'Collection mana curves' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Mana curve by color: 1 card' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Filter by card name' }), {
      target: { value: 'No match' },
    });
    expect(screen.getByLabelText('Visible cards')).toBeEmptyDOMElement();
    expect(screen.getByRole('img', { name: 'Mana curve by color: 0 cards' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset all' }));
    expect(screen.getByLabelText('Visible cards')).toHaveTextContent('Test creature');
    expect(screen.getByRole('img', { name: 'Mana curve by color: 1 card' })).toBeInTheDocument();
  });

  it('keeps the mana curves scoped to the active tab and first variant', () => {
    const firstVariant: CardInterface = {
      ...card,
      uuid: 'first-variant',
      name: 'First variant',
      manaCost: '{1}{W}',
      variantIds: ['alternate-variant'],
      meta: { ...card.meta, createdAt: 1 },
      front: { ...card.front, name: 'First variant' },
    };
    const alternateVariant: CardInterface = {
      ...card,
      uuid: 'alternate-variant',
      name: 'Alternate variant',
      manaCost: '{4}{U}',
      variantIds: ['first-variant'],
      meta: { ...card.meta, createdAt: 2, state: CardState.Approved },
      front: { ...card.front, name: 'Alternate variant' },
    };
    render(
      <Store.Provider value={{ ...store, cards: [firstVariant, alternateVariant] }}>
        <App />
      </Store.Provider>,
    );

    expect(screen.getByRole('region', { name: 'Collection mana curves' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Mana curve by color: 1 card' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Approved cards/ }));

    const colorCurve = screen.getByRole('img', { name: 'Mana curve by color: 1 card' });
    expect(within(colorCurve).getByTitle('Mana value 2: 1 White')).toBeInTheDocument();
    expect(within(colorCurve).getByTitle('Mana value 5: No cards')).toBeInTheDocument();
    expect(within(colorCurve).getByText('7+')).toBeInTheDocument();
  });

  it('updates statistics while expanded without discarding the chosen layout', () => {
    showApp();
    fireEvent.click(screen.getByRole('button', { name: 'Expand statistics' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stacked' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Filter by card name' }), {
      target: { value: 'No match' },
    });
    expect(screen.getByLabelText('Visible cards')).toBeEmptyDOMElement();
    expect(screen.getByRole('button', { name: 'Stacked' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: 'Mana curve by color: 0 cards' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Mana curve by rarity' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset all' }));
    expect(screen.getByRole('img', { name: 'Mana curve by color: 1 card' })).toBeInTheDocument();
  });

  it('keeps both sort selectors in the filters and persists selection changes', async () => {
    showApp();
    const filters = screen.getByRole('region', { name: 'Collection filters' });
    const primary = within(filters).getByRole('combobox', { name: 'Primary sort' });
    expect(within(filters).getByRole('combobox', { name: 'Secondary sort' })).toBeInTheDocument();
    fireEvent.mouseDown(primary);
    fireEvent.click(
      await screen.findByText('Color', { selector: '.ant-select-item-option-content' }),
    );
    expect(localStorage.getItem('mtg-funset:SortBy')).toBe('Color');
  });

  it('reserves the narrow sidebar width without letting the antd column cap it', () => {
    const stylesheet = document.createElement('style');
    stylesheet.textContent = compile(resolve('src/App.module.scss')).css;
    document.head.append(stylesheet);
    try {
      render(
        <div className="app">
          <div className="sidebarCol" data-testid="sidebar-column">
            <aside className="sidebar" aria-label="Sidebar layout" />
          </div>
        </div>,
      );
      const sidebar = screen.getByRole('complementary', { name: 'Sidebar layout' });
      expect(getComputedStyle(sidebar).width).toBe('288px');
      expect(getComputedStyle(sidebar).boxSizing).toBe('border-box');
      expect(getComputedStyle(screen.getByTestId('sidebar-column')).width).toBe('304px');
    } finally {
      stylesheet.remove();
    }
  });
});

describe('matching mobile collection actions', () => {
  const showMobile = (cards: CardInterface[] = store.cards) =>
    render(
      <Store.Provider value={{ ...store, cards }}>
        <MobileApp />
      </Store.Provider>,
    );

  it('explicitly prevents the tablet controls from wrapping below the collection', () => {
    showMobile();
    const controls = screen.getByRole('group', { name: 'Collection actions' });
    const layout = controls.closest('.ant-row') as HTMLElement;
    expect(layout).toHaveClass('ant-row-no-wrap');
  });

  it('uses the same create action and opens the mechanics editor on mobile', () => {
    showMobile();
    const create = screen.getByRole('button', { name: 'Create card' });
    expect(create).not.toHaveClass('ant-btn-lg');
    fireEvent.click(create);
    expect(createCard).toHaveBeenCalledWith(store.dispatch, benjamin);
    fireEvent.click(screen.getByRole('button', { name: 'Edit mechanics' }));
    expect(screen.getByRole('dialog', { name: 'Mechanics editor' })).toBeInTheDocument();
  });

  it('opens the filters in a slide-up sheet, applies them, and keeps them applied after closing', async () => {
    showMobile();
    expect(screen.getByLabelText('Visible cards')).toHaveTextContent('Test creature');
    // The tall filter panel is hidden until it slides up, so the cards stay visible.
    expect(screen.queryByRole('checkbox', { name: 'Common rarity' })).not.toBeInTheDocument();

    const filtersButton = screen.getByRole('button', { name: /filters/i });
    expect(filtersButton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(filtersButton);
    const sheet = await screen.findByRole('dialog', { name: 'Filters' });

    fireEvent.click(within(sheet).getByRole('checkbox', { name: 'Common rarity' }));
    expect(screen.getByLabelText('Visible cards')).toBeEmptyDOMElement();

    fireEvent.click(within(sheet).getByRole('button', { name: 'Done' }));
    await waitFor(
      () => expect(screen.queryByRole('dialog', { name: 'Filters' })).not.toBeInTheDocument(),
      { timeout: 2000 },
    );
    // The sheet slid down, but the chosen filter still applies.
    expect(screen.getByLabelText('Visible cards')).toBeEmptyDOMElement();

    // Reopening keeps the earlier selection instead of resetting it.
    fireEvent.click(screen.getByRole('button', { name: /filters/i }));
    const reopenedSheet = await screen.findByRole('dialog', { name: 'Filters' });
    expect(
      within(reopenedSheet).getByRole('checkbox', { name: 'Common rarity' }),
    ).not.toBeChecked();
    fireEvent.click(within(reopenedSheet).getByRole('button', { name: 'Reset all' }));
    expect(screen.getByLabelText('Visible cards')).toHaveTextContent('Test creature');
  });

  it('shows the number of active filters on the Filters button while the sheet is closed', async () => {
    showMobile();
    expect(screen.getByRole('button', { name: /filters/i })).toHaveTextContent(/^Filters$/);

    fireEvent.click(screen.getByRole('button', { name: /filters/i }));
    const sheet = await screen.findByRole('dialog', { name: 'Filters' });
    fireEvent.click(within(sheet).getByRole('checkbox', { name: 'Common rarity' }));
    fireEvent.click(within(sheet).getByRole('checkbox', { name: 'Colorless color' }));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Done' }));

    await waitFor(
      () => expect(screen.queryByRole('dialog', { name: 'Filters' })).not.toBeInTheDocument(),
      { timeout: 2000 },
    );
    expect(screen.getByRole('button', { name: /filters/i })).toHaveTextContent('Filters · 2');
  });

  it('sorts cards using the controls in the phone filter sheet', async () => {
    localStorage.setItem('mtg-funset:SortBy', SortByType.LastUpdated);
    const testCard = {
      ...card,
      front: { ...card.front, name: 'Test creature' },
      meta: { ...card.meta, lastUpdated: 20 },
    };
    const alphaCard = {
      ...testCard,
      uuid: 'alpha-card',
      name: 'Alpha creature',
      front: { ...testCard.front, name: 'Alpha creature' },
      meta: { ...testCard.meta, lastUpdated: 10 },
    };
    showMobile([testCard, alphaCard]);
    expect(screen.getByLabelText('Visible cards')).toHaveTextContent(
      'Test creature, Alpha creature',
    );

    fireEvent.click(screen.getByRole('button', { name: /filters/i }));
    const sheet = await screen.findByRole('dialog', { name: 'Filters' });
    const primarySort = within(sheet).getByRole('combobox', { name: 'Primary sort' });
    expect(within(sheet).getByRole('combobox', { name: 'Secondary sort' })).toBeInTheDocument();

    fireEvent.mouseDown(primarySort);
    fireEvent.click(
      await screen.findByText('Name', { selector: '.ant-select-item-option-content' }),
    );

    await waitFor(() =>
      expect(screen.getByLabelText('Visible cards')).toHaveTextContent(
        'Alpha creature, Test creature',
      ),
    );
    expect(localStorage.getItem('mtg-funset:SortBy')).toBe('Name');
  });

  it('keeps the filters visible without a sheet in the tablet side column', () => {
    const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation((media: string) => ({
      matches: false,
      media,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }));
    try {
      showMobile();
      expect(screen.getByRole('textbox', { name: 'Filter by card name' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Common rarity' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /filters/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    } finally {
      matchMediaSpy.mockRestore();
    }
  });

  it('uses confirmed user switching without exposing the administrative account', async () => {
    showMobile();
    const selector = screen.getByRole('combobox', { name: 'Switch current user' });
    expect(selector.closest('.ant-select')).toBeInTheDocument();
    fireEvent.mouseDown(selector);
    expect(
      await screen.findByText('Alex', { selector: '.ant-select-item-option-content' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('ADMIN', { selector: '.ant-select-item-option-content' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Alex', { selector: '.ant-select-item-option-content' }));
    expect(setCurrentUser).not.toHaveBeenCalled();
    expect(selector.closest('.ant-select')).toHaveTextContent('Benjamin');
    await act(async () => {
      await vi.mocked(Modal.confirm).mock.lastCall![0].onOk?.();
    });
    expect(setCurrentUser).toHaveBeenCalledWith(store.dispatch, alex);
  });

  it('retains mobile reload in the overflow menu without adding an export action', async () => {
    showMobile();
    vi.mocked(refreshCollection).mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'More collection actions' }));
    expect(screen.queryByRole('menuitem', { name: /Download JSON/ })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('menuitem', { name: /Reload collection/ }));
    expect(refreshCollection).toHaveBeenCalledWith(store.dispatch);
  });
});
