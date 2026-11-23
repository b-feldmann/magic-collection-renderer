import CardInterface from '../interfaces/CardInterface';
import { isLoadingCover } from './cover';

// The images a card may have in the middleware's images collection, by the number they are stored
// under there (its `face`): each face's cover, and the art of its Aftermath half.
const IMAGE_SLOTS = [
  { side: 'front', field: 'cover' },
  { side: 'back', field: 'cover' },
  { side: 'front', field: 'aftermathCover' },
  { side: 'back', field: 'aftermathCover' },
] as const;

export type CardImageSlot = 0 | 1 | 2 | 3;

export const CARD_IMAGE_SLOTS: CardImageSlot[] = [0, 1, 2, 3];

/** The slots of one face's images. */
export const getFaceImageSlots = (backFace: boolean): CardImageSlot[] =>
  backFace ? [1, 3] : [0, 2];

/** The face field that holds the slot's image. */
export const getImageField = (slot: CardImageSlot) => IMAGE_SLOTS[slot].field;

export const getCardImage = (card: CardInterface, slot: CardImageSlot): string | undefined => {
  const { side, field } = IMAGE_SLOTS[slot];
  return card[side]?.[field];
};

/** The card with another image in the slot. Unchanged when the card has no such face. */
export const withCardImage = (
  card: CardInterface,
  slot: CardImageSlot,
  value: string,
): CardInterface => {
  const { side, field } = IMAGE_SLOTS[slot];
  const face = card[side];
  return face ? { ...card, [side]: { ...face, [field]: value } } : card;
};

/** The slots (of one face, if given) whose image data has to be fetched from the images collection. */
export const getLoadingImageSlots = (card: CardInterface, backFace?: boolean): CardImageSlot[] =>
  (backFace === undefined ? CARD_IMAGE_SLOTS : getFaceImageSlots(backFace)).filter(slot =>
    isLoadingCover(getCardImage(card, slot)),
  );
