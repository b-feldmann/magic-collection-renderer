import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';

import SagaStepsInput from './SagaStepsInput';

// jsdom polyfills required by antd components.
if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = class {
    observe() {}

    unobserve() {}

    disconnect() {}
  };
}

let current: string[] = [];

const Editor = ({ initial, isCreature }: { initial: string[]; isCreature: boolean }) => {
  const [value, setValue] = useState(initial);
  current = value;
  return (
    <>
      <SagaStepsInput
        id="saga"
        name="Card text"
        value={value}
        onChange={setValue}
        isCreature={isCreature}
        documentKey="card"
      />
      <button type="button" onClick={() => setValue(['I — Replaced.'])}>
        Replace
      </button>
    </>
  );
};

const renderEditor = (initial: string[], isCreature = false) => {
  current = initial;
  return render(<Editor initial={initial} isCreature={isCreature} />);
};

const button = (name: string) => screen.getByRole('button', { name });
const click = (name: string) => fireEvent.click(button(name));
const field = (name: string | RegExp) => screen.getByRole('textbox', { name });
const type = (name: string | RegExp, value: string) =>
  fireEvent.change(field(name), { target: { value } });

describe('SagaStepsInput', () => {
  it('shows one field per step, without the chapter numbers', () => {
    renderEditor(['I, II — Draw a card.', 'Exile a card.', 'III — Scry 1.']);

    expect(field('Step 1 (I, II)')).toHaveValue('Draw a card.');
    expect(field('Step 2 (no chapter)')).toHaveValue('Exile a card.');
    expect(field('Step 3 (III)')).toHaveValue('Scry 1.');
  });

  it('writes edits as card text and leaves untouched text alone', () => {
    renderEditor(['I -- Draw a card.', 'II — Scry 1.']);
    expect(current).toEqual(['I -- Draw a card.', 'II — Scry 1.']);

    type('Step 2 (II)', 'Scry 2.');
    expect(current).toEqual(['I — Draw a card.', 'II — Scry 2.']);
  });

  it('renumbers the chapters when steps change', () => {
    renderEditor(['I — A.', 'II — B.', 'III — C.']);

    click('Step 1: more chapters');
    expect(current).toEqual(['I, II — A.', 'III — B.', 'IV — C.']);
    click('Step 3: move up');
    expect(current).toEqual(['I, II — A.', 'III — C.', 'IV — B.']);
    click('Step 2: remove');
    expect(current).toEqual(['I, II — A.', 'III — B.']);
    click('Step 2: fewer chapters');
    expect(current).toEqual(['I, II — A.', 'B.']);
  });

  it('adds a chapter at the end, and a step without one at the start', () => {
    renderEditor(['I — A.']);

    click('Add chapter');
    expect(field('Step 2 (II)')).toHaveFocus();
    type('Step 2 (II)', 'B.');
    click('Add step without chapter');
    expect(field('Step 1 (no chapter)')).toHaveFocus();
    type('Step 1 (no chapter)', 'Exile a card.');

    expect(current).toEqual(['Exile a card.', 'I — A.', 'II — B.']);
  });

  it('starts an option with Enter and makes further lines options', () => {
    renderEditor(['I — Choose one --']);
    const textarea = field('Step 1 (I)') as HTMLTextAreaElement;
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(textarea).toHaveValue('Choose one --\n* ');

    type('Step 1 (I)', 'Choose one --\n* Draw a card.\nScry 1.');
    expect(current).toEqual(['I — Choose one --', '* Draw a card.', '* Scry 1.']);
  });

  it('turns pasted Oracle text into steps', () => {
    renderEditor(['I — ', 'II — ', 'III — ']);

    type(
      'Step 1 (I)',
      [
        '(As this Saga enters and after your draw step, add a lore counter. Sacrifice after III.)',
        'As an additional cost to cast this spell, exile a card.',
        'I, II — Draw a card.',
        'III — Scry 2.',
      ].join('\n'),
    );

    // The pasted reminder text is the one that is added by itself.
    expect(current).toEqual([
      'As an additional cost to cast this spell, exile a card.',
      'I, II — Draw a card.',
      'III — Scry 2.',
    ]);
    expect(field('Step 2 (I, II)')).toHaveValue('Draw a card.');
  });

  it('inserts symbols into the step that had the focus last', () => {
    renderEditor(['I — Add ', 'II — Add ']);
    const second = field('Step 2 (II)') as HTMLTextAreaElement;
    fireEvent.focus(second);
    second.setSelectionRange(second.value.length, second.value.length);

    click('Generic');

    expect(current).toEqual(['I — Add ', 'II — Add {1}']);
  });

  it('follows text that changes elsewhere', () => {
    renderEditor(['I — A.', 'II — B.']);

    click('Replace');

    expect(field('Step 1 (I)')).toHaveValue('Replaced.');
    expect(screen.queryByRole('textbox', { name: 'Step 2 (II)' })).toBeNull();
  });

  it('keeps a custom reminder text', () => {
    renderEditor(['(Custom lore counter text.)', 'I — A.']);

    expect(field('Custom reminder text')).toHaveValue('(Custom lore counter text.)');
    type('Custom reminder text', '(Another lore counter text.)');
    expect(current).toEqual(['(Another lore counter text.)', 'I — A.']);
  });

  it("edits a creature's other abilities in a field of their own", () => {
    renderEditor(['I — A.', 'II — B.', 'Flying'], true);

    expect(field('Below the type line')).toHaveValue('Flying');
    type('Below the type line', 'Flying, haste');
    expect(current).toEqual(['I — A.', 'II — B.', 'Flying, haste']);
  });

  it("keeps a creature's last step a chapter", () => {
    renderEditor(['Exile a card.', 'I — A.', 'Flying'], true);

    expect(button('Step 1: move down')).toBeDisabled();
    expect(button('Step 2: fewer chapters')).toBeDisabled();

    click('Step 2: remove');
    expect(field('Below the type line')).toHaveValue('Exile a card.\nFlying');
  });

  it('offers no rules box to other Sagas', () => {
    renderEditor(['I — A.']);
    expect(screen.queryByRole('textbox', { name: 'Below the type line' })).toBeNull();
  });
});
