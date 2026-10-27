import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import axios from 'axios';
import Annotation from './Annotation';
import AnnotationInterface from '../../interfaces/AnnotationInterface';
import { Store } from '../../store';
import { UNKNOWN_CREATOR } from '../../utils/constants';
import { AnnotationActionType } from '../../reducer';
import { staticAntd } from '../../utils/staticAntd';

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

vi.mock('axios', () => ({ default: { put: vi.fn() } }));
vi.mock('../../utils/staticAntd', () => ({ staticAntd: { message: { error: vi.fn() } } }));
// The third-party picker is large; keep the actual Popover and reaction UI.
vi.mock('emoji-mart', () => ({
  NimblePicker: ({ onClick }: { onClick: (emoji: { native: string }) => void }) => (
    <button onClick={() => onClick({ native: '🔥' })}>Choose fire emoji</button>
  ),
}));

const reader = { ...UNKNOWN_CREATOR, uuid: 'reader', name: 'Reader' };
const comment: AnnotationInterface = {
  uuid: 'comment-1',
  cardReference: 'card-1',
  author: 'reader',
  content: 'Hello\nWorld',
  datetime: 123,
  edited: false,
};
const mount = (annotation = comment, currentUser = reader) => {
  const dispatch = vi.fn();
  const view = render(
    <Store.Provider
      value={{
        cards: [],
        mechanics: [],
        user: [reader],
        currentUser,
        annotationAccessor: {},
        dispatch,
      }}
    >
      <Annotation annotation={annotation} />
    </Store.Provider>,
  );
  return { ...view, dispatch };
};

beforeEach(() => vi.clearAllMocks());

it('renders author, timestamp, multiline content and a keyboard-accessible reaction control on old comments', async () => {
  mount();
  expect(screen.getByText('Reader')).toBeInTheDocument();
  expect(screen.getByText('Hello')).toBeInTheDocument();
  expect(screen.getByText('World')).toBeInTheDocument();
  const trigger = screen.getByRole('button', { name: 'Add reaction' });
  trigger.focus();
  fireEvent.click(trigger);
  expect(await screen.findByRole('button', { name: 'Choose fire emoji' })).toBeInTheDocument();
  fireEvent.keyDown(trigger, { key: 'Escape' });
  await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
});

it('chooses an emoji and applies only the server-confirmed reaction', async () => {
  const saved = { ...comment, reactions: [{ emoji: '🔥', users: ['reader'] }] };
  vi.mocked(axios.put).mockResolvedValue({ status: 200, data: { annotation: saved } });
  const { dispatch } = mount();
  fireEvent.click(screen.getByRole('button', { name: 'Add reaction' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Choose fire emoji' }));
  await waitFor(() =>
    expect(dispatch).toHaveBeenCalledWith({
      type: AnnotationActionType.UpdateAnnotation,
      payload: { annotation: saved },
    }),
  );
  expect(axios.put).toHaveBeenCalledWith(
    expect.stringContaining('/comment-1/reactions'),
    expect.objectContaining({ userUuid: 'reader', emoji: '🔥', active: true }),
  );
});

it('shows counts and own selection, removing only the selected emoji on click', async () => {
  const annotation = {
    ...comment,
    reactions: [
      { emoji: '🔥', users: ['reader', 'other'] },
      { emoji: '❤️', users: ['other'] },
    ],
  };
  vi.mocked(axios.put).mockResolvedValue({ status: 200, data: { annotation } });
  mount(annotation);
  const fire = screen.getByRole('button', { name: '🔥 2 reactions' });
  expect(fire).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: '❤️ 1 reaction' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  fireEvent.click(fire);
  await waitFor(() =>
    expect(axios.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ emoji: '🔥', active: false }),
    ),
  );
});

it('keeps counts unchanged on failure, prevents pending duplicates, and allows retry', async () => {
  let reject!: (reason: Error) => void;
  vi.mocked(axios.put).mockImplementationOnce(
    () =>
      new Promise((_resolve, rejectRequest) => {
        reject = rejectRequest;
      }),
  );
  const annotation = { ...comment, reactions: [{ emoji: '🔥', users: ['other'] }] };
  mount(annotation);
  const chip = screen.getByRole('button', { name: '🔥 1 reaction' });
  fireEvent.click(chip);
  fireEvent.click(chip);
  expect(chip).toBeDisabled();
  expect(axios.put).toHaveBeenCalledTimes(1);
  await act(async () => reject(new Error('offline')));
  expect(chip).toBeEnabled();
  expect(chip).toHaveAttribute('aria-pressed', 'false');
  expect(staticAntd.message.error).toHaveBeenCalled();
  vi.mocked(axios.put).mockResolvedValueOnce({ status: 200, data: { annotation } });
  fireEvent.click(chip);
  await waitFor(() => expect(axios.put).toHaveBeenCalledTimes(2));
});

it('allows reading counts but not reacting without a known current user', () => {
  mount({ ...comment, reactions: [{ emoji: '🔥', users: ['reader'] }] }, UNKNOWN_CREATOR);
  expect(screen.getByRole('button', { name: '🔥 1 reaction' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Add reaction' })).toBeDisabled();
  expect(axios.put).not.toHaveBeenCalled();
});
