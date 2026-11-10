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

/**
 * Sets every box to the largest printed size at which all of them fit (the
 * smallest size if none does), then re-breaks their lines like print.
 * Returns the chosen size.
 */
export const fitEvolutionText = (boxes: HTMLElement[]): number => {
  boxes.forEach(resetPrintedLines);
  let chosen = EVOLUTION_TEXT_SIZES[EVOLUTION_TEXT_SIZES.length - 1];
  for (const size of EVOLUTION_TEXT_SIZES) {
    boxes.forEach(box => applySize(box, size));
    if (boxes.every(boxFits)) {
      chosen = size;
      break;
    }
  }
  // The boxes stay vertically centered at every size: a level box is a band
  // of its own, so shrunk text doesn't move to its top like M15 rules text.
  boxes.forEach(box => {
    applySize(box, chosen);
    balancePrintedLines(box);
  });
  return chosen;
};
