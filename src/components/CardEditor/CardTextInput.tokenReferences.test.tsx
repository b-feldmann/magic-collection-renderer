import React, { useState } from 'react';
import { ConfigProvider } from 'antd';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CardInterface from '../../interfaces/CardInterface';
import { CardType, ColorType } from '../../interfaces/enums';
import { TokenCardsContext } from '../../store';
import { getTokenCardFaces } from '../../utils/tokenLinks';
import CardTextInput from './CardTextInput';

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

const rogue = (uuid: string, color: ColorType, cardText: string[]) =>
  ({
    uuid,
    name: 'Rogue',
    front: {
      name: 'Rogue',
      cardTypes: [CardType.Token, CardType.Creature],
      cardSubTypes: 'Rogue',
      cardStats: '1/1',
      tokenColors: [color],
      cardText,
    },
  }) as unknown as CardInterface;

const tokenCards = getTokenCardFaces([
  rogue('blue', ColorType.Blue, ['Whenever this creature becomes tapped, surveil 1.']),
  rogue('red', ColorType.Red, []),
  {
    uuid: 'treasure',
    name: 'Treasure',
    front: {
      name: 'Treasure',
      cardTypes: [CardType.Token, CardType.Artifact],
      cardSubTypes: 'Treasure',
      cardText: ['{t}, Sacrifice this token: Add one mana of any color.'],
    },
  } as unknown as CardInterface,
]);

function Harness({ initial = '' }: { initial?: string }) {
  const [lines, setLines] = useState([initial]);
  return (
    <ConfigProvider>
      <TokenCardsContext.Provider value={tokenCards}>
        <CardTextInput id="card-text" name="Card text" value={lines} onChange={setLines} />
      </TokenCardsContext.Provider>
    </ConfigProvider>
  );
}

const textbox = () => screen.getByRole('textbox', { name: 'Card text' }) as HTMLTextAreaElement;
const type = (value: string) => {
  const textarea = textbox();
  textarea.focus();
  fireEvent.change(textarea, { target: { value } });
};
const list = () => screen.queryByRole('listbox', { name: 'Token cards' });

describe('Card text token reference autocomplete', () => {
  it('lists the token cards that fit what is typed after "[Token:"', () => {
    render(<Harness />);
    expect(list()).toBeNull();
    type('Create [Token: rogue');
    const options = within(list()!).getAllByRole('option');
    expect(options.map(option => option.textContent)).toEqual([
      expect.stringContaining('1/1 blue Rogue'),
      expect.stringContaining('1/1 red Rogue'),
    ]);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(textbox()).toHaveAttribute('aria-controls', list()!.id);
    expect(textbox()).toHaveAttribute('aria-activedescendant', options[0].id);
  });

  it('finds token cards by their abilities', () => {
    render(<Harness />);
    type('Create [Token: surveil');
    expect(within(list()!).getAllByRole('option')).toHaveLength(1);
  });

  it('inserts the reference with the keyboard', () => {
    render(<Harness />);
    type('Create [Token: rogue');
    fireEvent.keyDown(textbox(), { key: 'ArrowDown' });
    fireEvent.keyDown(textbox(), { key: 'Enter' });
    expect(textbox()).toHaveValue('Create [Token: 1/1 red Rogue]');
    expect(list()).toBeNull();
    expect(textbox().selectionStart).toBe('Create [Token: 1/1 red Rogue]'.length);
  });

  it('inserts the reference on click and keeps the text after it', () => {
    render(<Harness initial="Create [Token: tre]." />);
    const textarea = textbox();
    textarea.focus();
    textarea.setSelectionRange(18, 18);
    fireEvent.select(textarea);
    fireEvent.click(within(list()!).getByRole('option'));
    expect(textbox()).toHaveValue('Create [Token: Treasure].');
  });

  it('closes the list with Escape', () => {
    render(<Harness />);
    type('Create [Token: rogue');
    fireEvent.keyDown(textbox(), { key: 'Escape' });
    expect(list()).toBeNull();
    expect(textbox()).not.toHaveAttribute('aria-activedescendant');
  });

  it('starts a reference from the toolbar', () => {
    render(<Harness initial="Create " />);
    const textarea = textbox();
    textarea.focus();
    textarea.setSelectionRange(7, 7);
    fireEvent.click(screen.getByRole('button', { name: 'Token' }));
    expect(textbox()).toHaveValue('Create [Token: ');
    expect(within(list()!).getAllByRole('option')).toHaveLength(3);
  });
});
