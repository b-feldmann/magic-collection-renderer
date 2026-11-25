import React, { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';

import EvolutionStepsInput from './EvolutionStepsInput';

// jsdom polyfills required by antd components.
if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = class {
    observe() {}

    unobserve() {}

    disconnect() {}
  };
}

type Face = Record<string, unknown>;

const ONE_LEVEL: Face = {
  cardText: ['Flying'],
  cardStats: '1/2',
  level1Indicator: '2+',
  level1Text: ['Trample', 'Haste'],
  level1Stats: '3/4',
  level2Indicator: '',
  level2Stats: '/',
};
const TWO_LEVELS: Face = {
  ...ONE_LEVEL,
  level1Indicator: '2-3',
  level2Indicator: '4+',
  level2Text: ['Vigilance'],
  level2Stats: '5/6',
};

let current: Face = {};

const Editor = ({ initial, hasStats }: { initial: Face; hasStats: boolean }) => {
  const [face, setFace] = useState(initial);
  const [documentKey, setDocumentKey] = useState('card-1');
  current = face;
  return (
    <>
      <EvolutionStepsInput
        id="evolution"
        name="Card text"
        getValue={key => face[key]}
        saveValue={(key, value) => setFace(previous => ({ ...previous, [key]: value }))}
        hasStats={hasStats}
        documentKey={documentKey}
        renderHints={fields => <output>{fields.join(' ')}</output>}
      />
      <button type="button" onClick={() => setDocumentKey('card-2')}>
        Other card
      </button>
    </>
  );
};

const renderEditor = (initial: Face, hasStats = true) =>
  render(<Editor initial={initial} hasStats={hasStats} />);

const button = (name: string) => screen.getByRole('button', { name });
const click = (name: string) => fireEvent.click(button(name));
const field = (name: string) => screen.getByRole('textbox', { name });
const queryField = (name: string) => screen.queryByRole('textbox', { name });
const type = (name: string, value: string) => fireEvent.change(field(name), { target: { value } });
const splits = () => screen.queryByRole('radiogroup', { name: 'Text heights' });

describe('EvolutionStepsInput', () => {
  it('shows the text, indicator and P/T of the base and every level', () => {
    renderEditor(TWO_LEVELS);

    expect(field('Base: text')).toHaveValue('Flying');
    expect(field('Base: power')).toHaveValue('1');
    expect(field('Base: toughness')).toHaveValue('2');
    expect(field('Level 1: indicator')).toHaveValue('2-3');
    expect(field('Level 1: text')).toHaveValue('Trample\nHaste');
    expect(field('Level 1: power')).toHaveValue('3');
    expect(field('Level 2: indicator')).toHaveValue('4+');
    expect(field('Level 2: text')).toHaveValue('Vigilance');
    expect(field('Level 2: toughness')).toHaveValue('6');
  });

  it('saves every field', () => {
    renderEditor(TWO_LEVELS);

    type('Base: text', 'Flying\nReach');
    type('Base: power', '*');
    type('Level 1: indicator', '2');
    type('Level 1: text', '');
    type('Level 2: text', 'Menace');
    type('Level 2: toughness', '9');

    expect(current).toEqual({
      ...TWO_LEVELS,
      cardText: ['Flying', 'Reach'],
      cardStats: '*/2',
      level1Indicator: '2',
      level1Text: [],
      level2Text: ['Menace'],
      level2Stats: '5/9',
    });
  });

  it('shows no P/T on a card without one', () => {
    renderEditor({ ...TWO_LEVELS, level2Indicator: '', level2Text: [] }, false);

    expect(queryField('Base: power')).toBeNull();
    expect(queryField('Level 1: power')).toBeNull();
    // Its leftover P/T doesn't make a second level either.
    expect(queryField('Level 2: text')).toBeNull();
  });

  it('adds a second level and keeps it while it is empty', () => {
    renderEditor(ONE_LEVEL);
    expect(queryField('Level 2: text')).toBeNull();

    click('Add level');
    expect(field('Level 2: indicator')).toHaveFocus();
    expect(button('Add level')).toBeDisabled();

    type('Level 2: text', 'Vigilance');
    expect(current.level2Text).toEqual(['Vigilance']);
    type('Level 2: text', '');
    expect(field('Level 2: text')).toHaveValue('');
  });

  it('does not carry an empty second level over to another card', () => {
    renderEditor(ONE_LEVEL);

    click('Add level');
    click('Other card');
    expect(queryField('Level 2: text')).toBeNull();
  });

  it('removes the second level', () => {
    renderEditor(TWO_LEVELS);

    click('Level 2: remove');
    expect(queryField('Level 2: text')).toBeNull();
    expect(current).toEqual({
      ...TWO_LEVELS,
      level2Indicator: '',
      level2Text: [],
      level2Stats: '',
    });
    expect(screen.queryByRole('button', { name: 'Level 1: remove' })).toBeNull();
  });

  it('moves the second level up when the first is removed', () => {
    renderEditor(TWO_LEVELS);

    click('Level 1: remove');
    expect(field('Level 1: indicator')).toHaveValue('4+');
    expect(field('Level 1: text')).toHaveValue('Vigilance');
    expect(field('Level 1: power')).toHaveValue('5');
    expect(queryField('Level 2: text')).toBeNull();
  });

  it('offers the height split only for a single level', () => {
    renderEditor(ONE_LEVEL);

    expect(within(splits()!).getByRole('radio', { name: 'Auto' })).toBeChecked();
    fireEvent.click(within(splits()!).getByRole('radio', { name: '1/2' }));
    expect(current.levelSplit).toBe('1/2');
    expect(within(splits()!).getByRole('radio', { name: '1/2' })).toBeChecked();

    click('Add level');
    expect(splits()).toBeNull();
    click('Level 2: remove');
    expect(within(splits()!).getByRole('radio', { name: '1/2' })).toBeChecked();
  });

  it('inserts symbols into the text focused last', () => {
    renderEditor(ONE_LEVEL);

    fireEvent.focus(field('Level 1: text'));
    (field('Level 1: text') as HTMLTextAreaElement).setSelectionRange(0, 7);
    fireEvent.click(screen.getByRole('button', { name: /tap/i }));
    expect(current.level1Text).toEqual(['{t}', 'Haste']);
  });

  it('shows the hints of every step', () => {
    renderEditor(ONE_LEVEL);

    expect(screen.getAllByRole('status').map(hint => hint.textContent)).toEqual([
      'cardText cardStats',
      'level1Indicator level1Text level1Stats',
    ]);
  });
});
