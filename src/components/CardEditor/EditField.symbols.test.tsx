import React, { useState } from 'react';
import { ConfigProvider } from 'antd';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ColorType } from '../../interfaces/enums';
import EditField from './EditField';
import CardTextInput from './CardTextInput';

const device = vi.hoisted(() => ({ isMobile: false }));
vi.mock('react-device-detect', async importOriginal => ({
  ...(await importOriginal<typeof import('react-device-detect')>()),
  get isMobile() {
    return device.isMobile;
  },
}));

beforeEach(() => {
  device.isMobile = false;
});

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
  it('uses a single color identity for the Mana icon and inserted symbol', () => {
    const onChange = vi.fn();
    render(
      <ConfigProvider>
        <CardTextInput
          id="card-text"
          name="Card Text"
          value={[]}
          onChange={onChange}
          manaColors={[ColorType.Red]}
        />
      </ConfigProvider>,
    );

    const manaButton = screen.getByRole('button', { name: 'Mana' });
    expect(manaButton.querySelector('.ms-r')).toBeInTheDocument();
    fireEvent.click(manaButton);
    expect(onChange).toHaveBeenCalledWith(['{r}']);
  });

  it('shows a Mana button for each color and updates when identity changes', () => {
    const onChange = vi.fn();
    const renderInput = (manaColors: ColorType[]) => (
      <ConfigProvider>
        <CardTextInput
          id="card-text"
          name="Card Text"
          value={[]}
          onChange={onChange}
          manaColors={manaColors}
        />
      </ConfigProvider>
    );
    const { rerender } = render(renderInput([ColorType.Red]));

    rerender(renderInput([ColorType.Green, ColorType.White]));
    const whiteMana = screen.getByRole('button', { name: 'Mana white' });
    const greenMana = screen.getByRole('button', { name: 'Mana green' });
    expect(whiteMana.querySelector('.ms-w')).toBeInTheDocument();
    expect(greenMana.querySelector('.ms-g')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mana red' })).not.toBeInTheDocument();
    fireEvent.click(greenMana);
    expect(onChange).toHaveBeenCalledWith(['{g}']);
  });

  it('falls back to the blue Mana symbol when there is no color identity', () => {
    const onChange = vi.fn();
    render(
      <ConfigProvider>
        <CardTextInput id="card-text" name="Card Text" value={[]} onChange={onChange} />
      </ConfigProvider>,
    );

    const manaButton = screen.getByRole('button', { name: 'Mana' });
    expect(manaButton.querySelector('.ms-u')).toBeInTheDocument();
    fireEvent.click(manaButton);
    expect(onChange).toHaveBeenCalledWith(['{u}']);
  });

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

  it('keeps the symbol guide inside the symbol toolbar after the divider', () => {
    render(<Harness />);
    const toolbar = screen.getByRole('group', { name: 'Card Text symbols' });
    const guide = screen.getByRole('button', { name: 'Symbol guide' });
    const dividers = toolbar.querySelectorAll<HTMLSpanElement>('[class*="symbolToolbarDivider"]');
    expect(dividers).toHaveLength(3);
    expect(toolbar).toContainElement(dividers[2]);
    expect(toolbar).toContainElement(guide);
    expect(
      dividers[2].compareDocumentPosition(guide) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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

  it('opens the redesigned code guide without changing the card text', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Symbol guide' }));
    expect(await screen.findByRole('heading', { name: 'Symbol guide' })).toBeInTheDocument();
    expect(screen.getByText('{0} – {20}')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy Tap: {t}' }));
    expect(screen.getByRole('textbox', { name: 'Card Text' })).toHaveValue('');
    expect(screen.getByLabelText('Stored lines')).toHaveTextContent('[""]');
  });

  it('hides the guide link on mobile while retaining quick inserts and manual code entry', () => {
    device.isMobile = true;
    render(<Harness />);
    expect(screen.queryByRole('button', { name: 'Symbol guide' })).not.toBeInTheDocument();
    for (const name of ['Tap', 'Mana', 'Generic']) {
      fireEvent.click(screen.getByRole('button', { name }));
    }
    const textarea = screen.getByRole('textbox', { name: 'Card Text' });
    expect(textarea).toHaveValue('{t}{u}{1}');
    fireEvent.change(textarea, { target: { value: '{ut}' } });
    expect(screen.getByLabelText('Stored lines')).toHaveTextContent('["{ut}"]');
  });

  it('disables insertion and guide actions with the rest of the editor', () => {
    render(<Harness disabled />);
    for (const name of ['Tap', 'Mana', 'Generic', 'Symbol guide']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
