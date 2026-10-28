import React, { useReducer } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Modal } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CardEditor from './CardEditor';
import { refreshCard } from '../../actions/cardActions';
import reducer, { CardActionType } from '../../reducer';
import { Store } from '../../store';
import { CardState, CardType, RarityType } from '../../interfaces/enums';
import { UNKNOWN_CREATOR } from '../../utils/constants';
import type CardInterface from '../../interfaces/CardInterface';

vi.mock('../../actions/cardActions', () => ({
  createCardVariant: vi.fn(() => Promise.resolve()),
  deleteCard: vi.fn(() => Promise.resolve()),
  refreshCard: vi.fn(),
  updateCard: vi.fn(() => Promise.resolve()),
}));

window.matchMedia ??= query => ({
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

const makeCard = (): CardInterface => ({
  name: 'Original',
  uuid: 'reload-card',
  manaCost: '',
  rarity: RarityType.Common,
  front: { name: 'Original', cardTypes: [CardType.Creature], cardText: [] },
  creator: UNKNOWN_CREATOR,
  meta: {
    comment: '',
    likes: [],
    dislikes: [],
    lastUpdated: 0,
    createdAt: 0,
    state: CardState.Draft,
  },
});

function Harness({ initialCard }: { initialCard: CardInterface }) {
  const [state, dispatch] = useReducer(reducer, {
    cards: [initialCard],
    mechanics: [],
    tags: [],
    annotationAccessor: {},
    user: [UNKNOWN_CREATOR],
    currentUser: UNKNOWN_CREATOR,
  });
  return (
    <Store.Provider value={{ ...state, dispatch }}>
      <CardEditor card={state.cards[0]} saveTmpCard={() => {}} />
      <output aria-label="Saved name">{state.cards[0].name}</output>
    </Store.Provider>
  );
}

describe('CardEditor reload button', () => {
  afterEach(() => vi.restoreAllMocks());

  beforeEach(() => {
    vi.mocked(refreshCard).mockReset();
  });

  it('loads the latest card directly when there are no unsaved edits', async () => {
    const latest = {
      ...makeCard(),
      name: 'Latest',
      front: { ...makeCard().front, name: 'Latest' },
    };
    vi.mocked(refreshCard).mockImplementation(async (dispatch, _uuid) => {
      dispatch({ type: CardActionType.UpdateCard, payload: { card: latest } });
      return latest;
    });
    const confirm = vi.spyOn(Modal, 'confirm');
    render(<Harness initialCard={makeCard()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reload card from server' }));

    await waitFor(() => expect(screen.getByLabelText('Saved name')).toHaveTextContent('Latest'));
    expect(refreshCard).toHaveBeenCalledWith(expect.any(Function), 'reload-card');
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks before replacing unsaved edits and discards them after confirmation', async () => {
    const latest = {
      ...makeCard(),
      name: 'Latest',
      front: { ...makeCard().front, name: 'Latest' },
    };
    vi.mocked(refreshCard).mockImplementation(async (dispatch, _uuid) => {
      dispatch({ type: CardActionType.UpdateCard, payload: { card: latest } });
      return latest;
    });
    const confirm = vi.spyOn(Modal, 'confirm').mockReturnValue({
      destroy: vi.fn(),
      update: vi.fn(),
    });
    render(<Harness initialCard={makeCard()} />);
    fireEvent.change(screen.getByLabelText('Card Name'), { target: { value: 'Local edit' } });

    fireEvent.click(screen.getByRole('button', { name: 'Reload card from server' }));

    expect(confirm).toHaveBeenCalled();
    expect(refreshCard).not.toHaveBeenCalled();
    const config = confirm.mock.calls[0][0] as { onOk?: () => Promise<void> };
    await act(async () => config.onOk?.());

    await waitFor(() => expect(screen.getByLabelText('Card Name')).toHaveValue('Latest'));
    expect(refreshCard).toHaveBeenCalledWith(expect.any(Function), 'reload-card');
  });
});
