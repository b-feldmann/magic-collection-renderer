import React, { createRef, useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, expect, it, vi } from 'vitest';
import EmojiCommentInput, { EmojiCommentInputHandle } from './EmojiCommentInput';
import {
  pasteCommentText,
  prepareCommentInputTests,
  selectCommentRange,
} from './emojiCommentInput.testUtils';

beforeAll(prepareCommentInputTests);

const mount = (initial = '') => {
  const onChange = vi.fn();
  const ref = createRef<EmojiCommentInputHandle>();
  const Harness = () => {
    const [value, setValue] = useState(initial);
    return (
      <EmojiCommentInput
        ref={ref}
        value={value}
        onChange={text => {
          onChange(text);
          setValue(text);
        }}
      />
    );
  };
  render(<Harness />);
  return { field: screen.getByRole('textbox', { name: 'Your comment' }), onChange, ref };
};

it('edits Unicode text while displaying the bundled Google sprites', async () => {
  const { field, onChange } = mount();
  await selectCommentRange(field, 0);
  await pasteCommentText(field, 'Hello 🔥');
  await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('Hello 🔥'));
  const icon = field.querySelector<HTMLElement>('[data-google-emoji]');
  expect(icon?.style.backgroundImage).toContain('/google/sheets-256/64.png');
  expect(icon).toHaveStyle({ backgroundPosition: '50% 3.3333333333333335%' });
  expect(field).toHaveTextContent('Hello 🔥');
});

it('converts emoji entered through a native text input event', async () => {
  const { field, onChange } = mount('Hello ');
  await selectCommentRange(field, 6);
  await act(async () => {
    const text = field.querySelector('[data-lexical-text]')!.firstChild as Text;
    text.data += '🔥';
    window.getSelection()!.collapse(text, text.length);
    fireEvent.input(field, { data: '🔥', inputType: 'insertText' });
  });
  await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('Hello 🔥'));
  expect(field.querySelectorAll('[data-google-emoji]')).toHaveLength(1);
});

it('does not replace composing text until composition ends', async () => {
  const { field, onChange } = mount('Hello ');
  await selectCommentRange(field, 6);
  await act(async () => fireEvent.compositionStart(field));
  await act(async () => {
    const text = window.getSelection()!.anchorNode as Text;
    text.data = 'Hello 🔥';
    window.getSelection()!.collapse(text, text.length);
    fireEvent.input(field, { data: '🔥', inputType: 'insertCompositionText', isComposing: true });
  });
  expect(field.querySelector('[data-google-emoji]')).toBeNull();
  await act(async () => fireEvent.compositionEnd(field, { data: '🔥' }));
  await waitFor(() => expect(field.querySelectorAll('[data-google-emoji]')).toHaveLength(1));
  expect(onChange).toHaveBeenLastCalledWith('Hello 🔥');
});

it('deletes a complete emoji forwards without deleting adjacent text', async () => {
  const { field, onChange } = mount('👍🏽 tail');
  await selectCommentRange(field, 0);
  await act(async () => fireEvent.keyDown(field, { key: 'Delete', code: 'Delete' }));
  await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(' tail'));
});

it.each(['👍🏽', '👨‍👩‍👧‍👦', '🇩🇪', '1️⃣'])('keeps %s as one editable Google emoji', async emoji => {
  const { field } = mount(emoji);
  await waitFor(() => expect(field.querySelectorAll('[data-google-emoji]')).toHaveLength(1));
  expect(field.textContent).toBe(emoji);
  await selectCommentRange(field, emoji.length);
  await act(async () => fireEvent.keyDown(field, { key: 'Backspace', code: 'Backspace' }));
  await waitFor(() => expect(field.textContent).toBe(''));
});

it('inserts the picked emoji at the remembered selection and retains focus', async () => {
  const { field, ref, onChange } = mount('Hello world');
  await selectCommentRange(field, 6, 11);
  field.blur();
  await act(async () => ref.current!.insertEmoji('🔥'));
  await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('Hello 🔥'));
  expect(field).toHaveFocus();
  await pasteCommentText(field, '!');
  expect(field.textContent).toBe('Hello 🔥!');
});

it('keeps unknown emoji, mana tokens and pasted HTML literal, with multiline Unicode output', async () => {
  const { field, onChange } = mount();
  await selectCommentRange(field, 0);
  await pasteCommentText(field, '🫩 {W}\n<script>hello</script> 🔥');
  await waitFor(() =>
    expect(onChange).toHaveBeenLastCalledWith('🫩 {W}\n<script>hello</script> 🔥'),
  );
  expect(field.querySelectorAll('[data-google-emoji]')).toHaveLength(1);
  expect(field.querySelector('script')).toBeNull();
  expect(field.querySelector('b')).toBeNull();
});

it('copies and cuts emoji as plain Unicode, not sprite markup', async () => {
  const { field, onChange } = mount('A 🔥 B');
  await selectCommentRange(field, 2, 4);
  const setData = vi.fn();
  const clipboardData = { setData } as unknown as DataTransfer;
  await act(async () =>
    fireEvent(
      field,
      new ClipboardEvent('copy', { bubbles: true, cancelable: true, clipboardData }),
    ),
  );
  expect(setData).toHaveBeenCalledWith('text/plain', '🔥');
  await act(async () =>
    fireEvent(field, new ClipboardEvent('cut', { bubbles: true, cancelable: true, clipboardData })),
  );
  await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('A  B'));
});

it('undoes and redoes picker insertion without corrupting emoji', async () => {
  const { field, ref } = mount('Hello');
  await selectCommentRange(field, 5);
  await act(async () => ref.current!.insertEmoji('👍🏽'));
  expect(field.textContent).toBe('Hello👍🏽');
  await act(async () => fireEvent.keyDown(field, { key: 'z', code: 'KeyZ', ctrlKey: true }));
  await waitFor(() => expect(field.textContent).toBe('Hello'));
  await act(async () =>
    fireEvent.keyDown(field, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }),
  );
  await waitFor(() => expect(field.textContent).toBe('Hello👍🏽'));
});

it('clears an external value reset without reporting a user edit', async () => {
  const onChange = vi.fn();
  const { rerender } = render(<EmojiCommentInput value="Hello 🔥" onChange={onChange} />);
  const field = screen.getByRole('textbox', { name: 'Your comment' });
  await waitFor(() => expect(field).toHaveTextContent('Hello 🔥'));
  rerender(<EmojiCommentInput value="" onChange={onChange} />);
  await waitFor(() => expect(field.textContent).toBe(''));
  expect(onChange).not.toHaveBeenCalled();
});
