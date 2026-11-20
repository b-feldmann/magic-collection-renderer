// Card renders are 1500×2100.
export const CARD_RATIO = 7 / 5;
// Gap between the cards, and the slot label under each card (line height + gap above it).
export const PACK_GAP = 10;
export const SLOT_LABEL_HEIGHT = 17;
// Cards don't grow past this on very large screens.
export const MAX_PACK_CARD_WIDTH = 360;

export interface PackLayout {
  columns: number;
  cardWidth: number;
}

/**
 * The largest card width at which `count` cards fit into `width` × `height` without scrolling,
 * trying every column count.
 */
export const packLayout = (count: number, width: number, height: number): PackLayout => {
  let best: PackLayout = { columns: Math.max(count, 1), cardWidth: 0 };
  for (let columns = 1; columns <= Math.max(count, 1); columns += 1) {
    const rows = Math.ceil(count / columns);
    const byWidth = (width - (columns - 1) * PACK_GAP) / columns;
    const byHeight =
      ((height - (rows - 1) * PACK_GAP) / Math.max(rows, 1) - SLOT_LABEL_HEIGHT) / CARD_RATIO;
    const cardWidth = Math.floor(Math.min(byWidth, byHeight, MAX_PACK_CARD_WIDTH));
    if (cardWidth > best.cardWidth) best = { columns, cardWidth };
  }
  return { ...best, cardWidth: Math.max(best.cardWidth, 1) };
};
