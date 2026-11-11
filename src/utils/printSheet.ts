// Layout of A4 print-and-play sheets: 3x3 cards at real size, the grid
// centered on the page so every side keeps an empty margin for the printer,
// with a small space between the cards and cut marks in the margins along
// every card edge. All values in mm.

export const A4_WIDTH = 210;
export const A4_HEIGHT = 297;
// 2.5" x 3.5", the size of a real card — exactly the 5:7 ratio of the render.
export const PRINT_CARD_WIDTH = 63.5;
export const PRINT_CARD_HEIGHT = 88.9;
export const SHEET_COLUMNS = 3;
export const SHEET_ROWS = 3;
export const CARDS_PER_SHEET = SHEET_COLUMNS * SHEET_ROWS;
// Small space between neighbouring cards, so a slightly-off cut doesn't
// shave the next card.
export const CARD_SPACING = 0.2;
// Cut marks start a little off the grid so they don't print onto the card.
const CUT_MARK_GAP = 1;
const CUT_MARK_LENGTH = 3;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const gridWidth = SHEET_COLUMNS * PRINT_CARD_WIDTH + (SHEET_COLUMNS - 1) * CARD_SPACING;
const gridHeight = SHEET_ROWS * PRINT_CARD_HEIGHT + (SHEET_ROWS - 1) * CARD_SPACING;
const left = (A4_WIDTH - gridWidth) / 2;
const top = (A4_HEIGHT - gridHeight) / 2;
const right = left + gridWidth;
const bottom = top + gridHeight;

// Card positions on a sheet, row by row.
export const SHEET_SLOTS: Rect[] = Array.from({ length: CARDS_PER_SHEET }, (_, index) => ({
  x: left + (index % SHEET_COLUMNS) * (PRINT_CARD_WIDTH + CARD_SPACING),
  y: top + Math.floor(index / SHEET_COLUMNS) * (PRINT_CARD_HEIGHT + CARD_SPACING),
  width: PRINT_CARD_WIDTH,
  height: PRINT_CARD_HEIGHT,
}));

// Both edges of every card column and row get a cut: short marks above and
// below each vertical edge and left and right of each horizontal edge, in the
// margins.
const columnEdges = Array.from({ length: SHEET_COLUMNS }, (_, column) => {
  const x = left + column * (PRINT_CARD_WIDTH + CARD_SPACING);
  return [x, x + PRINT_CARD_WIDTH];
}).flat();
const rowEdges = Array.from({ length: SHEET_ROWS }, (_, row) => {
  const y = top + row * (PRINT_CARD_HEIGHT + CARD_SPACING);
  return [y, y + PRINT_CARD_HEIGHT];
}).flat();

export const CUT_MARKS: Line[] = [
  ...columnEdges.flatMap(x => [
    { x1: x, y1: top - CUT_MARK_GAP - CUT_MARK_LENGTH, x2: x, y2: top - CUT_MARK_GAP },
    { x1: x, y1: bottom + CUT_MARK_GAP, x2: x, y2: bottom + CUT_MARK_GAP + CUT_MARK_LENGTH },
  ]),
  ...rowEdges.flatMap(y => [
    { x1: left - CUT_MARK_GAP - CUT_MARK_LENGTH, y1: y, x2: left - CUT_MARK_GAP, y2: y },
    { x1: right + CUT_MARK_GAP, y1: y, x2: right + CUT_MARK_GAP + CUT_MARK_LENGTH, y2: y },
  ]),
];
