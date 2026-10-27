import { beforeEach, expect, it, vi } from 'vitest';
import axios from 'axios';
import { setAnnotationReaction } from './annotationActions';
import { AnnotationActionType } from '../reducer';
import { staticAntd } from '../utils/staticAntd';

vi.mock('axios', () => ({ default: { put: vi.fn() } }));
vi.mock('../utils/staticAntd', () => ({ staticAntd: { message: { error: vi.fn() } } }));

const annotation = {
  uuid: 'comment-1',
  cardReference: 'card-1',
  author: 'user-1',
  content: 'Hello',
  datetime: 123,
  edited: false,
  reactions: [{ emoji: '🔥', users: ['user-1'] }],
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('api_key', 'test-key');
});

it.each([true, false])(
  'saves explicit membership %s and dispatches the server document',
  async active => {
    vi.mocked(axios.put).mockResolvedValue({ status: 200, data: { annotation } });
    const dispatch = vi.fn();
    expect(await setAnnotationReaction(dispatch, 'comment-1', 'user-1', '🔥', active)).toBe(true);
    expect(axios.put).toHaveBeenCalledWith(
      'http://localhost:8080/annotations/comment-1/reactions',
      {
        accessKey: 'test-key',
        userUuid: 'user-1',
        emoji: '🔥',
        active,
      },
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: AnnotationActionType.UpdateAnnotation,
      payload: { annotation },
    });
  },
);

it.each([
  { status: 500, data: { annotation } },
  { status: 200, data: {} },
  { status: 200, data: { annotation: { ...annotation, uuid: 'different' } } },
  { status: 200, data: { annotation: { ...annotation, reactions: 'bad' } } },
])('does not replace saved counts with an unsuccessful or invalid response', async response => {
  vi.mocked(axios.put).mockResolvedValue(response);
  const dispatch = vi.fn();
  expect(await setAnnotationReaction(dispatch, 'comment-1', 'user-1', '🔥', true)).toBe(false);
  expect(dispatch).not.toHaveBeenCalled();
  expect(staticAntd.message.error).toHaveBeenCalled();
});

it('reports network failure and allows a subsequent retry', async () => {
  const dispatch = vi.fn();
  vi.mocked(axios.put).mockRejectedValueOnce(new Error('offline'));
  expect(await setAnnotationReaction(dispatch, 'comment-1', 'user-1', '🔥', true)).toBe(false);
  expect(dispatch).not.toHaveBeenCalled();
  expect(staticAntd.message.error).toHaveBeenCalled();
  vi.mocked(axios.put).mockResolvedValueOnce({ status: 200, data: { annotation } });
  expect(await setAnnotationReaction(dispatch, 'comment-1', 'user-1', '🔥', true)).toBe(true);
});
