import { PRINTED_WHOLE_STEP_SIZES } from './printedTextFit';

// Geometry of a Saga's chapters, in the 1500x2100 design space. Measured on the
// 2026 Sagas (TRK, FDC, HOB, ECC, TMT) and, for creatures, on Final Fantasy's
// summons (FIN, 2025; there is no newer Saga creature).
//
// The chapters fill the text column. Every ability takes its text's height and
// an equal share of the space left over; below the last one is a little more
// room, except on creatures (Amok Time, All Good Things...). An ability shared by several chapters is
// at least as tall as its stack of chapter numbers. All abilities share one font
// size.

export interface SagaArea {
  top: number;
  bottom: number;
  /** The extra space below the last ability, as a share of the space each ability gets. */
  lastExtraShare: number;
}

export const getSagaArea = (isCreature: boolean): SagaArea =>
  isCreature
    ? { top: 438, bottom: 1585, lastExtraShare: 0 }
    : { top: 612, bottom: 1757, lastExtraShare: 0.4 };

/** The height of a chapter number's hexagon, and how far apart the numbers of one ability are. */
export const CHAPTER_ICON_HEIGHT = 132;
export const CHAPTER_ICON_PITCH = 157;
// Print centers the numbers a little above the middle of the text.
const CHAPTER_ICON_OFFSET = -8;
// Numbers move together (and then overlap) when the card has too many of them.
const CHAPTER_ICON_MIN_PITCH = 124;

// An ability keeps at least this much space around its text (above and below
// together), and its chapter numbers this much.
const TEXT_PADDING = 48;
const ICON_PADDING = 4;
const LAST_EXTRA_MAX = 140;

/** The abilities' leading, and the sizes they may use: 7.5pt at most, 7.75pt on creatures. */
export const SAGA_LINE_HEIGHT = 0.97;
const MIN_FONT_SIZE = 30;
const MAX_FONT_SIZE = 63.4;
const CREATURE_MAX_FONT_SIZE = 65.5;

export const getSagaFontSizes = (isCreature: boolean): number[] =>
  PRINTED_WHOLE_STEP_SIZES.filter(
    size => size >= MIN_FONT_SIZE && size <= (isCreature ? CREATURE_MAX_FONT_SIZE : MAX_FONT_SIZE),
  );

export interface SagaAbility {
  textHeight: number;
  /** How many chapters share the ability; 0 for one that belongs to no chapter. */
  chapterCount: number;
}

export interface SagaAbilityLayout {
  /** The line above the ability. */
  dividerTop: number;
  textTop: number;
  /** The top of each chapter number's hexagon. */
  iconTops: number[];
}

export interface SagaLayout {
  abilities: SagaAbilityLayout[];
  fits: boolean;
}

const iconStackHeight = (count: number, pitch: number) =>
  count ? (count - 1) * pitch + CHAPTER_ICON_HEIGHT : 0;

/**
 * Row heights: each one its text and an equal share of `space`, but no less than its minimum.
 * The last row's `extra` is not part of them.
 */
const distribute = (texts: number[], minimums: number[], space: number): number[] => {
  const atMinimum = new Set<number>();
  for (;;) {
    const free = texts.map((_, i) => i).filter(i => !atMinimum.has(i));
    const taken = [...atMinimum].reduce((sum, i) => sum + minimums[i], 0);
    const share =
      (space - taken - free.reduce((sum, i) => sum + texts[i], 0)) / Math.max(1, free.length);
    const tooSmall = free.filter(i => texts[i] + share < minimums[i]);
    if (!tooSmall.length) {
      return texts.map((text, i) => (atMinimum.has(i) ? minimums[i] : text + share));
    }
    tooSmall.forEach(i => atMinimum.add(i));
  }
};

/** Lays out a Saga's abilities, given the height of each one's text at the size being tried. */
export const layoutSaga = (abilities: SagaAbility[], area: SagaArea): SagaLayout => {
  if (!abilities.length) return { abilities: [], fits: true };
  const height = area.bottom - area.top;
  const texts = abilities.map(({ textHeight }) => textHeight);
  const textMinimums = texts.map(text => text + TEXT_PADDING);

  // Stacked numbers only move together when the abilities don't fit otherwise.
  const minimumsAt = (pitch: number) =>
    abilities.map(({ chapterCount }, i) =>
      Math.max(textMinimums[i], iconStackHeight(chapterCount, pitch) + ICON_PADDING),
    );
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  let pitch = CHAPTER_ICON_PITCH;
  while (pitch > CHAPTER_ICON_MIN_PITCH && sum(minimumsAt(pitch)) > height) pitch -= 1;
  const minimums = minimumsAt(pitch);
  const fits = sum(minimums) <= height;

  const leftOver = Math.max(0, height - sum(texts));
  const extra = Math.min(
    LAST_EXTRA_MAX,
    Math.max(0, height - sum(minimums)),
    (leftOver * area.lastExtraShare) / (abilities.length + area.lastExtraShare),
  );
  // Abilities that don't fit at any size overlap evenly instead of running off the column.
  const rows = fits
    ? distribute(texts, minimums, height - extra)
    : minimums.map(minimum => (minimum * height) / sum(minimums));

  let top = area.top;
  return {
    fits,
    abilities: abilities.map(({ textHeight, chapterCount }, i) => {
      const center = top + rows[i] / 2;
      const iconsTop = center + CHAPTER_ICON_OFFSET - iconStackHeight(chapterCount, pitch) / 2;
      const layout = {
        dividerTop: top,
        textTop: center - textHeight / 2,
        iconTops: Array.from({ length: chapterCount }, (_, n) => iconsTop + n * pitch),
      };
      top += rows[i];
      return layout;
    }),
  };
};
