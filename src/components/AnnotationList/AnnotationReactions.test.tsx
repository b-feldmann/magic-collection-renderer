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
vi.mock('@emoji-mart/react', () => ({
  default: ({ onEmojiSelect }: { onEmojiSelect: (emoji: { native: string }) => void }) => (
    <button onClick={() => onEmojiSelect({ native: '🔥' })}>Choose fire emoji</button>
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

it('renders inline comment emoji with Google icons while preserving text, mana and line breaks', () => {
  const { container } = mount({ ...comment, content: 'Hello 🔥{W}\n👍🏽 world' });
  const fire = screen.getByRole('img', { name: '🔥' });
  const thumb = screen.getByRole('img', { name: '👍🏽' });

  expect(fire.style.backgroundImage).toContain('/google/sheets-256/64.png');
  expect(fire).toHaveStyle({ backgroundPosition: '50% 3.3333333333333335%' });
  expect(thumb).toHaveStyle({ backgroundPosition: '20% 90%' });
  const content = container.querySelector('.mcr-comment-content');
  expect(content).toHaveTextContent('Hello 🔥👍🏽 world');
  expect(content?.querySelector('br')).not.toBeNull();
  expect(content?.querySelector('.ms-w')).not.toBeNull();
});

it('renders joined emoji as one icon and leaves unknown emoji and HTML as plain text', () => {
  const { container } = mount({ ...comment, content: '👨‍👩‍👧‍👦 🫩 <script>hello</script>' });

  expect(screen.getAllByRole('img')).toHaveLength(1);
  expect(screen.getByRole('img', { name: '👨‍👩‍👧‍👦' })).toBeInTheDocument();
  const content = container.querySelector('.mcr-comment-content');
  expect(content).toHaveTextContent('👨‍👩‍👧‍👦 🫩 <script>hello</script>');
  expect(content?.querySelector('script')).toBeNull();
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

it.each([
  ['🔥', '50% 3.3333333333333335%'],
  ['👍🏽', '20% 90%'],
])('renders reaction %s from the bundled Google spritesheet', (emoji, position) => {
  mount({ ...comment, reactions: [{ emoji, users: ['reader'] }] });
  const badge = screen.getByRole('button', { name: `${emoji} 1 reaction` });
  const icon = badge.querySelector<HTMLElement>('[aria-hidden="true"]');

  expect(icon?.style.backgroundImage).toContain('/google/sheets-256/64.png');
  expect(icon).toHaveStyle({
    backgroundPosition: position,
    backgroundSize: '6100% 6100%',
  });
  expect(icon?.textContent).toBe('');
});

it('keeps unsupported reaction emoji readable as text', () => {
  mount({ ...comment, reactions: [{ emoji: 'not-an-emoji', users: ['reader'] }] });
  const badge = screen.getByRole('button', { name: 'not-an-emoji 1 reaction' });
  expect(badge).toHaveTextContent('not-an-emoji');
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
