import React, { useState } from 'react';
import { ConfigProvider } from 'antd';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EditField from './EditField';

if (!window.matchMedia) {
  window.matchMedia = (media: string) => ({
    matches: false,
    media,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  });
}
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

function Harness({ initial = [''], disabled = false }: { initial?: string[]; disabled?: boolean }) {
  const [lines, setLines] = useState(initial);
  return (
    <ConfigProvider componentDisabled={disabled}>
      <EditField
        fieldKey="cardText"
        name="Card Text"
        type="text-list"
        getValue={() => lines}
        saveValue={(_key, value) => setLines(value)}
      />
      <output aria-label="Stored lines">{JSON.stringify(lines)}</output>
    </ConfigProvider>
  );
}

describe('Card Text symbol toolbar', () => {
  it.each([
    ['Tap', '{t}'],
    ['Mana', '{u}'],
    ['Generic', '{1}'],
  ])('inserts %s using the stored symbol syntax', (button, symbol) => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: button }));
    expect(screen.getByRole('textbox', { name: 'Card Text' })).toHaveValue(symbol);
    expect(screen.getByLabelText('Stored lines')).toHaveTextContent(JSON.stringify([symbol]));
  });

  it('replaces the selection and returns focus and caret for consecutive inserts', () => {
    render(<Harness initial={['Gain life.']} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(5, 9);
    const tap = screen.getByRole('button', { name: 'Tap' });
    tap.focus();
    fireEvent.click(tap);
    expect(textarea).toHaveValue('Gain {t}.');
    expect(textarea).toHaveFocus();
    expect(textarea.selectionStart).toBe(8);
    expect(textarea.selectionEnd).toBe(8);
    fireEvent.click(screen.getByRole('button', { name: 'Generic' }));
    expect(textarea).toHaveValue('Gain {t}{1}.');
    expect(textarea.selectionStart).toBe(11);
  });

  it('preserves blank and trailing lines when inserting in multiline text', () => {
    render(<Harness initial={['First', '', 'Second', '']} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    textarea.setSelectionRange(7, 7);
    fireEvent.click(screen.getByRole('button', { name: 'Mana' }));
    expect(screen.getByLabelText('Stored lines')).toHaveTextContent(
      JSON.stringify(['First', '', '{u}Second', '']),
    );
  });

  it('restores the caret even when a selected symbol is replaced by itself', () => {
    render(<Harness initial={['{t}']} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 3);
    fireEvent.click(screen.getByRole('button', { name: 'Tap' }));
    expect(textarea).toHaveFocus();
    expect(textarea.selectionStart).toBe(3);
    expect(textarea.selectionEnd).toBe(3);
  });

  it('opens the existing code guide from an explicitly named button', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Symbol guide' }));
    expect(await screen.findByText('Icon & Mechanic Codes')).toBeInTheDocument();
    expect(screen.getByText('{0} - {20}')).toBeInTheDocument();
  });

  it('disables insertion and guide actions with the rest of the editor', () => {
    render(<Harness disabled />);
    for (const name of ['Tap', 'Mana', 'Generic', 'Symbol guide']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
