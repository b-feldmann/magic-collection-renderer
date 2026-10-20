import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { createImage } from './imageActions';
import { EMPTY_CARD } from './cardActions';
import { ImageActionType } from '../reducer';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));
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
