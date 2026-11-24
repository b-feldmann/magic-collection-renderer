import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';

import PlaneswalkerStepsInput from './PlaneswalkerStepsInput';

// jsdom polyfills required by antd components.
if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = class {
    observe() {}

    unobserve() {}

    disconnect() {}
  };
}

let current: string[] = [];

const Editor = ({ initial }: { initial: string[] }) => {
  const [value, setValue] = useState(initial);
  current = value;
  return (
    <>
      <PlaneswalkerStepsInput
        id="planeswalker"
        name="Card text"
        value={value}
        onChange={setValue}
        documentKey="card"
      />
      <button type="button" onClick={() => setValue(['+1: Replaced.'])}>
        Replace
      </button>
    </>
  );
};

const renderEditor = (initial: string[]) => {
  current = initial;
  return render(<Editor initial={initial} />);
};

const button = (name: string) => screen.getByRole('button', { name });
const click = (name: string) => fireEvent.click(button(name));
const field = (name: string) => screen.getByRole<HTMLTextAreaElement>('textbox', { name });
const type = (name: string, value: string) => fireEvent.change(field(name), { target: { value } });

describe('PlaneswalkerStepsInput', () => {
  it('shows the cost and the text of every ability', () => {
    renderEditor(['Flying', '+1: Draw a card.', '−X: Scry X.']);

    expect(field('Ability 1 (no loyalty cost)')).toHaveValue('Flying');
    expect(field('Ability 1: loyalty cost')).toHaveValue('');
    expect(field('Ability 2 (+1)')).toHaveValue('Draw a card.');
    expect(field('Ability 2: loyalty cost')).toHaveValue('+1');
    expect(field('Ability 3 (−X)')).toHaveValue('Scry X.');
  });

  it('writes edits as card text and leaves untouched text alone', () => {
    renderEditor(['+1|Draw a card.', '-2|Scry 1.', '|Flying']);
    expect(current).toEqual(['+1|Draw a card.', '-2|Scry 1.', '|Flying']);

    type('Ability 2 (−2)', 'Scry 2.');
    expect(current).toEqual(['+1: Draw a card.', '−2: Scry 2.', 'Flying']);
  });

  it('changes costs with the buttons and the arrow keys', () => {
    renderEditor(['+1: A.', '−X: B.']);

    click('Ability 1: less loyalty');
    expect(current).toEqual(['0: A.', '−X: B.']);
    fireEvent.keyDown(field('Ability 1: loyalty cost'), { key: 'ArrowDown' });
    expect(current).toEqual(['−1: A.', '−X: B.']);
    expect(button('Ability 2: more loyalty')).toBeDisabled();
  });

  it('completes a typed cost when it is left', () => {
    renderEditor(['+1: A.']);

    type('Ability 1: loyalty cost', '-3');
    expect(field('Ability 1: loyalty cost')).toHaveValue('−3');
    expect(current).toEqual(['−3: A.']);
    type('Ability 1: loyalty cost', '2');
    fireEvent.blur(field('Ability 1: loyalty cost'));
    expect(field('Ability 1: loyalty cost')).toHaveValue('+2');
    expect(current).toEqual(['+2: A.']);
    type('Ability 1: loyalty cost', '');
    expect(current).toEqual(['A.']);
  });

  it('goes from the cost to the text with Enter', () => {
    renderEditor(['+1: A.']);

    fireEvent.keyDown(field('Ability 1: loyalty cost'), { key: 'Enter' });

    expect(field('Ability 1 (+1)')).toHaveFocus();
  });

  it('moves and removes abilities', () => {
    renderEditor(['A.', '+1: B.', '−2: C.']);

    expect(button('Ability 1: move up')).toBeDisabled();
    expect(button('Ability 3: move down')).toBeDisabled();
    click('Ability 1: move down');
    expect(current).toEqual(['+1: B.', 'A.', '−2: C.']);
    click('Ability 2: remove');
    expect(current).toEqual(['+1: B.', '−2: C.']);
  });

  it('adds a loyalty ability at the end, and one without a cost at the start', () => {
    renderEditor([]);

    click('Add loyalty ability');
    expect(field('Ability 1 (+1)')).toHaveFocus();
    click('Add ability without cost');
    expect(field('Ability 1 (no loyalty cost)')).toHaveFocus();
    // It has no line of its own until it has text.
    expect(current).toEqual(['+1:']);
    type('Ability 1 (no loyalty cost)', 'Flying');
    click('Add loyalty ability');

    expect(current).toEqual(['Flying', '+1:', '−1:']);
  });

  it('adds up to four abilities', () => {
    renderEditor(['A.', '+1: B.', '−2: C.', '−7: D.']);

    expect(button('Add loyalty ability')).toBeDisabled();
    expect(button('Add ability without cost')).toBeDisabled();
    type('Ability 4 (−7)', 'D.\n');
    expect(current).toEqual(['A.', '+1: B.', '−2: C.', '−7: D.']);
    expect(screen.queryByRole('textbox', { name: /^Ability 5/ })).toBeNull();
  });

  it('starts another ability with Enter', () => {
    renderEditor(['+1: A.', '−2: C.']);

    type('Ability 1 (+1)', 'A.\n');
    expect(field('Ability 2 (no loyalty cost)')).toHaveFocus();
    expect(current).toEqual(['+1: A.', '−2: C.']);

    type('Ability 2 (no loyalty cost)', 'B.');
    expect(current).toEqual(['+1: A.', 'B.', '−2: C.']);
  });

  it('moves a cost typed into the text to the shield', () => {
    renderEditor(['+1:']);

    type('Ability 1 (+1)', '-3: Destroy target creature.');

    expect(current).toEqual(['−3: Destroy target creature.']);
  });

  it('turns pasted Oracle text into abilities', () => {
    renderEditor(['+1:', '−1:', '−7: Keep me.']);

    type('Ability 1 (+1)', 'Flying\n+2: Draw a card.\n\n−X: Scry X.\n');

    expect(current).toEqual(['Flying', '+2: Draw a card.', '−X: Scry X.', '−7: Keep me.']);
  });

  it('inserts symbols into the ability that had the focus last', () => {
    renderEditor(['+1: Add ', '−2: Add ']);
    const second = field('Ability 2 (−2)');
    fireEvent.focus(second);
    second.setSelectionRange(second.value.length, second.value.length);

    click('Generic');

    expect(current).toEqual(['+1: Add ', '−2: Add {1}']);
  });

  it('follows text that changes elsewhere', () => {
    renderEditor(['+1: A.', '−2: B.']);

    click('Replace');

    expect(field('Ability 1 (+1)')).toHaveValue('Replaced.');
    expect(screen.queryByRole('textbox', { name: /^Ability 2/ })).toBeNull();
  });
});
