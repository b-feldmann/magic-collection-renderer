import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import axios from 'axios';
import Annotation from './Annotation';
import { Store } from '../../store';
import { UNKNOWN_CREATOR } from '../../utils/constants';
import AnnotationInterface from '../../interfaces/AnnotationInterface';
import styles from './Annotations.module.scss';

vi.mock('axios', () => ({ default: { put: vi.fn() } }));
vi.mock('../../utils/staticAntd', () => ({ staticAntd: { message: { error: vi.fn() } } }));

globalThis.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof globalThis.matchMedia;

globalThis.IntersectionObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof IntersectionObserver;

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const reader = { ...UNKNOWN_CREATOR, uuid: 'reader', name: 'Reader' };
const annotation = {
  uuid: 'comment-1',
  cardReference: 'card-1',
  content: 'Hello',
  author: 'reader',
  datetime: 123,
  edited: false,
};
const mount = (comment: AnnotationInterface = annotation) =>
  render(
    <Store.Provider
      value={{
        cards: [],
        mechanics: [],
        user: [reader],
        currentUser: reader,
        annotationAccessor: {},
        dispatch: vi.fn(),
      }}
    >
      <Annotation annotation={comment} />
    </Store.Provider>,
  );

beforeEach(() => vi.clearAllMocks());

it('focuses the real picker search on opening and restores the trigger on Escape', async () => {
  mount();
  const trigger = screen.getByRole('button', { name: 'Add reaction' });
  trigger.focus();
  // jsdom does not synthesize the native button click from Enter.
  fireEvent.click(trigger);
  const picker = await waitFor(() => {
    const element = document.querySelector('em-emoji-picker') as HTMLElement | null;
    if (!element?.shadowRoot) throw new Error('Picker shadow root is not ready');
    return element;
  });
  const search = picker.shadowRoot?.querySelector('input') as HTMLInputElement;
  expect(picker.closest('.ant-popover')).toHaveClass(styles.emojiPopover);
  expect(search).toBeInTheDocument();
  await waitFor(() => expect(picker.shadowRoot?.activeElement).toBe(search));
  await act(async () => {
    search.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }),
    );
  });
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

it.each([false, true])(
  'restores keyboard focus after a completed save (failure=%s)',
  async fail => {
    let finish!: () => void;
    vi.mocked(axios.put).mockImplementationOnce(
      () =>
        new Promise((resolve, reject) => {
          finish = () =>
            fail
              ? reject(new Error('offline'))
              : resolve({
                  status: 200,
                  data: {
                    annotation: { ...annotation, reactions: [] },
                  },
                });
        }),
    );
    mount({ ...annotation, reactions: [{ emoji: '😂', users: ['reader'] }] });
    const trigger = screen.getByRole('button', { name: 'Add reaction' });
    const emoji = screen.getByRole('button', { name: '😂 1 reaction' });
    emoji.focus();
    fireEvent.click(emoji);
    expect(trigger).toBeDisabled();
    expect(screen.getByLabelText('Comment reactions')).toHaveFocus();
    await act(async () => finish());
    await waitFor(() => expect(trigger).toBeEnabled());
    expect(trigger).toHaveFocus();
  },
);
