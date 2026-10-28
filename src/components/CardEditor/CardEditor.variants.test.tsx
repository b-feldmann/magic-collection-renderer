import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CardEditor from './CardEditor';
import { createCardVariant, EMPTY_CARD, updateCard } from '../../actions/cardActions';
import { Store, StoreType } from '../../store';
import CardInterface from '../../interfaces/CardInterface';
import { UNKNOWN_CREATOR, EDIT_SAVE_OFFSET } from '../../utils/constants';
import { CardState } from '../../interfaces/enums';

vi.mock('../../actions/cardActions', async importOriginal => ({
  ...(await importOriginal<typeof import('../../actions/cardActions')>()),
  createCardVariant: vi.fn(),
  updateCard: vi.fn(),
  deleteCard: vi.fn(),
}));

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

const makeCard = (): CardInterface => ({
  ...EMPTY_CARD(),
  uuid: 'source',
  name: 'Original',
  front: { name: 'Original', cardTypes: [], cardText: [] },
});
const makeStore = (cards = [makeCard()]): StoreType => ({
  cards,
  user: [UNKNOWN_CREATOR],
  currentUser: UNKNOWN_CREATOR,
  mechanics: [],
  annotationAccessor: {},
  dispatch: vi.fn(),
});
const typeName = (value: string) => {
  const input = screen.getByText('Card Name').closest('span')!.querySelector('input')!;
  fireEvent.change(input, { target: { value } });
};

const clickMenuAction = (name: string) => {
  fireEvent.click(screen.getByRole('button', { name: 'More card actions' }));
  fireEvent.click(screen.getByRole('menuitem', { name }));
};

describe('editor variant creation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(createCardVariant).mockReset().mockResolvedValue(undefined);
    vi.mocked(updateCard).mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('does not offer variant creation when no card is selected', () => {
    render(<CardEditor saveTmpCard={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Create Variant' })).not.toBeInTheDocument();
  });

  it.each(['before release', 'after release', 'undo'])(
    'preserves rating metadata when editing %s',
    async timing => {
      const card = makeCard();
      const preview = vi.fn();
      const onDraftChange = vi.fn();
      const { rerender } = render(
        <Store.Provider value={makeStore([card])}>
          <CardEditor card={card} saveTmpCard={preview} onDraftChange={onDraftChange} />
        </Store.Provider>,
      );
      if (timing !== 'after release') typeName('Unsaved edit');
      const released = {
        ...card,
        meta: { ...card.meta, state: CardState.Rate, likes: ['voter'], dislikes: ['other'] },
      };
      rerender(
        <Store.Provider value={makeStore([released])}>
          <CardEditor card={released} saveTmpCard={preview} onDraftChange={onDraftChange} />
        </Store.Provider>,
      );
      if (timing === 'after release') typeName('Unsaved edit');
      if (timing === 'undo') fireEvent.click(screen.getByRole('button', { name: 'Undo Changes' }));
      await act(async () => {
        vi.advanceTimersByTime(EDIT_SAVE_OFFSET + 100);
      });
      expect(updateCard).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.objectContaining({
          name: timing === 'undo' ? 'Original' : 'Unsaved edit',
          meta: expect.objectContaining({
            state: CardState.Rate,
            likes: ['voter'],
            dislikes: ['other'],
          }),
        }),
      );
      if (timing !== 'undo') {
        expect(preview).toHaveBeenCalledWith(
          expect.objectContaining({ meta: expect.objectContaining({ state: CardState.Rate }) }),
        );
      }
    },
  );

  it('places variant creation and back-face actions in the header menu beside favorite', () => {
    const card = makeCard();
    render(
      <Store.Provider value={makeStore([card])}>
        <CardEditor card={card} saveTmpCard={() => {}} />
      </Store.Provider>,
    );
    const group = screen.getByRole('button', { name: 'Mark as favorite' }).parentElement;
    expect(screen.getByRole('button', { name: 'More card actions' }).parentElement).toBe(group);
    fireEvent.click(screen.getByRole('button', { name: 'More card actions' }));
    expect(screen.getByRole('menuitem', { name: 'Add Back Face' }).parentElement).toBe(
      screen.getByRole('menuitem', { name: 'Create Variant' }).parentElement,
    );
  });

  it.each([
    ['Mark as favorite', 'wrap'],
    ['Undo Changes', 'nowrap'],
  ])('uses %s action-row wrapping of %s', (buttonName, flexWrap) => {
    const card = {
      ...makeCard(),
      back: { name: 'Back', cardTypes: [], cardText: [] },
    };
    render(
      <Store.Provider value={makeStore([card])}>
        <CardEditor card={card} saveTmpCard={() => {}} />
      </Store.Provider>,
    );

    const group = screen.getByRole('button', { name: buttonName }).parentElement;
    expect(group).toHaveStyle({ display: 'flex', flexWrap });
  });

  it('cancels discarded preview and autosave timers when another variant is selected', async () => {
    const card = makeCard();
    const other = {
      ...card,
      uuid: 'variant',
      name: 'Variant',
      front: { ...card.front, name: 'Variant' },
    };
    const value = makeStore([card, other]);
    const preview = vi.fn();
    const { rerender } = render(
      <Store.Provider value={value}>
        <CardEditor card={card} saveTmpCard={preview} />
      </Store.Provider>,
    );
    typeName('Discard this draft');
    rerender(
      <Store.Provider value={value}>
        <CardEditor card={other} saveTmpCard={preview} />
      </Store.Provider>,
    );
    preview.mockClear();
    await act(async () => {
      vi.advanceTimersByTime(EDIT_SAVE_OFFSET + 100);
    });
    expect(updateCard).not.toHaveBeenCalled();
    expect(preview).not.toHaveBeenCalledWith(expect.objectContaining({ uuid: 'source' }));
    expect(screen.getByDisplayValue('Variant')).toBeVisible();
  });

  it('reports fresh drafts immediately without bypassing preview debounce, and clears tracking after save', async () => {
    const card = makeCard();
    const preview = vi.fn();
    const onDraftChange = vi.fn();
    render(
      <Store.Provider value={makeStore([card])}>
        <CardEditor card={card} saveTmpCard={preview} onDraftChange={onDraftChange} />
      </Store.Provider>,
    );
    preview.mockClear();
    onDraftChange.mockClear();
    typeName('Fresh edit');
    expect(onDraftChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ uuid: 'source', name: 'Fresh edit' }),
    );
    expect(preview).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(EDIT_SAVE_OFFSET + 100);
    });
    expect(onDraftChange).toHaveBeenLastCalledWith(null);
  });

  it.each(['Add Back Face', 'Delete Back Face'])(
    'keeps newer drafts tracked after an earlier %s save finishes',
    async action => {
      const initial = makeCard();
      const card =
        action === 'Delete Back Face' ? { ...initial, back: { ...initial.front } } : initial;
      let finishSave!: (value: unknown) => void;
      vi.mocked(updateCard).mockReturnValueOnce(
        new Promise(resolve => {
          finishSave = resolve;
        }),
      );
      const onDraftChange = vi.fn();
      render(
        <Store.Provider value={makeStore([card])}>
          <CardEditor card={card} saveTmpCard={() => {}} onDraftChange={onDraftChange} />
        </Store.Provider>,
      );
      clickMenuAction(action);
      typeName('Newer draft');
      await act(async () => {
        finishSave(undefined);
      });
      expect(onDraftChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          uuid: 'source',
          front: expect.objectContaining({ name: 'Newer draft' }),
        }),
      );
    },
  );

  it('copies current unsaved contents and prevents duplicate submissions while creation is pending', async () => {
    let finish!: () => void;
    vi.mocked(createCardVariant).mockReturnValueOnce(
      new Promise(resolve => {
        finish = resolve;
      }),
    );
    const card = makeCard();
    const store = makeStore([card]);
    const preview = vi.fn();
    render(
      <Store.Provider value={store}>
        <CardEditor card={card} saveTmpCard={preview} />
      </Store.Provider>,
    );
    typeName('New draft');
    await act(async () => {
      clickMenuAction('Create Variant');
    });
    expect(createCardVariant).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        name: 'New draft',
        front: expect.objectContaining({ name: 'New draft' }),
      }),
      store.cards,
      store.currentUser,
    );
    expect(screen.getByRole('button', { name: 'More card actions' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'More card actions' }));
    expect(createCardVariant).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish();
    });
    expect(screen.getByRole('button', { name: 'More card actions' })).toBeEnabled();
    expect(preview).toHaveBeenLastCalledWith(null);
    await act(async () => {
      vi.advanceTimersByTime(EDIT_SAVE_OFFSET + 100);
    });
    expect(updateCard).not.toHaveBeenCalled();
  });

  it('preserves the unsaved editor contents and allows retry after a rejected creation', async () => {
    vi.mocked(createCardVariant).mockRejectedValueOnce(new Error('offline'));
    const card = makeCard();
    const preview = vi.fn();
    render(
      <Store.Provider value={makeStore([card])}>
        <CardEditor card={card} saveTmpCard={preview} />
      </Store.Provider>,
    );
    typeName('Keep this draft');
    await act(async () => {
      clickMenuAction('Create Variant');
    });
    expect(screen.getByDisplayValue('Keep this draft')).toBeVisible();
    expect(screen.getByRole('button', { name: 'More card actions' })).toBeEnabled();
    expect(preview).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Keep this draft' }));
  });

  it('merges latest family membership into a pending autosave and undo snapshot', async () => {
    const card = makeCard();
    const { rerender } = render(
      <Store.Provider value={makeStore([card])}>
        <CardEditor card={card} saveTmpCard={() => {}} />
      </Store.Provider>,
    );
    typeName('Edited');
    const updated = { ...card, variantIds: ['new-variant'] };
    rerender(
      <Store.Provider value={makeStore([updated])}>
        <CardEditor card={card} saveTmpCard={() => {}} />
      </Store.Provider>,
    );
    await act(async () => {
      vi.advanceTimersByTime(EDIT_SAVE_OFFSET + 100);
    });
    expect(updateCard).toHaveBeenLastCalledWith(
      expect.any(Function),
      expect.objectContaining({ name: 'Edited', variantIds: ['new-variant'] }),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Undo Changes' }));
    });
    expect(updateCard).toHaveBeenLastCalledWith(
      expect.any(Function),
      expect.objectContaining({ name: 'Original', variantIds: ['new-variant'] }),
    );
  });

  it('receives newer server fields while preserving and saving the local draft', async () => {
    const card = makeCard();
    const { rerender } = render(
      <Store.Provider value={makeStore([card])}>
        <CardEditor card={card} saveTmpCard={() => {}} />
      </Store.Provider>,
    );
    typeName('Local draft');

    const updatedByAnotherEditor = {
      ...card,
      name: 'Remote title',
      manaCost: '{U}',
      front: { ...card.front, name: 'Remote title', cardText: ['Remote rules text'] },
    };
    rerender(
      <Store.Provider value={makeStore([updatedByAnotherEditor])}>
        <CardEditor card={updatedByAnotherEditor} saveTmpCard={() => {}} />
      </Store.Provider>,
    );

    expect(screen.getByLabelText('Mana Cost')).toHaveValue('{U}');
    expect(screen.getByLabelText('Card Name')).toHaveValue('Local draft');
    await act(async () => {
      vi.advanceTimersByTime(EDIT_SAVE_OFFSET + 100);
    });
    expect(updateCard).toHaveBeenLastCalledWith(
      expect.any(Function),
      expect.objectContaining({
        name: 'Local draft',
        manaCost: '{U}',
        front: expect.objectContaining({
          name: 'Local draft',
          cardText: ['Remote rules text'],
        }),
      }),
    );
  });

  it('waits for an already running autosave before creating the variant', async () => {
    let finishSave!: (value: unknown) => void;
    vi.mocked(updateCard).mockReturnValueOnce(
      new Promise(resolve => {
        finishSave = resolve;
      }),
    );
    const card = makeCard();
    render(
      <Store.Provider value={makeStore([card])}>
        <CardEditor card={card} saveTmpCard={() => {}} />
      </Store.Provider>,
    );
    typeName('Edited');
    await act(async () => {
      vi.advanceTimersByTime(EDIT_SAVE_OFFSET + 100);
    });
    await act(async () => {
      clickMenuAction('Create Variant');
    });
    expect(createCardVariant).not.toHaveBeenCalled();
    await act(async () => {
      finishSave(undefined);
    });
    expect(createCardVariant).toHaveBeenCalledTimes(1);
  });
});
