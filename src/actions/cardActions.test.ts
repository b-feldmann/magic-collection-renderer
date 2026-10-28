import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('./imageActions', () => ({
  createImage: vi.fn(),
  getImage: vi.fn(),
}));

vi.mock('../utils/staticAntd', () => ({
  staticAntd: { message: { success: vi.fn(), error: vi.fn() } },
}));

vi.mock('../utils/accessService', () => ({
  getAccessToken: () => 'test-token',
  deleteAccessToken: vi.fn(),
}));

import axios from 'axios';
import {
  createCardVariant,
  deleteCard,
  refreshCard,
  refreshCollection,
  updateCard,
  updateCardRating,
} from './cardActions';
import { createImage } from './imageActions';
import { staticAntd } from '../utils/staticAntd';
import { AnnotationActionType, CardActionType } from '../reducer';
import CardInterface from '../interfaces/CardInterface';
import { CardType, CardState, RarityType } from '../interfaces/enums';
import { UNKNOWN_CREATOR } from '../utils/constants';

const makeCard = (uuid: string): CardInterface => ({
  name: 'Test',
  uuid,
  manaCost: '',
  rarity: RarityType.Common,
  front: { name: 'Test', cardTypes: [CardType.Creature], cardText: [] },
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

describe('card variant persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(axios.post).mockReset();
    vi.mocked(axios.get).mockReset();
    vi.mocked(axios.put).mockReset();
    vi.mocked(axios.patch).mockReset();
    vi.mocked(axios.delete).mockReset();
    vi.mocked(createImage).mockReset();
    vi.mocked(axios.post).mockResolvedValue({ data: { card: makeCard('new') } });
    vi.mocked(axios.put).mockImplementation(async (_url, body) => ({
      data: { card: (body as { card: CardInterface }).card },
    }));
    vi.mocked(axios.delete).mockResolvedValue({ data: {} });
    vi.mocked(axios.get).mockResolvedValue({ data: { base64: 'data:image/png;base64,loaded' } });
  });

  const writes = () =>
    vi.mocked(axios.put).mock.calls.map(call => (call[1] as { card: CardInterface }).card);

  it('allocates a server ID and persists independent copies and reciprocal membership before selection', async () => {
    const source = makeCard('source');
    source.front.cardText = ['Original text'];
    source.favorite = true;
    source.meta.likes = ['voter'];
    source.meta.comment = 'old comment';
    const before = JSON.stringify(source);
    const creator = { ...UNKNOWN_CREATOR, uuid: 'creator' };
    const dispatch = vi.fn();
    await createCardVariant(dispatch, source, [source], creator);
    expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/cards'), {
      accessKey: 'test-token',
      creator,
    });
    const copy = writes().find(card => card.uuid === 'new')!;
    expect(copy.variantIds).toEqual(['source']);
    expect(copy.front.cardText).toEqual(['Original text']);
    expect(copy.front).not.toBe(source.front);
    expect(copy.creator).toEqual(creator);
    expect(copy.favorite).toBe(false);
    expect(copy.meta).toMatchObject({
      likes: [],
      dislikes: [],
      comment: '',
      state: CardState.Draft,
    });
    expect(copy.meta.createdAt).toBeGreaterThan(0);
    expect(writes().find(card => card.uuid === 'source')!.variantIds).toEqual(['new']);
    expect(JSON.stringify(source)).toBe(before);
    expect(dispatch.mock.calls.slice(-1)[0]?.[0]).toMatchObject({
      type: CardActionType.CreateCard,
      payload: { card: { uuid: 'new', variantIds: ['source'] } },
    });
  });

  it('adds a third member from an existing variant without duplicate or self IDs', async () => {
    const a = { ...makeCard('a'), variantIds: ['b', 'b', 'a'] };
    const b = { ...makeCard('b'), variantIds: ['a'] };
    await createCardVariant(vi.fn(), b, [a, b], UNKNOWN_CREATOR);
    expect(writes().map(card => [card.uuid, card.variantIds])).toEqual([
      ['new', ['a', 'b']],
      ['a', ['b', 'new']],
      ['b', ['a', 'new']],
    ]);
  });

  it.each([CardState.Rate, CardState.Approved])(
    'creates a variant in the source workflow status (%s) without copying votes',
    async state => {
      const source = {
        ...makeCard('source'),
        meta: { ...makeCard('source').meta, state, likes: ['voter'], dislikes: ['other-voter'] },
      };

      await createCardVariant(vi.fn(), source, [source], UNKNOWN_CREATOR);

      expect(writes()[0].meta).toMatchObject({
        state,
        likes: [],
        dislikes: [],
        comment: '',
      });
    },
  );

  it('copies uploaded data on both faces under the new ID and preserves filenames', async () => {
    const source = makeCard('source');
    source.front.cover = 'base64:front.png|data:image/png;base64,front';
    source.back = { ...source.front, cover: 'base64:back.png|data:image/png;base64,back' };
    await createCardVariant(vi.fn(), source, [source], UNKNOWN_CREATOR);
    expect(createImage).toHaveBeenCalledWith(
      expect.any(Function),
      'data:image/png;base64,front',
      'front.png',
      expect.objectContaining({ uuid: 'new' }),
      0,
    );
    expect(createImage).toHaveBeenCalledWith(
      expect.any(Function),
      'data:image/png;base64,back',
      'back.png',
      expect.objectContaining({ uuid: 'new' }),
      1,
    );
    expect(writes()[0].front.cover).toBe('loading:front.png');
    expect(writes()[0].back?.cover).toBe('loading:back.png');
    expect(source.front.cover).toBe('base64:front.png|data:image/png;base64,front');
  });

  it('loads source art before copying an unloaded uploaded cover', async () => {
    const source = makeCard('source');
    source.front.cover = 'loading:art.png';
    await createCardVariant(vi.fn(), source, [source], UNKNOWN_CREATOR);
    expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/images'), {
      params: { accessKey: 'test-token', cardUuid: 'source', face: 0 },
    });
    expect(createImage).toHaveBeenCalledWith(
      expect.any(Function),
      'data:image/png;base64,loaded',
      'art.png',
      expect.objectContaining({ uuid: 'new' }),
      0,
    );
    expect(writes()[0].front.cover).toBe('loading:art.png');
  });

  it('keeps external URLs without writing uploaded images', async () => {
    const source = makeCard('source');
    source.front.cover = 'url:https://example.com/art.png';
    await createCardVariant(vi.fn(), source, [source], UNKNOWN_CREATOR);
    expect(writes()[0].front.cover).toBe(source.front.cover);
    expect(createImage).not.toHaveBeenCalled();
  });

  it('does not create or select a variant if allocation fails', async () => {
    vi.mocked(axios.post).mockRejectedValue(new Error('allocation failed'));
    const dispatch = vi.fn();
    await expect(
      createCardVariant(dispatch, makeCard('source'), [], UNKNOWN_CREATOR),
    ).rejects.toThrow();
    expect(axios.put).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
    expect(staticAntd.message.error).toHaveBeenCalled();
  });

  it.each(['read', 'upload', 'copy', 'sibling'])(
    'cleans up allocation and restores links when %s fails',
    async failure => {
      const source = makeCard('source');
      if (failure === 'read') {
        source.front.cover = 'loading';
        vi.mocked(axios.get).mockRejectedValueOnce(new Error('read failed'));
      } else if (failure === 'upload') {
        source.front.cover = 'base64:data';
        vi.mocked(createImage).mockRejectedValueOnce(new Error('upload failed'));
      } else if (failure === 'copy') {
        vi.mocked(axios.put).mockRejectedValueOnce(new Error('copy failed'));
      } else {
        vi.mocked(axios.put)
          .mockResolvedValueOnce({ data: { card: makeCard('new') } })
          .mockRejectedValueOnce(new Error('sibling failed'));
      }
      const dispatch = vi.fn();
      await expect(
        createCardVariant(dispatch, source, [source], UNKNOWN_CREATOR),
      ).rejects.toThrow();
      expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/cards/new'), {
        params: { accessKey: 'test-token' },
      });
      expect(
        dispatch.mock.calls.some(([action]) => action.type === CardActionType.CreateCard),
      ).toBe(false);
      if (failure === 'sibling') expect(writes().slice(-1)[0]?.variantIds).toBeUndefined();
    },
  );

  it('reports incomplete recovery instead of claiming success', async () => {
    vi.mocked(axios.put).mockRejectedValueOnce(new Error('save failed'));
    vi.mocked(axios.delete).mockRejectedValueOnce(new Error('cleanup failed'));
    await expect(createCardVariant(vi.fn(), makeCard('a'), [], UNKNOWN_CREATOR)).rejects.toThrow();
    expect(staticAntd.message.error).toHaveBeenCalledWith(
      expect.stringMatching(/recovery|refresh/i),
    );
  });

  it('waits for modal uploads before changing family links and retains the saved modal state', async () => {
    let finishUpload!: () => void;
    vi.mocked(createImage).mockReturnValueOnce(
      new Promise<void>(resolve => {
        finishUpload = resolve;
      }),
    );
    const source = makeCard('source');
    const modalDraft = {
      ...source,
      front: { ...source.front, cover: 'base64:art.png|modal-art' },
      meta: { ...source.meta, state: CardState.Rate },
    };
    vi.mocked(axios.patch).mockResolvedValueOnce({
      data: {
        card: {
          ...modalDraft,
          front: { ...modalDraft.front, cover: 'loading:art.png', cardMainType: 'Creature' },
        },
      },
    });
    const dispatch = vi.fn();
    const modalSave = updateCard(dispatch, modalDraft);
    await vi.waitFor(() => expect(createImage).toHaveBeenCalled());
    const creation = createCardVariant(dispatch, source, [source], UNKNOWN_CREATOR);
    // Finish all currently runnable work: without serialization creation overtakes the modal PUT.
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(dispatch.mock.calls.some(([action]) => action.type === CardActionType.CreateCard)).toBe(
      false,
    );
    finishUpload();
    await Promise.all([modalSave, creation]);
    const savedSource = writes()
      .filter(card => card.uuid === 'source')
      .slice(-1)[0];
    expect(savedSource.variantIds).toEqual(['new']);
    expect(savedSource.meta.state).toBe(CardState.Rate);
  });

  it('retains new membership when a stale modal save is requested during variant creation', async () => {
    let finishFamilyWrite!: (value: unknown) => void;
    const source = makeCard('source');
    vi.mocked(axios.put)
      .mockImplementationOnce(async (_url, body) => ({
        data: { card: (body as { card: CardInterface }).card },
      }))
      .mockImplementationOnce(
        (_url, body) =>
          new Promise(resolve => {
            finishFamilyWrite = () =>
              resolve({ data: { card: (body as { card: CardInterface }).card } });
          }),
      );
    vi.mocked(axios.patch).mockResolvedValueOnce({
      data: {
        card: { ...source, variantIds: ['new'], meta: { ...source.meta, state: CardState.Rate } },
      },
    });
    const dispatch = vi.fn();
    const creation = createCardVariant(dispatch, source, [source], UNKNOWN_CREATOR);
    await vi.waitFor(() => expect(axios.put).toHaveBeenCalledTimes(2));
    const modalSave = updateCard(dispatch, {
      ...source,
      meta: { ...source.meta, state: CardState.Rate },
    });
    finishFamilyWrite(undefined);
    await Promise.all([creation, modalSave]);
    expect(axios.patch).toHaveBeenCalledWith(
      expect.stringContaining('/cards/source'),
      expect.objectContaining({ set: { 'meta.state': CardState.Rate }, unset: [] }),
    );
    expect(dispatch.mock.calls.slice(-1)[0]?.[0]).toMatchObject({
      type: CardActionType.UpdateCard,
      payload: {
        card: { uuid: 'source', variantIds: ['new'], meta: { state: CardState.Rate } },
      },
    });
  });

  it('never overwrites original uploaded art while persisting or rolling back family links', async () => {
    const stored = {
      ...makeCard('source'),
      front: { ...makeCard('source').front, cover: 'loading:old.png' },
    };
    const draft = {
      ...stored,
      front: { ...stored.front, cover: 'base64:new.png|new-image-bytes' },
    };
    const images = new Map([['source', 'original-image-bytes']]);
    vi.mocked(createImage).mockImplementation(async (_dispatch, data, _name, card) => {
      images.set(card.uuid, data);
    });
    vi.mocked(axios.put)
      .mockResolvedValueOnce({ data: { card: makeCard('new') } })
      .mockRejectedValueOnce(new Error('membership failed'));
    await expect(createCardVariant(vi.fn(), draft, [stored], UNKNOWN_CREATOR)).rejects.toThrow(
      'membership failed',
    );
    expect(images.get('source')).toBe('original-image-bytes');
    expect(images.get('new')).toBe('new-image-bytes');
    expect(
      writes()
        .filter(card => card.uuid === 'source')
        .map(card => card.front.cover),
    ).toEqual(['loading:old.png', 'loading:old.png']);
  });

  it('does not resurrect a deleted card with a stale modal save or create a variant from it', async () => {
    const source = makeCard('source');
    const dispatch = vi.fn();
    await deleteCard(dispatch, source.uuid, [source]);
    await expect(updateCard(dispatch, source)).rejects.toThrow(/deleted/);
    await expect(createCardVariant(dispatch, source, [source], UNKNOWN_CREATOR)).rejects.toThrow(
      /deleted/,
    );
    expect(axios.put).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('refreshes authoritative membership before later stale snapshots are saved', async () => {
    const source = makeCard('source');
    const dispatch = vi.fn();
    await createCardVariant(dispatch, source, [source], UNKNOWN_CREATOR);
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: { cards: [{ ...source, variantIds: ['remote'] }] },
    });
    vi.mocked(axios.patch).mockResolvedValueOnce({
      data: { card: { ...source, variantIds: ['remote'] } },
    });
    refreshCollection(dispatch);
    await vi.waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: CardActionType.BulkReadCard }),
      ),
    );
    await updateCard(dispatch, source);
    expect(axios.patch).toHaveBeenLastCalledWith(
      expect.stringContaining('/cards/source'),
      expect.objectContaining({
        set: expect.not.objectContaining({ variantIds: expect.anything() }),
      }),
    );
    expect(dispatch.mock.calls.slice(-1)[0]?.[0]).toMatchObject({
      type: CardActionType.UpdateCard,
      payload: { card: { variantIds: ['remote'] } },
    });
  });

  it('persists deletion cleanup and leaves a single ordinary member', async () => {
    const a = { ...makeCard('a'), variantIds: ['b'] };
    const b = { ...makeCard('b'), variantIds: ['a'] };
    const dispatch = vi.fn();
    await deleteCard(dispatch, 'b', [a, b]);
    expect(writes()).toEqual([expect.objectContaining({ uuid: 'a', variantIds: [] })]);
    expect(dispatch.mock.calls.slice(-1)[0]?.[0]).toEqual({
      type: CardActionType.DeleteCard,
      payload: { uuid: 'b' },
    });
    expect(a.variantIds).toEqual(['b']);
  });

  it('moves comments off a deleted variant without replacing Mongo metadata', async () => {
    const a = { ...makeCard('a'), variantIds: ['b'] };
    const b = { ...makeCard('b'), variantIds: ['a'] };
    const comment = {
      uuid: 'comment-b',
      datetime: 1,
      author: 'author',
      content: 'Keep this comment',
      cardReference: 'b',
      edited: false,
      _id: 'mongo-comment-id',
      __v: 1,
    };
    vi.mocked(axios.put).mockImplementation(async (url, body) => {
      if (String(url).endsWith('/annotations')) {
        return { data: { annotation: (body as { annotation: typeof comment }).annotation } };
      }
      return { data: { card: (body as { card: CardInterface }).card } };
    });
    const dispatch = vi.fn();
    const expectedComment = {
      uuid: 'comment-b',
      datetime: 1,
      author: 'author',
      content: 'Keep this comment',
      cardReference: 'a',
      edited: false,
    };

    await deleteCard(dispatch, 'b', [a, b], [comment]);

    expect(axios.put).toHaveBeenCalledWith(
      expect.stringContaining('/annotations'),
      expect.objectContaining({ annotation: expectedComment, accessKey: 'test-token' }),
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: AnnotationActionType.UpdateAnnotation,
      payload: { annotation: expectedComment },
    });
  });

  it.each(['cleanup', 'delete'])(
    'does not publish deletion if %s fails and restores attempted changes',
    async failure => {
      const a = { ...makeCard('a'), variantIds: ['b'] };
      const b = { ...makeCard('b'), variantIds: ['a'] };
      if (failure === 'cleanup')
        vi.mocked(axios.put).mockRejectedValueOnce(new Error('cleanup failed'));
      else vi.mocked(axios.delete).mockRejectedValueOnce(new Error('delete failed'));
      const dispatch = vi.fn();
      await expect(deleteCard(dispatch, 'b', [a, b])).rejects.toThrow();
      expect(dispatch).not.toHaveBeenCalled();
      expect(writes().slice(-1)[0]?.variantIds).toEqual(['b']);
    },
  );
});

describe('updateCard', () => {
  beforeEach(() => {
    vi.mocked(axios.put).mockReset();
    vi.mocked(axios.patch).mockReset();
  });

  it('sends only changed fields and reconciles the complete server card', async () => {
    const card = makeCard('card-to-patch');
    const dispatch = vi.fn();
    const mergedCard = {
      ...card,
      front: { ...card.front, name: 'Edited name' },
      meta: { ...card.meta, likes: ['remote-voter'] },
    };
    vi.mocked(axios.get).mockResolvedValueOnce({ data: { cards: [card] } });
    vi.mocked(axios.put).mockResolvedValueOnce({ data: { card: mergedCard } });
    vi.mocked(axios.patch).mockResolvedValueOnce({ data: { card: mergedCard } });

    refreshCollection(dispatch);
    await vi.waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: CardActionType.BulkReadCard }),
      ),
    );
    await updateCard(dispatch, {
      ...card,
      front: { ...card.front, name: 'Edited name' },
    });

    expect(axios.patch).toHaveBeenCalledWith(expect.stringContaining('/cards/card-to-patch'), {
      accessKey: 'test-token',
      set: { 'front.cardMainType': 'Creature', 'front.name': 'Edited name' },
      unset: [],
    });
    expect(axios.put).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenLastCalledWith({
      type: CardActionType.UpdateCard,
      payload: { card: mergedCard },
    });
  });

  it('does not send Mongo-internal fields when there is no cached baseline', async () => {
    const card = {
      ...makeCard('uuid-1'),
      _id: '6abd7b0f36b7ed300aee2ac6',
      __v: 0,
    } as CardInterface;
    vi.mocked(axios.put).mockResolvedValueOnce({ data: { card: makeCard('uuid-1') } });
    vi.mocked(axios.patch).mockResolvedValue({ data: { card: makeCard('uuid-1') } });

    await updateCard(() => {}, card);

    expect(axios.patch).toHaveBeenCalledTimes(1);
    const body = vi.mocked(axios.patch).mock.calls[0][1] as {
      set: Record<string, unknown>;
    };
    expect(body.set.uuid).toBeUndefined();
    expect(body.set._id).toBeUndefined();
    expect(body.set.__v).toBeUndefined();
  });

  it('sends a rating intent and reconciles the complete server card', async () => {
    const dispatch = vi.fn();
    const card = {
      ...makeCard('card-to-rate'),
      meta: { ...makeCard('card-to-rate').meta, likes: ['voter-1'] },
    };
    vi.mocked(axios.put).mockResolvedValueOnce({ data: { card } });

    await updateCardRating(dispatch, 'card-to-rate', 'voter-1', 'like');

    expect(axios.put).toHaveBeenCalledWith(expect.stringContaining('/cards/card-to-rate/rating'), {
      accessKey: 'test-token',
      userUuid: 'voter-1',
      rating: 'like',
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: CardActionType.UpdateCard,
      payload: { card },
    });
  });

  it('fetches and publishes the latest version of one card', async () => {
    const dispatch = vi.fn();
    const latest = { ...makeCard('card-to-refresh'), name: 'Latest name' };
    vi.mocked(axios.get).mockResolvedValueOnce({ data: { card: latest } });

    await refreshCard(dispatch, 'card-to-refresh');

    expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/cards/card-to-refresh'), {
      params: { accessKey: 'test-token' },
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: CardActionType.UpdateCard,
      payload: { card: latest },
    });
  });
});
