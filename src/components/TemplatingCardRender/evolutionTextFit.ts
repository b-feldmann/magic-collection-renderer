import { EvolutionSplit } from '../../interfaces/enums';
import { balancePrintedLines, resetPrintedLines } from './printedLineBreaks';
import { PRINTED_RULES_SIZES } from './printedTextFit';

// Evolution cards are custom (there are no prints to measure), so their three
// text boxes (the rules box and both level boxes) are typeset with the rules
// measured on 2026 M15 prints: 76px MPlantin at full size with ≈0.985
// leading, shrinking in 0.25pt steps with ≈0.97 leading, and lines broken
// like print's paragraph composer. Like a planeswalker's abilities, all boxes
// share one size, so the card reads as one block of rules text.

export const EVOLUTION_TEXT_SIZES = PRINTED_RULES_SIZES;
const FULL_SIZE_LINE_HEIGHT = 0.985;
const SHRUNK_LINE_HEIGHT = 0.97;

/** Marks the boxes `fitEvolutionText` sizes together. */
export const EVOLUTION_TEXT_ATTRIBUTE = 'data-evolution-text';

const applySize = (box: HTMLElement, size: number) => {
  box.style.fontSize = `${size}px`;
  box.style.lineHeight = String(
    size >= EVOLUTION_TEXT_SIZES[0] ? FULL_SIZE_LINE_HEIGHT : SHRUNK_LINE_HEIGHT,
  );
};

const boxFits = (box: HTMLElement) =>
  box.scrollHeight <= box.clientHeight && box.scrollWidth <= box.clientWidth;

/** The largest printed size above `min` at which all of the boxes fit, or null if there is none. */
const findFittingSize = (boxes: HTMLElement[], min = 0): number | null =>
  EVOLUTION_TEXT_SIZES.find(size => {
    if (size <= min) return false;
    boxes.forEach(box => applySize(box, size));
    return boxes.every(boxFits);
  }) ?? null;

// The even split comes first, so a taller band needs to allow larger text.
const FIXED_SPLITS = [EvolutionSplit.Even, EvolutionSplit.TallBase, EvolutionSplit.TallLevel];

/**
 * The height split that allows the largest text, the even one if several do or
 * if the text fits none. `applySplit` lays the boxes out with a split; the
 * chosen one stays applied.
 */
export const chooseEvolutionSplit = (
  boxes: HTMLElement[],
  applySplit: (split: EvolutionSplit) => void,
): EvolutionSplit => {
  boxes.forEach(resetPrintedLines);
  let chosen = EvolutionSplit.Even;
  let largest = 0;
  for (const split of FIXED_SPLITS) {
    applySplit(split);
    const size = findFittingSize(boxes, largest);
    if (size !== null) {
      chosen = split;
      largest = size;
    }
    if (largest >= EVOLUTION_TEXT_SIZES[0]) break;
  }
  applySplit(chosen);
  return chosen;
};

/**
 * Sets every box to the largest printed size at which all of them fit (the
 * smallest size if none does), then re-breaks their lines like print.
 * Returns the chosen size.
 */
export const fitEvolutionText = (boxes: HTMLElement[]): number => {
  boxes.forEach(resetPrintedLines);
  const chosen = findFittingSize(boxes) ?? EVOLUTION_TEXT_SIZES[EVOLUTION_TEXT_SIZES.length - 1];
  // The boxes stay vertically centered at every size: a level box is a band
  // of its own, so shrunk text doesn't move to its top like M15 rules text.
  boxes.forEach(box => {
    applySize(box, chosen);
    balancePrintedLines(box);
  });
  return chosen;
};
