import React, { useReducer, useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import cloneDeep from 'lodash/cloneDeep';
import set from 'lodash/set';
import unset from 'lodash/unset';
import CardEditor from './CardEditor';
import { EMPTY_CARD } from '../../actions/cardActions';
import reducer from '../../reducer';
import { Store } from '../../store';
import CardInterface from '../../interfaces/CardInterface';
import { EDIT_SAVE_OFFSET, UNKNOWN_CREATOR } from '../../utils/constants';

// Keep the editor, actions, image hydration and reducer real. Only the HTTP
// boundary is simulated so server cover serialization participates in sync.
vi.mock('axios');
vi.mock('../../utils/accessService', () => ({ getAccessToken: () => 'test-token' }));
vi.mock('../../utils/staticAntd', () => ({
  staticAntd: { message: { error: vi.fn() } },
}));

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

const imageData = 'data:image/png;base64,saved-image';
const makeCard = (): CardInterface => ({
  ...EMPTY_CARD(),
  uuid: 'card-with-art',
  name: 'Original',
  front: { ...EMPTY_CARD().front, name: 'Original', cover: `base64:art.png|${imageData}` },
});

function Harness({ initialCard }: { initialCard: CardInterface }) {
  const [state, dispatch] = useReducer(reducer, {
    cards: [cloneDeep(initialCard)],
    mechanics: [],
    tags: [],
    annotationAccessor: {},
    user: [UNKNOWN_CREATOR],
    currentUser: UNKNOWN_CREATOR,
  });
  const [draft, setDraft] = useState<CardInterface | null>(null);
  return (
    <Store.Provider value={{ ...state, dispatch }}>
      <CardEditor card={draft || state.cards[0]} saveTmpCard={setDraft} />
      <output aria-label="Saved name">{state.cards[0].name}</output>
    </Store.Provider>
  );
}

describe('editor server/image synchronization', () => {
  let saved: CardInterface;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(axios.get).mockReset();
    vi.mocked(axios.post).mockReset();
    vi.mocked(axios.patch).mockReset();
    saved = makeCard();
    saved.front.cover = 'loading:art.png';
    vi.mocked(axios.get).mockResolvedValue({ data: { base64: imageData } });
    vi.mocked(axios.post).mockResolvedValue({ data: {} });
    vi.mocked(axios.patch).mockImplementation(async (_url, body) => {
      const changes = body as { set: Record<string, unknown>; unset: string[] };
      Object.entries(changes.set).forEach(([path, value]) => set(saved, path, value));
      changes.unset.forEach(path => unset(saved, path));
      saved.meta.lastUpdated = Date.now();
      return { data: { card: cloneDeep(saved) } };
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it.each([0, 1, 2])(
    'stops saving after a successful round-trip with %s uploaded card faces',
    async uploadedFaces => {
      const card = makeCard();
      if (uploadedFaces === 0) delete card.front.cover;
      if (uploadedFaces === 2) card.back = { ...card.front, name: 'Back' };
      saved = cloneDeep(card);
      if (uploadedFaces > 0) saved.front.cover = 'loading:art.png';
      if (saved.back) saved.back.cover = 'loading:art.png';
      render(<Harness initialCard={card} />);
      fireEvent.change(screen.getByLabelText('Card Name'), { target: { value: 'Edited' } });

      // Advance separately so React processes each server response/hydration
      // before another complete autosave interval elapses.
      for (let interval = 0; interval < 4; interval += 1) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(EDIT_SAVE_OFFSET + 100);
        });
      }

      expect(screen.getByLabelText('Saved name')).toHaveTextContent('Edited');
      expect(axios.patch).toHaveBeenCalledTimes(1);
      expect(axios.post).toHaveBeenCalledTimes(uploadedFaces);
      expect(axios.get).toHaveBeenCalledTimes(uploadedFaces);
      expect(screen.getByRole('button', { name: 'Undo Changes' })).toBeDisabled();
    },
  );

  it('keeps a newer local edit scheduled while an earlier save response arrives', async () => {
    let finishFirstSave!: () => void;
    vi.mocked(axios.patch).mockImplementationOnce(async (_url, body) => {
      const changes = body as { set: Record<string, unknown> };
      await new Promise<void>(resolve => {
        finishFirstSave = resolve;
      });
      Object.entries(changes.set).forEach(([path, value]) => set(saved, path, value));
      saved.meta.lastUpdated = Date.now();
      return { data: { card: cloneDeep(saved) } };
    });

    render(<Harness initialCard={makeCard()} />);
    fireEvent.change(screen.getByLabelText('Card Name'), { target: { value: 'First edit' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_OFFSET + 100);
    });
    fireEvent.change(screen.getByLabelText('Card Name'), { target: { value: 'Newer edit' } });
    await act(async () => {
      finishFirstSave();
    });
    expect(screen.getByLabelText('Card Name')).toHaveValue('Newer edit');

    for (let interval = 0; interval < 4; interval += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(EDIT_SAVE_OFFSET + 100);
      });
    }

    expect(screen.getByLabelText('Saved name')).toHaveTextContent('Newer edit');
    expect(axios.patch).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Undo Changes' })).toBeDisabled();
  });
});
