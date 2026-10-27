import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, expect, it, vi } from 'vitest';
import AnnotationEditor from './AnnotationEditor';
import {
  pasteCommentText,
  prepareCommentInputTests,
  selectCommentRange,
} from './emojiCommentInput.testUtils';

beforeAll(prepareCommentInputTests);

vi.mock('./AnnotationEmojiPicker', () => ({
  default: ({ onEmojiSelect }: { onEmojiSelect: (emoji: { native: string }) => void }) => (
    <button onClick={() => onEmojiSelect({ native: '🔥' })}>Choose fire emoji</button>
  ),
}));

it('opens the comment picker on the left and replaces the remembered text selection', async () => {
  const onSubmit = vi.fn().mockResolvedValue(false);
  render(<AnnotationEditor defaultContent="Hello world" submitting={false} onSubmit={onSubmit} />);
  const field = screen.getByRole('textbox', { name: 'Your comment' });
  await selectCommentRange(field, 6, 11);
  const trigger = screen.getByRole('button', { name: 'Add emoji to comment' });
  trigger.focus();
  fireEvent.click(trigger);
  const choose = await screen.findByRole('button', { name: 'Choose fire emoji' });
  await waitFor(() =>
    expect(choose.closest('.ant-popover')).toHaveClass('ant-popover-placement-left'),
  );
  fireEvent.click(choose);
  await waitFor(() => expect(field.textContent).toBe('Hello 🔥'));
  expect(field.querySelector('[data-google-emoji]')).not.toBeNull();
  expect(field).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('Hello 🔥', expect.any(Object)));
});

it('does not erase edits made while a successful submission is pending', async () => {
  let resolve!: (value: boolean) => void;
  const onSubmit = vi.fn(() => new Promise<boolean>(respond => (resolve = respond)));
  render(<AnnotationEditor defaultContent="First 🔥" submitting={false} onSubmit={onSubmit} />);
  const field = screen.getByRole('textbox', { name: 'Your comment' });
  fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }));
  await selectCommentRange(field, 'First 🔥'.length);
  await pasteCommentText(field, ' more');
  await act(async () => resolve(true));
  expect(field.textContent).toBe('First 🔥 more');
  expect(onSubmit).toHaveBeenCalledWith('First 🔥', expect.any(Object));
});

it('clears an unchanged submitted draft without allowing undo to recover it', async () => {
  const onSubmit = vi.fn().mockResolvedValue(true);
  render(<AnnotationEditor defaultContent="First 🔥" submitting={false} onSubmit={onSubmit} />);
  const field = screen.getByRole('textbox', { name: 'Your comment' });
  fireEvent.click(screen.getByRole('button', { name: 'Add Comment' }));
  await waitFor(() => expect(field.textContent).toBe(''));
  await selectCommentRange(field, 0);
  await act(async () => fireEvent.keyDown(field, { key: 'z', code: 'KeyZ', ctrlKey: true }));
  expect(field.textContent).toBe('');
});
