import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
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
  it('right-aligns switch-user confirmation actions', () => {
    const css = compile(resolve('src/components/CollectionActions/styles.module.scss')).css;
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
    fireEvent.change(screen.getByRole('textbox', { name: 'Filter by card name' }), {
      target: { value: 'No match' },
    });
    expect(screen.getByLabelText('Visible cards')).toBeEmptyDOMElement();
    fireEvent.click(screen.getByRole('button', { name: 'Reset all' }));
    expect(screen.getByLabelText('Visible cards')).toHaveTextContent('Test creature');
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
  const showMobile = () =>
    render(
      <Store.Provider value={store}>
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
