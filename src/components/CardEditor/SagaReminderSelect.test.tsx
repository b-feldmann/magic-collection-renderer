import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';

import CardTextInput from './CardTextInput';
import SagaStepsInput from './SagaStepsInput';

// jsdom polyfills required by antd components.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = class {
    observe() {}

    unobserve() {}

    disconnect() {}
  };
}

const STANDARD_TEXT =
  '(As this Saga enters and after your draw step, add a lore counter. Sacrifice after III.)';
const WITHOUT_SACRIFICE = '(As this Saga enters and after your draw step, add a lore counter.)';

let current: string[] = [];

const Editor = ({ initial, mode }: { initial: string[]; mode: 'text' | 'steps' }) => {
  const [value, setValue] = useState(initial);
  current = value;
  const props = { id: 'saga', name: 'Card text', value, onChange: setValue };
  return mode === 'text' ? (
    <CardTextInput {...props} steps="saga" />
  ) : (
    <SagaStepsInput {...props} isCreature={false} documentKey="card" />
  );
};

const select = () => screen.getByRole('combobox', { name: 'Reminder text' });

const expectSelected = (label: string) =>
  expect(select().closest('.ant-select')).toHaveTextContent(label);

const choose = (label: string) => {
  fireEvent.mouseDown(select());
  const option = document.querySelector(`.ant-select-item-option[title="${label}"]`);
  fireEvent.click(option as Element);
};

describe.each(['text', 'steps'] as const)('reminder text dropdown (%s editor)', mode => {
  it('writes the chosen reminder text above the chapters, and removes it again', () => {
    render(<Editor initial={['I, II — Draw a card.', 'III — Scry 1.']} mode={mode} />);
    expectSelected('Standard');

    choose('Read ahead');
    expect(current).toEqual(['Read ahead', 'I, II — Draw a card.', 'III — Scry 1.']);
    expectSelected('Read ahead');

    choose('Without sacrifice');
    expect(current).toEqual([WITHOUT_SACRIFICE, 'I, II — Draw a card.', 'III — Scry 1.']);

    choose('Standard');
    expect(current).toEqual(['I, II — Draw a card.', 'III — Scry 1.']);
    expectSelected('Standard');
  });

  it('starts a custom reminder text from the standard one', () => {
    render(<Editor initial={['I, II — Draw a card.', 'III — Scry 1.']} mode={mode} />);

    choose('Custom');

    expect(current).toEqual([STANDARD_TEXT, 'I, II — Draw a card.', 'III — Scry 1.']);
    expectSelected('Custom');
  });

  it('recognizes the reminder text of a card', () => {
    const { unmount } = render(
      <Editor initial={['(Add lore counters as you like.)', 'I — A.']} mode={mode} />,
    );
    expectSelected('Custom');
    unmount();

    render(<Editor initial={['Read ahead', 'I — A.']} mode={mode} />);
    expectSelected('Read ahead');
  });
});

describe('reminder text dropdown in the text editor', () => {
  it('leaves the other lines as typed', () => {
    render(<Editor initial={['Exile a card.', '', 'I -- Draw a card.']} mode="text" />);

    choose('Read ahead');

    expect(current).toEqual(['Read ahead', 'Exile a card.', '', 'I -- Draw a card.']);
  });

  it('follows the reminder text as it is typed', () => {
    render(<Editor initial={['I — A.']} mode="text" />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Card text' }), {
      target: { value: 'Read ahead\nI — A.' },
    });
    expectSelected('Read ahead');
  });

  it('is only offered for Sagas', () => {
    render(<CardTextInput id="text" name="Card text" value={['I — A.']} onChange={() => {}} />);

    expect(screen.queryByRole('combobox', { name: 'Reminder text' })).toBeNull();
  });
});
