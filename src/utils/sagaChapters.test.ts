import { describe, expect, it } from 'vitest';

import {
  addChapter,
  formatSagaDraft,
  parseChapterLine,
  parseSagaDraft,
  parseSagaText,
} from './sagaChapters';

describe('parseChapterLine', () => {
  it.each(['I, II — Draw a card.', 'I,II -- Draw a card.', ' I, II - Draw a card.'])(
    'reads the chapters of "%s"',
    line => {
      expect(parseChapterLine(line)).toMatchObject({ chapters: [1, 2], text: 'Draw a card.' });
    },
  );

  it.each([
    'Draw a card.',
    'IIII — Draw a card.',
    'I draw a card.',
    '- Draw a card.',
    '{X} — Win.',
  ])('finds no chapter in "%s"', line => {
    expect(parseChapterLine(line)).toBeNull();
  });
});

describe('parseSagaText', () => {
  it('splits the text into steps and adds reminder text with the last one', () => {
    const saga = parseSagaText(['I, II — Draw a card.', '', 'III, IV — You gain 2 life.']);

    expect(saga.steps).toEqual([
      { numerals: ['I', 'II'], lines: ['Draw a card.'] },
      { numerals: ['III', 'IV'], lines: ['You gain 2 life.'] },
    ]);
    expect(saga.reminder).toEqual([expect.stringContaining('Sacrifice after IV.')]);
  });

  it('uses the reminder text of pasted Oracle text, in italics', () => {
    const { reminder } = parseSagaText([
      'Read ahead (Choose a chapter and start with that many lore counters.)',
      'I — Draw a card.',
    ]);

    expect(reminder).toEqual([
      'Read ahead _(Choose a chapter and start with that many lore counters.)_',
    ]);
  });

  it('spells out Read ahead', () => {
    expect(parseSagaText(['Read ahead', 'I, II — Draw a card.']).reminder).toEqual([
      expect.stringMatching(/^Read ahead _\(Choose a chapter .* Sacrifice after II\.\)_$/),
    ]);
  });

  it('makes a line without a chapter a step of its own, wherever it stands', () => {
    const { reminder, steps } = parseSagaText([
      'As an additional cost to cast this spell, exile five cards.',
      'I — Choose one --',
      '* Draw a card.',
      '* Scry 2.',
      '-- Then scry 1.',
      'This Saga has hexproof.',
      'II — Draw a card.',
    ]);

    expect(steps).toEqual([
      { numerals: [], lines: ['As an additional cost to cast this spell, exile five cards.'] },
      {
        numerals: ['I'],
        lines: ['Choose one --', '* Draw a card.', '* Scry 2.', '-- Then scry 1.'],
      },
      { numerals: [], lines: ['This Saga has hexproof.'] },
      { numerals: ['II'], lines: ['Draw a card.'] },
    ]);
    expect(reminder).toEqual([expect.stringContaining('Sacrifice after II.')]);
  });

  it('only takes text in parentheses about lore counters for reminder text', () => {
    const { reminder, steps } = parseSagaText([
      'This Saga enters with two lore counters on it.',
      'I — Draw a card.',
    ]);

    expect(reminder).toEqual([expect.stringContaining('As this Saga enters')]);
    expect(steps[0]).toEqual({
      numerals: [],
      lines: ['This Saga enters with two lore counters on it.'],
    });
  });

  it("collects a creature's lines after the last chapter as its rules text", () => {
    const { steps, rules } = parseSagaText(
      [
        'Exile a card.',
        'I — Choose one --',
        '* Draw a card.',
        'II — Scry 2.',
        'Flying',
        'Choose one --',
        '* Scry 1.',
      ],
      true,
    );

    expect(steps).toEqual([
      { numerals: [], lines: ['Exile a card.'] },
      { numerals: ['I'], lines: ['Choose one --', '* Draw a card.'] },
      { numerals: ['II'], lines: ['Scry 2.'] },
    ]);
    expect(rules).toEqual(['Flying', 'Choose one --', '* Scry 1.']);
  });
});

describe('saga drafts', () => {
  it.each([
    [['I, II — Draw a card.', 'III — Scry 1.']],
    [['Exile a card.', 'I — Choose one --', '* Scry 1.', '* Draw a card.', '-- Indented.']],
    [['(Custom lore counter text.)', 'I — Draw a card.', 'Discard a card.']],
    [['Read ahead', 'I — Draw a card.']],
  ])('reads and writes %j unchanged', text => {
    expect(formatSagaDraft(parseSagaDraft(text, false))).toEqual(text);
  });

  it("keeps a creature's other abilities", () => {
    const text = ['Exile a card.', 'I — Scry 1.', 'Flying', 'Haste'];
    const draft = parseSagaDraft(text, true);

    expect(draft.rules).toBe('Flying\nHaste');
    expect(formatSagaDraft(draft)).toEqual(text);
  });

  it('numbers chapters by their order', () => {
    expect(formatSagaDraft(parseSagaDraft(['II, III — A.', 'B.', 'V — C.'], false))).toEqual([
      'I, II — A.',
      'B.',
      'III — C.',
    ]);
  });

  it('leaves out reminder text that is added anyway', () => {
    const reminder =
      '(As this Saga enters and after your draw step, add a lore counter. Sacrifice after I.)';
    expect(parseSagaDraft([reminder, 'I — A.'], false).reminder).toBe('');
    expect(
      parseSagaDraft([parseSagaText(['Read ahead', 'I — A.']).reminder[0], 'I — A.'], false)
        .reminder,
    ).toBe('Read ahead');
  });

  it('drops empty lines, but not empty chapters', () => {
    expect(
      formatSagaDraft({
        reminder: '',
        steps: [
          { chapterCount: 0, text: '' },
          { chapterCount: 1, text: '' },
          { chapterCount: 1, text: 'A.\n\n' },
        ],
        rules: '',
      }),
    ).toEqual(['I — ', 'II — A.']);
  });
});

describe('addChapter', () => {
  it('adds the next chapter after the last one and its options', () => {
    expect(addChapter(['I, II — Choose one --', '* Scry 1.', 'Flying'])).toEqual({
      lines: ['I, II — Choose one --', '* Scry 1.', 'III — ', 'Flying'],
      index: 2,
    });
  });

  it('starts with chapter I, in place of an empty line', () => {
    expect(addChapter([''])).toEqual({ lines: ['I — '], index: 0 });
  });
});
