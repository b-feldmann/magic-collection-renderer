import { isBulletText } from './injectUtils';

const ROMAN_NUMERALS =
  'I II III IV V VI VII VIII IX X XI XII XIII XIV XV XVI XVII XVIII XIX XX'.split(' ');

export const toRomanNumeral = (value: number): string => ROMAN_NUMERALS[value - 1] ?? String(value);

const fromRomanNumeral = (numeral: string): number => ROMAN_NUMERALS.indexOf(numeral) + 1;

// "I — ", "I, II -- ", "III-": the chapters an ability belongs to, as Oracle text writes them.
const CHAPTER_PREFIX = /^\s*([IVX]+(?:\s*,\s*[IVX]+)*)\s*(?:—|–|--?)\s*/;

export interface ChapterLine {
  /** The chapters as typed, including the dash. */
  prefix: string;
  chapters: number[];
  text: string;
}

/** The chapters and the ability of a line like "I, II — Draw a card.", or null without chapters. */
export const parseChapterLine = (line: string): ChapterLine | null => {
  const match = CHAPTER_PREFIX.exec(line);
  if (!match) return null;
  const chapters = match[1].split(',').map(numeral => fromRomanNumeral(numeral.trim()));
  if (chapters.includes(0)) return null;
  return { prefix: match[0], chapters, text: line.slice(match[0].length) };
};

/** The chapters of every chapter line in the text, in text order. */
export const getChapters = (lines: string[]): number[] =>
  lines.flatMap(line => parseChapterLine(line)?.chapters ?? []);

export const chapterPrefix = (chapters: number[]): string =>
  `${chapters.map(toRomanNumeral).join(', ')} — `;

// Bullets and indented lines ("-- text") belong to the line they follow.
const continuesLine = (line: string) => isBulletText(line) || line.trimStart().startsWith('--');

/** The text a new Saga starts with. */
export const EMPTY_SAGA_TEXT = [1, 2, 3].map(chapter => chapterPrefix([chapter]));

/**
 * The text with one more chapter after its last one (and the options of that, if it is modal),
 * and the index of the new line.
 */
export const addChapter = (lines: string[]): { lines: string[]; index: number } => {
  const prefix = chapterPrefix([Math.max(0, ...getChapters(lines)) + 1]);
  const afterLast = (matches: (line: string) => boolean) =>
    lines.reduce((after, line, i) => (matches(line) ? i + 1 : after), 0);
  let index = afterLast(line => parseChapterLine(line) !== null);
  if (index > 0) {
    while (index < lines.length && continuesLine(lines[index])) index += 1;
  } else {
    // Without a chapter it follows the text.
    index = afterLast(line => line.trim() !== '');
  }
  // It takes the place of an empty line.
  const replaced = index < lines.length && !lines[index].trim() ? 1 : 0;
  return { lines: [...lines.slice(0, index), prefix, ...lines.slice(index + replaced)], index };
};

const lastChapterNumeral = (chapters: number[]): string =>
  toRomanNumeral(chapters.length ? Math.max(...chapters) : EMPTY_SAGA_TEXT.length);

/** The reminder text a Saga with these chapters gets by itself. */
export const getReminder = (chapters: number[]): string =>
  `_(As this Saga enters and after your draw step, add a lore counter. Sacrifice after ${lastChapterNumeral(chapters)}.)_`;

/** The ability that replaces the reminder text; its own is added by itself. */
export const READ_AHEAD = 'Read ahead';

const getReadAhead = (chapters: number[]): string =>
  `${READ_AHEAD} _(Choose a chapter and start with that many lore counters. Add one after your draw step. Skipped chapters don't trigger. Sacrifice after ${lastChapterNumeral(chapters)}.)_`;

/** The reminder text of a Saga that leaves by its last ability, e.g. to return transformed. */
export const REMINDER_WITHOUT_SACRIFICE =
  '(As this Saga enters and after your draw step, add a lore counter.)';

// Text that explains how lore counters work, which replaces the generated reminder text.
const REMINDER = /^\W*read ahead\b|^[_*\s]*\(.*lore counter/i;

export const isReminderLine = (line: string): boolean => REMINDER.test(line);

// Reminder text is set in italics, also when pasted from Oracle text.
const italicizeReminder = (line: string) =>
  line.includes('_') ? line : line.replace(/\([^()]*\)/g, reminder => `_${reminder}_`);

interface SagaParts {
  reminder: string[];
  steps: { chapters: number[]; lines: string[] }[];
  rules: string[];
}

/**
 * Splits a Saga's card text into its parts. Every line is a step of its own, with or without
 * chapters (Greatest Show in the Multiverse, UNF), and bullets and indented lines belong to the
 * line they follow. On a creature, the lines after the last chapter are the abilities in the box
 * below its type line.
 */
const splitSagaText = (cardText: string[], isCreature: boolean): SagaParts => {
  const lines = cardText.filter(line => line.trim());
  const lastChapter = lines.reduce((last, line, i) => (parseChapterLine(line) ? i : last), -1);
  const parts: SagaParts = { reminder: [], steps: [], rules: [] };
  // Where the lines that continue one go.
  let current: string[] | undefined;

  lines.forEach((line, i) => {
    const chapter = parseChapterLine(line);
    if (!chapter && !parts.steps.length && isReminderLine(line)) {
      parts.reminder.push(line);
    } else if (!chapter && current && continuesLine(line)) {
      current.push(line);
    } else if (isCreature && i > lastChapter) {
      parts.rules.push(line);
      current = parts.rules;
    } else {
      current = [chapter?.text ?? line];
      parts.steps.push({ chapters: chapter?.chapters ?? [], lines: current });
    }
  });
  return parts;
};

export interface SagaStep {
  /** Empty for an ability that belongs to no chapter. */
  numerals: string[];
  lines: string[];
}

export interface SagaText {
  /** How lore counters work, above the steps. */
  reminder: string[];
  steps: SagaStep[];
  /** A Saga creature's other abilities, in the box below its type line. */
  rules: string[];
}

/** The parts of a Saga's card text as the card shows them (see splitSagaText). */
export const parseSagaText = (cardText: string[], isCreature = false): SagaText => {
  const { reminder, steps, rules } = splitSagaText(cardText, isCreature);
  const chapters = getChapters(cardText);
  return {
    reminder: reminder.length
      ? reminder.map(line =>
          line.trim() === READ_AHEAD ? getReadAhead(chapters) : italicizeReminder(line),
        )
      : [getReminder(chapters)],
    steps: steps.map(step => ({ numerals: step.chapters.map(toRomanNumeral), lines: step.lines })),
    rules,
  };
};

/** The most chapters a Saga may have. */
export const MAX_CHAPTERS = ROMAN_NUMERALS.length;

export interface SagaDraftStep {
  /** How many chapters share the step; 0 for one without a number. */
  chapterCount: number;
  text: string;
}

/** A Saga's card text as the step editor edits it. Chapters are numbered by their order. */
export interface SagaDraft {
  /** Empty for the reminder text that is added by itself. */
  reminder: string;
  steps: SagaDraftStep[];
  rules: string;
}

export const parseSagaDraft = (cardText: string[], isCreature: boolean): SagaDraft => {
  const { reminder, steps, rules } = splitSagaText(cardText, isCreature);
  const chapters = getChapters(cardText);
  const plain = (text: string) => text.replace(/_/g, '').trim();
  // Spelled-out text that would be added anyway follows the chapters from now on.
  let typedReminder = reminder.join('\n');
  if (plain(typedReminder) === plain(getReminder(chapters))) typedReminder = '';
  if (plain(typedReminder) === plain(getReadAhead(chapters))) typedReminder = READ_AHEAD;
  return {
    reminder: typedReminder,
    steps: steps.map(({ chapters, lines }) => ({
      chapterCount: chapters.length,
      text: lines.join('\n'),
    })),
    rules: rules.join('\n'),
  };
};

// The reminder text at the top of the card text, and the lines after it.
const splitReminder = (cardText: string[]): { reminder: string[]; rest: string[] } => {
  const isOther = (line: string) =>
    line.trim() !== '' && (parseChapterLine(line) !== null || !isReminderLine(line));
  const first = cardText.findIndex(isOther);
  const end = first < 0 ? cardText.length : first;
  return {
    reminder: cardText.slice(0, end).filter(line => line.trim()),
    rest: cardText.slice(end),
  };
};

/** The reminder text at the top of the card text, as typed. */
export const getTypedReminder = (cardText: string[]): string =>
  splitReminder(cardText).reminder.join('\n');

/** The card text with another reminder text, or without one. The other lines stay as typed. */
export const replaceReminder = (cardText: string[], reminder: string): string[] => [
  ...(reminder ? [reminder] : []),
  ...splitReminder(cardText).rest,
];

/** The chapters of every step, in order. */
export const numberChapters = (steps: Pick<SagaDraftStep, 'chapterCount'>[]): number[][] => {
  let last = 0;
  return steps.map(({ chapterCount }) =>
    Array.from({ length: chapterCount }, () => {
      last += 1;
      return last;
    }),
  );
};

const filledLines = (text: string) => text.split('\n').filter(line => line.trim());

/** The card text of a draft. Further lines of a step are its options, so they become bullets. */
export const formatSagaDraft = ({ reminder, steps, rules }: SagaDraft): string[] => {
  const chapters = numberChapters(steps);
  return [
    ...filledLines(reminder),
    ...steps.flatMap(({ text }, i) => {
      const [first, ...rest] = text.split('\n');
      const line = chapters[i].length ? `${chapterPrefix(chapters[i])}${first}` : first;
      const options = filledLines(rest.join('\n'));
      return [
        ...(line.trim() ? [line] : []),
        ...options.map(option => (continuesLine(option) ? option : `* ${option}`)),
      ];
    }),
    ...filledLines(rules),
  ];
};
