import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { createImage, getImage } from './imageActions';
import { EMPTY_CARD } from './cardActions';
import { ImageActionType } from '../reducer';

vi.mock('axios', () => ({ default: { post: vi.fn(), get: vi.fn() } }));
vi.mock('../utils/accessService', () => ({ getAccessToken: () => 'token' }));
vi.mock('../utils/staticAntd', () => ({ staticAntd: { message: { error: vi.fn() } } }));

describe('awaited image persistence', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not resolve or publish an uploaded image until the server accepts it', async () => {
    let accept!: (value: unknown) => void;
    vi.mocked(axios.post).mockReturnValueOnce(
      new Promise(resolve => {
        accept = resolve;
      }),
    );
    const dispatch = vi.fn();
    const card = { ...EMPTY_CARD(), uuid: 'new-card' };
    const saving = createImage(dispatch, 'data', 'art.png', card, 1);
    expect(saving).toBeInstanceOf(Promise);
    expect(dispatch).not.toHaveBeenCalled();
    accept({ data: {} });
    await saving;
    expect(dispatch).toHaveBeenCalledWith({
      type: ImageActionType.ReadImage,
      payload: { base64: 'data', name: 'art.png', cardUuid: 'new-card', face: 1 },
    });
  });

  it('rejects failed uploads so callers do not save a broken image reference', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce(new Error('offline'));
    const dispatch = vi.fn();
    await expect(createImage(dispatch, 'data', '', EMPTY_CARD(), 0)).rejects.toThrow('offline');
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe('loading stored images', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('publishes images that arrive close together in a single store update', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { base64: 'data' } });
    const dispatch = vi.fn();
    const first = { ...EMPTY_CARD(), uuid: 'first' };
    const second = { ...EMPTY_CARD(), uuid: 'second' };

    getImage(dispatch, first, 0);
    getImage(dispatch, second, 0);
    await vi.advanceTimersByTimeAsync(100);

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: ImageActionType.ReadImages,
      payload: {
        images: [
          expect.objectContaining({ cardUuid: 'first' }),
          expect.objectContaining({ cardUuid: 'second' }),
        ],
      },
    });
  });
});
